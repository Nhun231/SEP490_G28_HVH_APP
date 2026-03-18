import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DatePickerInput from '../components/DatePickerInput';
import DocumentUploadBox, { DocumentUpload } from '../components/DocumentUploadBox';
import BottomSheetPicker, { OptionItem } from '../components/BottomSheetPicker';
import MapLocationPicker, { LocationData } from '../components/MapLocationPicker';
import PickerField from '../components/PickerField';
import EventDayCard, { EventDay, DayErrorField } from '../components/EventDayCard';
import { ActivityDomain, getAllActivityDomains } from '@/services/event-service';
import { getFileExtension, getMimeType } from '@/services/upload-service';

// Import JSON data
import servedTargetsData from '../../assets/served_targets/doi_tuong_phuc_vu.json';
import servedPlacesData from '../../assets/served_places/dia_diem_phuc_vu.json';
import wardsData from '../../assets/wards/phuong_xa_moi_ha_noi.json';

interface EventFormErrors {
    eventName?: string;
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

const Event = () => {
    const [approvalMode, setApprovalMode] = useState(0);

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

    const todayStart = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    // Transform wards data to OptionItem format
    const wardOptions: OptionItem[] = wardsData.danh_sach_phuong_xa_moi.map(ward => ({
        id: ward.stt,
        label: ward.ten_moi
    }));

    const servedFieldOptions = useMemo<OptionItem[]>(() => {
        return activityDomains
            .filter((domain) => domain.active)
            .map((domain, index) => ({
                id: index + 1,
                label: domain.name,
            }));
    }, [activityDomains]);

    const selectedActivityDomain = useMemo<ActivityDomain | undefined>(() => {
        if (!servedField) return undefined;
        return activityDomains.filter((domain) => domain.active)[servedField.id - 1];
    }, [activityDomains, servedField]);

    const servedSpecificFieldOptions = useMemo<OptionItem[]>(() => {
        if (!selectedActivityDomain) return [];
        return selectedActivityDomain.activitySubDomainList
            .filter((subDomain) => subDomain.active)
            .map((subDomain) => ({
                id: subDomain.id,
                label: subDomain.name,
            }));
    }, [selectedActivityDomain]);

    // const getDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // const getMinutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

    const sanitizeNaturalNumberInput = (value: string) =>value.replace(/[^0-9]/g, '');

    const isPositiveNaturalNumber = (value: string) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0;
    };

    // const getDurationValidationError = (startTime: Date, endTime: Date) => {
    //     const durationMinutes = getMinutesOfDay(endTime) - getMinutesOfDay(startTime);
    //     const baseLimitMinutes = 4 * 60;

    //     if (durationMinutes <= baseLimitMinutes) {
    //         return undefined;
    //     }

    //     const specialLimitHours = selectedActivityDomain?.specialSessionMaxTime;
    //     if (typeof specialLimitHours !== 'number') {
    //         return 'Thời lượng sự kiện tối đa 4 giờ';
    //     }

    //     const specialLimitMinutes = specialLimitHours * 60;
    //     if (durationMinutes > specialLimitMinutes) {
    //         return `Thời lượng vượt quá giới hạn của lĩnh vực đã chọn (${specialLimitHours} giờ)`;
    //     }

    //     return undefined;
    // };

    // const getEarliestEventDate = () => {
    //     const validDates = eventDays
    //         .map((day) => day.date)
    //         .filter((date): date is Date => Boolean(date))
    //         .map((date) => getDateOnly(date));

    //     if (!validDates.length) return undefined;
    //     return new Date(Math.min(...validDates.map((date) => date.getTime())));
    // };

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

        if (!isPositiveNaturalNumber(value)) {
            setDayFieldError(dayId, field, 'Số lượng cần là số tự nhiên lớn hơn 0');
            return;
        }

