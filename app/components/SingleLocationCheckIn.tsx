import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationData {
    latitude: number;
    longitude: number;
    address: string;
}

interface SingleLocationCheckInProps {
    location?: LocationData;
    radius: string;
    onSelectLocation: () => void;
    onRadiusChange: (radius: string) => void;
}

export default function SingleLocationCheckIn({
    location,
    radius,
    onSelectLocation,
    onRadiusChange,
}: SingleLocationCheckInProps) {
    return (
        <View className="mb-4">
            <Text className="text-gray-800 font-bold text-base mb-3">
                Cài đặt địa điểm điểm danh
            </Text>

            {/* Địa điểm điểm danh */}
            <View className="mb-3">
                <Text className="text-gray-700 text-sm font-medium mb-2">
                    <Text className="text-red-500">* </Text>
                    Địa điểm điểm danh
                </Text>
                <TouchableOpacity
                    onPress={onSelectLocation}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-start"
                >
                    <View className="flex-1">
                        <Text className={location ? 'text-gray-800' : 'text-gray-400'}>
                            {location?.address || 'Vui lòng chọn địa điểm trên bản đồ'}
                        </Text>
                        {location && (
                            <Text className="text-gray-400 text-xs mt-1">
                                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </Text>
                        )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            </View>

            {/* Phạm vi điểm danh */}
            <View className="mb-3">
                <Text className="text-gray-700 text-sm font-medium mb-2">
                    <Text className="text-red-500">* </Text>
                    Phạm vi điểm danh
                </Text>
                <View className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <View className="flex-row items-center">
                        <TextInput
                            className="flex-1 text-gray-800 text-base"
                            value={radius}
                            onChangeText={onRadiusChange}
                            keyboardType="numeric"
                            placeholder="300"
                        />
                        <Text className="text-gray-600 ml-2">m</Text>
                    </View>
                </View>
                <Text className="text-red-500 text-xs mt-2">
                    Tiêu chuẩn: 300m - 500m (có thể yêu cầu lên đến 3000m cho sự kiện lớn, cần xét duyệt lại sau)
                </Text>
            </View>
        </View>
    );
}
