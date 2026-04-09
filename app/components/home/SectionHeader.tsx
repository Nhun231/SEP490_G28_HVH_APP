import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface SectionHeaderProps {
    title: string;
    onSeeMore?: () => void;
    showSeeMore?: boolean;
}

export default function SectionHeader({ title, onSeeMore, showSeeMore = true }: SectionHeaderProps) {
    return (
        <View className="flex-row justify-between items-center px-4 py-3">
            <Text className="text-xl font-bold text-gray-800">{title}</Text>
            {showSeeMore && (
                <TouchableOpacity onPress={onSeeMore}>
                    <Text className="text-[#42A5F5] font-semibold">
                        Xem thêm  ›
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
