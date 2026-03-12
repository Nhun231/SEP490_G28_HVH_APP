import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FormInput from '../components/FormInput';
import ToggleButtons from '../components/ToggleButtons';
import DatePickerInput from '../components/DatePickerInput';
import TimePickerInput from '../components/TimePickerInput';
import ImagePickerInput from '../components/ImagePickerInput';
import BottomSheetPicker from '../components/BottomSheetPicker';
import MapLocationPicker from '../components/MapLocationPicker';
import SingleLocationCheckIn from '../components/SingleLocationCheckIn';

// Import JSON data
import servedTargetsData from '../../assets/served_targets/doi_tuong_phuc_vu.json';
import servedPlacesData from '../../assets/served_places/dia_diem_phuc_vu.json';
import servedFieldsData from '../../assets/served_fields/linh_vuc_phuc_vu.json';
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

const Event = () => {
    const [approvalMode, setApprovalMode] = useState(0);

    // Basic info states
    const [eventName, setEventName] = useState('');
    const [servedTarget, setServedTarget] = useState<OptionItem>();
    const [servedField, setServedField] = useState<OptionItem>();
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
    const [showPlacePicker, setShowPlacePicker] = useState(false);
    const [showAreaPicker, setShowAreaPicker] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    // Transform wards data to OptionItem format
    const wardOptions: OptionItem[] = wardsData.danh_sach_phuong_xa_moi.map(ward => ({
        id: ward.stt,
        label: ward.ten_moi
    }));

    const addEventDay = () => {
        const newDay: EventDay = {
            id: Date.now().toString(),
            volunteerCount: '',
            servedCount: '',
        };
        setEventDays([...eventDays, newDay]);
    };

    const updateEventDay = (id: string, field: keyof EventDay, value: any) => {
        setEventDays(eventDays.map(day =>
            day.id === id ? { ...day, [field]: value } : day
        ));
    };

    const removeEventDay = (id: string) => {
        if (eventDays.length > 1) {
            setEventDays(eventDays.filter(day => day.id !== id));
        }
    };

    const handleSaveDraft = () => {
        console.log('Save draft');
        // TODO: Save draft logic
    };

    const handleSubmit = () => {
        console.log('Submit for approval', {
            eventName,
            approvalMode,
            servedTarget,
            servedField,
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
                                <Text className="text-red-500">* </Text>
                                Tên hoạt động
                            </Text>
                            <TextInput
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 text-gray-800"
                                placeholder="Ví dụ: Làm sạch môi trường + Hoàn Kiếm"
                                placeholderTextColor="#898989"
                                value={eventName}
                                onChangeText={setEventName}
                            />
                            <Text className="text-gray-500 text-xs mt-1">
                                Định dạng: Nội dung + Địa điểm (không quá 30 ký tự)
                            </Text>
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
                                <Text className="text-red-500">* </Text>
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
                        </View>

                        {/* Lĩnh vực phục vụ */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                <Text className="text-red-500">* </Text>
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
                        </View>

                        {/* Loại địa điểm phục vụ */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                <Text className="text-red-500">* </Text>
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
                        </View>

                        {/* Khu vực tổ chức */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                <Text className="text-red-500">* </Text>
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
                        </View>

                        {/* Người liên hệ */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                <Text className="text-red-500">* </Text>
                                Người liên hệ
                            </Text>
                            <TextInput
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 text-gray-800"
                                placeholder="Nhập tên người liên hệ"
                                placeholderTextColor="#898989"
                                value={contactPerson}
                                onChangeText={setContactPerson}
                            />
                        </View>

                        {/* Số điện thoại */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                <Text className="text-red-500">* </Text>
                                Số điện thoại
                            </Text>
                            <TextInput
                                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 text-gray-800"
                                placeholder="Nhập số điện thoại"
                                placeholderTextColor="#898989"
                                keyboardType="phone-pad"
                                value={contactPhone}
                                onChangeText={setContactPhone}
                            />
                        </View>

                        {/* Hạn đăng ký */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                <Text className="text-red-500">* </Text>
                                Hạn đăng ký
                            </Text>
                            <DatePickerInput
                                label=""
                                value={registrationDeadline}
                                onChange={setRegistrationDeadline}
                                placeholder="Vui lòng chọn ngày kết thúc tuyển chọn"
                            />
                            <Text className="text-gray-500 text-xs -mt-3">
                                Hạn đăng ký phải trước ngày bắt đầu ít nhất 3 ngày
                            </Text>
                        </View>

                        {/* Ảnh hoạt động */}
                        <ImagePickerInput
                            label="Ảnh hoạt động"
                            required
                            value={eventImage}
                            onChange={setEventImage}
                        />

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
                                    required
                                    value={day.date}
                                    onChange={(date) => updateEventDay(day.id, 'date', date)}
                                    placeholder=""
                                />

                                {/* Giờ bắt đầu và Giờ kết thúc */}
                                <View className="flex-row gap-3 mb-4">
                                    <View className="flex-1">
                                        <Text className="text-gray-700 text-sm font-medium mb-2">
                                            <Text className="text-red-500">* </Text>
                                            Giờ bắt đầu
                                        </Text>
                                        <TimePickerInput
                                            label=""
                                            value={day.startTime}
                                            onChange={(time) => updateEventDay(day.id, 'startTime', time)}
                                            placeholder=""
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-700 text-sm font-medium mb-2">
                                            <Text className="text-red-500">* </Text>
                                            Giờ kết thúc
                                        </Text>
                                        <TimePickerInput
                                            label=""
                                            value={day.endTime}
                                            onChange={(time) => updateEventDay(day.id, 'endTime', time)}
                                            placeholder=""
                                        />
                                    </View>
                                </View>

                                {/* Số lượng TNV cần tuyển */}
                                <View className="mb-4">
                                    <Text className="text-gray-700 text-sm font-medium mb-2">
                                        <Text className="text-red-500">* </Text>
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
                                </View>

                                {/* Số lượng đối tượng phục vụ */}
                                <View className="mb-0">
                                    <Text className="text-gray-700 text-sm font-medium mb-2">
                                        <Text className="text-red-500">* </Text>
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
                                <Text className="text-red-500">* </Text>
                                Địa chỉ điểm danh
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
                                            Nhập địa chỉ điểm danh
                                        </Text>
                                    )}
                                </View>
                                <Ionicons name="location" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Bán kính cho phép */}
                        <View className="mb-4">
                            <Text className="text-gray-700 text-sm font-medium mb-2">
                                <Text className="text-red-500">* </Text>
                                Bán kính cho phép
                            </Text>
                            <View className="flex-row items-center bg-[#E3F2FD] border-b border-gray-200 rounded-lg">
                                <TextInput
                                    className="flex-1 px-4 py-3 text-gray-800"
                                    placeholder="300"
                                    placeholderTextColor="#898989"
                                    keyboardType="numeric"
                                    value={checkInRadius}
                                    onChangeText={setCheckInRadius}
                                />
                                <Text className="text-gray-500 pr-4">Mét</Text>
                            </View>
                            <Text className="text-gray-500 text-xs mt-1">
                                Tiêu chuẩn: 300m - 500m (có thể yêu cầu lên đến 3000m cho sự kiện lớn, cần xét duyệt lại sau)
                            </Text>
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
                    setShowTargetPicker(false);
                }}
            />

            <BottomSheetPicker
                visible={showFieldPicker}
                onClose={() => setShowFieldPicker(false)}
                title="Chọn lĩnh vực phục vụ"
                options={servedFieldsData.linh_vuc_phuc_vu}
                selectedId={servedField?.id}
                onSelect={(item) => {
                    setServedField(item);
                    setShowFieldPicker(false);
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
                    setShowAreaPicker(false);
                }}
            />

            {/* Map Location Picker */}
            <MapLocationPicker
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onSelectLocation={(location) => {
                    setCheckInLocation(location);
                    setShowMapPicker(false);
                }}
                initialLocation={checkInLocation}
                radius={parseInt(checkInRadius) || 300}
            />
        </>
    );
};

export default Event;