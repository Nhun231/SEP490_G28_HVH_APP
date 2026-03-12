import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface FormInputProps extends TextInputProps {
    label: string;
    required?: boolean;
    error?: string;
}

export default function FormInput({ 
    label, 
    required = false, 
    error,
    ...inputProps 
}: FormInputProps) {
    return (
        <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-2">
                {required && <Text className="text-red-500">* </Text>}
                {label}
            </Text>
            <TextInput
                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg py-3 text-gray-800"
                placeholderTextColor="#898989"
                {...inputProps}
            />
            {error && (
                <Text className="text-red-500 text-xs mt-1">{error}</Text>
            )}
        </View>
    );
}
