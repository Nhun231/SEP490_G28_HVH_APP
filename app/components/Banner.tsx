import React from 'react';
import { View, Text, Image, Dimensions, ScrollView } from 'react-native';

const { width } = Dimensions.get('window');

interface BannerItem {
    id: string;
    title: string;
    subtitle: string;
    image: any;
}

interface BannerProps {
    items?: BannerItem[];
}

export default function Banner({ items }: BannerProps) {
    const [activeIndex, setActiveIndex] = React.useState(0);

    // mock data
    const defaultItems: BannerItem[] = [
        {
            id: '1',
            title: 'Chiến dịch Xuân 2024',
            subtitle: 'Tình nguyện vì cộng đồng - Lan tỏa yêu thương',
            image: require('../../assets/images/react-logo.png'),
        },
        {
            id: '2',
            title: 'Chiến dịch Xuân 2024',
            subtitle: 'Tình nguyện vì cộng đồng - Lan tỏa yêu thương',
            image: require('../../assets/images/react-logo.png'),
        },
        {
            id: '3',
            title: 'Chiến dịch Xuân 2024',
            subtitle: 'Tình nguyện vì cộng đồng - Lan tỏa yêu thương',
            image: require('../../assets/images/react-logo.png'),
        },
    ];

    const bannerItems = items || defaultItems;

    const onScroll = (event: any) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(slideIndex);
    };

    return (
        <View className="px-4 py-4">
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {bannerItems.map((item) => (
                    <View
                        key={item.id}
                        style={{ width: width - 32 }}
                        className="rounded-2xl overflow-hidden"
                    >
                        <Image
                            source={item.image}
                            className="w-full h-48"
                            resizeMode="cover"
                        />
                        <View className="absolute bottom-0 left-0 right-0 bg-black/40 p-4">
                            <Text className="text-white text-xl font-bold">
                                {item.title}
                            </Text>
                            <Text className="text-white text-sm mt-1">
                                {item.subtitle}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
            {/* Pagination Dots */}
            <View className="flex-row justify-center mt-3">
                {bannerItems.map((_, index) => (
                    <View
                        key={index}
                        className={`h-2 rounded-full mx-1 ${
                            index === activeIndex
                                ? 'bg-white w-6'
                                : 'bg-white/50 w-2'
                        }`}
                    />
                ))}
            </View>
        </View>
    );
}
