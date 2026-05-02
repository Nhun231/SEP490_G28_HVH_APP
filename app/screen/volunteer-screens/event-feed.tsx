import { EventSimpleResponse } from '@/services/event-types';
import { getEventFeeds } from '@/services/public-event-service';
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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventCard from '../../components/home/EventCard';
import AreaFilterSheet from '../../components/volunteer/event-feed/AreaFilterSheet';
import DomainFilterSheet from '../../components/volunteer/event-feed/DomainFilterSheet';

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

const EventFeed = () => {
    const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
    const [searchText, setSearchText] = useState('');
    const [events, setEvents] = useState<EventSimpleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [areaSheetVisible, setAreaSheetVisible] = useState(false);
    const [domainSheetVisible, setDomainSheetVisible] = useState(false);
    const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
    const [selectedSubdomainIds, setSelectedSubdomainIds] = useState<number[]>([]);

    const dates = useMemo(() => generateDates(7), []);

    // Base single-address call — returns raw API response
    const fetchSingle = useCallback(async (opts: {
        dateIso?: string;
        page?: number;
        name?: string;
        address?: string;
        subdomainIds?: number[];
    }) => {
        const { dateIso, page = 0, name, address, subdomainIds } = opts;
        return getEventFeeds({
            pageNumber: page,
            pageSize: 20,
            refresh: false,
            ...(dateIso && { startDate: dateIso, endDate: dateIso }),
            ...(name && { name }),
            ...(address && { address }),
            ...(subdomainIds?.length && { activitySubDomainIds: subdomainIds }),
        });
    }, []);

    // OR-logic: if multiple districts selected, make one call per district in parallel
    // then merge + deduplicate by event id
    const fetchOr = useCallback(async (opts: {
        dateIso?: string;
        page?: number;
        name?: string;
        districts?: string[];
        subdomainIds?: number[];
    }) => {
        const { districts = [], page = 0, ...rest } = opts;
        if (districts.length === 0) {
            const res = await fetchSingle({ ...rest, page });
            return { events: res.events || [], hasMore: res.hasMore ?? false };
        }
        // Parallel calls — one per district
        const results = await Promise.all(
            districts.map(addr => fetchSingle({ ...rest, address: addr, page: 0 }))
        );
        const seen = new Set<string>();
        const merged: EventSimpleResponse[] = [];
        for (const r of results) {
            for (const e of (r.events || [])) {
                if (!seen.has(e.id)) { seen.add(e.id); merged.push(e); }
            }
        }
        return { events: merged, hasMore: false }; // pagination not meaningful when merging
    }, [fetchSingle]);

    const applyAndSet = useCallback(async (
        opts: Parameters<typeof fetchOr>[0],
        page = 0,
    ) => {
        const { events, hasMore } = await fetchOr({ ...opts, page });
        if (page === 0) setEvents(events);
        else setEvents(prev => [...prev, ...events]);
        setHasMore(hasMore);
        setPageNumber(page);
    }, [fetchOr]);


    // initial load
    useEffect(() => {
        (async () => {
            setLoading(true);
            try { await applyAndSet({}); } catch { setEvents([]); }
            setLoading(false);
        })();
    }, [applyAndSet]);

    // unified search/filter trigger
    const applyFilters = useCallback(async (opts: {
        dateIso?: string;
        name?: string;
        districts?: string[];
        subdomainIds?: number[];
    } = {}) => {
        setLoading(true);
        try {
            await applyAndSet(opts, 0);
        } catch (e) {
            console.error('Filter error', e);
            setEvents([]);
        }
        setLoading(false);
    }, [applyAndSet]);

    // when date filter changes
    const handleDateSelect = useCallback(async (index: number | null) => {
        setSelectedDateIndex(index);
        await applyFilters({
            dateIso: index !== null ? dates[index].iso : undefined,
            name: searchText || undefined,
            districts: selectedDistricts,
            subdomainIds: selectedSubdomainIds,
        });
    }, [dates, searchText, selectedDistricts, selectedSubdomainIds, applyFilters]);

    // pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await applyAndSet({
                dateIso: selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined,
                name: searchText || undefined,
                districts: selectedDistricts,
                subdomainIds: selectedSubdomainIds,
            }, 0);
        } catch { /* silent */ }
        setRefreshing(false);
    }, [selectedDateIndex, dates, applyAndSet, searchText, selectedDistricts, selectedSubdomainIds]);

    // load more — only works when districts is empty (pagination meaningful)
    const loadMoreEvents = useCallback(async () => {
        if (!hasMore || loadingMore || loading || refreshing || selectedDistricts.length > 0) return;
        setLoadingMore(true);
        try {
            await applyAndSet({
                dateIso: selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined,
                name: searchText || undefined,
                districts: [],
                subdomainIds: selectedSubdomainIds,
            }, pageNumber + 1);
        } catch { /* silent */ }
        setLoadingMore(false);
    }, [hasMore, loadingMore, loading, refreshing, selectedDateIndex, dates, pageNumber, applyAndSet, searchText, selectedDistricts, selectedSubdomainIds]);

    const handleGoBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(vol-tabs)/home');
    };

    const handleSearch = useCallback(async () => {
        await applyFilters({
            dateIso: selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined,
            name: searchText || undefined,
            districts: selectedDistricts,
            subdomainIds: selectedSubdomainIds,
        });
    }, [searchText, selectedDateIndex, dates, selectedDistricts, selectedSubdomainIds, applyFilters]);

    const handleAreaConfirm = async (districts: string[]) => {
        setSelectedDistricts(districts);
        setAreaSheetVisible(false);
        await applyFilters({
            dateIso: selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined,
            name: searchText || undefined,
            districts,
            subdomainIds: selectedSubdomainIds,
        });
    };

    const handleDomainConfirm = async (ids: number[]) => {
        setSelectedSubdomainIds(ids);
        setDomainSheetVisible(false);
        await applyFilters({
            dateIso: selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined,
            name: searchText || undefined,
            districts: selectedDistricts,
            subdomainIds: ids,
        });
    };

    const handleEventPress = (event: EventSimpleResponse) => {
        router.push({ pathname: '/screen/volunteer-screens/event-detail-vol', params: { eventId: event.id } } as any);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* ═══ HEADER ═══ */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tìm hoạt động</Text>
                <View style={styles.headerBtn} />
            </View>

            {/* ═══ CONTENT AREA ═══ */}
            <View style={styles.contentArea}>
                {/* ═══ SEARCH INPUT ═══ */}
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm sự kiện..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
                        <Ionicons name="search" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* ═══ FILTER CHIPS ═══ */}
                <View style={styles.filterRow}>
                    {/* Area chip */}
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            selectedDistricts.length > 0 && styles.filterChipActive,
                        ]}
                        onPress={() => setAreaSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="location-outline"
                            size={13}
                            color={selectedDistricts.length > 0 ? '#42A4F5' : '#6B7280'}
                            style={{ marginRight: 3 }}
                        />
                        <Text style={[
                            styles.filterChipText,
                            selectedDistricts.length > 0 && styles.filterChipTextActive,
                        ]}>
                            {selectedDistricts.length > 0
                                ? `Phường/xã (${selectedDistricts.length})`
                                : 'Tất cả phường/xã'}
                        </Text>
                        <Ionicons
                            name="chevron-down"
                            size={12}
                            color={selectedDistricts.length > 0 ? '#42A4F5' : '#6B7280'}
                            style={{ marginLeft: 2 }}
                        />
                    </TouchableOpacity>

                    <View style={styles.chipDivider} />

                    {/* Domain chip */}
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            selectedSubdomainIds.length > 0 && styles.filterChipActive,
                        ]}
                        onPress={() => setDomainSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="layers-outline"
                            size={13}
                            color={selectedSubdomainIds.length > 0 ? '#42A4F5' : '#6B7280'}
                            style={{ marginRight: 3 }}
                        />
                        <Text style={[
                            styles.filterChipText,
                            selectedSubdomainIds.length > 0 && styles.filterChipTextActive,
                        ]}>
                            {selectedSubdomainIds.length > 0
                                ? `Lĩnh vực (${selectedSubdomainIds.length})`
                                : 'Lĩnh vực'}
                        </Text>
                        <Ionicons
                            name="chevron-down"
                            size={12}
                            color={selectedSubdomainIds.length > 0 ? '#42A4F5' : '#6B7280'}
                            style={{ marginLeft: 2 }}
                        />
                    </TouchableOpacity>

                    <View style={styles.chipDivider} />

                    {/* Clear all — only shown when any filter is active */}
                    {(selectedDistricts.length > 0 || selectedSubdomainIds.length > 0) ? (
                        <TouchableOpacity
                            style={styles.filterChip}
                            onPress={async () => {
                                setSelectedDistricts([]);
                                setSelectedSubdomainIds([]);
                                await applyFilters({
                                    dateIso: selectedDateIndex !== null ? dates[selectedDateIndex].iso : undefined,
                                    name: searchText || undefined,
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 3 }} />
                            <Text style={[styles.filterChipText, { color: '#EF4444' }]}>
                                Xóa{'\n'}lọc
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.filterChip, { opacity: 0 }]} pointerEvents="none">
                            <Text style={styles.filterChipText}>{'Mới\nnhất'}</Text>
                        </View>
                    )}
                </View>

                {/* ═══ DATE SELECTOR ═══ */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.dateContainer}
                    contentContainerStyle={styles.dateContent}
                >
                    <TouchableOpacity
                        style={[styles.dateChip, selectedDateIndex === null && styles.dateChipActive]}
                        onPress={() => handleDateSelect(null)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.dateChipLabel, selectedDateIndex === null && styles.dateChipLabelActive]}>
                            Tất cả ngày
                        </Text>
                    </TouchableOpacity>

                    {dates.map((d, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.dateChip, selectedDateIndex === index && styles.dateChipActive]}
                            onPress={() => handleDateSelect(index)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dateChipLabel, selectedDateIndex === index && styles.dateChipLabelActive]}>
                                {d.label}
                            </Text>
                            <Text style={[styles.dateChipSub, selectedDateIndex === index && styles.dateChipSubActive]}>
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
                        keyExtractor={(item) => item.id}
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

            {/* ═══ FILTER SHEETS ═══ */}
            <AreaFilterSheet
                visible={areaSheetVisible}
                initialSelected={selectedDistricts}
                onConfirm={handleAreaConfirm}
                onClose={() => setAreaSheetVisible(false)}
            />
            <DomainFilterSheet
                visible={domainSheetVisible}
                initialSelectedIds={selectedSubdomainIds}
                onConfirm={handleDomainConfirm}
                onClose={() => setDomainSheetVisible(false)}
            />
        </SafeAreaView>
    );
};

export default EventFeed;

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
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        alignItems: 'center',
    },
    filterChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: 8,
    },
    filterChipActive: {
        backgroundColor: '#EBF5FF',
    },
    filterChipText: {
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
        lineHeight: 16,
    },
    filterChipTextActive: {
        color: '#42A4F5',
        fontWeight: '600',
    },
    chipDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#E5E7EB',
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

    /* ── Search bar ── */
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        height: 40,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        color: '#1F2937',
    },
    searchBtn: {
        width: 40,
        height: 40,
        backgroundColor: '#42A4F5',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
