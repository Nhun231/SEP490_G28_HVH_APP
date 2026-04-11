import { EventApplicationStatus, VolApplicationItem } from '@/services/event-types';
import { getVolApplications, cancelVolApplication } from '@/services/vol-event-service';
import { getApiErrorMessage } from '@/services/api-helpers';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Constants ───────────────────────────────────────────────────────────────

type StatusFilter = EventApplicationStatus | null; // null = Tất cả

interface TabDef {
    label: string;
    value: StatusFilter;
}

const TABS: TabDef[] = [
    { label: 'Tất cả', value: null },
    { label: 'Đang chờ duyệt', value: 'PENDING' },
    { label: 'Đã được duyệt', value: 'APPROVED' },
    { label: 'Bị từ chối', value: 'REJECTED' },
    { label: 'Đã hủy', value: 'CANCELLED' },
];

const STATUS_CONFIG: Record<
    EventApplicationStatus,
    { label: string; color: string; bg: string; icon: string }
> = {
    PENDING:   { label: 'Chờ duyệt', color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
    APPROVED:  { label: 'Đã duyệt',  color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle-outline' },
    REJECTED:  { label: 'Từ chối',   color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
    CANCELLED: { label: 'Đã hủy',    color: '#6B7280', bg: '#F3F4F6', icon: 'ban-outline' },
};

const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

/** Format session time range: "HH:mm – HH:mm, DD/MM/YYYY" */
function formatSessionRange(start: string | null | undefined, end: string | null | undefined): string {
    if (!start) return '';
    try {
        const s = new Date(start);
        const e = end ? new Date(end) : null;
        const hhs = String(s.getHours()).padStart(2, '0');
        const mms = String(s.getMinutes()).padStart(2, '0');
        const hhe = e ? String(e.getHours()).padStart(2, '0') : null;
        const mme = e ? String(e.getMinutes()).padStart(2, '0') : null;
        const dd = String(s.getDate()).padStart(2, '0');
        const mo = String(s.getMonth() + 1).padStart(2, '0');
        const yyyy = s.getFullYear();
        const timePart = hhe ? `${hhs}:${mms} – ${hhe}:${mme}` : `${hhs}:${mms}`;
        return `${timePart}, ${dd}/${mo}/${yyyy}`;
    } catch {
        return start;
    }
}

/** Concatenate detailAddress + address into a single display string */
function buildFullAddress(address: string | null | undefined, detailAddress: string | null | undefined): string {
    const parts = [detailAddress, address].filter(Boolean);
    return parts.join(', ') || '';
}

function getFullImageUrl(path: string | null | undefined): string {
    if (!path) {
        return 'https://placehold.co/400x300/e2e8f0/64748b.png?text=No+Image';
    }
    if (path.startsWith('http')) return path;
    const supabaseUrl =
        process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co';
    if (path.startsWith('/storage/v1')) return `${supabaseUrl}${path}`;
    if (path.startsWith('/object/')) return `${supabaseUrl}/storage/v1${path}`;
    return `${supabaseUrl}/storage/v1/object/public/hvh-bucket/${path}`;
}

// ─── Application Event Card ───────────────────────────────────────────────────

interface ApplicationCardProps {
    item: VolApplicationItem;
    onPress: () => void;
    onCancel: (item: VolApplicationItem) => void;
}

/** Returns true if this application can still be cancelled by the volunteer */
function isCancellable(item: VolApplicationItem): boolean {
    if (item.status !== 'PENDING' && item.status !== 'APPROVED') return false;
    // Guard: cannot cancel on or after the session date
    if (item.session?.startDateTime) {
        const sessionDate = new Date(item.session.startDateTime);
        const today = new Date();
        // zero-out times for date-only comparison
        today.setHours(0, 0, 0, 0);
        sessionDate.setHours(0, 0, 0, 0);
        if (today >= sessionDate) return false;
    }
    return true;
}

function ApplicationEventCard({ item, onPress, onCancel }: ApplicationCardProps) {
    const cfg = STATUS_CONFIG[item.status];
    const imageUri = getFullImageUrl(item.imageUrl);
    const fullAddress = buildFullAddress(item.address, item.detailAddress);
    const hasSession = !!item.session;
    const sessionLabel = hasSession
        ? formatSessionRange(item.session!.startDateTime, item.session!.endDateTime)
        : '';
    const cancellable = isCancellable(item);

    return (
        <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
            {/* Colored stripe at top indicating status */}
            <View style={[cardStyles.statusStripe, { backgroundColor: cfg.color }]} />

            <View style={cardStyles.cardBody}>
                {/* Thumbnail */}
                <Image
                    source={imageUri}
                    style={cardStyles.thumbnail}
                    contentFit="cover"
                    transition={200}
                    placeholder={{
                        uri: 'https://placehold.co/400x300/e2e8f0/64748b.png?text=Loading',
                    }}
                />

                {/* Content */}
                <View style={cardStyles.content}>
                    {/* Event name */}
                    <Text style={cardStyles.eventName} numberOfLines={2}>
                        {item.name}
                    </Text>

                    {/* Address row */}
                    {!!fullAddress && (
                        <View style={cardStyles.infoRow}>
                            <Ionicons name="location-outline" size={13} color="#6B7280" />
                            <Text style={cardStyles.infoText} numberOfLines={2}>
                                {fullAddress}
                            </Text>
                        </View>
                    )}

                    {/* Session chip */}
                    {hasSession && (
                        <View style={cardStyles.sessionChip}>
                            <Ionicons name="calendar-outline" size={12} color="#2563EB" />
                            <Text style={cardStyles.sessionText} numberOfLines={1}>
                                {sessionLabel}
                            </Text>
                        </View>
                    )}

                    {/* Bottom row: badge + cancel button */}
                    <View style={cardStyles.cardFooter}>
                        <View style={[cardStyles.badge, { backgroundColor: cfg.bg }]}>
                            <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                            <Text style={[cardStyles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>

                        {cancellable && (
                            <TouchableOpacity
                                style={cardStyles.cancelBtn}
                                onPress={() => onCancel(item)}
                                activeOpacity={0.75}
                            >
                                <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                                <Text style={cardStyles.cancelBtnText}>Hủy đơn</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14,
        marginBottom: 12,
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    statusStripe: {
        height: 4,
        width: '100%',
    },
    cardBody: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
    },
    thumbnail: {
        width: 88,
        height: 88,
        borderRadius: 10,
        flexShrink: 0,
    },
    content: {
        flex: 1,
        gap: 6,
    },
    eventName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 17,
    },
    sessionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    sessionText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2563EB',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#DC2626',
        elevation: 2,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
    },
    cancelBtnDisabled: {
        opacity: 0.5,
    },
    cancelBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const MyApplications = () => {
    const [selectedTab, setSelectedTab] = useState<StatusFilter>(null);
    const [items, setItems] = useState<VolApplicationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // ─── Fetch ───────────────────────────────────────────────────────────────

    const fetchPage = useCallback(
        async (status: StatusFilter, page: number, append = false) => {
            const response = await getVolApplications({
                pageNumber: page,
                pageSize: PAGE_SIZE,
                status: status ?? undefined,
            });

            if (append) {
                setItems(prev => [...prev, ...response.content]);
            } else {
                setItems(response.content);
            }
            
            // Safely parse pagination info as some BE endpoints wrap pagination in `page: { ... }`
            const anyResp = response as any;
            let pNum = typeof response.number === 'number' ? response.number : (anyResp.page?.number ?? 0);
            let pTotal = typeof response.totalPages === 'number' ? response.totalPages : (anyResp.page?.totalPages ?? 1);
            
            pNum = Number.isNaN(pNum) ? 0 : pNum;
            pTotal = Number.isNaN(pTotal) ? 1 : pTotal;
            
            setCurrentPage(pNum);
            setTotalPages(pTotal);
        },
        []
    );

    const hasFetched = useRef(false);

    // Reload list every time the screen gains focus (e.g. returning from event-detail)
    useFocusEffect(
        useCallback(() => {
            if (hasFetched.current) return;
            hasFetched.current = true;

            let active = true;
            (async () => {
                setLoading(true);
                try {
                    await fetchPage(selectedTab, 0);
                } catch (e) {
                    console.error('[MyApplications] fetch error', e);
                    if (active) setItems([]);
                } finally {
                    if (active) setLoading(false);
                }
            })();
            return () => { active = false; };
        }, [selectedTab, fetchPage])
    );

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleTabChange = useCallback(
        async (status: StatusFilter) => {
            setSelectedTab(status);
            setLoading(true);
            try {
                await fetchPage(status, 0);
            } catch (e) {
                console.error('[MyApplications] tab change error', e);
                setItems([]);
            } finally {
                setLoading(false);
            }
        },
        [fetchPage]
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchPage(selectedTab, 0);
        } catch { /* silent */ }
        setRefreshing(false);
    }, [selectedTab, fetchPage]);

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || loading || refreshing) return;
        const nextPage = currentPage + 1;
        if (nextPage >= totalPages) return;

        setLoadingMore(true);
        try {
            await fetchPage(selectedTab, nextPage, true);
        } catch { /* silent */ }
        setLoadingMore(false);
    }, [loadingMore, loading, refreshing, currentPage, totalPages, selectedTab, fetchPage]);

    const handleCardPress = useCallback((item: VolApplicationItem) => {
        router.push({
            pathname: '/screen/volunteer-screens/event-detail-vol',
            params: { eventId: item.eventId },
        } as any);
    }, []);

    const handleCancelApplication = useCallback((item: VolApplicationItem) => {
        const isApproved = item.status === 'APPROVED';
        const warningNote = isApproved
            ? '\n\nLưu ý: Bạn đang hủy đơn đã được duyệt. Nếu hủy sau ngày kết thúc tuyển quân, điểm uy tín của bạn có thể bị trừ 3 điểm.'
            : '';

        Alert.alert(
            'Xác nhận hủy đơn',
            `Bạn có chắc chắn muốn hủy đơn đăng ký cho sự kiện "${item.name}"?${warningNote}`,
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Hủy đơn',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelVolApplication(item.id);
                            // Optimistically remove from list
                            setItems(prev => prev.filter(i => i.id !== item.id));
                            // Then silently refresh to get authoritative state
                            fetchPage(selectedTab, 0).catch(() => {});
                        } catch (err) {
                            Alert.alert(
                                'Không thể hủy đơn',
                                getApiErrorMessage(err) || 'Đã xảy ra lỗi. Vui lòng thử lại.',
                            );
                        }
                    },
                },
            ]
        );
    }, [selectedTab, fetchPage]);

    const handleGoBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(vol-tabs)/home');
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* ═══ HEADER ═══ */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hoạt động đã đăng ký</Text>
                <View style={styles.headerBtn} />
            </View>

            {/* ═══ CONTENT ═══ */}
            <View style={styles.contentArea}>
                {/* ─── Status Tabs ─── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabBar}
                    contentContainerStyle={styles.tabBarContent}
                >
                    {TABS.map((tab) => {
                        const isActive = selectedTab === tab.value;
                        return (
                            <TouchableOpacity
                                key={tab.label}
                                style={[styles.tab, isActive && styles.tabActive]}
                                onPress={() => handleTabChange(tab.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* ─── List ─── */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ApplicationEventCard
                                item={item}
                                onPress={() => handleCardPress(item)}
                                onCancel={handleCancelApplication}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={['#42A4F5']}
                                tintColor="#42A4F5"
                            />
                        }
                        ListFooterComponent={
                            loadingMore ? (
                                <ActivityIndicator
                                    style={{ padding: 16 }}
                                    size="small"
                                    color="#42A4F5"
                                />
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="document-text-outline" size={52} color="#9CA3AF" />
                                <Text style={styles.emptyText}>Chưa có đơn đăng ký nào</Text>
                                <Text style={styles.emptySubText}>
                                    {selectedTab === null
                                        ? 'Bạn chưa đăng ký tham gia hoạt động nào'
                                        : `Không có đơn ở trạng thái "${TABS.find(t => t.value === selectedTab)?.label}"`}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

export default MyApplications;

// ─── Screen Styles ───────────────────────────────────────────────────────────

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

    /* ── Status tabs ── */
    tabBar: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        maxHeight: 52,
    },
    tabBarContent: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 8,
        alignItems: 'center',
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    tabActive: {
        backgroundColor: '#42A4F5',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },

    /* ── List ── */
    listContent: {
        paddingTop: 14,
        paddingBottom: 28,
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
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 14,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 20,
    },
});
