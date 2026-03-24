import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image,
    ScrollView,
    RefreshControl,
    TextInput,
    Animated,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getMyEvents, MyEventItem, MyEventStatus, getApiErrorMessage } from '@/services/event-service';

// ── Types ──

export type EventStatus = MyEventStatus;

export interface HostEvent {
    id: string;
    name: string;
    imageUrl: string | null;
    status: EventStatus;
    startDate: string;
    address: string;
    recruitmentEndDate: string;
}

// ── Status Config ──

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bgColor: string; icon: string }> = {
    EDITING:         { label: 'Đang soạn thảo',             color: '#6B7280', bgColor: '#F3F4F6', icon: 'create-outline' },
    SUBMITTED:       { label: 'Chờ phê duyệt',              color: '#3B82F6', bgColor: '#DBEAFE', icon: 'time-outline' },
    APPROVED_BY_MNG: { label: 'Quản lý duyệt',              color: '#10B981', bgColor: '#D1FAE5', icon: 'checkmark-circle-outline' },
    REJECTED_BY_MNG: { label: 'Quản lý từ chối',            color: '#EF4444', bgColor: '#FEE2E2', icon: 'close-circle-outline' },
    REJECTED_BY_AD:  { label: 'Admin từ chối',               color: '#DC2626', bgColor: '#FEE2E2', icon: 'close-circle-outline' },
    RECRUITING:      { label: 'Đang tuyển tình nguyện viên', color: '#7C3AED', bgColor: '#EDE9FE', icon: 'people-outline' },
    UPCOMING:        { label: 'Sắp diễn ra',                 color: '#D97706', bgColor: '#FEF3C7', icon: 'alarm-outline' },
    ONGOING:         { label: 'Đang diễn ra',                color: '#059669', bgColor: '#D1FAE5', icon: 'play-circle-outline' },
    ENDED:           { label: 'Đã kết thúc',                 color: '#6B7280', bgColor: '#F3F4F6', icon: 'flag-outline' },
    COMPLETED:       { label: 'Hoàn thành',                  color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'ribbon-outline' },
    CANCELLED:       { label: 'Đã hủy',                      color: '#9CA3AF', bgColor: '#F9FAFB', icon: 'ban-outline' },
};

// ── Filter config ──

type MasterTab = 'active' | 'history';

interface ChipFilter {
    key: EventStatus;
    label: string;
}

const ACTIVE_CHIPS: ChipFilter[] = [
    { key: 'EDITING',         label: 'Soạn thảo' },
    { key: 'SUBMITTED',       label: 'Chờ duyệt' },
    { key: 'APPROVED_BY_MNG', label: 'QL duyệt' },
    { key: 'REJECTED_BY_MNG', label: 'QL từ chối' },
    { key: 'REJECTED_BY_AD',  label: 'Admin từ chối' },
    { key: 'RECRUITING',      label: 'Tuyển TNV' },
    { key: 'UPCOMING',        label: 'Sắp diễn ra' },
    { key: 'ONGOING',         label: 'Đang diễn ra' },
];

const HISTORY_CHIPS: ChipFilter[] = [
    { key: 'ENDED',     label: 'Đã kết thúc' },
    { key: 'COMPLETED', label: 'Hoàn thành' },
    { key: 'CANCELLED', label: 'Đã hủy' },
];

const ACTIVE_STATUSES: EventStatus[]  = ['EDITING', 'SUBMITTED', 'APPROVED_BY_MNG', 'REJECTED_BY_MNG', 'REJECTED_BY_AD', 'RECRUITING', 'UPCOMING', 'ONGOING'];
const HISTORY_STATUSES: EventStatus[] = ['ENDED', 'COMPLETED', 'CANCELLED'];

// ── Mock Data ──

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400';

