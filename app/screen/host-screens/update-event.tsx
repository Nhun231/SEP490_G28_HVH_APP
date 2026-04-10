import React, { useEffect, useMemo, useState } from 'react';
import {
    ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import DatePickerInput from '../../components/host/create-event/DatePickerInput';
import DocumentUploadBox, { DocumentUpload } from '../../components/register-vol/DocumentUploadBox';
import BottomSheetPicker, { OptionItem } from '../../components/host/create-event/BottomSheetPicker';
import MapLocationPicker, { LocationData } from '../../components/host/create-event/MapLocationPicker';
import PickerField from '../../components/host/create-event/PickerField';
import EventDayCard, { EventDay, DayErrorField } from '../../components/host/create-event/EventDayCard';
import {
    EventUpdateRequest,
    SessionUpdateAction,
    getApiErrorMessage,
    getApiErrorRawText,
    resolveSupabaseUrl,
    getEventDetailByHost,
    updateEvent,
} from '@/services/event-service';
import { getFileExtension, getMimeType, uploadImageToSupabase } from '@/services/upload-service';
import servedPlacesData from '../../../assets/served_places/dia_diem_phuc_vu.json';
import wardsData from '../../../assets/wards/phuong_xa_moi_ha_noi.json';

interface EventFormErrors {
    description?: string;
    servedPlace?: string;
    area?: string;
    detailAddress?: string;
    registrationDeadline?: string;
    checkInLocation?: string;
}

function buildPrefillImageDoc(prefill: { imageUrls?: string[] } | null): DocumentUpload {
    if (prefill?.imageUrls && prefill.imageUrls.length > 0) {
        const resolved = resolveSupabaseUrl(prefill.imageUrls[0]) || prefill.imageUrls[0];
        return { uri: resolved, fileName: 'existing-image', mimeType: 'image/jpeg' };
    }
    return { uri: null, fileName: null, mimeType: null };
}

const UpdateEvent = () => {
    const router = useRouter();
    const { eventId, eventData: eventDataParam } = useLocalSearchParams<{ eventId?: string; eventData?: string }>();
    const editEventId: string = typeof eventId === 'string' ? eventId : '';

    // Parse prefilled event data passed from event-detail
    const prefillEvent = (() => {
        if (typeof eventDataParam !== 'string') return null;
        try {
            return JSON.parse(eventDataParam) as (typeof getEventDetailByHost extends (...args: any) => Promise<infer R> ? R : never) & { resolvedCheckinAddress?: string | null };
        } catch {
            return null;
        }
    })();

    // Pre-computed init values 
    const initArea = prefillEvent ? (() => {
        const w = wardsData.danh_sach_phuong_xa_moi.find(x => x.ten_moi === prefillEvent.address);
        return w ? { id: w.stt, label: w.ten_moi } as OptionItem : undefined;
    })() : undefined;

    const initServedPlace = prefillEvent ? (() => {
        const p = servedPlacesData.dia_diem_phuc_vu.find(x => x.value === prefillEvent.servingPlaceType);
        return p ? { id: p.id, label: p.label, value: p.value } as OptionItem : undefined;
    })() : undefined;

    const initEventDays: EventDay[] = prefillEvent?.eventSessions?.length
        ? prefillEvent.eventSessions.map((s: any, idx: number) => ({
            id: s.id || String(idx + 1),
            date: new Date(s.startDateTime),
            startTime: new Date(s.startDateTime),
            endTime: new Date(s.endDateTime),
            volunteerCount: String(s.expectedVolAmount),
            servedCount: String(s.expectedSerAmount),
        }))
        : [{ id: '1', volunteerCount: '', servedCount: '' }];

    const initExistingUrl = prefillEvent?.imageUrls?.length
        ? (resolveSupabaseUrl(prefillEvent.imageUrls[0]) || prefillEvent.imageUrls[0])
        : null;

    // State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingEditData, setIsLoadingEditData] = useState(false);
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>(initExistingUrl);
    const [servedPlace, setServedPlace] = useState<OptionItem>(initServedPlace as OptionItem);
    const [approvalMode, setApprovalMode] = useState(prefillEvent ? (prefillEvent.autoApprove ? 0 : 1) : 0);
    const [description, setDescription] = useState(prefillEvent?.description ?? '');
    const [area, setArea] = useState<OptionItem>(initArea as OptionItem);
    const [registrationDeadline, setRegistrationDeadline] = useState<Date>(
        (prefillEvent?.recruitmentEndDate ? new Date(prefillEvent.recruitmentEndDate) : undefined) as Date
    );
    const [eventImageDoc, setEventImageDoc] = useState<DocumentUpload>(buildPrefillImageDoc(prefillEvent));
    const [eventDays, setEventDays] = useState<EventDay[]>(initEventDays);
    const [checkInLocation, setCheckInLocation] = useState<LocationData>(
        (prefillEvent
            ? { latitude: prefillEvent.latCheckInLocation, longitude: prefillEvent.lngCheckInLocation, address: prefillEvent.resolvedCheckinAddress || '' }
            : undefined) as LocationData
    );
    const [checkInRadius, setCheckInRadius] = useState(prefillEvent ? String(prefillEvent.checkInAccuracyMeters) : '300');
    const [detailAddress, setDetailAddress] = useState(prefillEvent?.detailAddress ?? '');

    // Modal visibility
    const [showPlacePicker, setShowPlacePicker] = useState(false);
    const [showAreaPicker, setShowAreaPicker] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    // Errors
    const [formErrors, setFormErrors] = useState<EventFormErrors>({});
    const [eventDayErrors, setEventDayErrors] = useState<Record<string, Partial<Record<DayErrorField, string>>>>({});

    const todayStart = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const wardOptions: OptionItem[] = wardsData.danh_sach_phuong_xa_moi.map(ward => ({
        id: ward.stt,
        label: ward.ten_moi,
    }));

    // Load edit data if not passed from event-detail
    useEffect(() => {
        if (!editEventId || prefillEvent) return;
        let cancelled = false;

        const loadEditData = async () => {
            setIsLoadingEditData(true);
            try {
                const event = await getEventDetailByHost(editEventId);
                if (cancelled) return;

                setDescription(event.description);
                setDetailAddress(event.detailAddress);
                setCheckInRadius(String(event.checkInAccuracyMeters));
                setApprovalMode(event.autoApprove ? 0 : 1);

                if (event.imageUrls && event.imageUrls.length > 0) {
                    const resolved = resolveSupabaseUrl(event.imageUrls[0]) || event.imageUrls[0];
                    setExistingImageUrl(resolved);
                    setEventImageDoc({ uri: resolved, fileName: 'existing-image', mimeType: 'image/jpeg' });
                }

                const wardItem = wardsData.danh_sach_phuong_xa_moi.find(w => w.ten_moi === event.address);
                if (wardItem) setArea({ id: wardItem.stt, label: wardItem.ten_moi });

                if (event.recruitmentEndDate) setRegistrationDeadline(new Date(event.recruitmentEndDate));

                const placeItem = servedPlacesData.dia_diem_phuc_vu.find(p => p.value === event.servingPlaceType);
                if (placeItem) setServedPlace({ id: placeItem.id, label: placeItem.label, value: placeItem.value });

                const lat = event.latCheckInLocation;
                const lng = event.lngCheckInLocation;
                setCheckInLocation({ latitude: lat, longitude: lng, address: '' });

                // Reverse geocode in background
                try {
                    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`;
                    const geocodeRes = await fetch(geocodeUrl, { headers: { 'User-Agent': 'HVH-App/1.0' } });
                    if (geocodeRes.ok) {
                        const gd = await geocodeRes.json();
                        const addr = gd.address as Record<string, string> | undefined;
                        let resolvedAddress = '';
                        if (addr) {
                            const parts = [
                                addr.road || addr.pedestrian || addr.footway || addr.path,
                                addr.suburb || addr.quarter || addr.neighbourhood,
                                addr.city_district || addr.district || addr.county,
                                addr.city || addr.town || addr.state,
                            ].filter(Boolean) as string[];
                            resolvedAddress = parts.length > 0 ? parts.join(', ') : (gd.display_name as string || '');
                        } else {
                            resolvedAddress = gd.display_name as string || '';
                        }
                        if (!cancelled) setCheckInLocation({ latitude: lat, longitude: lng, address: resolvedAddress });
                    }
                } catch { }

                if (event.eventSessions && event.eventSessions.length > 0) {
                    setEventDays(event.eventSessions.map((s, idx) => ({
                        id: s.id || String(idx + 1),
                        date: new Date(s.startDateTime),
                        startTime: new Date(s.startDateTime),
                        endTime: new Date(s.endDateTime),
                        volunteerCount: String(s.expectedVolAmount),
                        servedCount: String(s.expectedSerAmount),
                    })));
                }
            } catch (e) {
                console.log('[UpdateEvent] Failed to load event data:', e);
            } finally {
                if (!cancelled) setIsLoadingEditData(false);
            }
        };

        loadEditData();
        return () => { cancelled = true; };
    }, [editEventId]);

    // Utility helpers
    const formatDateToYMD = (date: Date): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const combineDateTimeToISO = (date: Date, time: Date): string => {
        const y = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(time.getHours()).padStart(2, '0');
        const mi = String(time.getMinutes()).padStart(2, '0');
        return `${y}-${mo}-${d}T${h}:${mi}:00+07:00`;
    };

    const containsSpecialCharacters = (v: string) => /[^\p{L}\p{N}\s.,]/u.test(v);

    const validateDetailAddress = (v: string): string | undefined => {
        const t = v.trim();
        if (!t) return 'Vui lòng nhập địa chỉ chi tiết';
        if (/[^\p{L}\p{N}\s,/]/u.test(t)) return 'Địa chỉ không được chứa ký tự đặc biệt';
        return undefined;
    };

    const isPositiveNaturalNumber = (v: string) => {
        const n = Number(v);
        return Number.isInteger(n) && n > 0;
    };

    const sanitizeVolunteerCountInput = (v: string) => {
        const d = v.replace(/[^0-9]/g, '');
        return !d || d.startsWith('0') ? '' : d;
    };

    const sanitizeServedCountInput = (v: string) => {
        const d = v.replace(/[^0-9]/g, '');
        if (!d) return '';
        return d[0] === '0' ? '0' : d;
    };

    // Error helpers
    const setFormFieldError = (field: keyof EventFormErrors, message?: string) => {
        setFormErrors(prev => ({ ...prev, [field]: message }));
    };

    const setDayFieldError = (dayId: string, field: DayErrorField, message?: string) => {
        setEventDayErrors(prev => {
            const current = prev[dayId] || {};
            const updated = { ...current };
            if (message) { updated[field] = message; } else { delete updated[field]; }
            if (Object.keys(updated).length === 0) { const next = { ...prev }; delete next[dayId]; return next; }
            return { ...prev, [dayId]: updated };
        });
    };

    const validateRequiredFormField = (field: keyof EventFormErrors, value: unknown, message: string) => {
        setFormFieldError(field, (value instanceof Date ? true : Boolean(value)) ? undefined : message);
    };

    const validateQuantityField = (dayId: string, field: 'volunteerCount' | 'servedCount', value: string, emptyMessage: string) => {
        if (!value.trim()) { setDayFieldError(dayId, field, emptyMessage); return; }
        if (field === 'volunteerCount') {
            if (!isPositiveNaturalNumber(value)) { setDayFieldError(dayId, field, 'Số lượng cần là số tự nhiên lớn hơn 0'); return; }
            setDayFieldError(dayId, field); return;
        }
        if (!/^\d+$/.test(value)) { setDayFieldError(dayId, field, 'Số lượng không hợp lệ'); return; }
        setDayFieldError(dayId, field);
    };

    // Event day CRUD
    const addEventDay = () => setEventDays(prev => [...prev, { id: Date.now().toString(), volunteerCount: '', servedCount: '' }]);

    const removeEventDay = (id: string) => {
        if (eventDays.length > 1) {
            setEventDays(prev => prev.filter(d => d.id !== id));
            setEventDayErrors(prev => { const next = { ...prev }; delete next[id]; return next; });
        }
    };

    const updateEventDay = (id: string, field: keyof EventDay, value: any) => {
        if (field === 'date' && value instanceof Date) setDayFieldError(id, field);
        if ((field === 'startTime' || field === 'endTime') && value instanceof Date) setDayFieldError(id, field);
        if ((field === 'volunteerCount' || field === 'servedCount') && typeof value === 'string') {
            validateQuantityField(id, field, value,
                field === 'volunteerCount' ? 'Vui lòng nhập số lượng TNV cần tuyển' : 'Vui lòng nhập số lượng đối tượng phục vụ');
        }
        setEventDays(prev => prev.map(day => day.id === id ? { ...day, [field]: value } : day));
    };

    // build PARTIAL request body, only include fields that differ from the original prefill values.
    const buildRequestBody = (): EventUpdateRequest | 'NO_CHANGE' | null => {
        // Guard: form must be in a valid state for fields that ARE visible
        if (!area?.label || !registrationDeadline || !checkInLocation || !servedPlace?.value) return null;
        const normalizedDesc = description.trim();
        if (!normalizedDesc || containsSpecialCharacters(normalizedDesc)) return null;
        if (validateDetailAddress(detailAddress)) return null;

        const body: EventUpdateRequest = {};
        let hasChange = false;

        // Description
        if (normalizedDesc !== (prefillEvent?.description ?? '').trim()) {
            body.description = normalizedDesc;
            hasChange = true;
        }

        // AutoApprove
        const currentAutoApprove = approvalMode === 0;
        if (currentAutoApprove !== (prefillEvent?.autoApprove ?? false)) {
            body.autoApprove = currentAutoApprove;
            hasChange = true;
        }

        // ServingPlaceType
        if (servedPlace.value !== (prefillEvent?.servingPlaceType ?? '')) {
            body.servingPlaceType = servedPlace.value!;
            hasChange = true;
        }

        // Address (area / ward)
        if (area.label !== (prefillEvent?.address ?? '')) {
            body.address = area.label;
            hasChange = true;
        }

        // DetailAddress
        if (detailAddress.trim() !== (prefillEvent?.detailAddress ?? '').trim()) {
            body.detailAddress = detailAddress.trim();
            hasChange = true;
        }

        // RecruitmentEndDate
        const currentDeadline = formatDateToYMD(registrationDeadline);
        const origDeadline = prefillEvent?.recruitmentEndDate
            ? formatDateToYMD(new Date(prefillEvent.recruitmentEndDate))
            : '';
        if (currentDeadline !== origDeadline) {
            body.recruitmentEndDate = currentDeadline;
            hasChange = true;
        }

        // Image
        // New image picked (existingImageUrl cleared, new local uri chosen)
        const hasNewImage = !existingImageUrl && !!eventImageDoc.uri;
        if (hasNewImage) {
            const fileExtension = getFileExtension(eventImageDoc.uri!, eventImageDoc.mimeType);
            body.updateImages = [{ imageId: null, updateAction: 'ADD', fileExtension }];
            hasChange = true;
        }

        // EventSessions
        const origSessions = (prefillEvent?.eventSessions ?? []) as Array<{
            id?: string; startDateTime: string; endDateTime: string;
            expectedVolAmount: number; expectedSerAmount: number;
        }>;
        const sessionsChanged = (() => {
            if (eventDays.length !== origSessions.length) return true;
            return eventDays.some((day, idx) => {
                const orig = origSessions[idx];
                if (!orig) return true;
                const origStart = new Date(orig.startDateTime);
                const origEnd = new Date(orig.endDateTime);
                const dayDate = day.date;
                const dayStart = day.startTime;
                const dayEnd = day.endTime;
                if (!dayDate || !dayStart || !dayEnd) return true;
                return (
                    dayDate.getFullYear() !== origStart.getFullYear() ||
                    dayDate.getMonth() !== origStart.getMonth() ||
                    dayDate.getDate() !== origStart.getDate() ||
                    dayStart.getHours() !== origStart.getHours() ||
                    dayStart.getMinutes() !== origStart.getMinutes() ||
                    dayEnd.getHours() !== origEnd.getHours() ||
                    dayEnd.getMinutes() !== origEnd.getMinutes() ||
                    parseInt(day.volunteerCount, 10) !== orig.expectedVolAmount ||
                    parseInt(day.servedCount, 10) !== orig.expectedSerAmount
                );
            });
        })();

        if (sessionsChanged) {
            // Validate sessions only when they've been touched
            const hasInvalidSessions = eventDays.some(d =>
                !d.date || !d.startTime || !d.endTime ||
                !isPositiveNaturalNumber(d.volunteerCount) ||
                !/^\d+$/.test(d.servedCount)
            );
            if (hasInvalidSessions) return null;

            // IDs from the API are always UUIDs — new sessions added in the form use Date.now()
            const origSessionIds = new Set(origSessions.map(s => s.id).filter(Boolean));
            body.eventSessions = eventDays.map(day => ({
                eventSessionId: origSessionIds.has(day.id) ? day.id : null,
                updateAction: (origSessionIds.has(day.id) ? 'EDIT' : 'ADD') as SessionUpdateAction,
                startDateTime: combineDateTimeToISO(day.date!, day.startTime!),
                endDateTime: combineDateTimeToISO(day.date!, day.endTime!),
                expectedVolAmount: parseInt(day.volunteerCount, 10),
                expectedSerAmount: parseInt(day.servedCount, 10),
            }));
            hasChange = true;
        }

        // CheckIn location
        const origLat = prefillEvent?.latCheckInLocation ?? 0;
        const origLng = prefillEvent?.lngCheckInLocation ?? 0;
        const origRadius = prefillEvent?.checkInAccuracyMeters ?? 300;
        const currentRadius = parseInt(checkInRadius, 10) || 300;
        // if new lat and long bigger than 0.000001 (11cm) = changed 
        const latChanged = Math.abs(checkInLocation.latitude - origLat) > 1e-6;
        const lngChanged = Math.abs(checkInLocation.longitude - origLng) > 1e-6;
        const radiusChanged = currentRadius !== origRadius;
        if (latChanged || lngChanged || radiusChanged) {
            body.checkInLocationLat = checkInLocation.latitude;
            body.checkInLocationLng = checkInLocation.longitude;
            body.checkInLocationAccuracyMeters = currentRadius;
            hasChange = true;
        }

        return hasChange ? body : 'NO_CHANGE';
    };

    // Form validation
    const validateForm = (): boolean => {
        const nextErrors: EventFormErrors = {};
        const nextDayErrors: Record<string, Partial<Record<DayErrorField, string>>> = {};

        if (!description.trim()) nextErrors.description = 'Vui lòng nhập mô tả sự kiện';
        else if (containsSpecialCharacters(description.trim())) nextErrors.description = 'Mô tả sự kiện không được chứa ký tự đặc biệt';

        if (!servedPlace?.value) nextErrors.servedPlace = 'Vui lòng chọn loại địa điểm phục vụ';

        if (!area) nextErrors.area = 'Vui lòng chọn khu vực tổ chức';

        const detailAddressErr = validateDetailAddress(detailAddress);
        if (detailAddressErr) nextErrors.detailAddress = detailAddressErr;

        if (!registrationDeadline) nextErrors.registrationDeadline = 'Vui lòng chọn hạn đăng ký';
        if (!checkInLocation) nextErrors.checkInLocation = 'Vui lòng chọn địa điểm điểm danh';

        eventDays.forEach(day => {
            const dayErr: Partial<Record<DayErrorField, string>> = {};
            if (!day.date) dayErr.date = 'Vui lòng chọn ngày tổ chức';
            if (!day.startTime) dayErr.startTime = 'Vui lòng chọn giờ bắt đầu';
            if (!day.endTime) dayErr.endTime = 'Vui lòng chọn giờ kết thúc';
            if (!day.volunteerCount.trim()) dayErr.volunteerCount = 'Vui lòng nhập số lượng TNV cần tuyển';
            else if (!isPositiveNaturalNumber(day.volunteerCount)) dayErr.volunteerCount = 'Số lượng cần là số tự nhiên lớn hơn 0';
            if (!day.servedCount.trim()) dayErr.servedCount = 'Vui lòng nhập số lượng đối tượng phục vụ';
            else if (!/^\d+$/.test(day.servedCount)) dayErr.servedCount = 'Số lượng không hợp lệ';
            if (Object.keys(dayErr).length > 0) nextDayErrors[day.id] = dayErr;
        });

        setFormErrors(nextErrors);
        setEventDayErrors(nextDayErrors);
        return Object.keys(nextErrors).length === 0 && Object.keys(nextDayErrors).length === 0;
    };

    // Image handling
    const handlePickEventImage = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) { Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
            if (result.canceled) return;
            if (result.assets?.[0]) {
                const asset = result.assets[0];
                const uri = asset.uri;
                const fileName = asset.fileName || uri.split('/').pop() || `event_${Date.now()}.jpg`;
                let extension = '.jpg', mimeType = 'image/jpeg';
                try {
                    const match = fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/);
                    if (match) { extension = match[0]; mimeType = getMimeType(extension); }
                    else if (asset.mimeType) { mimeType = asset.mimeType; extension = mimeType.includes('png') ? '.png' : '.jpg'; }
                } catch { }
                setExistingImageUrl(null);
                setEventImageDoc({ uri, fileName: fileName.toLowerCase().endsWith(extension) ? fileName : `${fileName}${extension}`, mimeType });
            }
        } catch (error) {
            Alert.alert('Thông báo', error instanceof Error ? error.message : 'Không thể chọn ảnh');
        }
    };

    const handleRemoveEventImage = () => {
        setExistingImageUrl(null);
        setEventImageDoc({ uri: null, fileName: null, mimeType: null });
    };

    // Submit
    const handleSubmit = async () => {
        if (!validateForm() || isSubmitting) return;

        const result = buildRequestBody();
        if (result === 'NO_CHANGE') {
            Alert.alert('Thông báo', 'Bạn chưa thay đổi thông tin nào. Vui lòng chỉnh sửa ít nhất một trường trước khi lưu.');
            return;
        }
        if (!result) {
            Alert.alert('Thông báo', 'Không thể tạo yêu cầu. Vui lòng kiểm tra lại thông tin.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await updateEvent(editEventId, result);

            // Upload new image only when a brand-new local file was selected
            const hasNewImage = !existingImageUrl && !!eventImageDoc.uri;
            if (hasNewImage && response.uploadUrls && response.uploadUrls.length > 0) {
                await uploadImageToSupabase(resolveSupabaseUrl(response.uploadUrls[0]) ?? response.uploadUrls[0], {
                    uri: eventImageDoc.uri!,
                    mimeType: eventImageDoc.mimeType || 'image/jpeg',
                });
            }

            Alert.alert('Thành công', 'Đã cập nhật thông tin sự kiện', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            const rawErrorText = getApiErrorRawText(error);
            if (rawErrorText) console.log(`[UpdateEvent API Error]\n${rawErrorText}`);
            Alert.alert('Thông báo', getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render
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
                        <Text style={styles.headerTitle}>Cập nhật sự kiện</Text>
                        <Text style={styles.headerSubtitle}>Chỉnh sửa thông tin bên dưới</Text>
                    </View>
                </View>

                {/* Loading overlay */}
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
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ════ SECTION 1 — Critical fields ════ */}
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionBadgeCritical}>
                                <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
                                <Text style={styles.sectionBadgeText}>Thông tin trọng yếu</Text>
                            </View>
                        </View>
                        <Text style={styles.sectionHint}>Thay đổi các mục này cần Tổ chức và Quản trị viên phê duyệt lại</Text>

                        {/* Location card */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Địa điểm tổ chức</Text>

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
                            <View style={[styles.fieldWrapper, { marginBottom: 0 }]}>
                                <Text style={styles.fieldLabel}>Địa chỉ chi tiết <Text style={styles.required}>*</Text></Text>
                                <View style={[styles.inputRow, { borderColor: formErrors.detailAddress ? '#EF4444' : '#D1D5DB' }]}>
                                    <Ionicons name="home-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Ví dụ: Số 12, Ngõ 150/82/15"
                                        placeholderTextColor="#9CA3AF"
                                        value={detailAddress}
                                        onBlur={() => setFormFieldError('detailAddress', validateDetailAddress(detailAddress))}
                                        onChangeText={text => {
                                            setDetailAddress(text);
                                            if (formErrors.detailAddress) setFormFieldError('detailAddress', validateDetailAddress(text));
                                        }}
                                    />
                                </View>
                                {formErrors.detailAddress && <Text style={styles.errorText}>{formErrors.detailAddress}</Text>}
                            </View>
                        </View>

                        {/* Deadline card */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Thời hạn tuyển dụng</Text>

                            <View style={{ marginBottom: 0 }}>
                                <DatePickerInput
                                    label="Hạn đăng ký"
                                    required
                                    value={registrationDeadline}
                                    error={formErrors.registrationDeadline}
                                    onDismiss={() => validateRequiredFormField('registrationDeadline', registrationDeadline, 'Vui lòng chọn hạn đăng ký')}
                                    onChange={date => { setRegistrationDeadline(date); setFormFieldError('registrationDeadline'); }}
                                    placeholder="Vui lòng chọn ngày kết thúc tuyển chọn"
                                    minimumDate={todayStart}
                                />
                                <Text style={styles.fieldHintNeg}>
                                    Hạn đăng ký phải sau ngày tạo và trước ngày bắt đầu ít nhất 3 ngày
                                </Text>
                                {formErrors.registrationDeadline && <Text style={styles.errorText}>{formErrors.registrationDeadline}</Text>}
                            </View>
                        </View>

                        {/* Schedule card */}
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

                            <TouchableOpacity onPress={addEventDay} style={styles.addDayBtn}>
                                <Ionicons name="add" size={20} color="#42A4F5" />
                                <Text style={styles.addDayText}>Thêm ngày</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Check-in card */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Điểm danh</Text>

                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>Địa điểm điểm danh <Text style={styles.required}>*</Text></Text>
                                <TouchableOpacity
                                    onPress={() => setShowMapPicker(true)}
                                    activeOpacity={0.7}
                                    style={[styles.pickerRow, { borderColor: formErrors.checkInLocation ? '#EF4444' : '#D1D5DB' }]}
                                >
                                    <Ionicons name="location-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                    <View style={styles.locationTextWrapper}>
                                        {checkInLocation?.address
                                            ? <Text style={styles.pickerTextDark} numberOfLines={2}>{checkInLocation.address}</Text>
                                            : <Text style={styles.pickerTextPlaceholder}>Chọn địa điểm trên bản đồ</Text>
                                        }
                                    </View>
                                    <Ionicons name="map-outline" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                                <Text style={styles.fieldHint}>Vui lòng chọn địa điểm thuộc khu vực thành phố Hà Nội</Text>
                                {formErrors.checkInLocation && <Text style={styles.errorText}>{formErrors.checkInLocation}</Text>}
                            </View>

                            <View style={{ marginBottom: 0 }}>
                                <Text style={styles.fieldLabel}>Bán kính cho phép <Text style={styles.required}>*</Text></Text>
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
                                <Text style={styles.fieldHint}>Mặc định 300m — có thể tăng đến 3000m cho sự kiện lớn</Text>
                            </View>
                        </View>

                        {/* ════ SECTION 2 — Non-critical fields ════ */}
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionBadgeOptional}>
                                <Ionicons name="create-outline" size={14} color="#FFFFFF" />
                                <Text style={styles.sectionBadgeText}>Thông tin thứ yếu</Text>
                            </View>
                        </View>
                        <Text style={styles.sectionHint}>Thay đổi các mục này chỉ cần Quản trị viên phê duyệt lại</Text>

                        {/* Description card */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Mô tả sự kiện</Text>

                            <View style={[styles.fieldWrapper, { marginBottom: 0 }]}>
                                <Text style={styles.fieldLabel}>Miêu tả sự kiện <Text style={styles.required}>*</Text></Text>
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
                                            const v = description.trim();
                                            if (!v) { setFormFieldError('description', 'Vui lòng nhập mô tả sự kiện'); return; }
                                            if (containsSpecialCharacters(v)) { setFormFieldError('description', 'Mô tả sự kiện không được chứa ký tự đặc biệt'); return; }
                                            setFormFieldError('description');
                                        }}
                                        onChangeText={text => {
                                            setDescription(text);
                                            const v = text.trim();
                                            if (!v) { setFormFieldError('description', formErrors.description); return; }
                                            setFormFieldError('description', containsSpecialCharacters(v) ? 'Mô tả sự kiện không được chứa ký tự đặc biệt' : undefined);
                                        }}
                                    />
                                </View>
                                {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
                            </View>
                        </View>

                        {/* Settings card — approval mode + serving place */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Cài đặt chung</Text>

                            {/* Approval Mode */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>Chế độ phê duyệt</Text>
                                <View style={styles.toggleRow}>
                                    {[{ label: 'Phê duyệt tự động', value: 0 }, { label: 'Phê duyệt thủ công', value: 1 }].map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() => setApprovalMode(opt.value)}
                                            style={[styles.toggleBtn, approvalMode === opt.value ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                                        >
                                            <Text style={[styles.toggleBtnText, { color: approvalMode === opt.value ? '#FFFFFF' : '#374151' }]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Serving Place Type */}
                            <PickerField
                                label="Loại địa điểm phục vụ"
                                required
                                icon="business-outline"
                                value={servedPlace}
                                placeholder="Vui lòng chọn loại địa điểm phục vụ"
                                onPress={() => setShowPlacePicker(true)}
                                error={formErrors.servedPlace}
                            />
                        </View>

                        {/* Event image card */}
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

                        {/* Action Buttons */}
                        <View style={styles.btnRow}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} disabled={isSubmitting}>
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? <ActivityIndicator size="small" color="#FFFFFF" />
                                    : <Text style={styles.submitBtnText}>Lưu thay đổi</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Serving Place Picker */}
            <BottomSheetPicker
                visible={showPlacePicker}
                onClose={() => { setShowPlacePicker(false); if (!servedPlace?.value) setFormFieldError('servedPlace', 'Vui lòng chọn loại địa điểm phục vụ'); }}
                title="Chọn loại địa điểm phục vụ"
                options={servedPlacesData.dia_diem_phuc_vu}
                selectedId={servedPlace?.id}
                onSelect={item => { setServedPlace(item); setFormFieldError('servedPlace'); setShowPlacePicker(false); }}
            />

            {/* Area Picker */}
            <BottomSheetPicker
                visible={showAreaPicker}
                onClose={() => { setShowAreaPicker(false); validateRequiredFormField('area', area, 'Vui lòng chọn khu vực tổ chức'); }}
                title="Chọn khu vực tổ chức"
                options={wardOptions}
                selectedId={area?.id}
                onSelect={item => { setArea(item); setFormFieldError('area'); setShowAreaPicker(false); }}
            />

            {/* Map Location Picker */}
            <MapLocationPicker
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onSelectLocation={location => { setCheckInLocation(location); setFormFieldError('checkInLocation'); setShowMapPicker(false); }}
                initialLocation={checkInLocation}
                radius={parseInt(checkInRadius) || 300}
            />
        </>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#42A4F5' },
    scrollView: { flex: 1, backgroundColor: '#F0F4F8' },
    scrollContent: { padding: 16, paddingBottom: 32 },
    header: {
        backgroundColor: '#42A4F5',
        paddingHorizontal: 16,
        paddingVertical: 14,
        paddingTop: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: { marginRight: 12 },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
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
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
    fieldWrapper: { marginBottom: 16 },
    fieldLabel: { color: '#374151', fontSize: 13, fontWeight: '600', marginBottom: 6 },
    required: { color: '#EF4444' },
    fieldHint: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
    fieldHintNeg: { color: '#9CA3AF', fontSize: 11, marginTop: -10, marginBottom: 4 },
    errorText: { color: '#EF4444', fontSize: 11, marginTop: 2 },
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
    inputIcon: { marginRight: 8 },
    textInput: { flex: 1, color: '#1F2937', fontSize: 14, paddingVertical: 10 },
    descriptionInput: { color: '#1F2937', fontSize: 14, minHeight: 88 },
    unitText: { color: '#6B7280', fontSize: 13, marginRight: 4 },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 13,
    },
    pickerTextDark: { color: '#1F2937', fontSize: 14 },
    pickerTextPlaceholder: { color: '#9CA3AF', fontSize: 14 },
    locationTextWrapper: { flex: 1, marginRight: 8 },
    toggleRow: { flexDirection: 'row', gap: 10 },
    toggleBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
    toggleBtnActive: { backgroundColor: '#42A4F5', borderColor: '#42A4F5' },
    toggleBtnInactive: { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB' },
    toggleBtnText: { fontWeight: '600', fontSize: 13 },
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
    addDayText: { color: '#42A4F5', fontWeight: '600', marginLeft: 4 },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtnText: { color: '#374151', fontWeight: '700', fontSize: 15 },
    submitBtn: { flex: 1, backgroundColor: '#42A4F5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    disabledBtn: { opacity: 0.6 },
    editLoadingOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 100,
    },
    editLoadingText: { fontSize: 15, color: '#42A4F5', fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    sectionBadgeCritical: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#EF4444', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    },
    sectionBadgeOptional: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#6B7280', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    },
    sectionBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    sectionHint: { color: '#9CA3AF', fontSize: 11, flexShrink: 1, marginBottom: 8 },
});

export default UpdateEvent;