        setDayFieldError(dayId, field);
    };

    // const validateRadiusField = (value: string) => {
    //     if (!value.trim()) {
    //         setFormFieldError('checkInRadius', 'Vui lòng nhập bán kính');
    //         return;
    //     }

    //     if (!isPositiveNaturalNumber(value)) {
    //         setFormFieldError('checkInRadius', 'Bán kính phải là số lớn hơn 0');
    //         return;
    //     }

    //     if (Number(value) < 300) {
    //         setFormFieldError('checkInRadius', 'Bán kính tiêu chuẩn mặc định là 300m');
    //         return;
    //     }

    //     setFormFieldError('checkInRadius');
    // };

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

        // if (field === 'startTime' || field === 'endTime') {
        //     const currentDay = eventDays.find((day) => day.id === id);
        //     const startTime = field === 'startTime' ? value : currentDay?.startTime;
        //     const endTime = field === 'endTime' ? value : currentDay?.endTime;

        //     if (startTime instanceof Date && endTime instanceof Date) {
        //         if (getMinutesOfDay(endTime) <= getMinutesOfDay(startTime)) {
        //             setDayFieldError(id, 'endTime', 'Giờ kết thúc phải sau giờ bắt đầu');
        //         } else {
        //             const durationError = getDurationValidationError(startTime, endTime);
        //             setDayFieldError(id, 'endTime', durationError);
        //         }
        //     }
        // }
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

    const handleSaveDraft = () => {
        console.log('Save draft');
        // TODO: Save draft logic
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
                if (!eventImageDoc.uri) {
                    setFormFieldError('eventImage', 'Vui lòng chọn ảnh hoạt động');
                }
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
            Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể chọn ảnh');
        }
    };

    const handleRemoveEventImage = () => {
        setEventImageDoc({ uri: null, fileName: null, mimeType: null });
    };

    const validateForm = () => {
        const nextErrors: EventFormErrors = {};
        const nextDayErrors: Record<string, Partial<Record<DayErrorField, string>>> = {};

        if (!eventName.trim()) nextErrors.eventName = 'Vui lòng nhập tên hoạt động';
        if (!servedTarget) nextErrors.servedTarget = 'Vui lòng chọn đối tượng phục vụ';
        if (!servedField) nextErrors.servedField = 'Vui lòng chọn lĩnh vực phục vụ';
        if (!servedSpecificField) nextErrors.servedSpecificField = 'Vui lòng chọn lĩnh vực cụ thể';
        if (!servedPlace) nextErrors.servedPlace = 'Vui lòng chọn loại địa điểm phục vụ';
        if (!area) nextErrors.area = 'Vui lòng chọn khu vực tổ chức';
        if (!registrationDeadline) nextErrors.registrationDeadline = 'Vui lòng chọn hạn đăng ký';
        if (!eventImageDoc.uri) nextErrors.eventImage = 'Vui lòng chọn ảnh hoạt động';
        if (!checkInLocation) nextErrors.checkInLocation = 'Vui lòng chọn địa điểm điểm danh';

        // if (!checkInRadius.trim()) {
        //     nextErrors.checkInRadius = 'Vui lòng nhập bán kính';
        // } else if (!isPositiveNaturalNumber(checkInRadius)) {
        //     nextErrors.checkInRadius = 'Bán kính phải là số lớn hơn 0';
        // } else if (Number(checkInRadius) < 300) {
        //     nextErrors.checkInRadius = 'Bán kính không được nhỏ hơn 300m';
        // }

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

            // if (day.startTime && day.endTime && getMinutesOfDay(day.endTime) <= getMinutesOfDay(day.startTime)) {
            //     dayErr.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
            // }

            // if (
            //     day.startTime &&
            //     day.endTime &&
            //     getMinutesOfDay(day.endTime) > getMinutesOfDay(day.startTime)
            // ) {
            //     const durationError = getDurationValidationError(day.startTime, day.endTime);
            //     if (durationError) {
            //         dayErr.endTime = durationError;
            //     }
            // }

            if (!day.volunteerCount.trim()) {
                dayErr.volunteerCount = 'Vui lòng nhập số lượng TNV cần tuyển';
            } else if (!isPositiveNaturalNumber(day.volunteerCount)) {
                dayErr.volunteerCount = 'Số lượng cần là số tự nhiên lớn hơn 0';
            }

            if (!day.servedCount.trim()) {
                dayErr.servedCount = 'Vui lòng nhập số lượng đối tượng phục vụ';
            } else if (!isPositiveNaturalNumber(day.servedCount)) {
                dayErr.servedCount = 'Số lượng cần là số tự nhiên lớn hơn 0';
            }

            if (Object.keys(dayErr).length > 0) {
                nextDayErrors[day.id] = dayErr;
            }
        });

        // if (registrationDeadline) {
        //     const earliestEventDate = getEarliestEventDate();
        //     if (earliestEventDate) {
        //         const maxDeadline = new Date(earliestEventDate);
        //         maxDeadline.setDate(maxDeadline.getDate() - 3);

        //         if (getDateOnly(registrationDeadline) > getDateOnly(maxDeadline)) {
        //             nextErrors.registrationDeadline = 'Hạn đăng ký phải sau ngày tạo sự kiện và trước ngày bắt đầu sự kiện ít nhất 3 ngày';
        //         }
        //     }
        // }

        setFormErrors(nextErrors);
        setEventDayErrors(nextDayErrors);

        return Object.keys(nextErrors).length === 0 && Object.keys(nextDayErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
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
        });
        // TODO: Submit logic
    };

    return (
        <>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn}>
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

                        {/* ── Thông tin cơ bản ── */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

                            {/* Tên hoạt động */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>
                                    Tên hoạt động <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={[styles.inputRow, { borderColor: formErrors.eventName ? '#EF4444' : '#D1D5DB' }]}>
                                    <Ionicons name="pencil-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Ví dụ: Làm sạch môi trường + Hoàn Kiếm"
                                        placeholderTextColor="#9CA3AF"
                                        value={eventName}
                                        onBlur={() => validateRequiredFormField('eventName', eventName.trim(), 'Vui lòng nhập tên hoạt động')}
                                        onChangeText={(text) => {
                                            setEventName(text);
                                            setFormFieldError('eventName', text.trim() ? undefined : formErrors.eventName);
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

                            {/* Miêu tả sự kiện */}
                            <View style={styles.fieldWrapper}>
                                <Text style={styles.fieldLabel}>
                                    Miêu tả sự kiện <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={styles.descriptionInputRow}>
                                    <TextInput
                                        style={styles.descriptionInput}
                                        placeholder="Nhập miêu tả chi tiết cho sự kiện"
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        value={description}
                                        onChangeText={setDescription}
                                    />
                                </View>
                            </View>

                            {/* Chế độ phê duyệt */}
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

                            {/* Đối tượng phục vụ */}
                            <PickerField
                                label="Đối tượng phục vụ"
                                required
                                icon="people-outline"
                                value={servedTarget}
                                placeholder="Vui lòng chọn đối tượng phục vụ"
                                onPress={() => setShowTargetPicker(true)}
                                error={formErrors.servedTarget}
                            />

                            {/* Lĩnh vực phục vụ */}
                            <PickerField
                                label="Lĩnh vực phục vụ"
                                required
                                icon="grid-outline"
                                value={servedField}
                                placeholder="Vui lòng chọn lĩnh vực phục vụ"
                                onPress={() => setShowFieldPicker(true)}
                                error={formErrors.servedField}
                            />

                            {/* Lĩnh vực cụ thể */}
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
                                    <Text style={[styles.fieldHint, { marginTop: -12 }]}>
                                        Vui lòng chọn lĩnh vực phục vụ trước
                                    </Text>
                                )}
                            </View>

                            {/* Loại địa điểm phục vụ */}
                            <PickerField
                                label="Loại địa điểm phục vụ"
                                required
                                icon="location-outline"
                                value={servedPlace}
                                placeholder="Vui lòng chọn loại địa điểm phục vụ"
                                onPress={() => setShowPlacePicker(true)}
                                error={formErrors.servedPlace}
                            />

                            {/* Khu vực tổ chức */}
                            <PickerField
                                label="Khu vực tổ chức"
                                required
                                icon="map-outline"
                                value={area}
                                placeholder="Vui lòng chọn khu vực tổ chức"
                                onPress={() => setShowAreaPicker(true)}
                                error={formErrors.area}
                            />

                            {/* Hạn đăng ký */}
                            <View style={{ marginBottom: 0 }}>
                                <DatePickerInput
                                    label="Hạn đăng ký"
                                    required
                                    value={registrationDeadline}
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

                        {/* ── Ảnh hoạt động ── */}
                        <View style={styles.card}>
                            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Ảnh hoạt động</Text>
                            <DocumentUploadBox
                                label="Ảnh đại diện sự kiện"
                                required
                                subtitle="PNG, JPG (tối đa 5MB)"
                                document={eventImageDoc}
                                onPress={handlePickEventImage}
                                onRemove={handleRemoveEventImage}
                            />
                            {formErrors.eventImage && (
                                <Text style={styles.errorTextNeg}>{formErrors.eventImage}</Text>
                            )}
                        </View>

                        {/* ── Lịch tổ chức sự kiện ── */}
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
                                    sanitizeInput={sanitizeNaturalNumberInput}
                                />
                            ))}

                            {/* Thêm ngày button */}
                            <TouchableOpacity onPress={addEventDay} style={styles.addDayBtn}>
                                <Ionicons name="add" size={20} color="#42A5F5" />
                                <Text style={styles.addDayText}>Thêm ngày</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Cài đặt địa điểm điểm danh ── */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Cài đặt địa điểm điểm danh</Text>

                            {/* Địa điểm điểm danh */}
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

                            {/* Bán kính cho phép */}
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
                                    Tiêu chuẩn: 300m - 500m (có thể yêu cầu lên đến 3000m cho sự kiện lớn)
                                </Text>
                                {/* {formErrors.checkInRadius && (
                                    <Text style={styles.errorText}>{formErrors.checkInRadius}</Text>
                                )} */}
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.btnRow}>
                            <TouchableOpacity onPress={handleSaveDraft} style={styles.draftBtn}>
                                <Text style={styles.draftBtnText}>Lưu bản thảo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
                                <Text style={styles.submitBtnText}>Gửi phê duyệt</Text>
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
                onClose={() => {
                    setShowMapPicker(false);
                    validateRequiredFormField('checkInLocation', checkInLocation, 'Vui lòng chọn địa điểm điểm danh');
                }}
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
});

export default Event;
