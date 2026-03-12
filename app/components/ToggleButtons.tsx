import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ToggleButtonsProps {
    label: string;
    options: string[];
    selected: number;
    onChange: (index: number) => void;
}

export default function ToggleButtons({ 
    label, 
    options, 
    selected, 
    onChange 
}: ToggleButtonsProps) {
    return (
        <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-2">
                <Text className="text-red-500">* </Text>
                {label}
            </Text>
            <View className="flex-row gap-3">
                {options.map((option, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => onChange(index)}
                        className={`flex-1 py-3 rounded-lg border ${
                            selected === index
                                ? 'bg-[#42A5F5] border-[#42A5F5]'
                                : 'bg-white border-gray-200'
                        }`}
                    >
                        <Text
                            className={`text-center font-medium ${
                                selected === index ? 'text-white' : 'text-gray-700'
                            }`}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
