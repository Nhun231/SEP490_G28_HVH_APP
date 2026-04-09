import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import EventListHeader, { MasterTabConfig } from '../../components/EventListHeader';
import VolunteerCard, { VolunteerApplication } from '../../components/VolunteerCard';
import { getRegisteredParticipants, RegisteredParticipant, getApiErrorMessage } from '@/services/event-service';

type AppTab = 'PENDING' | 'APPROVED';

const MASTER_TABS: MasterTabConfig<AppTab>[] = [
    { key: 'PENDING', label: 'Chờ duyệt', icon: 'hourglass-outline' },
    { key: 'APPROVED', label: 'Đã duyệt', icon: 'checkmark-circle-outline' },
];

const PAGE_SIZE = 10;

// Map API participant → VolunteerApplication used by VolunteerCard
function toVolunteerApplication(p: RegisteredParticipant): VolunteerApplication {
    return {
        id: p.applicationId,
        name: p.name,
        nickName: p.nickName,
        avatarUrl: p.avatarUrl ?? null,
        creditScore: p.creditScore,
        honorScore: p.honorScore,
        address: p.address ?? '',
        createdAt: p.createdAt,
        status: 'PENDING',
    };
}

// mock approved data
const MOCK_APPROVED: VolunteerApplication[] = [
    {
        id: 'mock-4',
        name: 'Phạm Thu Hà',
        avatarUrl: null,
        creditScore: 60,
        honorScore: 29,
        address: 'Cầu Giấy, Hà Nội',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'APPROVED',
    },
    {
        id: 'mock-5',
        name: 'Nguyễn Văn An',
        avatarUrl: null,
        creditScore: 70,
        honorScore: 28,
        address: 'Thanh Xuân, Hà Nội',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'APPROVED',
    },
];

const EventApplicationsScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ eventName?: string; sessionId?: string }>();
    const eventName = params.eventName || 'Sự kiện';
    const sessionId = params.sessionId || '';

    // Master tab state
    const [masterTab, setMasterTab] = useState<AppTab>('PENDING');

    // Search state
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Pending data 
    const [pendingList, setPendingList] = useState<VolunteerApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const pageNumberRef = useRef(0);

    // Approved data (mock)
    const [approvedList] = useState<VolunteerApplication[]>(MOCK_APPROVED);

    // Fetch pending participants
    const fetchPending = useCallback(async (page: number, replace: boolean) => {
        if (!sessionId) return;
        try {
            const res = await getRegisteredParticipants(sessionId, page, PAGE_SIZE);
            const mapped = res.registeredParticipants.map(toVolunteerApplication);
            if (replace) {
                setPendingList(mapped);
            } else {
                setPendingList(prev => [...prev, ...mapped]);
            }
            setHasMore(res.hasMore);
            pageNumberRef.current = page;
        } catch (err) {
            console.error('[EventApplications] fetch error:', getApiErrorMessage(err));
        }
    }, [sessionId]);

    // Initial load
    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchPending(0, true);
            setLoading(false);
        })();
    }, [fetchPending]);

    // Pull-to-refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPending(0, true);
        setRefreshing(false);
    }, [fetchPending]);

    // Load more (cursor pagination)
    const handleLoadMore = useCallback(async () => {
        if (!hasMore || loadingMore || loading || refreshing) return;
        setLoadingMore(true);
        await fetchPending(pageNumberRef.current + 1, false);
        setLoadingMore(false);
    }, [hasMore, loadingMore, loading, refreshing, fetchPending]);

    // Search debounce
    const handleSearchChange = (text: string) => {
        setSearchText(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(text.trim().toLowerCase());
        }, 400);
    };

    const handleSearchClear = () => {
        setSearchText('');
        setSearchQuery('');
    };

    const handleSearchToggle = () => {
        if (searchVisible) {
            setSearchVisible(false);
            setSearchText('');
            setSearchQuery('');
        } else {
            setSearchVisible(true);
        }
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // remove item from list after approve/reject succeeds in modal
    const handleRemoveFromList = useCallback((item: VolunteerApplication) => {
        setPendingList(prev => prev.filter(v => v.id !== item.id));
    }, []);

    // Filtered list
    const currentList = masterTab === 'PENDING' ? pendingList : approvedList;
    const filteredList = searchQuery
        ? currentList.filter(
            v =>
                v.name.toLowerCase().includes(searchQuery) ||
                (v.address ?? '').toLowerCase().includes(searchQuery),
        )
        : currentList;

    // Section label
    const sectionLabel =
        masterTab === 'PENDING'
            ? `DANH SÁCH CHỜ (${pendingList.length}${hasMore ? '+' : ''})`
            : `ĐÃ DUYỆT GẦN ĐÂY (${approvedList.length})`;

    // Footer (load-more indicator)
    const renderFooter = () => {
        if (!loadingMore) return null;
        return <ActivityIndicator style={{ padding: 16 }} size="small" color="#42A4F5" />;
    };

    // Empty state
    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                    <Ionicons
                        name={
                            searchQuery
                                ? 'search-outline'
                                : masterTab === 'PENDING'
                                    ? 'hourglass-outline'
                                    : 'checkmark-circle-outline'
                        }
                        size={52}
                        color="#CBD5E1"
                    />
                </View>
                <Text style={styles.emptyTitle}>
                    {searchQuery
                        ? 'Không tìm thấy kết quả'
                        : masterTab === 'PENDING'
                            ? 'Chưa có đơn đăng ký'
                            : 'Chưa có ai được duyệt'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {searchQuery
                        ? `Không có tình nguyện viên khớp với "${searchText}"`
                        : masterTab === 'PENDING'
                            ? 'Các đơn đăng ký chờ duyệt sẽ hiển thị tại đây.'
                            : 'Tình nguyện viên được duyệt sẽ hiển thị tại đây.'}
                </Text>
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Shared header */}
                <EventListHeader
                    title="Danh sách đăng ký"
                    subtitle={`Sự kiện: ${eventName}`}
                    masterTabs={MASTER_TABS}
                    masterTab={masterTab}
                    onMasterTabChange={(tab) => setMasterTab(tab)}
                    searchPlaceholder="Tìm tên, vị trí..."
                    searchText={searchText}
                    onSearchChange={handleSearchChange}
                    onSearchClear={handleSearchClear}
                    searchVisible={searchVisible}
                    onSearchToggle={handleSearchToggle}
                    onBack={() => router.back()}
                />

                {/* Content */}
                <View style={styles.listWrapper}>
                    <Text style={styles.sectionLabel}>{sectionLabel}</Text>

                    {/* Loading skeleton for initial fetch */}
                    {loading && masterTab === 'PENDING' ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#42A4F5" />
                            <Text style={styles.loadingText}>Đang tải danh sách...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredList}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <VolunteerCard
                                    item={item}
                                    onApprove={handleRemoveFromList}
                                    onReject={handleRemoveFromList}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={renderEmpty}
                            ListFooterComponent={renderFooter}
                            refreshControl={
                                masterTab === 'PENDING' ? (
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={handleRefresh}
                                        colors={['#42A4F5']}
                                        tintColor="#42A4F5"
                                    />
                                ) : undefined
                            }
                            onEndReached={masterTab === 'PENDING' ? handleLoadMore : undefined}
                            onEndReachedThreshold={0.3}
                        />
                    )}
                </View>
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },
    listWrapper: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.8,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        textTransform: 'uppercase',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    loadingBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#94A3B8',
    },
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
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default EventApplicationsScreen;
