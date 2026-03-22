import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack } from 'expo-router';
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
    UpdateImage,
    getApiErrorMessage,
    getApiErrorRawText,
} from '@/services/event-service';
import { getFileExtension, getMimeType, uploadImageToSupabase } from '@/services/upload-service';

// Hide default navigation header
export const unstable_settings = {
    headerShown: false,
};

// Import JSON data
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
    registrationDeadline?: string;
    eventImage?: string;
    checkInLocation?: string;
    checkInRadius?: string;
}

const CreateEvent = () => {
    const router = useRouter();
    const [approvalMode, setApprovalMode] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Basic info states
    const [eventName, setEventName] = useState('');
    const [description, setDescription] = useState('');
    const [servedTarget, setServedTarget] = useState<OptionItem>();
    const [servedField, setServedField] = useState<OptionItem>();
    const [servedSpecificField, setServedSpecificField] = useState<OptionItem>();
    const [servedPlace, setServedPlace] = useState<OptionItem>();
    const [area, setArea] = useState<OptionItem>();
    const [registrationDeadline, setRegistrationDeadline] = useState<Date>();
    const [eventImageDoc, setEventImageDoc] = useState<DocumentUpload>({
        uri: null,
        fileName: null,
        mimeType: null,
    });

    // Multi-day event states
    const [eventDays, setEventDays] = useState<EventDay[]>([
        { id: '1', volunteerCount: '', servedCount: '' }
    ]);

    // Location state
    const [checkInLocation, setCheckInLocation] = useState<LocationData>();
    const [checkInRadius, setCheckInRadius] = useState('300');

    // Modal visibility states
    const [showTargetPicker, setShowTargetPicker] = useState(false);
    const [showFieldPicker, setShowFieldPicker] = useState(false);
    const [showSpecificFieldPicker, setShowSpecificFieldPicker] = useState(false);
    const [showPlacePicker, setShowPlacePicker] = useState(false);
    const [showAreaPicker, setShowAreaPicker] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [activityDomains, setActivityDomains] = useState<ActivityDomain[]>([]);
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

    // helper function to check if a string is a positive natural number (integer > 0)
    const isPositiveNaturalNumber = (value: string) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0;
    };

    const containsSpecialCharacters = (value: string) => /[^\p{L}\p{N}\s]/u.test(value);

    // helper function to check duration of event session does not exceed limits
    const getDurationValidationError = (startTime: Date, endTime: Date) => {
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
            return `Thời lượng vượt quá giới hạn của lĩnh vực đã chọn (${specialLimitHours} giờ)`;
        }

        return undefined;
    };

    // helper function to set error message for a specific field of a specific event day
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

    // helper function to set error message for a specific field in the main form
    const setFormFieldError = (field: keyof EventFormErrors, message?: string) => {
        setFormErrors((prev) => ({
            ...prev,
            [field]: message,
        }));
    };

    const validateRequiredFormField = (field: keyof EventFormErrors, value: unknown, message: string) => {
        const hasValue = value instanceof Date ? true : Boolean(value);
        setFormFieldError(field, hasValue ? undefined : message);
    };

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

    useEffect(() => {
        const fetchAllActivityDomains = async () => {
            try {
                const allDomains = await getAllActivityDomains();
                setActivityDomains(allDomains);
            } catch (error) {
                console.error('Failed to fetch activity domains:', error);
                setActivityDomains([]);
            }
        };

        fetchAllActivityDomains();
    }, []);

    /**
     * Format date to YYYY-MM-DD
     */
    const formatDateToYMD = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    /**
     * Combine date and time into ISO 8601 format with timezone
     * e.g., "2026-04-01T05:30:00+07:00"
     */
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

    /**
     * Build the request body for draft/submit API
     */
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
            if (getMinutesOfDay(day.endTime) <= getMinutesOfDay(day.startTime)) return true;
            if (getDurationValidationError(day.startTime, day.endTime)) return true;
            return false;
        });

        if (hasInvalidSessions) {
            return null;
        }

        // Build updateImages array
        const updateImages: UpdateImage[] = [];
        if (eventImageDoc.uri) {
            const fileExtension = getFileExtension(eventImageDoc.uri, eventImageDoc.mimeType);
            // Keep the dot in extension (e.g., '.png', '.jpg') as backend expects it
            updateImages.push({
                imageId: null,
                updateAction: 'ADD',
                fileExtension: fileExtension, // Already has dot from getFileExtension
            });
        }

        // Build eventSessions array from eventDays
        const eventSessions: EventSession[] = eventDays
            .map(day => ({
                eventSessionId: null,
                updateAction: 'ADD' as const,
                startDateTime: combineDateTimeToISO(day.date!, day.startTime!),
                endDateTime: combineDateTimeToISO(day.date!, day.endTime!),
                expectedVolAmount: parseInt(day.volunteerCount, 10),
                expectedSerAmount: parseInt(day.servedCount, 10),
            }));

        const requestBody: EventCreateRequest = {
            name: eventName.trim(),
            updateImages,
            description: description.trim(),
            address: area.label,
            autoApprove: approvalMode === 0,
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

    const validateRequestBodyRequiredFields = () => {
        const missingFields: string[] = [];

        if(!eventName.trim()) {
            setFormFieldError('eventName', 'Vui lòng nhập tên sự kiện');
            missingFields.push('Tên sự kiện');
        } else if (containsSpecialCharacters(eventName.trim())) {
            setFormFieldError('eventName', 'Tên sự kiện không được chứa ký tự đặc biệt');
            missingFields.push('Tên sự kiện không hợp lệ');
        } else {
            setFormFieldError('eventName');
        }

        if(!description.trim()) {
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
                if (getMinutesOfDay(day.endTime) <= getMinutesOfDay(day.startTime)) {
                    setDayFieldError(day.id, 'endTime', 'Giờ kết thúc phải sau giờ bắt đầu');
                    missingFields.push(`Thời gian không hợp lệ (Ngày ${index + 1})`);
                } else {
                    const durationError = getDurationValidationError(day.startTime, day.endTime);
                    if (durationError) {
                        setDayFieldError(day.id, 'endTime', durationError);
                        missingFields.push(`Thời lượng sự kiện không hợp lệ (Ngày ${index + 1})`);
                    }
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

    const addEventDay = () => {
        const newDay: EventDay = {
            id: Date.now().toString(),
            volunteerCount: '',
            servedCount: '',
        };
        setEventDays([...eventDays, newDay]);
    };

    const updateEventDay = (id: string, field: keyof EventDay, value: any) => {
        if (field === 'date' && value instanceof Date) {
            setDayFieldError(id, 'date');
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
                if (getMinutesOfDay(endTime) <= getMinutesOfDay(startTime)) {
                    setDayFieldError(id, 'endTime', 'Giờ kết thúc phải sau giờ bắt đầu');
                } else {
                    const durationError = getDurationValidationError(startTime, endTime);
                    setDayFieldError(id, 'endTime', durationError);
                }
            }
        }
    };

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
            const response = await saveDraftEvent(requestBody);
            console.log('Draft saved:', response);

            // Upload images if there are upload URLs returned
            if (response.imageUploadUrls && response.imageUploadUrls.length > 0 && eventImageDoc.uri) {
                const uploadUrl = response.imageUploadUrls[0].uploadUrl;
                await uploadImageToSupabase(uploadUrl, {
                    uri: eventImageDoc.uri,
                    mimeType: eventImageDoc.mimeType || 'image/jpeg',
                });
                console.log('Image uploaded successfully');
            }

            Alert.alert('Thông báo', 'Đã lưu bản thảo sự kiện thành công');
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

    const handleRemoveEventImage = () => {
        setEventImageDoc({ uri: null, fileName: null, mimeType: null });
    };

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

            if (day.startTime && day.endTime && getMinutesOfDay(day.endTime) <= getMinutesOfDay(day.startTime)) {
                dayErr.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
            }

            if (
                day.startTime &&
                day.endTime &&
                getMinutesOfDay(day.endTime) > getMinutesOfDay(day.startTime)
            ) {
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

        console.log('Submit for approval', {
            eventName,
            description,
            approvalMode,
            servedTarget,
            servedTargetValue: servedTarget?.value,
            servedField,
            servedSpecificField,
            servedPlace,
            servingPlaceType: servedPlace?.value,
            area,
            registrationDeadline,
            eventImage: eventImageDoc.uri,
            eventImageFileExtension: eventImageDoc.uri ? getFileExtension(eventImageDoc.uri, eventImageDoc.mimeType) : undefined,
            eventDays,
            checkInLocation,
            checkInRadius,
            requestBody,
        });

        setIsSubmitting(true);
        try {
            const response = await submitEvent(requestBody);
            console.log('Event submitted:', response);

            // Upload images if there are upload URLs returned
            if (response.imageUploadUrls && response.imageUploadUrls.length > 0 && eventImageDoc.uri) {
                const uploadUrl = response.imageUploadUrls[0].uploadUrl;
                await uploadImageToSupabase(uploadUrl, {
                    uri: eventImageDoc.uri,
                    mimeType: eventImageDoc.mimeType || 'image/jpeg',
                });
                console.log('Image uploaded successfully');
            }

            Alert.alert('Thông báo', 'Đã gửi sự kiện để phê duyệt');
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
                        <Text style={styles.headerTitle}>Thêm sự kiện mới</Text>
                        <Text style={styles.headerSubtitle}>Điền thông tin bên dưới</Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.scrollView}
                    keyboardVerticalOffset={0}
                >
                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

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
                                <Ionicons name="add" size={20} color="#42A5F5" />
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
                                {/* {formErrors.checkInRadius && (
                                    <Text style={styles.errorText}>{formErrors.checkInRadius}</Text>
                                )} */}
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
                onClose={() => {setShowMapPicker(false)}}
                onSelectLocation={(location) => {
                    setCheckInLocation(location);
                    setFormFieldError('checkInLocation'); // Clear error when location is selected
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
    errorTextNeg: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: -10,
        marginBottom: 8,
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

    // Toggle buttons (approval mode)
    toggleRow: {
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
});

export default CreateEvent;
