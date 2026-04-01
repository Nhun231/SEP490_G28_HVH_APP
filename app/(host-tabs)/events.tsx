import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView, RefreshControl, TextInput, Animated, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getMyEvents, MyEventStatus, getApiErrorMessage } from '@/services/event-service';
import HostEventCard, { HostEvent, EventStatus } from '../components/HostEventCard';
import StatusChip, { ChipFilter } from '../components/StatusChip';
import SkeletonCard from '../components/SkeletonCard';

// keep events data in cache for each chip key 
type CacheEntry = { events: HostEvent[]; hasMore: boolean; page: number; ts: number };
const CACHE_TTL_MS = 30_000; // 30 sec
const eventCache = new Map<string, CacheEntry>();

type MasterTab = 'active' | 'history';

const ACTIVE_CHIPS: ChipFilter[] = [
    { key: 'EDITING', label: 'Soạn thảo' },
    { key: 'SUBMITTED', label: 'Chờ duyệt' },
    { key: 'APPROVED_BY_MNG', label: 'Tổ chức duyệt' },
    { key: 'REJECTED_BY_MNG', label: 'Tổ chức từ chối' },
    { key: 'REJECTED_BY_AD', label: 'Admin từ chối' },
    { key: 'RECRUITING', label: 'Tuyển TNV' },
    { key: 'UPCOMING', label: 'Sắp diễn ra' },
    { key: 'ONGOING', label: 'Đang diễn ra' },
];

const HISTORY_CHIPS: ChipFilter[] = [
    { key: 'ENDED', label: 'Đã kết thúc' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'CANCELLED', label: 'Đã hủy' },
];

