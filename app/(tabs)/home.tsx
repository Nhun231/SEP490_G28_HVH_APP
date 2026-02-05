import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SearchBar from "../components/SearchBar";
import Banner from "../components/Banner";
import MenuIcons from "../components/MenuIcons";
import SectionHeader from "../components/SectionHeader";
import EventCard, { EventCardData } from "../components/EventCard";

const Home = () => {
    // Mock data cho events
    const events: EventCardData[] = [
        {
            id: '1',
            title: 'Chiến dịch Xuân 2024 - Tình nguyện vì cộng đồng',
            date: '15/03/2025',
            location: 'Hội Chữ thập đỏ Việt Nam',
            image: require('../../assets/images/react-logo.png'),
            status: 'upcoming',
        },
        {
            id: '2',
            title: 'Bảo vệ trẻ em - Tương lai tươi sáng',
            date: '20/03/2025',
            location: 'Quỹ Bảo trợ trẻ em Việt Nam',
            image: require('../../assets/images/react-logo.png'),
            status: 'upcoming',
        },
        {
            id: '3',
            title: 'Làm sạch môi trường - Bảo vệ biển đảo',
            date: '25/03/2025',
            location: 'Trung tâm Bảo vệ môi trường',
            image: require('../../assets/images/react-logo.png'),
            status: 'upcoming',
        },
        {
            id: '4',
            title: 'Hiến máu nhân đạo - Giọt hồng yêu thương',
            date: '28/03/2025',
            location: 'Viện Huyết học Truyền máu',
            image: require('../../assets/images/react-logo.png'),
            status: 'upcoming',
        },
    ];

    const handleSearch = (text: string) => {
        console.log('Search:', text);
        // Implement search logic here
    };

    const handleSeeMore = () => {
        console.log('See more events');
        // Navigate to events list screen
    };

    const handleEventPress = (eventId: string) => {
        console.log('Event pressed:', eventId);
        // Navigate to event detail screen
    };

    return (
        // bg-[#81D4FA]
        <SafeAreaView className="flex-1 bg-gray-50 "> 
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