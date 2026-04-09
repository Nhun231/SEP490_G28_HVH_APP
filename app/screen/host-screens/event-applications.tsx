import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import EventListHeader, { MasterTabConfig } from '../../components/host/event-list/EventListHeader';
import VolunteerCard, { VolunteerApplication } from '../../components/host/verify-vol-to-event/VolunteerCard';
import {
    getRegisteredParticipants,
    RegisteredParticipant,
    getActualParticipants,
    ActualParticipant,
    getApiErrorMessage,
} from '@/services/event-service';

type AppTab = 'PENDING' | 'APPROVED';

const MASTER_TABS: MasterTabConfig<AppTab>[] = [
    { key: 'PENDING', label: 'Chờ duyệt', icon: 'hourglass-outline' },
    { key: 'APPROVED', label: 'Đã duyệt', icon: 'checkmark-circle-outline' },
];

const PAGE_SIZE = 10;

// Map pending API participant → VolunteerApplication
function fromPending(p: RegisteredParticipant): VolunteerApplication {
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

// Map approved API participant → VolunteerApplication
// checkInTime is used as createdAt fallback; if null use current time
function fromApproved(p: ActualParticipant): VolunteerApplication {
    return {
        id: p.eventApplicationId,
        name: p.fullName,
        nickName: p.nickName,
        email: p.email,
        phone: p.phone,
        checkInTime: p.checkInTime,
        avatarUrl: p.avatarUrl ?? null,
        creditScore: p.creditScore,
        honorScore: p.honorScore,
        address: p.address ?? '',
        createdAt: p.checkInTime ?? new Date().toISOString(),
        status: 'APPROVED',
    };
}

const EventApplicationsScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<{ eventName?: string; sessionId?: string; eventStatus?: string; sessionStartTime?: string }>();
    const eventName = params.eventName || 'Sự kiện';
    const sessionId = params.sessionId || '';
    const eventStatus = params.eventStatus || '';
    const sessionStartTime = params.sessionStartTime || null;

    // Master tab state — default to APPROVED for ONGOING events
    const [masterTab, setMasterTab] = useState<AppTab>(
        eventStatus === 'ONGOING' ? 'APPROVED' : 'PENDING'
    );

    // Search state
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Pending state
    const [pendingList, setPendingList] = useState<VolunteerApplication[]>([]);
    const [pendingLoading, setPendingLoading] = useState(true);
    const [pendingRefreshing, setPendingRefreshing] = useState(false);
    const [pendingLoadingMore, setPendingLoadingMore] = useState(false);
    const [pendingHasMore, setPendingHasMore] = useState(false);
    const pendingPageRef = useRef(0);

    // Approved state
    const [approvedList, setApprovedList] = useState<VolunteerApplication[]>([]);
    const [approvedLoading, setApprovedLoading] = useState(true);
    const [approvedRefreshing, setApprovedRefreshing] = useState(false);
    const [approvedLoadingMore, setApprovedLoadingMore] = useState(false);
    const [approvedHasMore, setApprovedHasMore] = useState(false);
    const approvedPageRef = useRef(0);

    // Fetch pending participants (cursor-based)
    const fetchPending = useCallback(async (page: number, replace: boolean) => {
        if (!sessionId) return;
        try {
            const res = await getRegisteredParticipants(sessionId, page, PAGE_SIZE);
            const mapped = res.registeredParticipants.map(fromPending);
            if (replace) {
                setPendingList(mapped);
            } else {
                setPendingList(prev => [...prev, ...mapped]);
            }
            setPendingHasMore(res.hasMore);
            pendingPageRef.current = page;
        } catch (err) {
            console.error('[EventApplications] fetchPending error:', getApiErrorMessage(err));
        }
    }, [sessionId]);

    // Fetch approved participants (page-based — hasMore derived from totalPages)
    const fetchApproved = useCallback(async (page: number, replace: boolean) => {
        if (!sessionId) return;
        try {
            const res = await getActualParticipants(sessionId, page, PAGE_SIZE);
            const mapped = res.content.map(fromApproved);
            if (replace) {
                setApprovedList(mapped);
            } else {
                setApprovedList(prev => [...prev, ...mapped]);
            }
            setApprovedHasMore(res.page.number + 1 < res.page.totalPages);
            approvedPageRef.current = page;
        } catch (err) {
            console.error('[EventApplications] fetchApproved error:', getApiErrorMessage(err));
        }
    }, [sessionId]);

    // Initial load — both tabs in parallel
    useEffect(() => {
        (async () => {
            setPendingLoading(true);
            setApprovedLoading(true);
            await Promise.all([fetchPending(0, true), fetchApproved(0, true)]);
            setPendingLoading(false);
            setApprovedLoading(false);
        })();
    }, [fetchPending, fetchApproved]);

    // Pull-to-refresh per tab
    const handleRefresh = useCallback(async () => {
        if (masterTab === 'PENDING') {
            setPendingRefreshing(true);
            await fetchPending(0, true);
            setPendingRefreshing(false);
        } else {
            setApprovedRefreshing(true);
            await fetchApproved(0, true);
            setApprovedRefreshing(false);
        }
    }, [masterTab, fetchPending, fetchApproved]);

    // Load more per tab
    const handleLoadMore = useCallback(async () => {
        if (masterTab === 'PENDING') {
            if (!pendingHasMore || pendingLoadingMore || pendingLoading || pendingRefreshing) return;
            setPendingLoadingMore(true);
            await fetchPending(pendingPageRef.current + 1, false);
            setPendingLoadingMore(false);
        } else {
            if (!approvedHasMore || approvedLoadingMore || approvedLoading || approvedRefreshing) return;
            setApprovedLoadingMore(true);
            await fetchApproved(approvedPageRef.current + 1, false);
            setApprovedLoadingMore(false);
        }
    }, [
        masterTab,
        pendingHasMore, pendingLoadingMore, pendingLoading, pendingRefreshing, fetchPending,
        approvedHasMore, approvedLoadingMore, approvedLoading, approvedRefreshing, fetchApproved,
    ]);

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

    // Optimistic update: remove item from pending list after approve/reject succeeds
    const handleRemoveFromList = useCallback((item: VolunteerApplication) => {
        setPendingList(prev => prev.filter(v => v.id !== item.id));
    }, []);

    // Derived values for active tab
    const isPending = masterTab === 'PENDING';
    const currentList = isPending ? pendingList : approvedList;
    const isLoading = isPending ? pendingLoading : approvedLoading;
    const isRefreshing = isPending ? pendingRefreshing : approvedRefreshing;
    const isLoadingMore = isPending ? pendingLoadingMore : approvedLoadingMore;

    const filteredList = searchQuery
        ? currentList.filter(
            v =>
                v.name.toLowerCase().includes(searchQuery) ||
                (v.address ?? '').toLowerCase().includes(searchQuery),
        )
        : currentList;

    const sectionLabel = isPending
        ? `DANH SÁCH CHỜ (${pendingList.length}${pendingHasMore ? '+' : ''})`
        : `ĐÃ DUYỆT (${approvedList.length}${approvedHasMore ? '+' : ''})`;

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return <ActivityIndicator style={{ padding: 16 }} size="small" color="#42A4F5" />;
    };

    const renderEmpty = () => {
        if (isLoading) return null;
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                    <Ionicons
                        name={
                            searchQuery
                                ? 'search-outline'
                                : isPending
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
                        : isPending
                            ? 'Chưa có đơn đăng ký'
                            : 'Chưa có ai được duyệt'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {searchQuery
                        ? `Không có tình nguyện viên khớp với "${searchText}"`
                        : isPending
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

                <View style={styles.listWrapper}>
                    <Text style={styles.sectionLabel}>{sectionLabel}</Text>

                    {isLoading ? (
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
                                    eventStatus={eventStatus}
                                    sessionStartTime={sessionStartTime}
                                />
                            )}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={renderEmpty}
                            ListFooterComponent={renderFooter}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isRefreshing}
                                    onRefresh={handleRefresh}
                                    colors={['#42A4F5']}
                                    tintColor="#42A4F5"
                                />
                            }
                            onEndReached={handleLoadMore}
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
