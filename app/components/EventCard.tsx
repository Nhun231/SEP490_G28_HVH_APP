import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

export interface EventCardData {
    id: string;
    title: string;
    date: string;
    location: string;
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
                    source={event.image}
                    className="w-full h-48"
                    resizeMode="cover"
                />
                <View className={`absolute top-3 left-3 bg-orange-500 px-3 py-1 rounded-full`}>
                    <Text className="text-white text-xs font-semibold">
                        {'Sắp diễn ra'}
                    </Text>
                </View>
            </View>

            {/* Content */}
            <View className="p-4">
                <Text className="text-gray-900 text-lg font-bold mb-3" numberOfLines={2}>
                    {event.title}
                </Text>

                {/* Date */}
                <View className="flex-row items-center mb-2">
                    <Text className="text-gray-400 mr-2">🗓️</Text>
                    <Text className="text-gray-300 text-sm">{event.date}</Text>
                </View>

                {/* Location */}
                <View className="flex-row items-center">
                    <Text className="text-gray-400 mr-2">🏢</Text>
                    <Text className="text-gray-300 text-sm flex-1" numberOfLines={1}>
                        {event.location}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}
