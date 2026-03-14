import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput } from 'react-native';
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
            <SafeAreaView className="flex-1 bg-[#E3F2FD]">
                {/* Header */}
                <View className="bg-[#E3F2FD] px-4 py-2 -mt-5 flex-row items-center">
                    <TouchableOpacity className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#898989" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-800">
                        Thêm sự kiện mới
                    </Text>
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="p-4">
                        {/* Thông tin cơ bản Section */}
                        <Text className="text-gray-800 font-bold text-base mb-4">
                            Thông tin cơ bản
                        </Text>

                        {/* Tên hoạt động */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Tên hoạt động
                            </Text>
                            <TextInput
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 text-gray-800"
                                placeholder="Ví dụ: Làm sạch môi trường + Hoàn Kiếm"
                                placeholderTextColor="#898989"
                                value={eventName}
                                onChangeText={(text) => {
                                    setEventName(text);
                                    setFormErrors((prev) => ({ ...prev, eventName: undefined }));
                                }}
                            />
                            <Text className="text-gray-500 text-xs mt-1">
                                Định dạng: Nội dung + Địa điểm (không quá 30 ký tự)
                            </Text>
                            {formErrors.eventName && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.eventName}</Text>
                            )}
                        </View>

                        {/* Chế độ phê duyệt */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Chế độ phê duyệt
                            </Text>
                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => setApprovalMode(0)}
                                    className={`flex-1 py-3 px-4 rounded-lg ${approvalMode === 0 ? 'bg-[#14B8A6]' : 'bg-[#E3F2FD] border border-gray-200'
                                        }`}
                                >
                                    <Text className={`text-center font-medium ${approvalMode === 0 ? 'text-white' : 'text-gray-700'
                                        }`}>
                                        Phê duyệt tự động
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setApprovalMode(1)}
                                    className={`flex-1 py-3 px-4 rounded-lg ${approvalMode === 1 ? 'bg-[#14B8A6]' : 'bg-[#E3F2FD] border border-gray-200'
                                        }`}
                                >
                                    <Text className={`text-center font-medium ${approvalMode === 1 ? 'text-white' : 'text-gray-700'
                                        }`}>
                                        Phê duyệt thủ công
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Đối tượng phục vụ */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Đối tượng phục vụ
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowTargetPicker(true)}
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
                            >
                                <Text className={servedTarget ? "text-gray-800" : "text-[#898989]"} numberOfLines={1}>
                                    {servedTarget?.label || "Vui lòng chọn đối tượng phục vụ"}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.servedTarget && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.servedTarget}</Text>
                            )}
                        </View>

                        {/* Lĩnh vực phục vụ */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Lĩnh vực phục vụ
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowFieldPicker(true)}
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
                            >
                                <Text className={servedField ? "text-gray-800" : "text-[#898989]"} numberOfLines={1}>
                                    {servedField?.label || "Vui lòng chọn lĩnh vực phục vụ"}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.servedField && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.servedField}</Text>
                            )}
                        </View>

                        {/* Lĩnh vực cụ thể */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Lĩnh vực cụ thể
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!servedField) {
                                        return;
                                    }
                                    setShowSpecificFieldPicker(true);
                                }}
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
                            >
                                <Text className={servedSpecificField ? "text-gray-800" : "text-[#898989]"} numberOfLines={1}>
                                    {servedSpecificField?.label || "Vui lòng chọn lĩnh vực cụ thể"}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            {!servedField && (
                                <Text className="text-gray-500 text-xs mt-1">
                                    Vui lòng chọn lĩnh vực phục vụ trước
                                </Text>
                            )}
                            {formErrors.servedSpecificField && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.servedSpecificField}</Text>
                            )}
                        </View>

                        {/* Loại địa điểm phục vụ */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Loại địa điểm phục vụ
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPlacePicker(true)}
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
                            >
                                <Text className={servedPlace ? "text-gray-800" : "text-[#898989]"} numberOfLines={1}>
                                    {servedPlace?.label || "Vui lòng chọn loại địa điểm phục vụ"}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.servedPlace && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.servedPlace}</Text>
                            )}
                        </View>

                        {/* Khu vực tổ chức */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Khu vực tổ chức
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowAreaPicker(true)}
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
                            >
                                <Text className={area ? "text-gray-800" : "text-[#898989]"} numberOfLines={1}>
                                    {area?.label || "Vui lòng chọn khu vực tổ chức"}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.area && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.area}</Text>
                            )}
                        </View>

                        {/* Người liên hệ */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Người liên hệ
                            </Text>
                            <TextInput
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 text-gray-800"
                                placeholder="Nhập tên người liên hệ"
                                placeholderTextColor="#898989"
                                value={contactPerson}
                                onChangeText={(text) => {
                                    setContactPerson(text);
                                    setFormErrors((prev) => ({ ...prev, contactPerson: undefined }));
                                }}
                            />
                            {formErrors.contactPerson && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.contactPerson}</Text>
                            )}
                        </View>

                        {/* Số điện thoại */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Số điện thoại
                            </Text>
                            <TextInput
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 text-gray-800"
                                placeholder="Nhập số điện thoại"
                                placeholderTextColor="#898989"
                                keyboardType="phone-pad"
                                value={contactPhone}
                                onChangeText={(text) => {
                                    setContactPhone(text);
                                    setFormErrors((prev) => ({ ...prev, contactPhone: undefined }));
                                }}
                            />
                            {formErrors.contactPhone && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.contactPhone}</Text>
                            )}
                        </View>

                        {/* Hạn đăng ký */}
                        <View className="mb-4">
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
                            <Text className="text-gray-500 text-xs -mt-3">
                                Hạn đăng ký phải trước ngày bắt đầu ít nhất 3 ngày
                            </Text>
                            {formErrors.registrationDeadline && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.registrationDeadline}</Text>
                            )}
                        </View>

                        {/* Ảnh hoạt động */}
                        <ImagePickerInput
                            label="Ảnh hoạt động"
                            value={eventImage}
                            onChange={(uri) => {
                                setEventImage(uri);
                                setFormErrors((prev) => ({ ...prev, eventImage: undefined }));
                            }}
                        />
                        {formErrors.eventImage && (
                            <Text className="text-red-500 text-xs -mt-3 mb-4">{formErrors.eventImage}</Text>
                        )}

                        {/* Lịch tổ chức sự kiện Section */}
                        <Text className="text-gray-800 font-bold text-base mb-4 mt-6">
                            Lịch tổ chức sự kiện
                        </Text>

                        {eventDays.map((day, index) => (
                            <View key={day.id} className="mb-6 bg-[#E3F2FD] rounded-lg p-4 border border-gray-200">
                                <View className="flex-row justify-between items-center mb-3">
                                    <Text className="text-gray-700 font-semibold">
                                        Ngày {index + 1}
                                    </Text>
                                    {eventDays.length > 1 && (
                                        <TouchableOpacity
                                            onPress={() => removeEventDay(day.id)}
                                            className="p-1"
                                        >
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
                                    <Text className="text-red-500 text-xs -mt-3 mb-3">{eventDayErrors[day.id]?.date}</Text>
                                )}

                                {/* Giờ bắt đầu và Giờ kết thúc */}
                                <View className="flex-row gap-3 mb-4">
                                    <View className="flex-1">
                                        <TimePickerInput
                                            label="Giờ bắt đầu"
                                            value={day.startTime}
                                            onChange={(time) => updateEventDay(day.id, 'startTime', time)}
                                            placeholder="Chọn giờ bắt đầu"
                                            minHour={5}
                                            maxHour={23}
                                            onInvalidSelection={(message) => setDayFieldError(day.id, 'startTime', message)}
                                        />
                                        {eventDayErrors[day.id]?.startTime && (
                                            <Text className="text-red-500 text-xs -mt-3">{eventDayErrors[day.id]?.startTime}</Text>
                                        )}
                                    </View>
                                    <View className="flex-1">
                                        <TimePickerInput
                                            label="Giờ kết thúc"
                                            value={day.endTime}
                                            onChange={(time) => updateEventDay(day.id, 'endTime', time)}
                                            placeholder="Chọn giờ kết thúc"
                                            minHour={5}
                                            maxHour={23}
                                            onInvalidSelection={(message) => setDayFieldError(day.id, 'endTime', message)}
                                        />
                                        {eventDayErrors[day.id]?.endTime && (
                                            <Text className="text-red-500 text-xs -mt-3">{eventDayErrors[day.id]?.endTime}</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Số lượng TNV cần tuyển */}
                                <View className="mb-4">
                                    <Text className="text-gray-700 text-sm font-medium mb-2">
                                        Số lượng TNV cần tuyển
                                    </Text>
                                    <View className="flex-row items-center bg-[#E3F2FD] border-b border-gray-200 rounded-lg">
                                        <TextInput
                                            className="flex-1 px-4 py-3 text-gray-800"
                                            placeholder="Nhập số lượng"
                                            placeholderTextColor="#898989"
                                            keyboardType="numeric"
                                            value={day.volunteerCount}
                                            onChangeText={(text) => updateEventDay(day.id, 'volunteerCount', text)}
                                        />
                                        <Text className="text-gray-500 pr-4">Người</Text>
                                    </View>
                                    {eventDayErrors[day.id]?.volunteerCount && (
                                        <Text className="text-red-500 text-xs mt-1">{eventDayErrors[day.id]?.volunteerCount}</Text>
                                    )}
                                </View>

                                {/* Số lượng đối tượng phục vụ */}
                                <View className="mb-0">
                                    <Text className="text-gray-700 text-sm font-medium mb-2">
                                        Số lượng đối tượng phục vụ
                                    </Text>
                                    <View className="flex-row items-center bg-[#E3F2FD] border-b border-gray-200 rounded-lg">
                                        <TextInput
                                            className="flex-1 px-4 py-3 text-gray-800"
                                            placeholder="Nhập số lượng"
                                            placeholderTextColor="#898989"
                                            keyboardType="numeric"
                                            value={day.servedCount}
                                            onChangeText={(text) => updateEventDay(day.id, 'servedCount', text)}
                                        />
                                        <Text className="text-gray-500 pr-4">Người</Text>
                                    </View>
                                    {eventDayErrors[day.id]?.servedCount && (
                                        <Text className="text-red-500 text-xs mt-1">{eventDayErrors[day.id]?.servedCount}</Text>
                                    )}
                                </View>
                            </View>
                        ))}

                        {/* Thêm ngày button */}
                        <TouchableOpacity
                            onPress={addEventDay}
                            className="border-2 border-dashed border-[#14B8A6] rounded-lg py-3 mb-6 flex-row items-center justify-center"
                        >
                            <Ionicons name="add" size={20} color="#14B8A6" />
                            <Text className="text-[#14B8A6] font-medium ml-1">Thêm ngày</Text>
                        </TouchableOpacity>

                        {/* Cài đặt địa điểm điểm danh Section */}
                        <Text className="text-gray-800 font-bold text-base mb-4">
                            Cài đặt địa điểm điểm danh
                        </Text>

                        {/* Địa chỉ điểm danh */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Địa điểm điểm danh
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowMapPicker(true)}
                                activeOpacity={0.7}
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
                            >
                                <View className="flex-1 mr-2">
                                    {checkInLocation?.address ? (
                                        <Text className="text-gray-800" numberOfLines={2}>
                                            {checkInLocation.address}
                                        </Text>
                                    ) : (
                                        <Text className="text-[#898989]">
                                            Chọn địa điểm trên bản đồ
                                        </Text>
                                    )}
                                </View>
                                <Ionicons name="location" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            {formErrors.checkInLocation && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.checkInLocation}</Text>
                            )}
                        </View>

                        {/* Bán kính cho phép */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                Bán kính cho phép
                            </Text>
                            <View className="flex-row items-center bg-[#E3F2FD] border-b border-gray-200 rounded-lg">
                                <TextInput
                                    className="flex-1 px-4 py-3 text-gray-800"
                                    placeholder="300"
                                    placeholderTextColor="#898989"
                                    keyboardType="numeric"
                                    value={checkInRadius}
                                    onChangeText={(text) => {
                                        const sanitized = text.replace(/[^0-9]/g, '');
                                        setCheckInRadius(sanitized || '300');

                                        if (!sanitized) {
                                            setFormErrors((prev) => ({ ...prev, checkInRadius: 'Vui lòng nhập bán kính' }));
                                            return;
                                        }

                                        if (!isPositiveNumber(sanitized)) {
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
                                <Text className="text-gray-500 pr-4">Mét</Text>
                            </View>
                            <Text className="text-gray-500 text-xs mt-1">
                                Tiêu chuẩn: 300m - 500m (có thể yêu cầu lên đến 3000m cho sự kiện lớn, cần xét duyệt lại sau)
                            </Text>
                            {formErrors.checkInRadius && (
                                <Text className="text-red-500 text-xs mt-1">{formErrors.checkInRadius}</Text>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-3 mt-6 mb-8">
                            <TouchableOpacity
                                onPress={handleSaveDraft}
                                className="flex-1 bg-white border border-gray-300 py-4 rounded-lg"
                            >
                                <Text className="text-gray-700 font-semibold text-center">
                                    Lưu bản thảo
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                className="flex-1 bg-[#14B8A6] py-4 rounded-lg"
                            >
                                <Text className="text-white font-semibold text-center">
                                    Gửi phê duyệt
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
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

export default Event;