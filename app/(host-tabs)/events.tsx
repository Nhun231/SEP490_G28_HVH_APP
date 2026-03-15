import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DatePickerInput from '../components/DatePickerInput';
import TimePickerInput from '../components/TimePickerInput';
import ImagePickerInput from '../components/ImagePickerInput';
import BottomSheetPicker from '../components/BottomSheetPicker';
import MapLocationPicker from '../components/MapLocationPicker';
import baseAxios from '@/lib/baseAxios';

// Import JSON data
import servedTargetsData from '../../assets/served_targets/doi_tuong_phuc_vu.json';
import servedPlacesData from '../../assets/served_places/dia_diem_phuc_vu.json';
import wardsData from '../../assets/wards/phuong_xa_moi_ha_noi.json';

interface OptionItem {
    id: number;
    label: string;
}

interface LocationData {
    latitude: number;
    longitude: number;
    address?: string;
}

interface EventDay {
    id: string;
    date?: Date;
    startTime?: Date;
    endTime?: Date;
    volunteerCount: string;
    servedCount: string;
}

interface ActivitySubDomain {
    id: number;
    name: string;
    active: boolean;
}

interface ActivityDomain {
    name: string;
    specialSessionMaxTime: number;
    active: boolean;
    activitySubDomainList: ActivitySubDomain[];
}

