import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationItem {
    id: string;
    name: string;
    radius: string;
}

interface LocationCheckInSectionProps {
    locations: LocationItem[];
    onAddLocation: () => void;
    onEditLocation: (id: string) => void;
    onRadiusChange: (id: string, radius: string) => void;
}

export default function LocationCheckInSection({
    locations,
    onAddLocation,
    onEditLocation,
    onRadiusChange,
}: LocationCheckInSectionProps) {
    return (
        <View className="mb-4">
            <Text className="text-gray-800 font-bold text-base mb-3">
                Cài đặt địa điểm điểm danh
            </Text>

            {locations.map((location, index) => (
                <View key={location.id} className="mb-4">
                    <Text className="text-gray-700 text-sm font-medium mb-2">
                        Địa điểm {index + 1}
                    </Text>

                    {/* Địa điểm điểm danh */}
                    <TouchableOpacity
                        onPress={() => onEditLocation(location.id)}
                        className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg py-3 flex-row justify-between items-center mb-3"
                    >
                        <View className="flex-1">
                            <Text className="text-gray-500 text-xs mb-1">
                                * Địa điểm điểm danh
                            </Text>
                            <Text className="text-gray-800">
                                {location.name || 'Vui lòng chọn địa điểm'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    {/* Phạm vi điểm danh */}
                    <View className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg py-3">
                        <Text className="text-gray-500 text-xs mb-2">
                            * Phạm vi điểm danh
                        </Text>
                        <View className="flex-row items-center">
                            <TextInput
                                className="flex-1 text-gray-800 text-base"
                                value={location.radius}
                                onChangeText={(text) => onRadiusChange(location.id, text)}
                                keyboardType="numeric"
                                placeholder="300"
                            />
                            <Text className="text-gray-600 ml-2">m</Text>
                        </View>
                        <Text className="text-red-500 text-xs mt-2">
                            Tiêu chuẩn: 300m - 500m (có thể yêu cầu lên đến 3000m cho sự kiện lớn, cần xét duyệt lại sau)
                        </Text>
                    </View>
                </View>
            ))}

            {/* Add Location Button */}
            <TouchableOpacity
                onPress={onAddLocation}
                className="bg-white border-2 border-[#42A5F5] rounded-lg py-3 flex-row justify-center items-center"
            >
                <Ionicons name="add-circle-outline" size={20} color="#42A5F5" />
                <Text className="text-[#42A5F5] font-semibold ml-2">
                    Thêm địa điểm điểm danh
                </Text>
            </TouchableOpacity>
        </View>
    );
}
