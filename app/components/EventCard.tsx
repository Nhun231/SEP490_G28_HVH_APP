import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export interface EventCardData {
    id: string;
    name: string;
    start_date: string;
    org_id: string; //temporary using string
    image: any;
    status: 'upcoming';
}

interface EventCardProps {
    event: EventCardData;
    onPress?: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
    return (
        <TouchableOpacity
            className="bg-white rounded-2xl overflow-hidden mb-4 shadow-sm"
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Image with Status Badge */}
            <View className="relative">
                <Image
                    source={{uri: event.image}}
                    className="w-full h-48"
                    resizeMode="cover"
                />
                <View className={`absolute top-3 left-3 bg-[#42A5F5] px-3 py-1 rounded-full`}>
                    <Text className="text-white text-xs font-semibold">
                        {'Sắp diễn ra'}
                    </Text>
                </View>
            </View>

            {/* Content */}
            <View className="p-4">
                <Text className="text-gray-900 text-lg font-bold mb-3" numberOfLines={2}>
                    {event.name}
                </Text>

                {/* Date */}
                <View className="flex-row items-center mb-2">
                    <Ionicons name="calendar" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <Text className="text-gray-600 text-sm">{event.start_date}</Text>
                </View>

                {/* Location */}
                <View className="flex-row items-center">
                    <Ionicons name="business" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <Text className="text-gray-600 text-sm flex-1" numberOfLines={1}>
                        {event.org_id}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}
