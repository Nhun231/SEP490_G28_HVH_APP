import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface MenuItem {
    id: string;
    icon: string;
    label: string;
    color: string;
    onPress: () => void;
}

interface MenuIconsProps {
    items?: MenuItem[];
}

export default function MenuIcons({ items }: MenuIconsProps) {
    // mock data
    const defaultItems: MenuItem[] = [
        {
            id: '1',
            icon: '🎯',
            label: 'Tìm hoạt động',
            color: 'bg-blue-500',
            onPress: () => console.log('Tìm hoạt động'), // change later
        },
        {
            id: '2',
            icon: '🏢',
            label: 'Tìm tổ chức',
            color: 'bg-green-500',
            onPress: () => console.log('Tìm tổ chức'), // change later
        },
        {
            id: '3',
            icon: '📦',
            label: 'Chứng nhận',
            color: 'bg-yellow-500',
            onPress: () => console.log('Chứng nhận'), // change later
        },
        {
            id: '4',
            icon: '📸',
            label: 'Vòng khoảnh khắc',
            color: 'bg-orange-500',
            onPress: () => console.log('Vòng khoảnh khắc'), // change later
        },
        {
            id: '5',
            icon: '▶️',
            label: 'Đăng ký tổ chức',
            color: 'bg-pink-500',
            onPress: () => console.log('Đăng ký tổ chức'), // change later
        },
    ];

    const menuItems = items || defaultItems;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 py-4"
        >
            {menuItems.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    className="items-center mr-4"
                    onPress={item.onPress}
                    style={{ width: 80 }}
                >
                    <View className={`w-16 h-16 ${item.color} rounded-2xl items-center justify-center mb-2`}>
                        <Text className="text-3xl">{item.icon}</Text>
                    </View>
                    <Text className="text-xs text-center text-gray-700" numberOfLines={2}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}
