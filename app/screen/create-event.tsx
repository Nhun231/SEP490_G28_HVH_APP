import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import DatePickerInput from '../components/DatePickerInput';
import DocumentUploadBox, { DocumentUpload } from '../components/DocumentUploadBox';
import BottomSheetPicker, { OptionItem } from '../components/BottomSheetPicker';
import MapLocationPicker, { LocationData } from '../components/MapLocationPicker';
import PickerField from '../components/PickerField';
import EventDayCard, { EventDay, DayErrorField } from '../components/EventDayCard';
import {
    ActivityDomain,
    getAllActivityDomains,
    saveDraftEvent,
    submitEvent,
    EventCreateRequest,
    EventSession,
    SessionUpdateAction,
    UpdateImage,
    getApiErrorMessage,
    getApiErrorRawText,
    resolveSupabaseUrl,
    getEventDetailByHost,
} from '@/services/event-service';
import { getFileExtension, getMimeType, uploadImageToSupabase } from '@/services/upload-service';
import servedTargetsData from '../../assets/served_targets/doi_tuong_phuc_vu.json';
import servedPlacesData from '../../assets/served_places/dia_diem_phuc_vu.json';
import wardsData from '../../assets/wards/phuong_xa_moi_ha_noi.json';

interface EventFormErrors {
    eventName?: string;
    description?: string;
    servedTarget?: string;
    servedField?: string;
    servedSpecificField?: string;
    servedPlace?: string;
    area?: string;
    detailAddress?: string;
    registrationDeadline?: string;
    eventImage?: string;
    checkInLocation?: string;
}

// keep activityDomains in cache to avoid refetch every time
let cachedActivityDomains: ActivityDomain[] = [];

// build DocumentUpload from prefillEvent for initializer if event is editing
function buildPrefillImageDoc(prefill: { imageUrls?: string[] } | null): DocumentUpload {
    if (prefill?.imageUrls && prefill.imageUrls.length > 0) {
        const resolved = resolveSupabaseUrl(prefill.imageUrls[0]) || prefill.imageUrls[0];
        return { uri: resolved, fileName: 'existing-image', mimeType: 'image/jpeg' };
    }
    return { uri: null, fileName: null, mimeType: null };
}

