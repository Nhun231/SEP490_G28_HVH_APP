import { EventSimpleResponse, getEventFeeds } from '@/services/event-service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../components/EventCard';

// ─── helpers ────────────────────────────────────────────────────────
const VIETNAMESE_DAYS = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function generateDates(count: number): { label: string; subLabel: string; iso: string }[] {
    const today = new Date();
    const result = [];
    for (let i = 0; i < count; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayName = i === 0 ? 'Hôm nay' : VIETNAMESE_DAYS[d.getDay()];
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        result.push({ label: dayName, subLabel: dateStr, iso });
    }
    return result;
}

// ─── filter chip data ────────────────────────────────────────────────
interface FilterChip {
    id: string;
    label: string;
}

const FILTER_CHIPS: FilterChip[] = [
    { id: 'area', label: 'Tất cả\nkhu vực' },
    { id: 'field', label: 'Lĩnh\nvực' },
    { id: 'sort', label: 'Mới\nnhất' },
    { id: 'other', label: 'Bộ lọc\nkhác' },
];

// ─── component ───────────────────────────────────────────────────────
const EventFeed = () => {
    const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
    const [events, setEvents] = useState<EventSimpleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const dates = useMemo(() => generateDates(7), []);

    // ─── fetch events ────────────────────────────────────────────────
    const fetchEvents = useCallback(async (dateIso?: string, page: number = 0) => {
        try {
            const response = await getEventFeeds({
                pageNumber: page,
                pageSize: 20,
                refresh: false,
                ...(dateIso && { startDate: dateIso, endDate: dateIso }),
            });
            
            if (page === 0) {
                setEvents(response.events || []);
            } else {
                setEvents(prev => [...prev, ...(response.events || [])]);
            }
            setHasMore(response.hasMore ?? false);
            setPageNumber(page);
        } catch (error) {
            console.error('Error fetching events:', error);
            if (page === 0) setEvents([]);
        }
    }, []);

    // initial load
    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchEvents();
            setLoading(false);
        })();
    }, [fetchEvents]);

    // when date filter changes
    const handleDateSelect = useCallback(async (index: number | null) => {
        setSelectedDateIndex(index);
        setLoading(true);
        if (index === null) {
            await fetchEvents(undefined, 0);
        } else {
            await fetchEvents(dates[index].iso, 0);
        }
        setLoading(false);
    }, [dates, fetchEvents]);

    // pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        const dateIso = selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined;
        await fetchEvents(dateIso, 0);
        setRefreshing(false);
    }, [selectedDateIndex, dates, fetchEvents]);

    // load more (pagination)
    const loadMoreEvents = useCallback(async () => {
        if (!hasMore || loadingMore || loading || refreshing) return;
        setLoadingMore(true);
        const dateIso = selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined;
        await fetchEvents(dateIso, pageNumber + 1);
        setLoadingMore(false);
    }, [hasMore, loadingMore, loading, refreshing, selectedDateIndex, dates, pageNumber, fetchEvents]);

    const handleGoBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/home');
        }
    };

    const handleSearch = () => {
        console.log('Open search');
    };

    const handleEventPress = (event: EventSimpleResponse) => {
        console.log('Event pressed:', event.name);
        // TODO: navigate to event details
    };

    // ─── render ──────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* ═══ HEADER ═══ */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tìm hoạt động</Text>
                <TouchableOpacity onPress={handleSearch} style={styles.headerBtn}>
                    <Ionicons name="search" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* ═══ CONTENT AREA (white bg) ═══ */}
            <View style={styles.contentArea}>
            {/* ═══ FILTER CHIPS ═══ */}
            <View style={styles.filterRow}>
                {FILTER_CHIPS.map((chip) => (
                    <TouchableOpacity key={chip.id} style={styles.filterChip} activeOpacity={0.7}>
                        <Text style={styles.filterChipText}>{chip.label}</Text>
                        <Ionicons name="chevron-down" size={14} color="#6B7280" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* ═══ DATE SELECTOR ═══ */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dateContainer}
                contentContainerStyle={styles.dateContent}
            >
                {/* "Tất cả ngày" chip */}
                <TouchableOpacity
                    style={[
                        styles.dateChip,
                        selectedDateIndex === null && styles.dateChipActive,
                    ]}
                    onPress={() => handleDateSelect(null)}
                    activeOpacity={0.7}
                >
                    <Text
                        style={[
                            styles.dateChipLabel,
                            selectedDateIndex === null && styles.dateChipLabelActive,
                        ]}
                    >
                        Tất{'\n'}cả{'\n'}ngày
                    </Text>
                </TouchableOpacity>

                {/* Day chips */}
                {dates.map((d, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.dateChip,
                            selectedDateIndex === index && styles.dateChipActive,
                        ]}
                        onPress={() => handleDateSelect(index)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.dateChipLabel,
                                selectedDateIndex === index && styles.dateChipLabelActive,
                            ]}
                        >
                            {d.label}
                        </Text>
                        <Text
                            style={[
                                styles.dateChipSub,
                                selectedDateIndex === index && styles.dateChipSubActive,
                            ]}
                        >
                            {d.subLabel}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* ═══ EVENT LIST ═══ */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#42A4F5" />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item }) => (
                        <EventCard
                            event={item}
                            onPress={() => handleEventPress(item)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMoreEvents}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator style={{ padding: 16 }} size="small" color="#42A4F5" />
                        ) : null
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#42A4F5']}
                            tintColor="#42A4F5"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                            <Text style={styles.emptyText}>Không có sự kiện nào</Text>
                            <Text style={styles.emptySubText}>Thử thay đổi bộ lọc hoặc ngày</Text>
                        </View>
                    }
                />
            )}
            </View>
        </SafeAreaView>
    );
};

export default EventFeed;

// ─── styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E3F2FD',
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#42A4F5',
        paddingHorizontal: 12,
        paddingBottom: 14,
    },
    headerBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* ── Filter chips row ── */
    filterRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    filterChipText: {
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        lineHeight: 16,
    },

    /* ── Date selector ── */
    dateContainer: {
        backgroundColor: '#FFFFFF',
        maxHeight: 72,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    dateContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    dateChip: {
        minWidth: 68,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 3,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    dateChipActive: {
        backgroundColor: '#42A4F5',
    },
    dateChipLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    dateChipLabelActive: {
        color: '#FFFFFF',
    },
    dateChipSub: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
        textAlign: 'center',
    },
    dateChipSubActive: {
        color: '#FFFFFF',
    },

    /* ── Event list ── */
    listContent: {
        paddingTop: 12,
        paddingBottom: 24,
    },

    /* ── Loading ── */
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },

    /* ── Empty ── */
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 12,
    },
    emptySubText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 4,
    },
});