const MOCK_EVENTS: HostEvent[] = [
    { id: '1',  name: 'Làm sạch môi trường Hồ Hoàn Kiếm',          imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400', status: 'RECRUITING',      startDate: '2026-04-15', address: 'Công viên Hồ Hoàn Kiếm, Quận Hoàn Kiếm, Hà Nội',               recruitmentEndDate: '2026-04-10' },
    { id: '2',  name: 'Hiến máu nhân đạo 2026',                     imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=400', status: 'UPCOMING',        startDate: '2026-04-20', address: 'Bệnh viện Bạch Mai, Đống Đa, Hà Nội',                          recruitmentEndDate: '2026-04-15' },
    { id: '3',  name: 'Trồng cây xanh tại trường học',              imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400', status: 'ONGOING',         startDate: '2026-03-21', address: 'Trường THPT Chu Văn An, Ba Đình, Hà Nội',                      recruitmentEndDate: '2026-03-15' },
    { id: '4',  name: 'Hỗ trợ học tập cho trẻ em vùng cao',        imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400', status: 'SUBMITTED',       startDate: '2026-05-01', address: 'Trường Tiểu học Tà Phìn, Sa Pa, Lào Cai',                     recruitmentEndDate: '2026-04-25' },
    { id: '5',  name: 'Chăm sóc người già tại viện dưỡng lão',     imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400', status: 'APPROVED_BY_MNG', startDate: '2026-04-25', address: 'Viện dưỡng lão Hà Đông, Hà Nội',                               recruitmentEndDate: '2026-04-20' },
    { id: '6',  name: 'Hội chợ từ thiện ủng hộ trẻ em khuyết tật', imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400', status: 'EDITING',         startDate: '2026-05-10', address: 'Quảng trường Đông Kinh Nghĩa Thục, Hoàn Kiếm, Hà Nội',       recruitmentEndDate: '2026-05-05' },
    { id: '7',  name: 'Dọn rác bãi biển Sầm Sơn',                  imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=400', status: 'COMPLETED',       startDate: '2026-03-10', address: 'Bãi biển Sầm Sơn, Thanh Hóa',                                 recruitmentEndDate: '2026-03-05' },
    { id: '8',  name: 'Hỗ trợ xây dựng nhà tình thương',           imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400', status: 'ENDED',           startDate: '2026-02-20', address: 'Xã Hòa Bình, Huyện Phú Xuyên, Hà Nội',                        recruitmentEndDate: '2026-02-15' },
    { id: '9',  name: 'Tặng quà trung thu cho trẻ em nghèo',       imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400', status: 'REJECTED_BY_MNG', startDate: '2026-09-15', address: 'Làng trẻ SOS Hà Nội, Từ Liêm, Hà Nội',                       recruitmentEndDate: '2026-09-10' },
    { id: '10', name: 'Chiến dịch bảo vệ rừng nguyên sinh',        imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400', status: 'CANCELLED',       startDate: '2026-01-12', address: 'Vườn Quốc gia Cúc Phương, Ninh Bình',                         recruitmentEndDate: '2026-01-05' },
    { id: '11', name: 'Khám chữa bệnh miễn phí vùng sâu',          imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400', status: 'REJECTED_BY_AD',  startDate: '2026-06-20', address: 'Xã Chiềng Bằng, Quỳnh Nhai, Sơn La',                         recruitmentEndDate: '2026-06-10' },
];

// ── Helpers ──

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

// ── StatusChip ──

interface StatusChipProps {
    chip: ChipFilter;
    isActive: boolean;
    count: number;
    onPress: () => void;
}

const StatusChip = ({ chip, isActive, count, onPress }: StatusChipProps) => (
    <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.label}</Text>
        {count > 0 && (
            <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                <Text style={[styles.chipBadgeText, isActive && styles.chipBadgeTextActive]}>{count}</Text>
            </View>
        )}
    </TouchableOpacity>
);

// ── HostEventCard ──

interface EventCardProps {
    item: HostEvent;
    onPress: (id: string) => void;
}

const HostEventCard = ({ item, onPress }: EventCardProps) => {
    const cfg = STATUS_CONFIG[item.status] ?? {
        label: item.status,
        color: '#6B7280',
        bgColor: '#F3F4F6',
        icon: 'help-circle-outline',
    };
    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item.id)} activeOpacity={0.75}>
            <Image
                source={{ uri: item.imageUrl || DEFAULT_IMAGE }}
                style={styles.cardImage}
                resizeMode="cover"
            />
            <View style={styles.cardBody}>
                <View style={[styles.statusBadge, { backgroundColor: cfg.bgColor }]}>
                    <Ionicons name={cfg.icon as any} size={11} color={cfg.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>{formatDate(item.startDate)}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText} numberOfLines={1}>{item.address}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>Hạn ĐK: {formatDate(item.recruitmentEndDate)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

// ── Main Screen ──

const SEARCH_BAR_HEIGHT = 52;

const EventManagement = () => {
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);

    // Master tab & chip filter
    const [masterTab, setMasterTab]     = useState<MasterTab>('active');
    const [activeChip, setActiveChip]   = useState<EventStatus>('EDITING');
    const [historyChip, setHistoryChip] = useState<EventStatus>('ENDED');

    // Search
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchText, setSearchText]       = useState('');
    const [searchQuery, setSearchQuery]     = useState(''); // debounced value actually sent to filter / API
    const searchAnim = useRef(new Animated.Value(0)).current;
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // API state
    const [events, setEvents]           = useState<HostEvent[]>([]);
    const [loading, setLoading]         = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing]   = useState(false);
    const [error, setError]             = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore]         = useState(true);
    const isFetching                    = useRef(false); // guard against concurrent / loop calls
    const PAGE_SIZE = 10;

    // ── Search bar animation ──

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
        // Debounce: update query after 400 ms of inactivity
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(text.trim());
            // TODO: Uncomment when API is ready – call fetchEvents(0) here so the
            // API receives the updated `name` param:
            // setEvents([]); setCurrentPage(0); setHasMore(true); fetchEvents(0);
        }, 400);
    };

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    // Animated height for the search bar container
    const searchBarHeight = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SEARCH_BAR_HEIGHT],
    });

    // ── API fetch ──

    const fetchEvents = useCallback(async (page: number, isRefresh = false) => {
        // Prevent concurrent calls (which can cause infinite loops on error)
        if (isFetching.current) return;
        isFetching.current = true;

        if (isRefresh) setRefreshing(true);
        else if (page === 0) setLoading(true);
        else setLoadingMore(true);

        setError(null);

        try {
            const chipFilter = masterTab === 'active' ? activeChip : historyChip;
            // Always send a status — API requires it
            const response = await getMyEvents({
                pageNumber: page,
                pageSize:   PAGE_SIZE,
                status:     chipFilter as MyEventStatus,
                name:       searchQuery || undefined,
            });

            const mapped: HostEvent[] = response.content.map(item => ({
                ...item,
                status: item.status as EventStatus,
                imageUrl: item.imageUrl ?? null,
            }));

            if (isRefresh || page === 0) {
                setEvents(mapped);
                setCurrentPage(0);
            } else {
                setEvents(prev => [...prev, ...mapped]);
            }

            setHasMore(response.page.number + 1 < response.page.totalPages);
            setCurrentPage(page);
        } catch (e) {
            // On error we set error state and do NOT retry — prevents infinite loop
            const msg = getApiErrorMessage(e);
            setError(msg || 'Không thể tải danh sách sự kiện');
        } finally {
            isFetching.current = false;
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [masterTab, activeChip, historyChip, searchQuery]);

    // Re-fetch from page 0 whenever filters or search change.
    // fetchEvents is intentionally NOT in deps to avoid stale-closure loops;
    // the callback already captures all relevant state via its own deps.
    useEffect(() => {
        setEvents([]);
        setCurrentPage(0);
        setHasMore(true);
        setError(null);
        fetchEvents(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [masterTab, activeChip, historyChip, searchQuery]);

    const handleRefresh  = useCallback(() => fetchEvents(0, true), [fetchEvents]);
    const handleLoadMore = useCallback(() => {
        if (!loadingMore && !loading && hasMore && !error) fetchEvents(currentPage + 1);
    }, [loadingMore, loading, hasMore, error, currentPage, fetchEvents]);

    // Derived state
    const currentChip    = masterTab === 'active' ? activeChip : historyChip;
    const setCurrentChip = masterTab === 'active'
        ? (v: EventStatus) => setActiveChip(v)
        : (v: EventStatus) => setHistoryChip(v);
    const chips          = masterTab === 'active' ? ACTIVE_CHIPS : HISTORY_CHIPS;

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

    // ── Render helpers ──

    const renderEmpty = () => {
        if (loading) return null; // skeleton shown separately
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

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <Ionicons name="sync-outline" size={18} color="#42A4F5" />
                <Text style={styles.footerLoaderText}>Đang tải thêm...</Text>
            </View>
        );
    };

    // ── JSX ──

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* ── Header ── */}
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

            {/* ── Animated Search Bar ── */}
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

            {/* ── Master Tabs ── */}
            <View style={styles.masterTabRow}>
                <TouchableOpacity
                    style={[styles.masterTab, masterTab === 'active' && styles.masterTabActive]}
                    onPress={() => handleMasterTab('active')}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name="flash-outline"
                        size={15}
                        color={masterTab === 'active' ? BLUE : 'rgba(255,255,255,0.8)'}
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
                        color={masterTab === 'history' ? BLUE : 'rgba(255,255,255,0.8)'}
                        style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.masterTabText, masterTab === 'history' && styles.masterTabTextActive]}>
                        Lịch sử
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Chip bar + List (always light background) ── */}
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
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[BLUE]}
                            tintColor={BLUE}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                />
            </View>

            {/* ── FAB ── */}
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

// ── Styles ──

const BLUE = '#42A4F5';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BLUE,
    },

    // Header
    header: {
        backgroundColor: BLUE,
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
        backgroundColor: BLUE,
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
        color: BLUE,
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
        backgroundColor: BLUE,
        borderColor: BLUE,
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

    // Event card
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 14,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.13,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImage: {
        width: 110,
        height: 'auto',
        minHeight: 130,
        backgroundColor: '#E2E8F0',
    },
    cardBody: {
        flex: 1,
        padding: 13,
        justifyContent: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 7,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 9,
        lineHeight: 21,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 4,
    },
    metaText: {
        fontSize: 12,
        color: '#94A3B8',
        flex: 1,
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
        backgroundColor: BLUE,
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
        backgroundColor: BLUE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 16,
        shadowColor: BLUE,
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
