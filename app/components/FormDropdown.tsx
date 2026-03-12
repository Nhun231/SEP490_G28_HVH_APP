import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FormDropdownProps {
    label: string;
    placeholder: string;
    value?: string;
    required?: boolean;
    onPress: () => void;
}

export default function FormDropdown({ 
    label, 
    placeholder, 
    value,
    required = false,
    onPress 
}: FormDropdownProps) {
    return (
        <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-2">
                {required && <Text className="text-red-500">* </Text>}
                {label}
            </Text>
            <TouchableOpacity
                onPress={onPress}
                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg py-3 flex-row justify-between items-center"
            >
                <Text className={value ? "text-gray-800" : "text-gray-400"}>
                    {value || placeholder}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
        </View>
    );
}
