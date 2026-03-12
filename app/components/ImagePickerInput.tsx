import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface ImagePickerInputProps {
    label: string;
    value?: string;
    onChange: (uri: string) => void;
    required?: boolean;
}

export default function ImagePickerInput({
    label,
    value,
    onChange,
    required = false,
}: ImagePickerInputProps) {
    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert(
                'Cần quyền truy cập',
                'Vui lòng cấp quyền truy cập thư viện ảnh để chọn hình'
            );
            return;
        }

        // Pick image
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            onChange(result.assets[0].uri);
        }
    };

    return (
        <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-2">
                {required && <Text className="text-red-500">* </Text>}
                {label}
            </Text>

            {value ? (
                <View>
                    {/* Preview Image */}
                    <View className="bg-gray-100 rounded-lg overflow-hidden mb-3">
                        <Image
                            source={{ uri: value }}
                            className="w-full h-48"
                            resizeMode="cover"
                        />
                    </View>

                    {/* Change Image Button */}
                    <TouchableOpacity
                        onPress={pickImage}
                        className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-center items-center"
                    >
                        <Ionicons name="image-outline" size={20} color="#42A5F5" />
                        <Text className="text-[#42A5F5] font-medium ml-2">
                            Đổi ảnh khác
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={pickImage}
                    className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
                >
                    <Text className="text-gray-400">Chọn ảnh hoạt động</Text>
                    <Ionicons name="image-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
            )}
        </View>
    );
}
