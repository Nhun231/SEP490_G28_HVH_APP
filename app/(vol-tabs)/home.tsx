import React, { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Banner from "../components/home/Banner";
import MenuIcons from "../components/home/MenuIcons";
import SectionHeader from "../components/home/SectionHeader";
import EventCard from "../components/home/EventCard";
import { getEventFeeds, EventSimpleResponse } from "@/services/event-service";

const Home = () => {
    const [events, setEvents] = useState<EventSimpleResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        try {
            const response = await getEventFeeds({ pageNumber: 0, pageSize: 20, refresh: false });
            setEvents(response.events || []);
        } catch (error) {
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

    const handleSeeMore = () => {
        router.push('/screen/volunteer-screens/event-feed' as any);
    };

    const handleEventPress = (event: EventSimpleResponse) => {
        if (event.id) {
            router.push({ pathname: '/screen/volunteer-screens/event-detail-vol', params: { eventId: event.id } } as any);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Trang chủ</Text>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => router.push('/screen/volunteer-screens/notifications' as any)}
                >
                    <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                <Banner />
                <MenuIcons />
                <SectionHeader title="Sự kiện mới nhất" onSeeMore={handleSeeMore} />
                <View style={{ paddingBottom: 16 }}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#42A4F5" style={{ paddingVertical: 20 }} />
                    ) : events.length === 0 ? (
                        <Text style={styles.empty}>Không có sự kiện nào</Text>
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
                <View style={{ height: 24 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#42A4F5' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    scroll: { backgroundColor: '#E3F2FD' },
    empty: { textAlign: 'center', color: '#9CA3AF', paddingVertical: 24 },
});

export default Home;