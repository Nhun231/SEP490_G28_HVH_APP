/**
 * org-events.tsx
 * Full paginated list of all events hosted by an organization.
 * Matches event-feed layout/style — same EventCard, same background, same header.
 * No search/filter (no date picker, no area/domain chips).
 */

import { getEventsByOrg } from '@/services/organization-service';
import type { EventSimpleResponse } from '@/services/event-types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../../components/home/EventCard';


const PAGE_SIZE = 10;

export default function OrgEvents() {
    const { orgId, orgName } = useLocalSearchParams<{ orgId: string; orgName?: string }>();

    const [events, setEvents] = useState<EventSimpleResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchingRef = useRef(false);

    const fetchEvents = useCallback(async (opts: {
        page?: number;
        append?: boolean;
    } = {}) => {
        if (!orgId || fetchingRef.current) return;
        fetchingRef.current = true;
        try {
            const { page = 0, append = false } = opts;
            const data = await getEventsByOrg(orgId, { pageNumber: page, pageSize: PAGE_SIZE });
            const items = data.content ?? [];

            if (append) setEvents(prev => [...prev, ...items]);
            else setEvents(items);

            setPageNumber(page);
            setTotalElements(data.totalElements ?? items.length);
            setHasMore(page + 1 < (data.totalPages ?? 1));
            setError(null);
        } catch (e: any) {
            setError(e.message || 'Không thể tải sự kiện');
        } finally {
            fetchingRef.current = false;
        }
    }, [orgId]);

    // Initial load
    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchEvents({ page: 0 });
            setLoading(false);
        })();
    }, [fetchEvents]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchEvents({ page: 0 });
        setRefreshing(false);
    }, [fetchEvents]);

    const handleLoadMore = useCallback(async () => {
        if (!hasMore || loadingMore || loading || refreshing) return;
        setLoadingMore(true);
        await fetchEvents({ page: pageNumber + 1, append: true });
        setLoadingMore(false);
    }, [hasMore, loadingMore, loading, refreshing, pageNumber, fetchEvents]);

    const handleEventPress = (event: EventSimpleResponse) => {
        router.push({
            pathname: '/screen/volunteer-screens/event-detail-vol',
            params: { eventId: event.id },
        } as any);
    };

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(vol-tabs)/benefit' as any);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>

            {/* ═══ HEADER (matches event-feed) ═══ */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {orgName || 'Sự kiện tổ chức'}
                    </Text>
                    {!loading && (
                        <Text style={styles.headerSub}>
                            {totalElements.toLocaleString('vi-VN')} sự kiện
                        </Text>
                    )}
                </View>
                {/* Spacer to keep title centred */}
                <View style={styles.headerBtn} />
            </View>

            {/* ═══ CONTENT AREA (same background as event-feed) ═══ */}
            <View style={styles.contentArea}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                ) : error && events.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
                        <Text style={[styles.emptyText, { color: '#EF4444' }]}>Lỗi tải dữ liệu</Text>
                        <Text style={styles.emptySubText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => fetchEvents({ page: 0 })}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="refresh" size={16} color="#fff" />
                            <Text style={styles.retryBtnText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={events}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <EventCard
                                event={item}
                                onPress={() => handleEventPress(item)}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loadingMore
                                ? <ActivityIndicator style={{ padding: 16 }} size="small" color="#42A4F5" />
                                : null
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
                                <Text style={styles.emptyText}>Chưa có sự kiện nào</Text>
                                <Text style={styles.emptySubText}>
                                    Tổ chức này chưa có hoạt động nào được đăng tải.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}


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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
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

    /* ── Empty / Error ── */
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
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
        textAlign: 'center',
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#42A4F5',
        borderRadius: 10,
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginTop: 16,
    },
    retryBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
});
