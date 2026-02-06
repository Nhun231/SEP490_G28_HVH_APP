import React from 'react';
import { View, Text, Image, Dimensions, ScrollView } from 'react-native';

const { width } = Dimensions.get('window');

interface BannerItem {
    id: string;
    name: string;
    start_date: string;
    org_id: string; //temporary using string
    image: any;
    status: 'upcoming';
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
            name: 'Chiến dịch Xuân 2025 - Tình nguyện vì cộng đồng',
            start_date: '15/03/2025',
            org_id: 'Hội Chữ thập đỏ Việt Nam', //temporary using string
            image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=400&fit=crop',
            status: 'upcoming',
        },
        {
            id: '2',
            name: 'Bảo vệ trẻ em - Tương lai tươi sáng',
            start_date: '20/03/2025',
            org_id: 'Quỹ Bảo trợ trẻ em Việt Nam', //temporary using string
            image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=200&fit=crop',
            status: 'upcoming',
        },
        {
            id: '3',
            name: 'Làm sạch môi trường - Bảo vệ biển đảo',
            start_date: '25/03/2025',
            org_id: 'Trung tâm Bảo vệ môi trường', //temporary using string
            image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=200&fit=crop',
            status: 'upcoming',
        },
        {
            id: '4',
            name: 'Hiến máu nhân đạo - Giọt hồng yêu thương',
            start_date: '28/03/2025',
            org_id: 'Viện Huyết học Truyền máu', //temporary using string
            image: 'https://images.unsplash.com/photo-1615461066159-fea0960485d5?w=400&h=200&fit=crop',
            status: 'upcoming',
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
                            source={{uri: item.image}}
                            className="w-full h-48"
                            resizeMode="cover"
                        />
                        <View className="absolute bottom-0 left-0 right-0 bg-black/40 p-4">
                            <Text className="text-white text-xl font-bold">
                                {item.name}
                            </Text>
                            <Text className="text-white text-sm mt-1">
                                {item.start_date}
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
                                ? 'bg-[#42A5F5] w-6'
                                : 'bg-[#90CAF9] w-2'
                        }`}
                    />
                ))}
            </View>
        </View>
    );
}
