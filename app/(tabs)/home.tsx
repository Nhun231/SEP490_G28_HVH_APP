import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "../components/SearchBar";
import Banner from "../components/Banner";
import MenuIcons from "../components/MenuIcons";
import SectionHeader from "../components/SectionHeader";
import EventCard, { EventCardData } from "../components/EventCard";

const Home = () => {
    // mock data
    const events: EventCardData[] = [
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

    const handleSearch = (text: string) => {
        console.log('Search:', text);
        // Implement search logic here
    };

    const handleSeeMore = () => {
        console.log('See more events');
        // Navigate to volunteer events list screen
    };

    const handleEventPress = (eventId: string) => {
        console.log('Event pressed:', eventId);
        // Navigate to volunteer event detail screen
    };

    return (
        <SafeAreaView className="flex-1 bg-[#E3F2FD]" edges={["top"]}> 
            <ScrollView showsVerticalScrollIndicator={false}>
                <SearchBar onSearch={handleSearch} />
                <Banner />
                <MenuIcons />
                <SectionHeader
                    title="Sự kiện mới nhất"
                    onSeeMore={handleSeeMore}
                />
                <View className="px-4">
                    {events.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            onPress={() => handleEventPress(event.id)}
                        />
                    ))}
                </View>
                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default Home;