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
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// ─── Org Type Filter Options ─────────────────────────────────────────────────

const ORG_TYPE_OPTIONS: { label: string; value: EOrgType | null }[] = [
    { label: 'Tất cả loại', value: null },
    { label: 'Quỹ xã hội', value: 'SOCIAL_FUND' },
    { label: 'Quỹ từ thiện', value: 'CHARITY_FUND' },
    { label: 'Phi chính phủ', value: 'NGO' },
    { label: 'Tổ chức xã hội', value: 'SOCIAL_ORGANIZATION' },
    { label: 'Tổ chức quần chúng', value: 'MASS_ORGANIZATION' },
    { label: 'Trường đại học', value: 'UNIVERSITY_BASED' },
    { label: 'Doanh nghiệp tư nhân', value: 'PRIVATE_ENTERPRISE_BASED' },
    { label: 'Khác', value: 'OTHER' },
];

// ─── Org Type Selection Sheet ─────────────────────────────────────────────────

interface OrgTypeSheetProps {
    visible: boolean;
    selected: EOrgType | null;
    onSelect: (v: EOrgType | null) => void;
    onClose: () => void;
}

function OrgTypeSheet({ visible, selected, onSelect, onClose }: OrgTypeSheetProps) {
    if (!visible) return null;
    return (
        <View style={sheet.overlay}>
            <TouchableOpacity style={sheet.backdrop} onPress={onClose} activeOpacity={1} />
            <View style={sheet.container}>
                <View style={sheet.handle} />
                <Text style={sheet.title}>Chọn loại tổ chức</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {ORG_TYPE_OPTIONS.map((opt) => {
                        const active = selected === opt.value;
                        return (
                            <TouchableOpacity
                                key={opt.label}
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

// ─── Org Card ────────────────────────────────────────────────────────────────

function OrgCard({ org, onPress }: { org: OrganizationSimpleResponse; onPress: () => void }) {
    const typeLabel = org.orgType ? (ORG_TYPE_SHORT_LABELS[org.orgType] ?? org.orgType) : 'Khác';

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

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Ionicons name="calendar-outline" size={16} color="#42A4F5" />
                    <Text style={styles.statLabel}>Số hoạt động</Text>
                    <Text style={styles.statValue}>{org.numberOfHostedEvents.toLocaleString('vi-VN')}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const Benefit = () => {
    const [searchText, setSearchText] = useState('');
    const [selectedOrgType, setSelectedOrgType] = useState<EOrgType | null>(null);
    const [orgTypeSheetVisible, setOrgTypeSheetVisible] = useState(false);

    const [orgs, setOrgs] = useState<OrganizationSimpleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pageNumber, setPageNumber] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // committed search (only triggers on button press)
    const [committedSearch, setCommittedSearch] = useState('');

    const fetchOrgs = useCallback(async (opts: {
        page?: number;
        name?: string;
        orgType?: EOrgType | null;
        append?: boolean;
    }) => {
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
    }, []);

    // Initial load
    useEffect(() => {
        (async () => {
            setLoading(true);
            try { await fetchOrgs({}); } catch (e) { console.error(e); setOrgs([]); }
            setLoading(false);
        })();
    }, [fetchOrgs]);

    const applyFilters = useCallback(async (name: string, orgType: EOrgType | null) => {
        setLoading(true);
        try { await fetchOrgs({ page: 0, name, orgType }); } catch { setOrgs([]); }
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
        applyFilters(committedSearch, null);
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await fetchOrgs({ page: 0, name: committedSearch, orgType: selectedOrgType }); } catch { /* silent */ }
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
        router.push({ pathname: '/screen/org-detail', params: { orgId: org.id, orgName: org.name } } as any);
    };

    // ── Render ──
    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>

            {/* ══ BLUE HEADER ══ */}
            <View style={styles.header}>
                <View style={styles.headerBtn} />
                <Text style={styles.headerTitle}>Tìm kiếm tổ chức</Text>
                <TouchableOpacity style={styles.headerBtn} onPress={handleSearch}>
                    <Ionicons name="search" size={22} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* ══ CONTENT AREA ══ */}
            <View style={styles.contentArea}>

                {/* SEARCH BAR */}
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm theo tên tổ chức..."
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

                {/* FILTER CHIPS ROW */}
                <View style={styles.filterRow}>
                    {/* Org type chip */}
                    <TouchableOpacity
                        style={[styles.filterChip, selectedOrgType !== null && styles.filterChipActive]}
                        onPress={() => setOrgTypeSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="business-outline"
                            size={13}
                            color={selectedOrgType !== null ? '#42A4F5' : '#6B7280'}
                            style={{ marginRight: 3 }}
                        />
                        <Text style={[styles.filterChipText, selectedOrgType !== null && styles.filterChipTextActive]}>
                            {selectedOrgType !== null
                                ? ORG_TYPE_SHORT_LABELS[selectedOrgType]
                                : 'Loại\ntổ chức'}
                        </Text>
                        <Ionicons
                            name="chevron-down"
                            size={12}
                            color={selectedOrgType !== null ? '#42A4F5' : '#6B7280'}
                            style={{ marginLeft: 2 }}
                        />
                    </TouchableOpacity>

                    <View style={styles.chipDivider} />

                    {/* Clear / placeholder */}
                    {selectedOrgType !== null ? (
                        <TouchableOpacity style={styles.filterChip} onPress={handleClearFilter} activeOpacity={0.7}>
                            <Ionicons name="close-circle" size={14} color="#EF4444" style={{ marginRight: 3 }} />
                            <Text style={[styles.filterChipText, { color: '#EF4444' }]}>{'Xóa\nlọc'}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.filterChip, { opacity: 0 }]} pointerEvents="none">
                            <Text style={styles.filterChipText}>{'Tất cả\nloại'}</Text>
                        </View>
                    )}
                </View>

                {/* LIST */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={orgs}
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

            {/* ORG TYPE BOTTOM SHEET */}
            <OrgTypeSheet
                visible={orgTypeSheetVisible}
                selected={selectedOrgType}
                onSelect={handleOrgTypeConfirm}
                onClose={() => setOrgTypeSheetVisible(false)}
            />
        </SafeAreaView>
    );
};

export default Benefit;

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#42A4F5' },
    contentArea: { flex: 1, backgroundColor: '#E3F2FD' },

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
        backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 8,
    },
    searchInput: {
        flex: 1, height: 40, backgroundColor: '#F3F4F6',
        borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#1F2937',
    },
    searchBtn: {
        width: 40, height: 40, backgroundColor: '#42A4F5',
        borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    },

    /* Filter chips */
    filterRow: {
        flexDirection: 'row', backgroundColor: '#FFFFFF',
        paddingHorizontal: 8, paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'center',
    },
    filterChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8,
    },
    filterChipActive: { backgroundColor: '#EBF5FF' },
    filterChipText: {
        fontSize: 12, color: '#374151', textAlign: 'center', lineHeight: 16,
    },
    filterChipTextActive: { color: '#42A4F5', fontWeight: '600' },
    chipDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

    /* List */
    listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 },

    /* Loading */
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },

    /* Empty */
    emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12, textAlign: 'center' },
    emptySubText: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

    /* Org Card */
    card: {
        backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12,
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
        alignSelf: 'flex-start', backgroundColor: '#E3F2FD',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    typeTagText: { fontSize: 11, color: '#42A4F5', fontWeight: '600' },

    statsRow: {
        flexDirection: 'row', marginTop: 12, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    statBox: { flex: 1, alignItems: 'center', gap: 2 },
    statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    statValue: { fontSize: 16, fontWeight: '700', color: '#42A4F5' },
});