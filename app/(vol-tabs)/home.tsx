import React, { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, View, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import SearchBar from "../components/SearchBar";
import Banner from "../components/Banner";
import MenuIcons from "../components/MenuIcons";
import SectionHeader from "../components/SectionHeader";
import EventCard, { EventCardData } from "../components/EventCard";
import { getEventFeeds, EventSimpleResponse } from "@/services/event-service";

const Home = () => {
    const [events, setEvents] = useState<EventSimpleResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        try {
            const response = await getEventFeeds({ pageNumber: 0, pageSize: 20, refresh: false });
            setEvents(response.events || []);
        } catch (error) {
            console.error('Error fetching events:', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchEvents();
        }, [fetchEvents])
    );

    const handleSearch = (text: string) => {
        // console.log('Search:', text); // Removed
    };

    const handleSeeMore = () => {
        router.push('/screen/event-feed' as any);
    };

    const handleEventPress = (event: EventSimpleResponse) => {
        if (event.id) {
            router.push({ pathname: '/screen/event-detail', params: { eventId: event.id } } as any);
        }
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
                <View className="pb-4">
                    {loading ? (
                        <ActivityIndicator size="large" color="#42A4F5" style={{ paddingVertical: 20 }} />
                    ) : events.length === 0 ? (
                        <Text className="text-center text-gray-400 py-6">Không có sự kiện nào</Text>
                    ) : (
                        events.map((event, index) => (
                            <EventCard
                                key={index}
                                event={event}
                                onPress={() => handleEventPress(event)}
                            />
                        ))
                    )}
                </View>
                <View className="h-6" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default Home;