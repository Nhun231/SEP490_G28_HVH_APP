import {
    EOrgType,
    OrgListResponse,
    ORG_TYPE_LABELS,
    ORG_TYPE_SHORT_LABELS,
    OrganizationSimpleResponse,
    getOrganizations,
} from '@/services/organization-service';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import StarRating from '@/app/components/volunteer/organization/StarRating';


const ORG_TYPE_OPTIONS: { label: string; value: EOrgType | null }[] = [
    { label: 'Tất cả lĩnh vực', value: null },
    { label: 'Quỹ xã hội', value: 'SOCIAL_FUND' },
    { label: 'Quỹ từ thiện', value: 'CHARITY_FUND' },
    { label: 'Phi chính phủ', value: 'NGO' },
    { label: 'Tổ chức xã hội', value: 'SOCIAL_ORGANIZATION' },
    { label: 'Tổ chức quần chúng', value: 'MASS_ORGANIZATION' },
    { label: 'Trường đại học', value: 'UNIVERSITY_BASED' },
    { label: 'Doanh nghiệp tư nhân', value: 'PRIVATE_ENTERPRISE_BASED' },
    { label: 'Khác', value: 'OTHER' },
];

// Mock rating buckets
const RATING_OPTIONS = [
    { label: 'Tất cả đánh giá', value: null },
    { label: '4 sao trở lên', value: 4 },
    { label: '3 sao trở lên', value: 3 },
    { label: '2 sao trở lên', value: 2 },
];

// Mock hour buckets
const HOUR_OPTIONS = [
    { label: 'Tất cả số giờ', value: null },
    { label: 'Trên 100,000 giờ', value: 100000 },
    { label: 'Trên 50,000 giờ', value: 50000 },
    { label: 'Trên 10,000 giờ', value: 10000 },
];


interface SheetOption<T> {
    label: string;
    value: T;
}

interface DropdownSheetProps<T> {
    visible: boolean;
    title: string;
    options: SheetOption<T>[];
    selected: T;
    onSelect: (v: T) => void;
    onClose: () => void;
}