const CreateEvent = () => {
    const router = useRouter();
    const { eventId: editEventIdParam, eventData: eventDataParam } = useLocalSearchParams<{ eventId?: string; eventData?: string }>();
    const editEventId: string | null = typeof editEventIdParam === 'string' ? editEventIdParam : null;
    const isEditMode = !!editEventId;
    // Parse prefilled event data from event-detail (avoid refetch API)
    const prefillEvent = (() => {
        if (typeof eventDataParam !== 'string') return null;
        try {
            // return object as EventDetailResponse + resolvedCheckinAddress
            return JSON.parse(eventDataParam) as (typeof getEventDetailByHost extends (...args: any) => Promise<infer R> ? R : never) & { resolvedCheckinAddress?: string | null };
        }
        catch {
            return null;
        }
    })();

    // Pre-compute values from prefillEvent
    const initServedTarget = prefillEvent ? (() => {
        const t = servedTargetsData.doi_tuong_phuc_vu.find((x) => x.value === prefillEvent.servedTarget);
        return t ? { id: t.id, label: t.label, value: t.value } as OptionItem : undefined;
    })() : undefined;

    const initServedPlace = prefillEvent ? (() => {
        const p = servedPlacesData.dia_diem_phuc_vu.find((x) => x.value === prefillEvent.servingPlaceType);
        return p ? { id: p.id, label: p.label, value: p.value } as OptionItem : undefined;
    })() : undefined;

    const initArea = prefillEvent ? (() => {
        const w = wardsData.danh_sach_phuong_xa_moi.find((x) => x.ten_moi === prefillEvent.address);
        return w ? { id: w.stt, label: w.ten_moi } as OptionItem : undefined;
    })() : undefined;

    const initEventDays: EventDay[] = prefillEvent?.eventSessions?.length ? prefillEvent.eventSessions.map((s: any, idx: number) => ({
        id: s.id || String(idx + 1),
        date: new Date(s.startDateTime),
        startTime: new Date(s.startDateTime),
        endTime: new Date(s.endDateTime),
        volunteerCount: String(s.expectedVolAmount),
        servedCount: String(s.expectedSerAmount),
    })) : [{ id: '1', volunteerCount: '', servedCount: '' }];


    const initExistingUrl = prefillEvent?.imageUrls?.length ? (resolveSupabaseUrl(prefillEvent.imageUrls[0]) || prefillEvent.imageUrls[0]) : null; // current image URL from API (null if user selects new image)

    const [approvalMode, setApprovalMode] = useState(prefillEvent ? (prefillEvent.autoApprove ? 0 : 1) : 0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingEditData, setIsLoadingEditData] = useState(false); // use when navigate with only eventId
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>(initExistingUrl);

    // Basic info states, get from prefillEvent if exists
    const [eventName, setEventName] = useState(prefillEvent?.name ?? '');
    const [description, setDescription] = useState(prefillEvent?.description ?? '');
    const [servedTarget, setServedTarget] = useState<OptionItem>(initServedTarget as OptionItem);
    const [servedField, setServedField] = useState<OptionItem>();
    const [servedSpecificField, setServedSpecificField] = useState<OptionItem>();
    const [servedPlace, setServedPlace] = useState<OptionItem>(initServedPlace as OptionItem);
    const [area, setArea] = useState<OptionItem>(initArea as OptionItem);
    const [registrationDeadline, setRegistrationDeadline] = useState<Date>(
        (prefillEvent?.recruitmentEndDate ? new Date(prefillEvent.recruitmentEndDate) : undefined) as Date
    );
    const [eventImageDoc, setEventImageDoc] = useState<DocumentUpload>(buildPrefillImageDoc(prefillEvent));

    // Multi-day event states
    const [eventDays, setEventDays] = useState<EventDay[]>(initEventDays);

    // Location state
    const [checkInLocation, setCheckInLocation] = useState<LocationData>(
        (prefillEvent ? { latitude: prefillEvent.latCheckInLocation, longitude: prefillEvent.lngCheckInLocation, address: prefillEvent.resolvedCheckinAddress || '' } : undefined) as LocationData
    );
    const [checkInRadius, setCheckInRadius] = useState(prefillEvent ? String(prefillEvent.checkInAccuracyMeters) : '300');
    const [detailAddress, setDetailAddress] = useState(prefillEvent?.detailAddress ?? '');

    // Serving flag
    const [isServingEvent, setIsServingEvent] = useState(false);

    // Modal visibility states
    const [showTargetPicker, setShowTargetPicker] = useState(false);
    const [showFieldPicker, setShowFieldPicker] = useState(false);
    const [showSpecificFieldPicker, setShowSpecificFieldPicker] = useState(false);
    const [showPlacePicker, setShowPlacePicker] = useState(false);
    const [showAreaPicker, setShowAreaPicker] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    // keep activity domains in cache
    const [activityDomains, setActivityDomains] = useState<ActivityDomain[]>(cachedActivityDomains);

    // form errors
    const [formErrors, setFormErrors] = useState<EventFormErrors>({});
    const [eventDayErrors, setEventDayErrors] = useState<Record<string, Partial<Record<DayErrorField, string>>>>({});

    // get start of today for date validation prevent selecting past dates for event sessions
    const todayStart = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    // Transform wards data to OptionItem format
    const wardOptions: OptionItem[] = wardsData.danh_sach_phuong_xa_moi.map(ward => ({
        id: ward.stt,
        label: ward.ten_moi
    }));

    // convert activityDomains to servedField options for the picker
    const servedFieldOptions = useMemo<OptionItem[]>(() => {
        return activityDomains
            .filter((domain) => {
                // Only take domains that are active and have at least one active subdomain
                return domain.active &&
                    domain.activitySubDomainList.some((subDomain) => subDomain.active);
            })
            .map((domain, index) => ({
                id: index + 1,
                label: domain.name,
            }));
    }, [activityDomains]);

    // Determine selected activity domain based on servedField selection to populate activity subdomain
    const selectedActivityDomain = useMemo<ActivityDomain | undefined>(() => {
        if (!servedField) return undefined;
        // Same filtering logic as servedFieldOptions 
        const filteredDomains = activityDomains.filter((domain) => {
            return domain.active &&
                domain.activitySubDomainList.some((subDomain) => subDomain.active);
        });
        return filteredDomains[servedField.id - 1];
    }, [activityDomains, servedField]);

    // convert subdomains of the selected activity domain to servedSpecificField options for the picker
    const servedSpecificFieldOptions = useMemo<OptionItem[]>(() => {
        if (!selectedActivityDomain) return [];
        return selectedActivityDomain.activitySubDomainList
            .filter((subDomain) => subDomain.active)
            .map((subDomain) => ({
                id: subDomain.id,
                label: subDomain.name,
            }));
    }, [selectedActivityDomain]);

    const getMinutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

    // Sanitize input to allow only digits, no leading zeros, for volunteer count
    const sanitizeVolunteerCountInput = (value: string) => {
        const digitsOnly = value.replace(/[^0-9]/g, '');
        if (!digitsOnly) return '';
        if (digitsOnly.startsWith('0')) return '';
        return digitsOnly;
    };

    // Sanitize input to allow only digits, allow leading zero for served count 
    const sanitizeServedCountInput = (value: string) => {
        const digitsOnly = value.replace(/[^0-9]/g, '');
        if (!digitsOnly) return '';
        if (digitsOnly[0] === '0') return '0';
        return digitsOnly;
    };

    // check if a string is a positive natural number (integer > 0)
    const isPositiveNaturalNumber = (value: string) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0;
    };

    // check if a string contains special characters (anything other than letters, numbers, whitespace, dots, and commas)
    const containsSpecialCharacters = (value: string) => /[^\p{L}\p{N}\s.,]/u.test(value);

    // validate detailAddress: not empty, only letters/digits/comma/slash
    const validateDetailAddress = (value: string): string | undefined => {
        const trimmed = value.trim();
        if (!trimmed) return 'Vui lòng nhập địa chỉ chi tiết';
        if (/[^\p{L}\p{N}\s,/]/u.test(trimmed)) return 'Địa chỉ không được chứa ký tự đặc biệt (chỉ chữ, số, dấu phẩy và dấu gạch chéo)';
        return undefined;
    };

    // check duration of event session does not exceed limits
    const getDurationValidationError = (startTime: Date, endTime: Date) => {
        // Only validate duration after required domain selections are completed.
        if (!servedField || !servedSpecificField) {
            return undefined;
        }

        const durationMinutes = getMinutesOfDay(endTime) - getMinutesOfDay(startTime);
        const baseLimitMinutes = 4 * 60;

        if (durationMinutes <= baseLimitMinutes) {
            return undefined;
        }

        const specialLimitHours = selectedActivityDomain?.specialSessionMaxTime;
        if (typeof specialLimitHours !== 'number') {
            return 'Thời lượng sự kiện tối đa 4 giờ';
        }

        const specialLimitMinutes = specialLimitHours * 60;
        if (durationMinutes > specialLimitMinutes) {
            return `Thời lượng vượt quá giới hạn của lĩnh vực đã chọn (Tối đa ${specialLimitHours} tiếng)`;
        }

        return undefined;
    };

    // set error message for a specific field of a specific event day
    const setDayFieldError = (dayId: string, field: DayErrorField, message?: string) => {
        setEventDayErrors((prev) => {
            const current = prev[dayId] || {};
            const updated = { ...current };

            if (message) {
                updated[field] = message;
            } else {
                delete updated[field];
            }

            if (Object.keys(updated).length === 0) {
                const next = { ...prev };
                delete next[dayId];
                return next;
            }

            return {
                ...prev,
                [dayId]: updated,
            };
        });
    };

    // set error message for a specific field in the main form
    const setFormFieldError = (field: keyof EventFormErrors, message?: string) => {
        setFormErrors((prev) => ({
            ...prev,
            [field]: message,
        }));
    };

    // validate required fields in the main form and set error messages accordingly
    const validateRequiredFormField = (field: keyof EventFormErrors, value: unknown, message: string) => {
        const hasValue = value instanceof Date ? true : Boolean(value);
        setFormFieldError(field, hasValue ? undefined : message);
    };

    // validate quantity fields in event days and set error messages accordingly
    const validateQuantityField = (dayId: string, field: 'volunteerCount' | 'servedCount', value: string, emptyMessage: string) => {
        if (!value.trim()) {
            setDayFieldError(dayId, field, emptyMessage);
            return;
        }

        if (field === 'volunteerCount') {
            if (!isPositiveNaturalNumber(value)) {
                setDayFieldError(dayId, field, 'Số lượng cần là số tự nhiên lớn hơn 0');
                return;
            }
            setDayFieldError(dayId, field);
            return;
        }

        if (!/^\d+$/.test(value)) {
            setDayFieldError(dayId, field, 'Số lượng không hợp lệ');
            return;
        }

        setDayFieldError(dayId, field);
    };

    // fetch activity domains on component mount
    useEffect(() => {
        if (cachedActivityDomains.length > 0) return;
        const fetchAllActivityDomains = async () => {
            try {
                const allDomains = await getAllActivityDomains();
                cachedActivityDomains = allDomains;
                setActivityDomains(allDomains);
            } catch (error) {
                console.error('Failed to fetch activity domains:', error);
                setActivityDomains([]);
            }
        };
        fetchAllActivityDomains();
    }, []);

    // fill form for edit mode
    useEffect(() => {
        if (!editEventId || activityDomains.length === 0) return;

        // if has prefill event
        if (prefillEvent) {
            const filteredDomains = activityDomains.filter(
                (d) => d.active && d.activitySubDomainList.some((s) => s.active)
            );
            for (let i = 0; i < filteredDomains.length; i++) {
                const subdomain = filteredDomains[i].activitySubDomainList.find(
                    (s) => s.active && s.name === prefillEvent.activitySubDomain
                );
                if (subdomain) {
                    setServedField({ id: i + 1, label: filteredDomains[i].name });
                    setServedSpecificField({ id: subdomain.id, label: subdomain.name });
                    break;
                }
            }
            return;
        }

        // if no prefill event (navigate directly with only eventId)
        let cancelled = false;
        const loadEditData = async () => {
            setIsLoadingEditData(true);
            try {
                const event = await getEventDetailByHost(editEventId);
                if (cancelled) return;

                setEventName(event.name);
                setDescription(event.description);
                setDetailAddress(event.detailAddress);
                setCheckInRadius(String(event.checkInAccuracyMeters));
                setApprovalMode(event.autoApprove ? 0 : 1);

                if (event.imageUrls && event.imageUrls.length > 0) {
                    const resolved = resolveSupabaseUrl(event.imageUrls[0]) || event.imageUrls[0];
                    setExistingImageUrl(resolved);
                    setEventImageDoc({ uri: resolved, fileName: 'existing-image', mimeType: 'image/jpeg' });
                }

                const targetItem = servedTargetsData.doi_tuong_phuc_vu.find((t) => t.value === event.servedTarget);
                if (targetItem) setServedTarget({ id: targetItem.id, label: targetItem.label });

                const placeItem = servedPlacesData.dia_diem_phuc_vu.find((p) => p.value === event.servingPlaceType);
                if (placeItem) setServedPlace({ id: placeItem.id, label: placeItem.label });

                const wardItem = wardsData.danh_sach_phuong_xa_moi.find((w) => w.ten_moi === event.address);
                if (wardItem) setArea({ id: wardItem.stt, label: wardItem.ten_moi });

                if (event.recruitmentEndDate) setRegistrationDeadline(new Date(event.recruitmentEndDate));

                const lat = event.latCheckInLocation;
                const lng = event.lngCheckInLocation;
                setCheckInLocation({ latitude: lat, longitude: lng, address: '' });
                try {
                    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`;
                    const geocodeRes = await fetch(geocodeUrl, { headers: { 'User-Agent': 'HVH-App/1.0' } });
                    if (geocodeRes.ok) {
                        const geocodeData = await geocodeRes.json();
                        const addr = geocodeData.address as Record<string, string> | undefined;
                        let resolvedAddress = '';
                        if (addr) {
                            const parts = [
                                addr.road || addr.pedestrian || addr.footway || addr.path,
                                addr.suburb || addr.quarter || addr.neighbourhood,
                                addr.city_district || addr.district || addr.county,
                                addr.city || addr.town || addr.state,
                            ].filter(Boolean) as string[];
                            resolvedAddress = parts.length > 0 ? parts.join(', ') : (geocodeData.display_name as string || '');
                        } else {
                            resolvedAddress = geocodeData.display_name as string || '';
                        }
                        if (!cancelled) setCheckInLocation({ latitude: lat, longitude: lng, address: resolvedAddress });
                    }
                } catch { } // keep address empty

                const filteredDomains = activityDomains.filter(
                    (d) => d.active && d.activitySubDomainList.some((s) => s.active)
                );
                for (let i = 0; i < filteredDomains.length; i++) {
                    const subdomain = filteredDomains[i].activitySubDomainList.find(
                        (s) => s.active && s.name === event.activitySubDomain
                    );
                    if (subdomain) {
                        setServedField({ id: i + 1, label: filteredDomains[i].name });
                        setServedSpecificField({ id: subdomain.id, label: subdomain.name });
                        break;
                    }
                }

                if (event.eventSessions && event.eventSessions.length > 0) {
                    const loadedDays: EventDay[] = event.eventSessions.map((s, idx) => ({
                        id: s.id || String(idx + 1),
                        date: new Date(s.startDateTime),
                        startTime: new Date(s.startDateTime),
                        endTime: new Date(s.endDateTime),
                        volunteerCount: String(s.expectedVolAmount),
                        servedCount: String(s.expectedSerAmount),
                    }));
                    setEventDays(loadedDays);
                }
            } catch (e) {
                console.log('[Edit Mode] Failed to load event data:', e);
            } finally {
                if (!cancelled) setIsLoadingEditData(false);
            }
        };
        loadEditData();
        return () => { cancelled = true; };
    }, [editEventId, activityDomains]);

    // format date to "YYYY-MM-DD" for API request
    const formatDateToYMD = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // combine date and time into ISO string with Vietnam timezone for API request
    const combineDateTimeToISO = (date: Date, time: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(time.getHours()).padStart(2, '0');
        const minutes = String(time.getMinutes()).padStart(2, '0');
        const seconds = '00';
        // Vietnam timezone offset
        const timezoneOffset = '+07:00';
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;
    };

    // build the request body for both saving draft and submitting event
    const buildRequestBody = (): EventCreateRequest | null => {
        if (!servedTarget?.value || !servedSpecificField?.id || !servedPlace?.value ||
            !area?.label || !registrationDeadline || !checkInLocation) {
            return null;
        }

        const normalizedEventName = eventName.trim();
        const normalizedDescription = description.trim();
        if (!normalizedEventName || !normalizedDescription) {
            return null;
        }

        if (containsSpecialCharacters(normalizedEventName) || containsSpecialCharacters(normalizedDescription)) {
            return null;
        }

        const hasInvalidSessions = eventDays.some((day) => {
            if (!day.date || !day.startTime || !day.endTime) return true;
            if (!isPositiveNaturalNumber(day.volunteerCount)) return true;
            if (!/^\d+$/.test(day.servedCount)) return true;
            if (getDurationValidationError(day.startTime, day.endTime)) return true;
            return false;
        });

        if (hasInvalidSessions) {
            return null;
        }

        if (validateDetailAddress(detailAddress)) {
            return null;
        }

        // Build updateImages array
        // in edit mode if has existingImageUrl (not select new image) -> don't send updateImages (keep old image)
        // if user select new image (existingImageUrl === null) -> ADD action
        const updateImages: UpdateImage[] = [];
        if (!existingImageUrl && eventImageDoc.uri) {
            const fileExtension = getFileExtension(eventImageDoc.uri, eventImageDoc.mimeType);
            updateImages.push({
                imageId: null,
                updateAction: 'ADD',
                fileExtension: fileExtension,
            });
        }

        // Build eventSessions array from eventDays
        // In edit mode: existing sessions (id = UUID from API) → EDIT; new sessions (id = local temp e.g. '1','2') → ADD
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const eventSessions: EventSession[] = eventDays
            .map(day => {
                const isExistingSession = isEditMode && UUID_REGEX.test(day.id);
                return {
                    eventSessionId: isExistingSession ? day.id : null,
                    updateAction: (isExistingSession ? 'EDIT' : 'ADD') as SessionUpdateAction,
                    startDateTime: combineDateTimeToISO(day.date!, day.startTime!),
                    endDateTime: combineDateTimeToISO(day.date!, day.endTime!),
                    expectedVolAmount: parseInt(day.volunteerCount, 10),
                    expectedSerAmount: parseInt(day.servedCount, 10),
                };
            });


        const requestBody: EventCreateRequest = {
            ...(isEditMode && editEventId ? { eventId: editEventId } : {}),
            name: eventName.trim(),
            updateImages,
            description: description.trim(),
            address: area.label,
            detailAddress: detailAddress.trim(),
            autoApprove: approvalMode === 0,
            servingActivity: isServingEvent,
            activitySubDomainId: servedSpecificField.id,
            servedTarget: servedTarget.value,
            servingPlaceType: servedPlace.value,
            recruitmentEndDate: formatDateToYMD(registrationDeadline),
            eventSessions,
            checkInPlaceLat: checkInLocation.latitude,
            checkInPlaceLng: checkInLocation.longitude,
            checkInPlaceAccuracyMeters: parseInt(checkInRadius, 10) || 300,
        };

        return requestBody;
    };

    // Validate required fields in the request body
    const validateRequestBodyRequiredFields = () => {
        const missingFields: string[] = [];

        if (!eventName.trim()) {
            setFormFieldError('eventName', 'Vui lòng nhập tên sự kiện');
            missingFields.push('Tên sự kiện');
        } else if (containsSpecialCharacters(eventName.trim())) {
            setFormFieldError('eventName', 'Tên sự kiện không được chứa ký tự đặc biệt');
            missingFields.push('Tên sự kiện không hợp lệ');
        } else {
            setFormFieldError('eventName');
        }

        if (!description.trim()) {
            setFormFieldError('description', 'Vui lòng nhập mô tả sự kiện');
            missingFields.push('Mô tả sự kiện');
        } else if (containsSpecialCharacters(description.trim())) {
            setFormFieldError('description', 'Mô tả sự kiện không được chứa ký tự đặc biệt');
            missingFields.push('Mô tả sự kiện không hợp lệ');
        } else {
            setFormFieldError('description');
        }

        if (!servedTarget?.value) {
            setFormFieldError('servedTarget', 'Vui lòng chọn đối tượng phục vụ');
            missingFields.push('Đối tượng phục vụ');
        } else {
            setFormFieldError('servedTarget');
        }

        if (!servedField) {
            setFormFieldError('servedField', 'Vui lòng chọn lĩnh vực phục vụ');
            missingFields.push('Lĩnh vực phục vụ');
        } else {
            setFormFieldError('servedField');
        }

        if (!servedSpecificField?.id) {
            setFormFieldError('servedSpecificField', 'Vui lòng chọn lĩnh vực cụ thể');
            missingFields.push('Lĩnh vực cụ thể');
        } else {
            setFormFieldError('servedSpecificField');
        }

        if (!servedPlace?.value) {
            setFormFieldError('servedPlace', 'Vui lòng chọn loại địa điểm phục vụ');
            missingFields.push('Loại địa điểm phục vụ');
        } else {
            setFormFieldError('servedPlace');
        }

        if (!area?.label) {
            setFormFieldError('area', 'Vui lòng chọn khu vực tổ chức');
            missingFields.push('Khu vực tổ chức');
        } else {
            setFormFieldError('area');
        }

        const detailAddressError = validateDetailAddress(detailAddress);
        if (detailAddressError) {
            setFormFieldError('detailAddress', detailAddressError);
            missingFields.push('Địa chỉ chi tiết');
        } else {
            setFormFieldError('detailAddress');
        }

        if (!registrationDeadline) {
            setFormFieldError('registrationDeadline', 'Vui lòng chọn hạn đăng ký');
            missingFields.push('Hạn đăng ký');
        } else {
            setFormFieldError('registrationDeadline');
        }

        if (!checkInLocation) {
            setFormFieldError('checkInLocation', 'Vui lòng chọn địa điểm điểm danh');
            missingFields.push('Địa điểm điểm danh');
        } else {
            setFormFieldError('checkInLocation');
        }

        eventDays.forEach((day, index) => {
            if (!day.date) {
                setDayFieldError(day.id, 'date', 'Vui lòng chọn ngày tổ chức');
                missingFields.push(`Ngày tổ chức (Ngày ${index + 1})`);
            }

            if (!day.startTime) {
                setDayFieldError(day.id, 'startTime', 'Vui lòng chọn giờ bắt đầu');
                missingFields.push(`Giờ bắt đầu (Ngày ${index + 1})`);
            }

            if (!day.endTime) {
                setDayFieldError(day.id, 'endTime', 'Vui lòng chọn giờ kết thúc');
                missingFields.push(`Giờ kết thúc (Ngày ${index + 1})`);
            }

            if (day.startTime && day.endTime) {
                const durationError = getDurationValidationError(day.startTime, day.endTime);
                if (durationError) {
                    setDayFieldError(day.id, 'endTime', durationError);
                    missingFields.push(`Thời lượng sự kiện không hợp lệ (Ngày ${index + 1})`);
                }
            }

            if (!day.volunteerCount.trim()) {
                setDayFieldError(day.id, 'volunteerCount', 'Vui lòng nhập số lượng TNV cần tuyển');
                missingFields.push(`Số lượng TNV cần tuyển (Ngày ${index + 1})`);
            }

            if (!day.servedCount.trim()) {
                setDayFieldError(day.id, 'servedCount', 'Vui lòng nhập số lượng đối tượng phục vụ');
                missingFields.push(`Số lượng đối tượng phục vụ (Ngày ${index + 1})`);
            }
        });

        return missingFields;
    };

    // add a new event day with empty fields to the form
    const addEventDay = () => {
        const newDay: EventDay = {
            id: Date.now().toString(),
            volunteerCount: '',
            servedCount: '',
        };
        setEventDays([...eventDays, newDay]);
    };

    // update a specific field of a specific event day
    const updateEventDay = (id: string, field: keyof EventDay, value: any) => {
        if (field === 'date' && value instanceof Date) {
            setDayFieldError(id, field);
        }

        if ((field === 'startTime' || field === 'endTime') && value instanceof Date) {
            setDayFieldError(id, field);
        }

        if ((field === 'volunteerCount' || field === 'servedCount') && typeof value === 'string') {
            validateQuantityField(
                id,
                field,
                value,
                field === 'volunteerCount'
                    ? 'Vui lòng nhập số lượng TNV cần tuyển'
                    : 'Vui lòng nhập số lượng đối tượng phục vụ'
            );
        }

        setEventDays((prev) => prev.map(day =>
            day.id === id ? { ...day, [field]: value } : day
        ));

        if (field === 'startTime' || field === 'endTime') {
            const currentDay = eventDays.find((day) => day.id === id);
            const startTime = field === 'startTime' ? value : currentDay?.startTime;
            const endTime = field === 'endTime' ? value : currentDay?.endTime;

            if (startTime instanceof Date && endTime instanceof Date) {
                const durationError = getDurationValidationError(startTime, endTime);
                setDayFieldError(id, 'endTime', durationError);
            }
        }
    };

    // remove an event day from the form, but ensure at least one day remains
    const removeEventDay = (id: string) => {
        if (eventDays.length > 1) {
            setEventDays(eventDays.filter(day => day.id !== id));
            setEventDayErrors((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    // handle save event as draft
    const handleSaveDraft = async () => {
        if (isSubmitting) return;

        const requestBody = buildRequestBody();
        if (!requestBody) {
            const missingFields = validateRequestBodyRequiredFields();
            const missingFieldsMessage = missingFields.length
                ? `\nThiếu: ${missingFields.join(', ')}`
                : '';
            Alert.alert('Thông báo', `Vui lòng điền đầy đủ thông tin cần thiết${missingFieldsMessage}`);
            return;
        }

        setIsSubmitting(true);
        try {
            console.log(`[Create Event][Draft] Request body\n${JSON.stringify(requestBody, null, 2)}`);
            const response = await saveDraftEvent(requestBody);
            console.log('Draft saved:', response);

            // upload image if has uploadUrls and user select new image
            if (response.uploadUrls && response.uploadUrls.length > 0 && eventImageDoc.uri && !existingImageUrl) {
                await uploadImageToSupabase(resolveSupabaseUrl(response.uploadUrls[0]) ?? response.uploadUrls[0], {
                    uri: eventImageDoc.uri,
                    mimeType: eventImageDoc.mimeType || 'image/jpeg',
                });
                console.log('Image uploaded successfully');
            }

            Alert.alert('Thông báo', 'Đã lưu bản thảo sự kiện thành công', [
                { text: 'OK', onPress: () => router.replace('/(host-tabs)/events') },
            ]);
        } catch (error) {
            const rawErrorText = getApiErrorRawText(error);
            if (rawErrorText) {
                console.log(`[Event API Error][Draft]\n${rawErrorText}`);
            }
            console.log('Failed to save draft:', error);
            const errorMessage = getApiErrorMessage(error);
            Alert.alert('Thông báo', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // handle picking event image from device library
    const handlePickEventImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
            });

            if (result.canceled) {
                return;
            }

            if (result.assets?.[0]) {
                const asset = result.assets[0];
                const uri = asset.uri;
                const fileName = asset.fileName || uri.split('/').pop() || `event_${Date.now()}.jpg`;
                let extension = '.jpg';
                let mimeType = 'image/jpeg';

                try {
                    const match = fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/);
                    if (match) {
                        extension = match[0];
                        mimeType = getMimeType(extension);
                    } else if (asset.mimeType) {
                        mimeType = asset.mimeType;
                        extension = mimeType.includes('png') ? '.png' : '.jpg';
                    }
                } catch (err) {
                    console.warn('Could not detect file extension, using default .jpg', err);
                }

                // user select new image -> clear existingImageUrl to not be considered as old image
                setExistingImageUrl(null);
                setEventImageDoc({
                    uri,
                    fileName: fileName.toLowerCase().endsWith(extension) ? fileName : `${fileName}${extension}`,
                    mimeType,
                });
                setFormErrors((prev) => ({ ...prev, eventImage: undefined }));
            }
        } catch (error) {
            Alert.alert('Thông báo', error instanceof Error ? error.message : 'Không thể chọn ảnh');
        }
    };

    // handle removing selected event image
    const handleRemoveEventImage = () => {
        setExistingImageUrl(null);
        setEventImageDoc({ uri: null, fileName: null, mimeType: null });
    };

    // validate the entire form before submission and set error messages
    const validateForm = () => {
        const nextErrors: EventFormErrors = {};
        const nextDayErrors: Record<string, Partial<Record<DayErrorField, string>>> = {};

        if (!eventName.trim()) nextErrors.eventName = 'Vui lòng nhập tên sự kiện';
        if (!description.trim()) nextErrors.description = 'Vui lòng nhập mô tả sự kiện';
        if (eventName.trim() && containsSpecialCharacters(eventName.trim())) {
            nextErrors.eventName = 'Tên sự kiện không được chứa ký tự đặc biệt';
        }
        if (description.trim() && containsSpecialCharacters(description.trim())) {
            nextErrors.description = 'Mô tả sự kiện không được chứa ký tự đặc biệt';
        }
        if (!servedTarget) nextErrors.servedTarget = 'Vui lòng chọn đối tượng phục vụ';
        if (!servedField) nextErrors.servedField = 'Vui lòng chọn lĩnh vực phục vụ';
        if (!servedSpecificField) nextErrors.servedSpecificField = 'Vui lòng chọn lĩnh vực cụ thể';
        if (!servedPlace) nextErrors.servedPlace = 'Vui lòng chọn loại địa điểm phục vụ';
        if (!area) nextErrors.area = 'Vui lòng chọn khu vực tổ chức';
        const detailAddressValidationError = validateDetailAddress(detailAddress);
        if (detailAddressValidationError) nextErrors.detailAddress = detailAddressValidationError;
        if (!registrationDeadline) nextErrors.registrationDeadline = 'Vui lòng chọn hạn đăng ký';
        if (!checkInLocation) nextErrors.checkInLocation = 'Vui lòng chọn địa điểm điểm danh';

        eventDays.forEach((day) => {
            const dayErr: Partial<Record<DayErrorField, string>> = {};

            if (!day.date) {
                dayErr.date = 'Vui lòng chọn ngày tổ chức';
            }

            if (!day.startTime) {
                dayErr.startTime = 'Vui lòng chọn giờ bắt đầu';
            }

            if (!day.endTime) {
                dayErr.endTime = 'Vui lòng chọn giờ kết thúc';
            }

            if (day.startTime && day.endTime) {
                const durationError = getDurationValidationError(day.startTime, day.endTime);
                if (durationError) {
                    dayErr.endTime = durationError;
                }
            }

            if (!day.volunteerCount.trim()) {
                dayErr.volunteerCount = 'Vui lòng nhập số lượng TNV cần tuyển';
            } else if (!isPositiveNaturalNumber(day.volunteerCount)) {
                dayErr.volunteerCount = 'Số lượng cần là số tự nhiên lớn hơn 0';
            }

            if (!day.servedCount.trim()) {
                dayErr.servedCount = 'Vui lòng nhập số lượng đối tượng phục vụ';
            } else if (!/^\d+$/.test(day.servedCount)) {
                dayErr.servedCount = 'Số lượng không hợp lệ';
            }

            if (Object.keys(dayErr).length > 0) {
                nextDayErrors[day.id] = dayErr;
            }
        });

        setFormErrors(nextErrors);
        setEventDayErrors(nextDayErrors);

        return Object.keys(nextErrors).length === 0 && Object.keys(nextDayErrors).length === 0;
    };

    // handle submit event 
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        if (isSubmitting) return;

        const requestBody = buildRequestBody();
        if (!requestBody) {
            Alert.alert('Thông báo', 'Không thể tạo yêu cầu. Vui lòng kiểm tra lại thông tin.');
            return;
        }

        setIsSubmitting(true);
        try {
            console.log(`[Create Event][Submit] Request body\n${JSON.stringify(requestBody, null, 2)}`);
            const response = await submitEvent(requestBody);
            console.log('Event submitted:', response);

            // upload image if has uploadUrls and user select new image
            if (response.uploadUrls && response.uploadUrls.length > 0 && eventImageDoc.uri && !existingImageUrl) {
                await uploadImageToSupabase(resolveSupabaseUrl(response.uploadUrls[0]) ?? response.uploadUrls[0], {
                    uri: eventImageDoc.uri,
                    mimeType: eventImageDoc.mimeType || 'image/jpeg',
                });
                console.log('Image uploaded successfully');
            }

            Alert.alert('Thông báo', 'Đã gửi sự kiện để phê duyệt', [
                { text: 'OK', onPress: () => router.replace('/(host-tabs)/events') },
            ]);
        } catch (error) {
            const rawErrorText = getApiErrorRawText(error);
            if (rawErrorText) {
                console.log(`[Event API Error][Submit]\n${rawErrorText}`);
            }
            console.log('Failed to submit event:', error);
            const errorMessage = getApiErrorMessage(error);
            Alert.alert('Thông báo', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>
                            {isEditMode ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            {isEditMode ? 'Cập nhật thông tin bên dưới' : 'Điền thông tin bên dưới'}
                        </Text>
                    </View>
                </View>

                {/* Loading overlay when loading edit data */}
                {isLoadingEditData && (
                    <View style={styles.editLoadingOverlay}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.editLoadingText}>Đang tải dữ liệu...</Text>
                    </View>
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.scrollView}
                    keyboardVerticalOffset={0}
                >
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled">
                        {/* Basic Information */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

                            {/* Event Name */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>
                                    Tên sự kiện <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={[styles.inputRow, { borderColor: formErrors.eventName ? '#EF4444' : '#D1D5DB' }]}>
                                    <Ionicons name="pencil-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Ví dụ: Làm sạch môi trường + Hoàn Kiếm"
                                        placeholderTextColor="#9CA3AF"
                                        value={eventName}
                                        onBlur={() => {
                                            const normalizedValue = eventName.trim();
                                            if (!normalizedValue) {
                                                setFormFieldError('eventName', 'Vui lòng nhập tên sự kiện');
                                                return;
                                            }
                                            if (containsSpecialCharacters(normalizedValue)) {
                                                setFormFieldError('eventName', 'Tên sự kiện không được chứa ký tự đặc biệt');
                                                return;
                                            }
                                            setFormFieldError('eventName');
                                        }}
                                        onChangeText={(text) => {
                                            setEventName(text);
                                            const normalizedValue = text.trim();
                                            if (!normalizedValue) {
                                                setFormFieldError('eventName', formErrors.eventName);
                                                return;
                                            }
                                            setFormFieldError(
                                                'eventName',
                                                containsSpecialCharacters(normalizedValue)
                                                    ? 'Tên sự kiện không được chứa ký tự đặc biệt'
                                                    : undefined
                                            );
                                        }}
                                    />
                                </View>
                                <Text style={styles.fieldHint}>
                                    Định dạng: Nội dung + Địa điểm (không quá 30 ký tự)
                                </Text>
                                {formErrors.eventName && (
                                    <Text style={styles.errorText}>{formErrors.eventName}</Text>
                                )}
                            </View>

                            {/* Description */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>
                                    Miêu tả sự kiện <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={[styles.descriptionInputRow, { borderColor: formErrors.description ? '#EF4444' : '#D1D5DB' }]}>
                                    <TextInput
                                        style={styles.descriptionInput}
                                        placeholder="Nhập miêu tả chi tiết cho sự kiện"
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        scrollEnabled={false}
                                        blurOnSubmit={false}
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        value={description}
                                        onBlur={() => {
                                            const normalizedValue = description.trim();
                                            if (!normalizedValue) {
                                                setFormFieldError('description', 'Vui lòng nhập mô tả sự kiện');
                                                return;
                                            }
                                            if (containsSpecialCharacters(normalizedValue)) {
                                                setFormFieldError('description', 'Mô tả sự kiện không được chứa ký tự đặc biệt');
                                                return;
                                            }
                                            setFormFieldError('description');
                                        }}
                                        onChangeText={(text) => {
                                            setDescription(text);
                                            const normalizedValue = text.trim();
                                            if (!normalizedValue) {
                                                setFormFieldError('description', formErrors.description);
                                                return;
                                            }
                                            setFormFieldError(
                                                'description',
                                                containsSpecialCharacters(normalizedValue)
                                                    ? 'Mô tả sự kiện không được chứa ký tự đặc biệt'
                                                    : undefined
                                            );
                                        }}
                                    />
                                </View>
                                {formErrors.description && (
                                    <Text style={styles.errorText}>{formErrors.description}</Text>
                                )}
                            </View>

                            {/* Approval Mode */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>Chế độ phê duyệt</Text>
                                <View style={styles.toggleRow}>
                                    <TouchableOpacity
                                        onPress={() => setApprovalMode(0)}
                                        style={[styles.toggleBtn, approvalMode === 0 ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                                    >
                                        <Text style={[styles.toggleBtnText, { color: approvalMode === 0 ? '#FFFFFF' : '#374151' }]}>
                                            Phê duyệt tự động
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setApprovalMode(1)}
                                        style={[styles.toggleBtn, approvalMode === 1 ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                                    >
                                        <Text style={[styles.toggleBtnText, { color: approvalMode === 1 ? '#FFFFFF' : '#374151' }]}>
                                            Phê duyệt thủ công
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Is Serving Event Flag */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>Sự kiện có tính chất phục vụ</Text>
                                <View style={styles.flagRow}>
                                    <TouchableOpacity
                                        onPress={() => setIsServingEvent(false)}
                                        style={[styles.toggleBtn, !isServingEvent ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                                    >
                                        <Text style={[styles.toggleBtnText, { color: !isServingEvent ? '#FFFFFF' : '#374151' }]}>
                                            Không phục vụ
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setIsServingEvent(true)}
                                        style={[styles.toggleBtn, isServingEvent ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                                    >
                                        <Text style={[styles.toggleBtnText, { color: isServingEvent ? '#FFFFFF' : '#374151' }]}>
                                            Có phục vụ
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.fieldHint}>
                                    Chọn "Có phục vụ" nếu sự kiện cung cấp dịch vụ trực tiếp cho đối tượng thụ hưởng
                                </Text>
                            </View>

                            {/* Serving Target */}
                            <PickerField
                                label="Đối tượng phục vụ"
                                required
                                icon="people-outline"
                                value={servedTarget}
                                placeholder="Vui lòng chọn đối tượng phục vụ"
                                onPress={() => setShowTargetPicker(true)}
                                error={formErrors.servedTarget}
                            />

                            {/* Serving Field */}
                            <PickerField
                                label="Lĩnh vực phục vụ"
                                required
                                icon="grid-outline"
                                value={servedField}
                                placeholder="Vui lòng chọn lĩnh vực phục vụ"
                                onPress={() => setShowFieldPicker(true)}
                                error={formErrors.servedField}
                            />

                            {/* Serving Specific Field */}
                            <View>
                                <PickerField
                                    label="Lĩnh vực cụ thể"
                                    required
                                    icon="list-outline"
                                    value={servedSpecificField}
                                    placeholder="Vui lòng chọn lĩnh vực cụ thể"
                                    onPress={() => { if (!servedField) return; setShowSpecificFieldPicker(true); }}
                                    error={formErrors.servedSpecificField}
                                    disabled={!servedField}
                                />
                                {!servedField && (
                                    <Text style={[styles.fieldHint, { marginTop: -12, marginBottom: 12 }]}>
                                        Vui lòng chọn lĩnh vực phục vụ trước
                                    </Text>
                                )}
                            </View>

                            {/* Serving Place Type */}
                            <PickerField
                                label="Loại địa điểm phục vụ"
                                required
                                icon="location-outline"
                                value={servedPlace}
                                placeholder="Vui lòng chọn loại địa điểm phục vụ"
                                onPress={() => setShowPlacePicker(true)}
                                error={formErrors.servedPlace}
                            />

                            {/* Area */}
                            <PickerField
                                label="Khu vực tổ chức"
                                required
                                icon="map-outline"
                                value={area}
                                placeholder="Vui lòng chọn khu vực tổ chức"
                                onPress={() => setShowAreaPicker(true)}
                                error={formErrors.area}
                            />

                            {/* Detail Address */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>
                                    Địa chỉ chi tiết <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={[styles.inputRow, { borderColor: formErrors.detailAddress ? '#EF4444' : '#D1D5DB' }]}>
                                    <Ionicons name="home-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Ví dụ: Số 12, Ngõ 150/82/15"
                                        placeholderTextColor="#9CA3AF"
                                        value={detailAddress}
                                        onBlur={() => setFormFieldError('detailAddress', validateDetailAddress(detailAddress))}
                                        onChangeText={(text) => {
                                            setDetailAddress(text);
                                            if (formErrors.detailAddress) {
                                                setFormFieldError('detailAddress', validateDetailAddress(text));
                                            }
                                        }}
                                    />
                                </View>
                                {formErrors.detailAddress && (
                                    <Text style={styles.errorText}>{formErrors.detailAddress}</Text>
                                )}
                            </View>

                            {/* Registration Deadline */}
                            <View style={{ marginBottom: 0 }}>
                                <DatePickerInput
                                    label="Hạn đăng ký"
                                    required
                                    value={registrationDeadline}
                                    error={formErrors.registrationDeadline}
                                    onDismiss={() => validateRequiredFormField('registrationDeadline', registrationDeadline, 'Vui lòng chọn hạn đăng ký')}
                                    onChange={(date) => {
                                        setRegistrationDeadline(date);
                                        setFormFieldError('registrationDeadline');
                                    }}
                                    placeholder="Vui lòng chọn ngày kết thúc tuyển chọn"
                                    minimumDate={todayStart}
                                />
                                <Text style={styles.fieldHintNeg}>
                                    Hạn đăng ký phải sau ngày tạo sự kiện và trước ngày bắt đầu ít nhất 3 ngày
                                </Text>
                                {formErrors.registrationDeadline && (
                                    <Text style={styles.errorText}>{formErrors.registrationDeadline}</Text>
                                )}
                            </View>
                        </View>

                        {/* Event Images */}
                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Ảnh sự kiện</Text>
                            <DocumentUploadBox
                                label="Ảnh đại diện sự kiện"
                                subtitle="PNG, JPG (tối đa 5MB)"
                                document={eventImageDoc}
                                onPress={handlePickEventImage}
                                onRemove={handleRemoveEventImage}
                            />
                        </View>

                        {/* Event Schedule */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Lịch tổ chức sự kiện</Text>

                            {eventDays.map((day, index) => (
                                <EventDayCard
                                    key={day.id}
                                    day={day}
                                    index={index}
                                    totalDays={eventDays.length}
                                    errors={eventDayErrors[day.id]}
                                    todayStart={todayStart}
                                    onRemove={removeEventDay}
                                    onUpdateDay={updateEventDay}
                                    onSetDayFieldError={setDayFieldError}
                                    onValidateQuantity={validateQuantityField}
                                    sanitizeVolunteerInput={sanitizeVolunteerCountInput}
                                    sanitizeServedInput={sanitizeServedCountInput}
                                />
                            ))}

                            {/* Add Day Button */}
                            <TouchableOpacity onPress={addEventDay} style={styles.addDayBtn}>
                                <Ionicons name="add" size={20} color="#42A4F5" />
                                <Text style={styles.addDayText}>Thêm ngày</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Check-in Location Settings */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Cài đặt địa điểm điểm danh</Text>

                            {/* Check-in Location */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>
                                    Địa điểm điểm danh <Text style={styles.required}>*</Text>
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowMapPicker(true)}
                                    activeOpacity={0.7}
                                    style={[styles.pickerRow, { borderColor: formErrors.checkInLocation ? '#EF4444' : '#D1D5DB' }]}
                                >
                                    <Ionicons name="location-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                    <View style={styles.locationTextWrapper}>
                                        {checkInLocation?.address ? (
                                            <Text style={styles.pickerTextDark} numberOfLines={2}>
                                                {checkInLocation.address}
                                            </Text>
                                        ) : (
                                            <Text style={styles.pickerTextPlaceholder}>
                                                Chọn địa điểm trên bản đồ
                                            </Text>
                                        )}
                                    </View>
                                    <Ionicons name="map-outline" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                                <Text style={styles.fieldHint}>
                                    Vui lòng chọn địa điểm thuộc khu vực thành phố Hà Nội
                                </Text>
                                {formErrors.checkInLocation && (
                                    <Text style={styles.errorText}>{formErrors.checkInLocation}</Text>
                                )}
                            </View>

                            {/* Check-in Radius */}
                            <View style={{ marginBottom: 0 }}>
                                <Text style={styles.fieldLabel}>
                                    Bán kính cho phép <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="radio-button-on-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="300"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={checkInRadius}
                                        onChangeText={setCheckInRadius}
                                    />
                                    <Text style={styles.unitText}>Mét</Text>
                                </View>
                                <Text style={styles.fieldHint}>
                                    Giá trị mặc định: 300m (có thể yêu cầu lên đến 3000m cho sự kiện lớn)
                                </Text>

                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                onPress={handleSaveDraft}
                                style={[styles.draftBtn, isSubmitting && styles.disabledBtn]}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.draftBtnText}>
                                    {isSubmitting ? 'Đang xử lý...' : 'Lưu bản thảo'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.submitBtnText}>
                                    {isSubmitting ? 'Đang xử lý...' : 'Gửi phê duyệt'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Bottom Sheet Pickers */}
            <BottomSheetPicker
                visible={showTargetPicker}
                onClose={() => {
                    setShowTargetPicker(false);
                    validateRequiredFormField('servedTarget', servedTarget, 'Vui lòng chọn đối tượng phục vụ');
                }}
                title="Chọn đối tượng phục vụ"
                options={servedTargetsData.doi_tuong_phuc_vu}
                selectedId={servedTarget?.id}
                onSelect={(item) => {
                    setServedTarget(item);
                    setFormFieldError('servedTarget');
                    setShowTargetPicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showFieldPicker}
                onClose={() => {
                    setShowFieldPicker(false);
                    validateRequiredFormField('servedField', servedField, 'Vui lòng chọn lĩnh vực phục vụ');
                }}
                title="Chọn lĩnh vực phục vụ"
                options={servedFieldOptions}
                selectedId={servedField?.id}
                onSelect={(item) => {
                    setServedField(item);
                    setServedSpecificField(undefined);
                    setFormErrors((prev) => ({
                        ...prev,
                        servedField: undefined,
                        servedSpecificField: undefined,
                    }));
                    setShowFieldPicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showSpecificFieldPicker}
                onClose={() => {
                    setShowSpecificFieldPicker(false);
                    validateRequiredFormField('servedSpecificField', servedSpecificField, 'Vui lòng chọn lĩnh vực cụ thể');
                }}
                title="Chọn lĩnh vực cụ thể"
                options={servedSpecificFieldOptions}
                selectedId={servedSpecificField?.id}
                onSelect={(item) => {
                    setServedSpecificField(item);
                    setFormFieldError('servedSpecificField');
                    setShowSpecificFieldPicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showPlacePicker}
                onClose={() => {
                    setShowPlacePicker(false);
                    validateRequiredFormField('servedPlace', servedPlace, 'Vui lòng chọn loại địa điểm phục vụ');
                }}
                title="Chọn loại địa điểm phục vụ"
                options={servedPlacesData.dia_diem_phuc_vu}
                selectedId={servedPlace?.id}
                onSelect={(item) => {
                    setServedPlace(item);
                    setFormFieldError('servedPlace');
                    setShowPlacePicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showAreaPicker}
                onClose={() => {
                    setShowAreaPicker(false);
                    validateRequiredFormField('area', area, 'Vui lòng chọn khu vực tổ chức');
                }}
                title="Chọn khu vực tổ chức"
                options={wardOptions}
                selectedId={area?.id}
                onSelect={(item) => {
                    setArea(item);
                    setFormFieldError('area');
                    setShowAreaPicker(false);
                }}
            />

            {/* Map Location Picker */}
            <MapLocationPicker
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onSelectLocation={(location) => {
                    setCheckInLocation(location);
                    setFormFieldError('checkInLocation');
                    setShowMapPicker(false);
                }}
                initialLocation={checkInLocation}
                radius={parseInt(checkInRadius) || 300}
            />
        </>
    );
};

const styles = StyleSheet.create({
    // Layout
    safeArea: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },

    // Header
    header: {
        backgroundColor: '#42A4F5',
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingTop: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        marginRight: 12,
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
    },

    // Cards
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },

    // Form fields
    fieldWrapper: {
        marginBottom: 16,
    },
    fieldLabel: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    required: {
        color: '#EF4444',
    },
    fieldHint: {
        color: '#9CA3AF',
        fontSize: 11,
        marginTop: 4,
    },
    fieldHintNeg: {
        color: '#9CA3AF',
        fontSize: 11,
        marginTop: -10,
        marginBottom: 4,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: 2,
    },


    // Text input row (with icon)
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 3,
    },
    descriptionInputRow: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inputIcon: {
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        color: '#1F2937',
        fontSize: 14,
        paddingVertical: 10,
    },
    descriptionInput: {
        color: '#1F2937',
        fontSize: 14,
        minHeight: 88,
    },
    unitText: {
        color: '#6B7280',
        fontSize: 13,
        marginRight: 4,
    },

    // Picker row (map location — kept inline due to unique layout)
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 13,
    },
    pickerTextDark: {
        color: '#1F2937',
        fontSize: 14,
    },
    pickerTextPlaceholder: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    locationTextWrapper: {
        flex: 1,
        marginRight: 8,
    },

    // Toggle buttons (approval mode & serving flag)
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    flagRow: {
        flexDirection: 'row',
        gap: 10,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
    },
    toggleBtnActive: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    toggleBtnInactive: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D1D5DB',
    },
    toggleBtnText: {
        fontWeight: '600',
        fontSize: 13,
    },

    // Add-day dashed button
    addDayBtn: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#42A4F5',
        borderRadius: 10,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addDayText: {
        color: '#42A4F5',
        fontWeight: '600',
        marginLeft: 4,
    },

    // Action buttons
    btnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    draftBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    draftBtnText: {
        color: '#374151',
        fontWeight: '700',
        fontSize: 15,
    },
    submitBtn: {
        flex: 1,
        backgroundColor: '#42A4F5',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    disabledBtn: {
        opacity: 0.6,
    },
    // Loading overlay for edit mode
    editLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        zIndex: 100,
    },
    editLoadingText: {
        fontSize: 15,
        color: '#42A4F5',
        fontWeight: '600',
    },
});

export default CreateEvent;