const EventManagement = () => {
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);

    // Master tab & chip filter
    const [masterTab, setMasterTab] = useState<MasterTab>('active');
    const [activeChip, setActiveChip] = useState<EventStatus>('EDITING');
    const [historyChip, setHistoryChip] = useState<EventStatus>('ENDED');

    // Search
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const searchAnim = useRef(new Animated.Value(0)).current;
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // API state
    const [events, setEvents] = useState<HostEvent[]>([]);
    const [loading, setLoading] = useState(false);       // only true when no data (show skeleton)
    const [reloading, setReloading] = useState(false);   // true when fetch again but keep old list
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const requestIdRef = useRef(0); // request id to prevent race condition 
    const isLoadingMoreRef = useRef(false); // prevent duplicate load more request
    const PAGE_SIZE = 10;

    // Search bar animation
    const openSearch = () => {
        setSearchVisible(true);
        Animated.spring(searchAnim, {
            toValue: 1,
            useNativeDriver: false,
            bounciness: 6,
        }).start(() => {
            // Focus after animation
            setTimeout(() => inputRef.current?.focus(), 50);
        });
    };

    const closeSearch = () => {
        Keyboard.dismiss();
        setSearchText('');
        setSearchQuery('');
        Animated.timing(searchAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start(() => setSearchVisible(false));
    };

    const handleSearchChange = (text: string) => {
        setSearchText(text);
        // only update query when user stop typing for 400ms
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(text.trim());
        }, 400);
    };

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    // Animated height for the search bar container
    const searchBarHeight = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 52],
    });

    // API fetch
    const fetchEvents = useCallback(async (page: number, isRefresh = false) => {
        if (page > 0 && isLoadingMoreRef.current) return;
        if (page > 0) isLoadingMoreRef.current = true;

        const myId = ++requestIdRef.current
        const chipFilter = masterTab === 'active' ? activeChip : historyChip;
        const cacheKey = `${chipFilter}::${searchQuery}`;

        if (isRefresh) {
            setRefreshing(true);
        } else if (page === 0) {
            // If cache is still fresh — show immediately, fetch in background (stale-while-revalidate)
            const cached = eventCache.get(cacheKey);
            if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
                setEvents(cached.events);
                setHasMore(cached.hasMore);
                setCurrentPage(cached.page);
                setLoading(false);
                setReloading(true); // fetch again in background, don't hide list
            } else if (events.length === 0) {
                setLoading(true);   // nothing yet — show skeleton
            } else {
                setReloading(true); // have old data — keep it, just blur
            }
        } else {
            setLoadingMore(true);
        }

        setError(null);

        try {
            const response = await getMyEvents({
                pageNumber: page,
                pageSize: PAGE_SIZE,
                status: chipFilter as MyEventStatus,
                name: searchQuery || undefined,
            });

            if (myId !== requestIdRef.current) return;

            const mapped: HostEvent[] = response.content
                .map(item => ({
                    ...item,
                    status: item.status as EventStatus,
                    imageUrl: item.imageUrl ?? null,
                }))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const nextHasMore = response.page.number + 1 < response.page.totalPages;

            if (isRefresh || page === 0) {
                setEvents([...mapped]);
                setCurrentPage(0);
                // save to cache
                eventCache.set(cacheKey, { events: mapped, hasMore: nextHasMore, page: 0, ts: Date.now() });
            } else {
                setEvents(prev => {
                    const merged = [...prev, ...mapped];
                    eventCache.set(cacheKey, { events: merged, hasMore: nextHasMore, page, ts: Date.now() });
                    return merged;
                });
            }
            setHasMore(nextHasMore);
            setCurrentPage(page);
        } catch (e) {
            if (myId !== requestIdRef.current) return;
            const msg = getApiErrorMessage(e);
            setError(msg || 'Không thể tải danh sách sự kiện');
        } finally {
            if (myId === requestIdRef.current) {
                setLoading(false);
                setReloading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
            if (page > 0) isLoadingMoreRef.current = false;
        }
    }, [masterTab, activeChip, historyChip, searchQuery]);

    // Re-fetch when filter change — keep old list, let stale-while-revalidate handle it
    useEffect(() => {
        setCurrentPage(0);
        setHasMore(true);
        setError(null);
        fetchEvents(0);
    }, [masterTab, activeChip, historyChip, searchQuery]);

    // When back to tab — only fetch if cache has expired
    useFocusEffect(useCallback(() => {
        const chipFilter = masterTab === 'active' ? activeChip : historyChip;
        const cacheKey = `${chipFilter}::${searchQuery}`;
        const cached = eventCache.get(cacheKey);
        if (!cached || Date.now() - cached.ts >= CACHE_TTL_MS) {
            fetchEvents(0);
        }
    }, [masterTab, activeChip, historyChip, searchQuery, fetchEvents]));

    const handleRefresh = useCallback(() => fetchEvents(0, true), [fetchEvents]);

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && !loading && hasMore && !error) fetchEvents(currentPage + 1);
    }, [loadingMore, loading, hasMore, error, currentPage, fetchEvents]);

    // Derived state
    const currentChip = masterTab === 'active' ? activeChip : historyChip;

    const setCurrentChip = masterTab === 'active'
        ? (v: EventStatus) => setActiveChip(v)
        : (v: EventStatus) => setHistoryChip(v);

    const chips = masterTab === 'active' ? ACTIVE_CHIPS : HISTORY_CHIPS;

    // Chip counts reflect currently loaded events
    const chipCounts = chips.reduce<Record<string, number>>((acc, chip) => {
        acc[chip.key] = events.filter(e => e.status === chip.key).length;
        return acc;
    }, {});

    const handleMasterTab = (tab: MasterTab) => {
        setMasterTab(tab);
        if (tab === 'active') setActiveChip('EDITING');
        else setHistoryChip('ENDED');
    };

    const handleEventPress = (id: string) => {
        const event = events.find(e => e.id === id);
        router.push({
            pathname: '/screen/event-detail',
            params: { id, status: event?.status },
        });
    };

    // render 3 skeleton cards when no data
    const renderSkeleton = () => (
        <View>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
    );

    // render empty when no data
    const renderEmpty = () => {
        if (loading) return renderSkeleton();
        if (error) return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                    <Ionicons name="cloud-offline-outline" size={52} color="#CBD5E1" />
                </View>
                <Text style={styles.emptyTitle}>Không thể tải dữ liệu</Text>
                <Text style={styles.emptySubtitle}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => fetchEvents(0)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                    <Ionicons
                        name={searchQuery ? 'search-outline' : 'calendar-outline'}
                        size={52}
                        color="#CBD5E1"
                    />
                </View>
                <Text style={styles.emptyTitle}>
                    {searchQuery ? 'Không tìm thấy sự kiện' : 'Chưa có sự kiện'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {searchQuery
                        ? `Không có sự kiện nào khớp với "${searchQuery}"`
                        : masterTab === 'active'
                            ? 'Tạo sự kiện mới để bắt đầu hoạt động tình nguyện!'
                            : 'Các sự kiện đã kết thúc sẽ được hiển thị tại đây.'}
                </Text>
            </View>
        );
    };

    // render footer when loading more
    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <Ionicons name="sync-outline" size={18} color="#42A4F5" />
                <Text style={styles.footerLoaderText}>Đang tải thêm...</Text>
            </View>
        );
    };

    // JSX
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Sự kiện của tôi</Text>
                    <Text style={styles.headerSub}>Quản lý toàn bộ sự kiện bạn tổ chức</Text>
                </View>
                <TouchableOpacity
                    style={[styles.headerIconBtn, searchVisible && styles.headerIconBtnActive]}
                    onPress={searchVisible ? closeSearch : openSearch}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={searchVisible ? 'close' : 'search-outline'}
                        size={22}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </View>

            {/* Animated Search Bar */}
            <Animated.View style={[styles.searchWrapper, { height: searchBarHeight }]}>
                {searchVisible && (
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
                        <TextInput
                            ref={inputRef}
                            style={styles.searchInput}
                            placeholder="Tìm kiếm sự kiện..."
                            placeholderTextColor="#94A3B8"
                            value={searchText}
                            onChangeText={handleSearchChange}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => { setSearchText(''); setSearchQuery(''); }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </Animated.View>

            {/* Master Tabs */}
            <View style={styles.masterTabRow}>
                <TouchableOpacity
                    style={[styles.masterTab, masterTab === 'active' && styles.masterTabActive]}
                    onPress={() => handleMasterTab('active')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="flash-outline"
                        size={15}
                        color={masterTab === 'active' ? '#42A4F5' : 'rgba(255,255,255,0.8)'}
                        style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.masterTabText, masterTab === 'active' && styles.masterTabTextActive]}>
                        Đang triển khai
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.masterTab, masterTab === 'history' && styles.masterTabActive]}
                    onPress={() => handleMasterTab('history')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="archive-outline"
                        size={15}
                        color={masterTab === 'history' ? '#42A4F5' : 'rgba(255,255,255,0.8)'}
                        style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.masterTabText, masterTab === 'history' && styles.masterTabTextActive]}>
                        Lịch sử
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Chip bar + List */}
            <View style={styles.listWrapper}>
                {/* Chip filter */}
                <View style={styles.chipBar}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chipBarContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {chips.map(chip => (
                            <StatusChip
                                key={chip.key}
                                chip={chip}
                                isActive={currentChip === chip.key}
                                count={chipCounts[chip.key] ?? 0}
                                onPress={() => setCurrentChip(chip.key)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Event list */}
                <FlatList
                    data={events}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <HostEventCard item={item} onPress={handleEventPress} />}
                    style={[styles.list, reloading && { opacity: 0.55 }]}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#42A4F5']}
                            tintColor={'#42A4F5'}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                />
            </View>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/screen/create-event')}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={24} color="#FFFFFF" />
                <Text style={styles.fabText}>Tạo sự kiện mới</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },

    // Header
    header: {
        backgroundColor: '#42A4F5',
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    headerSub: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 13,
        marginTop: 2,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    headerIconBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.35)',
    },

    // Animated search bar
    searchWrapper: {
        overflow: 'hidden',
        paddingHorizontal: 16,
        backgroundColor: '#42A4F5',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 10,
        height: 42,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        paddingVertical: 0,
        height: '100%',
    },

    // Master tabs
    masterTabRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.18)',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    masterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    masterTabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    masterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
    },
    masterTabTextActive: {
        color: '#42A4F5',
    },

    // Chip bar
    chipBar: {
        backgroundColor: '#F8FAFC',
        paddingTop: 14,
        paddingBottom: 10,
    },
    chipBarContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        gap: 5,
    },
    chipActive: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    chipTextActive: {
        color: '#FFFFFF',
    },
    chipBadge: {
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    chipBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    chipBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    chipBadgeTextActive: {
        color: '#FFFFFF',
    },

    // List
    listWrapper: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    list: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 110,
    },

    // Empty state
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
    },
    emptyIconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: '#42A4F5',
        borderRadius: 10,
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // Footer loader
    footerLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    footerLoaderText: {
        fontSize: 14,
        color: '#94A3B8',
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        backgroundColor: '#42A4F5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 16,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
        gap: 8,
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default EventManagement;