interface ActivityDomainResponse {
    content: ActivityDomain[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

type DayErrorField = 'date' | 'startTime' | 'endTime' | 'volunteerCount' | 'servedCount';

interface EventFormErrors {
    eventName?: string;
    servedTarget?: string;
    servedField?: string;
    servedSpecificField?: string;
    servedPlace?: string;
    area?: string;
    contactPerson?: string;
    contactPhone?: string;
    registrationDeadline?: string;
    eventImage?: string;
    checkInLocation?: string;
    checkInRadius?: string;
}

const Event = () => {
    const [approvalMode, setApprovalMode] = useState(0);

    // Basic info states
    const [eventName, setEventName] = useState('');
    const [servedTarget, setServedTarget] = useState<OptionItem>();
    const [servedField, setServedField] = useState<OptionItem>();
    const [servedSpecificField, setServedSpecificField] = useState<OptionItem>();
    const [servedPlace, setServedPlace] = useState<OptionItem>();
    const [area, setArea] = useState<OptionItem>();
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [registrationDeadline, setRegistrationDeadline] = useState<Date>();
    const [eventImage, setEventImage] = useState<string>();

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

    const getDateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const getMinutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

    const isPositiveNumber = (value: string) => /^\d+$/.test(value) && Number(value) > 0;

    const isAllowedTimeRange = (time: Date) => {
        const minutes = getMinutesOfDay(time);
        return minutes >= 300 && minutes <= 1380; // 05:00 - 23:00
    };

    const getEarliestEventDate = () => {
        const validDates = eventDays
            .map((day) => day.date)
            .filter((date): date is Date => Boolean(date))
            .map((date) => getDateOnly(date));

        if (!validDates.length) return undefined;
        return new Date(Math.min(...validDates.map((date) => date.getTime())));
    };

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

    useEffect(() => {
        const fetchAllActivityDomains = async () => {
            try {
                const firstResponse = await baseAxios.get<ActivityDomainResponse>(
                    '/api/v1/activity-domain/activity-domains',
                    {
                        params: { page: 0, size: 100 },
                    }
                );

                const firstData = firstResponse.data;
                let allDomains = [...firstData.content];

                for (let page = 1; page < firstData.page.totalPages; page += 1) {
                    const pageResponse = await baseAxios.get<ActivityDomainResponse>(
                        '/api/v1/activity-domain/activity-domains',
                        {
                            params: { page, size: 100 },
                        }
                    );
                    allDomains = [...allDomains, ...pageResponse.data.content];
                }

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
            const selectedDate = getDateOnly(value);
            if (selectedDate < todayStart) {
                setDayFieldError(id, 'date', 'Ngày tổ chức không được là ngày trong quá khứ');
                return;
            }
            setDayFieldError(id, 'date');
        }

        if ((field === 'startTime' || field === 'endTime') && value instanceof Date) {
            if (!isAllowedTimeRange(value)) {
                const errorMessage = 'Giờ chỉ được chọn trong khoảng 05:00 đến 23:00';
                setDayFieldError(id, field, errorMessage);
                return;
            }
            setDayFieldError(id, field);
        }

        if ((field === 'volunteerCount' || field === 'servedCount') && typeof value === 'string') {
            if (value.trim().length === 0) {
                setDayFieldError(id, field, 'Trường này không được để trống');
            } else if (!isPositiveNumber(value)) {
                setDayFieldError(id, field, 'Giá trị phải là số lớn hơn 0');
            } else {
                setDayFieldError(id, field);
            }
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
                    setDayFieldError(id, 'endTime');
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

    const handleSaveDraft = () => {
        console.log('Save draft');
        // TODO: Save draft logic
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
        if (!contactPerson.trim()) nextErrors.contactPerson = 'Vui lòng nhập người liên hệ';
        if (!contactPhone.trim()) nextErrors.contactPhone = 'Vui lòng nhập số điện thoại';
        if (!registrationDeadline) nextErrors.registrationDeadline = 'Vui lòng chọn hạn đăng ký';
        if (!eventImage) nextErrors.eventImage = 'Vui lòng chọn ảnh hoạt động';
        if (!checkInLocation) nextErrors.checkInLocation = 'Vui lòng chọn địa điểm điểm danh';

        if (!checkInRadius.trim()) {
            nextErrors.checkInRadius = 'Vui lòng nhập bán kính';
        } else if (!isPositiveNumber(checkInRadius)) {
            nextErrors.checkInRadius = 'Bán kính phải là số lớn hơn 0';
        } else if (Number(checkInRadius) < 300) {
            nextErrors.checkInRadius = 'Bán kính không được nhỏ hơn 300m';
        }

        eventDays.forEach((day) => {
            const dayErr: Partial<Record<DayErrorField, string>> = {};

            if (!day.date) {
                dayErr.date = 'Vui lòng chọn ngày tổ chức';
            } else if (getDateOnly(day.date) < todayStart) {
                dayErr.date = 'Ngày tổ chức không được là ngày trong quá khứ';
            }

            if (!day.startTime) {
                dayErr.startTime = 'Vui lòng chọn giờ bắt đầu';
            } else if (!isAllowedTimeRange(day.startTime)) {
                dayErr.startTime = 'Giờ bắt đầu chỉ được từ 05:00 đến 23:00';
            }

            if (!day.endTime) {
                dayErr.endTime = 'Vui lòng chọn giờ kết thúc';
            } else if (!isAllowedTimeRange(day.endTime)) {
                dayErr.endTime = 'Giờ kết thúc chỉ được từ 05:00 đến 23:00';
            }

            if (day.startTime && day.endTime && getMinutesOfDay(day.endTime) <= getMinutesOfDay(day.startTime)) {
                dayErr.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
            }

            if (!day.volunteerCount.trim()) {
                dayErr.volunteerCount = 'Vui lòng nhập số lượng TNV cần tuyển';
            } else if (!isPositiveNumber(day.volunteerCount)) {
                dayErr.volunteerCount = 'Giá trị phải là số lớn hơn 0';
            }

            if (!day.servedCount.trim()) {
                dayErr.servedCount = 'Vui lòng nhập số lượng đối tượng phục vụ';
            } else if (!isPositiveNumber(day.servedCount)) {
                dayErr.servedCount = 'Giá trị phải là số lớn hơn 0';
            }

            if (Object.keys(dayErr).length > 0) {
                nextDayErrors[day.id] = dayErr;
            }
        });

        if (registrationDeadline) {
            const earliestEventDate = getEarliestEventDate();
            if (earliestEventDate) {
                const maxDeadline = new Date(earliestEventDate);
                maxDeadline.setDate(maxDeadline.getDate() - 3);

                if (getDateOnly(registrationDeadline) > getDateOnly(maxDeadline)) {
                    nextErrors.registrationDeadline = 'Hạn đăng ký phải trước ngày bắt đầu sự kiện ít nhất 3 ngày';
                }
            }
        }

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
            approvalMode,
            servedTarget,
            servedField,
            servedSpecificField,
            servedPlace,
            area,
            contactPerson,
            contactPhone,
            registrationDeadline,
            eventImage,
            eventDays,
            checkInLocation,
            checkInRadius,
        });
        // TODO: Submit logic
    };

    return (
        <>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>
                            Thêm sự kiện mới
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            Điền thông tin bên dưới
                        </Text>
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
                        <Text style={styles.sectionTitle}>
                            Thông tin cơ bản
                        </Text>

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
                                    onChangeText={(text) => {
                                        setEventName(text);
                                        setFormErrors((prev) => ({ ...prev, eventName: undefined }));
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

                        {/* Chế độ phê duyệt */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Chế độ phê duyệt
                            </Text>
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
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Đối tượng phục vụ <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowTargetPicker(true)}
                                style={[styles.pickerRow, { borderColor: formErrors.servedTarget ? '#EF4444' : '#D1D5DB' }]}
                            >
                                <Ionicons name="people-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <Text style={[styles.pickerText, { color: servedTarget ? '#1F2937' : '#9CA3AF' }]} numberOfLines={1}>
                                    {servedTarget?.label || 'Vui lòng chọn đối tượng phục vụ'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.servedTarget && (
                                <Text style={styles.errorText}>{formErrors.servedTarget}</Text>
                            )}
                        </View>

                        {/* Lĩnh vực phục vụ */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Lĩnh vực phục vụ <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowFieldPicker(true)}
                                style={[styles.pickerRow, { borderColor: formErrors.servedField ? '#EF4444' : '#D1D5DB' }]}
                            >
                                <Ionicons name="grid-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <Text style={[styles.pickerText, { color: servedField ? '#1F2937' : '#9CA3AF' }]} numberOfLines={1}>
                                    {servedField?.label || 'Vui lòng chọn lĩnh vực phục vụ'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.servedField && (
                                <Text style={styles.errorText}>{formErrors.servedField}</Text>
                            )}
                        </View>

                        {/* Lĩnh vực cụ thể */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Lĩnh vực cụ thể <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                onPress={() => { if (!servedField) return; setShowSpecificFieldPicker(true); }}
                                style={[styles.pickerRow, { borderColor: formErrors.servedSpecificField ? '#EF4444' : '#D1D5DB', opacity: servedField ? 1 : 0.5 }]}
                            >
                                <Ionicons name="list-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <Text style={[styles.pickerText, { color: servedSpecificField ? '#1F2937' : '#9CA3AF' }]} numberOfLines={1}>
                                    {servedSpecificField?.label || 'Vui lòng chọn lĩnh vực cụ thể'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                            {!servedField && (
                                <Text style={styles.fieldHint}>
                                    Vui lòng chọn lĩnh vực phục vụ trước
                                </Text>
                            )}
                            {formErrors.servedSpecificField && (
                                <Text style={styles.errorText}>{formErrors.servedSpecificField}</Text>
                            )}
                        </View>

                        {/* Loại địa điểm phục vụ */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Loại địa điểm phục vụ <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPlacePicker(true)}
                                style={[styles.pickerRow, { borderColor: formErrors.servedPlace ? '#EF4444' : '#D1D5DB' }]}
                            >
                                <Ionicons name="location-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <Text style={[styles.pickerText, { color: servedPlace ? '#1F2937' : '#9CA3AF' }]} numberOfLines={1}>
                                    {servedPlace?.label || 'Vui lòng chọn loại địa điểm phục vụ'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.servedPlace && (
                                <Text style={styles.errorText}>{formErrors.servedPlace}</Text>
                            )}
                        </View>

                        {/* Khu vực tổ chức */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Khu vực tổ chức <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAreaPicker(true)}
                                style={[styles.pickerRow, { borderColor: formErrors.area ? '#EF4444' : '#D1D5DB' }]}
                            >
                                <Ionicons name="map-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <Text style={[styles.pickerText, { color: area ? '#1F2937' : '#9CA3AF' }]} numberOfLines={1}>
                                    {area?.label || 'Vui lòng chọn khu vực tổ chức'}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.area && (
                                <Text style={styles.errorText}>{formErrors.area}</Text>
                            )}
                        </View>

                        {/* Người liên hệ */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Người liên hệ <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputRow, { borderColor: formErrors.contactPerson ? '#EF4444' : '#D1D5DB' }]}>
                                <Ionicons name="person-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Nhập tên người liên hệ"
                                    placeholderTextColor="#9CA3AF"
                                    value={contactPerson}
                                    onChangeText={(text) => {
                                        setContactPerson(text);
                                        setFormErrors((prev) => ({ ...prev, contactPerson: undefined }));
                                    }}
                                />
                            </View>
                            {formErrors.contactPerson && (
                                <Text style={styles.errorText}>{formErrors.contactPerson}</Text>
                            )}
                        </View>

                        {/* Số điện thoại */}
                        <View style={styles.fieldWrapper}>
                            <Text style={styles.fieldLabel}>
                                Số điện thoại <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={[styles.inputRow, { borderColor: formErrors.contactPhone ? '#EF4444' : '#D1D5DB' }]}>
                                <Ionicons name="call-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Nhập số điện thoại"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={contactPhone}
                                    onChangeText={(text) => {
                                        setContactPhone(text);
                                        setFormErrors((prev) => ({ ...prev, contactPhone: undefined }));
                                    }}
                                />
                            </View>
                            {formErrors.contactPhone && (
                                <Text style={styles.errorText}>{formErrors.contactPhone}</Text>
                            )}
                        </View>

                        {/* Hạn đăng ký */}
                        <View style={{ marginBottom: 0 }}>
                            <DatePickerInput
                                label="Hạn đăng ký"
                                value={registrationDeadline}
                                onChange={(date) => {
                                    setRegistrationDeadline(date);
                                    setFormErrors((prev) => ({ ...prev, registrationDeadline: undefined }));
                                }}
                                placeholder="Vui lòng chọn ngày kết thúc tuyển chọn"
                                minimumDate={todayStart}
                            />
                            <Text style={styles.fieldHintNeg}>
                                Hạn đăng ký phải trước ngày bắt đầu ít nhất 3 ngày
                            </Text>
                            {formErrors.registrationDeadline && (
                                <Text style={styles.errorText}>{formErrors.registrationDeadline}</Text>
                            )}
                        </View>
                    </View>

                    {/* ── Ảnh hoạt động ── */}
                    <View style={styles.card}>
                        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                            Ảnh hoạt động
                        </Text>
                        <ImagePickerInput
                            label="Ảnh đại diện sự kiện *"
                            hint="Chọn ảnh mô tả hoạt động (tỷ lệ 16:9)"
                            value={eventImage}
                            onChange={(uri) => {
                                setEventImage(uri);
                                setFormErrors((prev) => ({ ...prev, eventImage: undefined }));
                            }}
                        />
                        {formErrors.eventImage && (
                            <Text style={styles.errorTextNeg}>{formErrors.eventImage}</Text>
                        )}
                    </View>

                    {/* ── Lịch tổ chức sự kiện ── */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            Lịch tổ chức sự kiện
                        </Text>

                        {eventDays.map((day, index) => (
                            <View key={day.id} style={styles.dayCard}>
                                <View style={styles.dayCardHeader}>
                                    <Text style={styles.dayCardTitle}>
                                        Ngày {index + 1}
                                    </Text>
                                    {eventDays.length > 1 && (
                                        <TouchableOpacity onPress={() => removeEventDay(day.id)} style={styles.trashBtn}>
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Ngày tổ chức */}
                                <DatePickerInput
                                    label="Ngày tổ chức"
                                    value={day.date}
                                    onChange={(date) => updateEventDay(day.id, 'date', date)}
                                    placeholder="Vui lòng chọn ngày diễn ra sự kiện"
                                    minimumDate={todayStart}
                                />
                                {eventDayErrors[day.id]?.date && (
                                    <Text style={styles.errorTextNeg}>{eventDayErrors[day.id]?.date}</Text>
                                )}

                                {/* Giờ bắt đầu và Kết thúc */}
                                <View style={styles.timeRow}>
                                    <View style={styles.halfCol}>
                                        <TimePickerInput
                                            label="Giờ bắt đầu"
                                            value={day.startTime}
                                            onChange={(time) => updateEventDay(day.id, 'startTime', time)}
                                            placeholder="Chọn giờ"
                                            minHour={5}
                                            maxHour={23}
                                            onInvalidSelection={(message) => setDayFieldError(day.id, 'startTime', message)}
                                        />
                                        {eventDayErrors[day.id]?.startTime && (
                                            <Text style={styles.errorTextNeg}>{eventDayErrors[day.id]?.startTime}</Text>
                                        )}
                                    </View>
                                    <View style={styles.halfCol}>
                                        <TimePickerInput
                                            label="Giờ kết thúc"
                                            value={day.endTime}
                                            onChange={(time) => updateEventDay(day.id, 'endTime', time)}
                                            placeholder="Chọn giờ"
                                            minHour={5}
                                            maxHour={23}
                                            onInvalidSelection={(message) => setDayFieldError(day.id, 'endTime', message)}
                                        />
                                        {eventDayErrors[day.id]?.endTime && (
                                            <Text style={styles.errorTextNeg}>{eventDayErrors[day.id]?.endTime}</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Số lượng TNV */}
                                <View style={styles.dayFieldWrapper}>
                                    <Text style={styles.fieldLabel}>
                                        Số lượng TNV cần tuyển
                                    </Text>
                                    <View style={[styles.inputRow, { borderColor: eventDayErrors[day.id]?.volunteerCount ? '#EF4444' : '#D1D5DB' }]}>
                                        <Ionicons name="people-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Nhập số lượng"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="numeric"
                                            value={day.volunteerCount}
                                            onChangeText={(text) => updateEventDay(day.id, 'volunteerCount', text)}
                                        />
                                        <Text style={styles.unitText}>Người</Text>
                                    </View>
                                    {eventDayErrors[day.id]?.volunteerCount && (
                                        <Text style={styles.errorText}>{eventDayErrors[day.id]?.volunteerCount}</Text>
                                    )}
                                </View>

                                {/* Số lượng đối tượng phục vụ */}
                                <View style={{ marginBottom: 0 }}>
                                    <Text style={styles.fieldLabel}>
                                        Số lượng đối tượng phục vụ
                                    </Text>
                                    <View style={[styles.inputRow, { borderColor: eventDayErrors[day.id]?.servedCount ? '#EF4444' : '#D1D5DB' }]}>
                                        <Ionicons name="heart-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Nhập số lượng"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="numeric"
                                            value={day.servedCount}
                                            onChangeText={(text) => updateEventDay(day.id, 'servedCount', text)}
                                        />
                                        <Text style={styles.unitText}>Người</Text>
                                    </View>
                                    {eventDayErrors[day.id]?.servedCount && (
                                        <Text style={styles.errorText}>{eventDayErrors[day.id]?.servedCount}</Text>
                                    )}
                                </View>
                            </View>
                        ))}

                        {/* Thêm ngày button */}
                        <TouchableOpacity
                            onPress={addEventDay}
                            style={styles.addDayBtn}
                        >
                            <Ionicons name="add" size={20} color="#42A5F5" />
                            <Text style={styles.addDayText}>Thêm ngày</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── Cài đặt địa điểm điểm danh ── */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            Cài đặt địa điểm điểm danh
                        </Text>

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
                            <View style={[styles.inputRow, { borderColor: formErrors.checkInRadius ? '#EF4444' : '#D1D5DB' }]}>
                                <Ionicons name="radio-button-on-outline" size={17} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="300"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={checkInRadius}
                                    onChangeText={(text) => {
                                        const sanitized = text.replace(/[^0-9]/g, '');
                                        setCheckInRadius(sanitized);

                                        if (!sanitized) {
                                            setFormErrors((prev) => ({ ...prev, checkInRadius: 'Vui lòng nhập bán kính' }));
                                            return;
                                        }
                                        if (Number(sanitized) === 0) {
                                            setFormErrors((prev) => ({ ...prev, checkInRadius: 'Bán kính phải là số lớn hơn 0' }));
                                            return;
                                        }
                                        if (Number(sanitized) < 300) {
                                            setFormErrors((prev) => ({ ...prev, checkInRadius: 'Bán kính không được nhỏ hơn 300m' }));
                                            return;
                                        }
                                        setFormErrors((prev) => ({ ...prev, checkInRadius: undefined }));
                                    }}
                                />
                                <Text style={styles.unitText}>Mét</Text>
                            </View>
                            <Text style={styles.fieldHint}>
                                Tiêu chuẩn: 300m - 500m (có thể yêu cầu lên đến 3000m cho sự kiện lớn)
                            </Text>
                            {formErrors.checkInRadius && (
                                <Text style={styles.errorText}>{formErrors.checkInRadius}</Text>
                            )}
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            onPress={handleSaveDraft}
                            style={styles.draftBtn}
                        >
                            <Text style={styles.draftBtnText}>
                                Lưu bản thảo
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            style={styles.submitBtn}
                        >
                            <Text style={styles.submitBtnText}>
                                Gửi phê duyệt
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Bottom Sheet Pickers - Rendered outside SafeAreaView */}
            <BottomSheetPicker
                visible={showTargetPicker}
                onClose={() => setShowTargetPicker(false)}
                title="Chọn đối tượng phục vụ"
                options={servedTargetsData.doi_tuong_phuc_vu}
                selectedId={servedTarget?.id}
                onSelect={(item) => {
                    setServedTarget(item);
                    setFormErrors((prev) => ({ ...prev, servedTarget: undefined }));
                    setShowTargetPicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showFieldPicker}
                onClose={() => setShowFieldPicker(false)}
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
                onClose={() => setShowSpecificFieldPicker(false)}
                title="Chọn lĩnh vực cụ thể"
                options={servedSpecificFieldOptions}
                selectedId={servedSpecificField?.id}
                onSelect={(item) => {
                    setServedSpecificField(item);
                    setFormErrors((prev) => ({ ...prev, servedSpecificField: undefined }));
                    setShowSpecificFieldPicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showPlacePicker}
                onClose={() => setShowPlacePicker(false)}
                title="Chọn loại địa điểm phục vụ"
                options={servedPlacesData.dia_diem_phuc_vu}
                selectedId={servedPlace?.id}
                onSelect={(item) => {
                    setServedPlace(item);
                    setFormErrors((prev) => ({ ...prev, servedPlace: undefined }));
                    setShowPlacePicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showAreaPicker}
                onClose={() => setShowAreaPicker(false)}
                title="Chọn khu vực tổ chức"
                options={wardOptions}
                selectedId={area?.id}
                onSelect={(item) => {
                    setArea(item);
                    setFormErrors((prev) => ({ ...prev, area: undefined }));
                    setShowAreaPicker(false);
                }}
            />

            {/* Map Location Picker */}
            <MapLocationPicker
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onSelectLocation={(location) => {
                    setCheckInLocation(location);
                    setFormErrors((prev) => ({ ...prev, checkInLocation: undefined }));
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
        backgroundColor: '#F0F4F8',
    },
    scrollView: {
        flex: 1,
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
    inputIcon: {
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        color: '#1F2937',
        fontSize: 14,
        paddingVertical: 10,
    },
    unitText: {
        color: '#6B7280',
        fontSize: 13,
        marginRight: 4,
    },

    // Picker row (TouchableOpacity as select)
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 13,
    },
    pickerText: {
        flex: 1,
        fontSize: 14,
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

    // Event day card
    dayCard: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    dayCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dayCardTitle: {
        color: '#374151',
        fontWeight: '700',
        fontSize: 14,
    },
    trashBtn: {
        padding: 4,
    },
    timeRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 0,
    },
    halfCol: {
        flex: 1,
    },
    dayFieldWrapper: {
        marginBottom: 12,
        marginTop: 12,
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