function DropdownSheet<T>({ visible, title, options, selected, onSelect, onClose }: DropdownSheetProps<T>) {
    if (!visible) return null;
    return (
        <View style={sheet.overlay}>
            <TouchableOpacity style={sheet.backdrop} onPress={onClose} activeOpacity={1} />
            <View style={sheet.container}>
                <View style={sheet.handle} />
                <Text style={sheet.title}>{title}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {options.map((opt) => {
                        const active = selected === opt.value;
                        return (
                            <TouchableOpacity
                                key={String(opt.label)}
                                style={[sheet.item, active && sheet.itemActive]}
                                onPress={() => { onSelect(opt.value); onClose(); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[sheet.itemText, active && sheet.itemTextActive]}>
                                    {opt.label}
                                </Text>
                                {active && <Ionicons name="checkmark" size={18} color="#42A4F5" />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}


const sheet = StyleSheet.create({
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    container: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 32, paddingTop: 12, paddingHorizontal: 16, maxHeight: '70%',
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 14,
    },
    title: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    item: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    itemActive: { backgroundColor: '#EBF5FF', borderRadius: 8, paddingHorizontal: 8 },
    itemText: { fontSize: 14, color: '#374151' },
    itemTextActive: { color: '#42A4F5', fontWeight: '600' },
});


// Mock ratings per org (until BE adds rating)
const MOCK_RATINGS: Record<string, { rating: number; total: number }> = {};
function getMockRating(id: string) {
    if (!MOCK_RATINGS[id]) {
        const seed = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
        MOCK_RATINGS[id] = {
            rating: parseFloat((3.5 + (seed % 30) / 20).toFixed(1)),
            total: 100 + (seed * 17) % 2200,
        };
    }
    return MOCK_RATINGS[id];
}

function OrgCard({ org, onPress }: { org: OrganizationSimpleResponse; onPress: () => void }) {
    const typeLabel = org.orgType ? (ORG_TYPE_SHORT_LABELS[org.orgType] ?? org.orgType) : 'Khác';
    const mock = getMockRating(org.id);

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
            <View style={styles.cardTop}>
                {/* Avatar */}
                <View style={styles.orgAvatar}>
                    <Ionicons name="business" size={26} color="#42A4F5" />
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                    <Text style={styles.orgName} numberOfLines={2}>{org.name}</Text>
                    <View style={styles.typeTag}>
                        <Text style={styles.typeTagText}>{typeLabel}</Text>
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>

            {/* Star rating row */}
            <View style={styles.ratingRow}>
                <StarRating rating={mock.rating} totalRatings={mock.total} />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Ionicons name="calendar-outline" size={16} color="#10B981" />
                    <Text style={styles.statLabel}>Sự kiện đã tổ chức</Text>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>{org.numberOfHostedEvents.toLocaleString('vi-VN')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                    <Ionicons name="ribbon-outline" size={16} color="#42A4F5" />
                    <Text style={styles.statLabel}>Giờ uy tín</Text>
                    <Text style={[styles.statValue, { color: '#42A4F5' }]}>
                        {org.creditHour.toLocaleString('vi-VN')}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}


const PAGE_SIZE = 10;

const Benefit = () => {
    const [searchText, setSearchText] = useState('');
    const [selectedOrgType, setSelectedOrgType] = useState<EOrgType | null>(null);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [selectedHour, setSelectedHour] = useState<number | null>(null);
    const [orgTypeSheetVisible, setOrgTypeSheetVisible] = useState(false);
    const [ratingSheetVisible, setRatingSheetVisible] = useState(false);
    const [hourSheetVisible, setHourSheetVisible] = useState(false);

    const [orgs, setOrgs] = useState<OrganizationSimpleResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Guard against concurrent fetches
    const isFetchingRef = useRef(false);

    // committed search (only triggers on button press)
    const [committedSearch, setCommittedSearch] = useState('');

    // Client-side filter: rating and hour applied instantly on the loaded list
    const filteredOrgs = useMemo(() => {
        let list = orgs;
        if (selectedRating !== null) {
            list = list.filter((o) => getMockRating(o.id).rating >= selectedRating);
        }
        if (selectedHour !== null) {
            list = list.filter((o) => o.creditHour >= selectedHour);
        }
        return list;
    }, [orgs, selectedRating, selectedHour]);

    const fetchOrgs = useCallback(async (opts: {
        page?: number;
        name?: string;
        orgType?: EOrgType | null;
        append?: boolean;
    }) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const { page = 0, name, orgType, append = false } = opts;
            const res: OrgListResponse = await getOrganizations({
                pageNumber: page,
                pageSize: PAGE_SIZE,
                name: name || undefined,
                orgTypes: orgType ? [orgType] : undefined,
            });
            const items = res.content ?? [];
            const total = res.totalPages ?? 1;

            if (append) setOrgs(prev => [...prev, ...items]);
            else setOrgs(items);

            setPageNumber(page);
            setHasMore(page + 1 < total);
            setTotalElements(res.totalElements ?? items.length);
            setError(null);
        } finally {
            isFetchingRef.current = false;
        }
    }, []);

    // Initial load
    useEffect(() => {
        (async () => {
            setLoading(true);
            try { await fetchOrgs({}); }
            catch (e) {
                console.error('[Benefit] initial load error', e);
                setOrgs([]);
                setError('Không thể tải danh sách tổ chức. Vui lòng thử lại.');
            }
            setLoading(false);
        })();
    }, [fetchOrgs]);

    const applyFilters = useCallback(async (name: string, orgType: EOrgType | null) => {
        setLoading(true);
        setError(null);
        try { await fetchOrgs({ page: 0, name, orgType }); }
        catch { setOrgs([]); setError('Không thể tải danh sách. Vui lòng thử lại.'); }
        setLoading(false);
    }, [fetchOrgs]);

    const handleSearch = () => {
        setCommittedSearch(searchText);
        applyFilters(searchText, selectedOrgType);
    };

    const handleOrgTypeConfirm = (orgType: EOrgType | null) => {
        setSelectedOrgType(orgType);
        applyFilters(committedSearch, orgType);
    };

    const handleClearFilter = () => {
        setSelectedOrgType(null);
        setSelectedRating(null);
        setSelectedHour(null);
        setSearchText('');
        setCommittedSearch('');
        applyFilters('', null);
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try { await fetchOrgs({ page: 0, name: committedSearch, orgType: selectedOrgType }); }
        catch { /* silent */ }
        setRefreshing(false);
    }, [fetchOrgs, committedSearch, selectedOrgType]);

    const handleLoadMore = useCallback(async () => {
        if (!hasMore || loadingMore || loading || refreshing) return;
        setLoadingMore(true);
        try {
            await fetchOrgs({ page: pageNumber + 1, name: committedSearch, orgType: selectedOrgType, append: true });
        } catch { /* silent */ }
        setLoadingMore(false);
    }, [hasMore, loadingMore, loading, refreshing, pageNumber, fetchOrgs, committedSearch, selectedOrgType]);

    const handleOrgPress = (org: OrganizationSimpleResponse) => {
        router.push({
            pathname: '/screen/volunteer-screens/org-detail',
            params: {
                orgId: org.id,
                orgName: org.name,
                numberOfHostedEvents: String(org.numberOfHostedEvents),
                creditHour: String(org.creditHour),
            },
        } as any);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>

            {/* ══ BLUE HEADER ══ */}
            <View style={styles.header}>
                <View style={styles.headerBtn} />
                <Text style={styles.headerTitle}>Tìm kiếm tổ chức</Text>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => router.push('/screen/volunteer-screens/notifications' as any)}
                >
                    <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* ══ CONTENT AREA ══ */}
            <View style={styles.contentArea}>

                {/* SEARCH BAR */}
                <View style={styles.searchRow}>
                    <View style={styles.searchInputWrap}>
                        <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm theo tên hoặc mã tổ chức"
                            placeholderTextColor="#9CA3AF"
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                    </View>
                    <TouchableOpacity onPress={handleSearch} style={styles.filterIconBtn}>
                        <Ionicons name="options-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* FILTER DROPDOWN ROWS */}
                <View style={styles.filterSection}>
                    {/* Lĩnh vực */}
                    <TouchableOpacity
                        style={styles.filterDropRow}
                        onPress={() => setOrgTypeSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterDropText, selectedOrgType !== null && styles.filterDropTextActive]}>
                            {selectedOrgType !== null ? ORG_TYPE_SHORT_LABELS[selectedOrgType] : 'Tất cả lĩnh vực'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={selectedOrgType !== null ? '#42A4F5' : '#374151'} />
                    </TouchableOpacity>

                    {/* Đánh giá */}
                    <TouchableOpacity
                        style={styles.filterDropRow}
                        onPress={() => setRatingSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterDropText, selectedRating !== null && styles.filterDropTextActive]}>
                            {selectedRating !== null
                                ? RATING_OPTIONS.find(o => o.value === selectedRating)?.label
                                : 'Tất cả đánh giá'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={selectedRating !== null ? '#42A4F5' : '#374151'} />
                    </TouchableOpacity>

                    {/* Số giờ */}
                    <TouchableOpacity
                        style={styles.filterDropRow}
                        onPress={() => setHourSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterDropText, selectedHour !== null && styles.filterDropTextActive]}>
                            {selectedHour !== null
                                ? HOUR_OPTIONS.find(o => o.value === selectedHour)?.label
                                : 'Tất cả số giờ'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={selectedHour !== null ? '#42A4F5' : '#374151'} />
                    </TouchableOpacity>
                </View>

                {/* Clear all filters */}
                {(selectedOrgType !== null || selectedRating !== null || selectedHour !== null || committedSearch !== '') && (
                    <TouchableOpacity
                        style={styles.clearFilterRow}
                        onPress={handleClearFilter}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-circle" size={15} color="#EF4444" />
                        <Text style={styles.clearFilterText}>Xóa bộ lọc</Text>
                    </TouchableOpacity>
                )}

                {/* Result count */}
                {!loading && !error && (
                    <Text style={styles.resultCount}>Tìm thấy {filteredOrgs.length} tổ chức</Text>
                )}

                {/* LIST */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
                        <Text style={[styles.emptyText, { color: '#EF4444' }]}>Lỗi tải dữ liệu</Text>
                        <Text style={styles.emptySubText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => applyFilters(committedSearch, selectedOrgType)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="refresh" size={16} color="#fff" />
                            <Text style={styles.retryBtnText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredOrgs}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <OrgCard org={item} onPress={() => handleOrgPress(item)} />
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
                            loadingMore
                                ? <ActivityIndicator style={{ padding: 16 }} size="small" color="#42A4F5" />
                                : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="business-outline" size={48} color="#9CA3AF" />
                                <Text style={styles.emptyText}>Không tìm thấy tổ chức</Text>
                                <Text style={styles.emptySubText}>Thử thay đổi bộ lọc hoặc từ khoá</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* BOTTOM SHEETS */}
            <DropdownSheet
                visible={orgTypeSheetVisible}
                title="Chọn lĩnh vực"
                options={ORG_TYPE_OPTIONS}
                selected={selectedOrgType}
                onSelect={(v) => { setSelectedOrgType(v); applyFilters(committedSearch, v); }}
                onClose={() => setOrgTypeSheetVisible(false)}
            />
            <DropdownSheet
                visible={ratingSheetVisible}
                title="Chọn đánh giá"
                options={RATING_OPTIONS}
                selected={selectedRating}
                onSelect={(v) => { setSelectedRating(v); }}
                onClose={() => setRatingSheetVisible(false)}
            />
            <DropdownSheet
                visible={hourSheetVisible}
                title="Chọn số giờ"
                options={HOUR_OPTIONS}
                selected={selectedHour}
                onSelect={(v) => { setSelectedHour(v); }}
                onClose={() => setHourSheetVisible(false)}
            />
        </SafeAreaView>
    );
};

export default Benefit;


const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#42A4F5' },
    contentArea: { flex: 1, backgroundColor: '#F3F4F6' },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#42A4F5', paddingHorizontal: 12, paddingBottom: 14,
    },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

    /* Search */
    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 8,
    },
    searchInputWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F3F4F6', borderRadius: 10,
        paddingHorizontal: 10, height: 40,
    },
    searchInput: {
        flex: 1, fontSize: 14, color: '#1F2937',
    },
    filterIconBtn: {
        width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, backgroundColor: '#F3F4F6',
    },

    /* Filter dropdown rows */
    filterSection: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    filterDropRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    filterDropText: { fontSize: 14, color: '#374151' },
    filterDropTextActive: { color: '#42A4F5', fontWeight: '600' },

    /* Clear filter */
    clearFilterRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        backgroundColor: '#FEF2F2',
        borderBottomWidth: 1, borderBottomColor: '#FECACA',
    },
    clearFilterText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },

    /* Result count */
    resultCount: {
        fontSize: 13, color: '#6B7280',
        paddingHorizontal: 14, paddingVertical: 8,
    },

    /* List */
    listContent: { paddingHorizontal: 12, paddingBottom: 24 },

    /* Loading */
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

    /* Empty / Error */
    emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12, textAlign: 'center' },
    emptySubText: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
    retryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#42A4F5', borderRadius: 10,
        paddingHorizontal: 20, paddingVertical: 10, marginTop: 16,
    },
    retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

    /* Org Card */
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07, shadowRadius: 4,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    orgAvatar: {
        width: 52, height: 52, borderRadius: 10, backgroundColor: '#E3F2FD',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    cardInfo: { flex: 1 },
    orgName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 6, lineHeight: 20 },
    typeTag: {
        alignSelf: 'flex-start', backgroundColor: '#FCE7F3',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    typeTagText: { fontSize: 11, color: '#DB2777', fontWeight: '600' },

    /* Rating row */
    ratingRow: { marginTop: 10, marginBottom: 2 },

    /* Stats */
    statsRow: {
        flexDirection: 'row', marginTop: 10, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8,
    },
    statBox: {
        flex: 1, borderRadius: 10, padding: 10,
        alignItems: 'center', gap: 3, backgroundColor: '#F0F9FF',
    },
    statDivider: { width: 8 },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    statValue: { fontSize: 15, fontWeight: '800' },
});

