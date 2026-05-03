import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Modal, Image, FlatList, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getEventClaims, getClaimDetail, verifyClaimHour } from '@/services/host-event-service';
import { resolveSupabaseUrl } from '@/services/api-helpers';
import type { ClaimItem, ClaimDetail } from '@/services/event-types';

const PAGE_SIZE = 10;

function fmtDateTime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const Avatar = ({ uri, name, size = 48 }: { uri: string | null; name: string; size?: number }) => (
    <View style={[aStyles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
        {uri
            ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
            : <Text style={[aStyles.initials, { fontSize: size * 0.36 }]}>{name.charAt(0).toUpperCase()}</Text>
        }
    </View>
);

const HourBadge = ({ hours }: { hours: number }) => (
    <View style={styles.hourBadge}>
        <View style={styles.hourIconWrap}>
            <Ionicons name="time" size={22} color="#fff" />
        </View>
        <View>
            <Text style={styles.hourBadgeLabel}>Số giờ muốn bổ sung</Text>
            <Text style={styles.hourBadgeValue}>{hours} giờ</Text>
        </View>
    </View>
);

type LocalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ConfirmType = 'approve' | 'reject';

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HonorHourRequestsScreen() {
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [claims, setClaims] = useState<ClaimItem[]>([]);
    const [statusMap, setStatusMap] = useState<Record<string, LocalStatus>>({});
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [detailItem, setDetailItem] = useState<ClaimItem | null>(null);
    const [claimDetail, setClaimDetail] = useState<ClaimDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [confirm, setConfirm] = useState<{ item: ClaimItem; type: ConfirmType } | null>(null);
    const [verifying, setVerifying] = useState(false);

    const fetchPage = useCallback(async (pageNum: number, append = false) => {
        if (!eventId) return;
        const data = await getEventClaims(eventId, pageNum, PAGE_SIZE);
        const fetched = data.content ?? [];
        setClaims(prev => append ? [...prev, ...fetched] : fetched);
        setTotal(data.page.totalElements);
        setPage(pageNum);
        setHasMore(pageNum + 1 < data.page.totalPages);
        // init status for new items
        setStatusMap(prev => {
            const next = { ...prev };
            fetched.forEach(c => { if (!next[c.id]) next[c.id] = 'PENDING'; });
            return next;
        });
    }, [eventId]);

    useEffect(() => {
        (async () => {
            setLoading(true); setError(null);
            try { await fetchPage(0); }
            catch { setError('Không thể tải danh sách khiếu nại.'); }
            finally { setLoading(false); }
        })();
    }, [fetchPage]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try { await fetchPage(0); } catch { }
        finally { setRefreshing(false); }
    };

    const handleLoadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try { await fetchPage(page + 1, true); } catch { }
        finally { setLoadingMore(false); }
    };

    const handleApprove = (item: ClaimItem) => setConfirm({ item, type: 'approve' });
    const handleReject = (item: ClaimItem) => setConfirm({ item, type: 'reject' });

    const handleOpenDetail = async (item: ClaimItem) => {
        setDetailItem(item);
        setClaimDetail(null);
        setDetailLoading(true);
        try {
            const detail = await getClaimDetail(item.id);
            setClaimDetail(detail);
        } catch {
            // keep null — modal shows basic info from ClaimItem
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => { setDetailItem(null); setClaimDetail(null); };

    const confirmAction = async () => {
        if (!confirm || verifying) return;
        const { item, type } = confirm;
        setVerifying(true);
        try {
            await verifyClaimHour(item.id, type === 'approve');
            setStatusMap(prev => ({ ...prev, [item.id]: type === 'approve' ? 'APPROVED' : 'REJECTED' }));
            setConfirm(null);
            closeDetail();
            Alert.alert(
                type === 'approve' ? 'Đã duyệt' : 'Đã từ chối',
                type === 'approve'
                    ? `Khiếu nại của "${item.nickName ?? item.name}" đã được duyệt.`
                    : `Khiếu nại của "${item.nickName ?? item.name}" đã bị từ chối.`,
            );
        } catch {
            Alert.alert('Lỗi', 'Không thể xử lý yêu cầu. Vui lòng thử lại.');
        } finally {
            setVerifying(false);
        }
    };

    const pendingCount = Object.values(statusMap).filter(s => s === 'PENDING').length;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Yêu cầu bổ sung điểm</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Summary badge */}
            {!loading && !error && (
                <View style={styles.summaryBar}>
                    <Ionicons name="hourglass-outline" size={16} color={'#42A4F5'} />
                    <Text style={styles.summaryText}>{pendingCount} yêu cầu chờ xét duyệt</Text>
                </View>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={'#42A4F5'} />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="cloud-offline-outline" size={52} color="#CBD5E1" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchPage(0).finally(() => setLoading(false)); }}>
                        <Text style={styles.retryBtnText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : claims.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Ionicons name="checkmark-done-circle-outline" size={64} color="#BFDBFE" />
                    <Text style={styles.emptyText}>Không có yêu cầu nào</Text>
                </View>
            ) : (
                <FlatList
                    data={claims}
                    keyExtractor={r => r.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
                            colors={['#42A4F5']} tintColor={'#42A4F5'} />
                    }
                    ListFooterComponent={
                        loadingMore
                            ? <ActivityIndicator style={{ padding: 16 }} size="small" color={'#42A4F5'} />
                            : null
                    }
                    renderItem={({ item }) => {
                        const status = statusMap[item.id] ?? 'PENDING';
                        return (
                            <View style={styles.card}>
                                {/* Card header */}
                                <View style={styles.cardHeader}>
                                    <Avatar uri={item.avatarUrl} name={item.name} size={48} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.cardName}>{item.nickName ?? item.name}</Text>
                                        <Text style={styles.cardDate}>{fmtDateTime(item.createdAt)}</Text>
                                    </View>
                                    {status !== 'PENDING' && (
                                        <View style={[styles.statusChip, { backgroundColor: status === 'APPROVED' ? '#DBEAFE' : '#FEE2E2' }]}>
                                            <Text style={[styles.statusChipText, { color: status === 'APPROVED' ? '#1E40AF' : '#991B1B' }]}>
                                                {status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Hour badge */}
                                <HourBadge hours={item.honorHours} />

                                {/* Reason */}
                                <View style={styles.attachRow}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={15} color="#64748B" />
                                    <Text style={styles.attachText} numberOfLines={2}>Lý do: {item.reason}</Text>
                                </View>

                                {/* Action buttons */}
                                <TouchableOpacity style={styles.detailBtn} onPress={() => handleOpenDetail(item)} activeOpacity={0.8}>
                                    <Ionicons name="eye-outline" size={16} color="#fff" />
                                    <Text style={styles.detailBtnText}>Chi tiết</Text>
                                </TouchableOpacity>
                            </View>

                        );
                    }}
                />
            )}

            {/* ── Detail Modal ─────────────────────────────────────────── */}
            <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={closeDetail}>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailSheet}>
                        <View style={styles.detailHeader}>
                            <TouchableOpacity onPress={closeDetail} style={styles.detailCloseBtn}>
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.detailHeaderTitle}>Chi tiết khiếu nại</Text>
                        </View>

                        {detailItem && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
                                {/* Person row */}
                                <View style={styles.detailPersonRow}>
                                    <Avatar uri={(claimDetail ?? detailItem).avatarUrl} name={(claimDetail ?? detailItem).name} size={56} />
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={styles.detailName}>{(claimDetail ?? detailItem).nickName ?? (claimDetail ?? detailItem).name}</Text>
                                        <Text style={styles.detailDate}>Đã gửi: {fmtDateTime((claimDetail ?? detailItem).createdAt)}</Text>
                                    </View>
                                </View>

                                <HourBadge hours={(claimDetail ?? detailItem).honorHours} />

                                {detailLoading ? (
                                    <ActivityIndicator size="small" color={'#42A4F5'} style={{ marginVertical: 20 }} />
                                ) : (
                                    <View style={styles.infoBox}>
                                        <View style={styles.infoBoxHeader}>
                                            <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                            <Text style={styles.infoBoxTitle}>Thông tin khiếu nại</Text>
                                        </View>

                                        <Text style={styles.infoLabel}>Lý do khiếu nại <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                        <View style={styles.infoField}>
                                            <Text style={styles.infoFieldText}>{claimDetail?.reason ?? detailItem.reason}</Text>
                                        </View>

                                        {!!claimDetail?.detailReason && (
                                            <>
                                                <Text style={styles.infoLabel}>Giải trình chi tiết <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                                <View style={[styles.infoField, { minHeight: 88 }]}>
                                                    <Text style={styles.infoFieldText}>{claimDetail.detailReason}</Text>
                                                </View>
                                            </>
                                        )}

                                        {claimDetail && claimDetail.evidencesUrls.length > 0 && (
                                            <>
                                                <Text style={styles.infoLabel}>Minh chứng <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                                <View style={styles.evidenceGrid}>
                                                    {claimDetail.evidencesUrls.map((url, i) => (
                                                        <Image
                                                            key={i}
                                                            source={{ uri: resolveSupabaseUrl(url) ?? url }}
                                                            style={styles.evidenceImg}
                                                        />
                                                    ))}
                                                </View>
                                            </>
                                        )}
                                    </View>
                                )}

                                {(statusMap[detailItem.id] ?? 'PENDING') === 'PENDING' && (
                                    <View style={styles.detailActions}>
                                        <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#EF4444' }]}
                                            onPress={() => handleReject(detailItem)} activeOpacity={0.85}>
                                            <Ionicons name="close-circle-outline" size={18} color="#fff" />
                                            <Text style={styles.detailActionBtnText}>Từ chối</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#42A4F5' }]}
                                            onPress={() => handleApprove(detailItem)} activeOpacity={0.85}>
                                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                            <Text style={styles.detailActionBtnText}>Duyệt</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        )}

                        {/* ── Inline confirm overlay (inside same modal, no stacking) ── */}
                        {confirm && (
                            <View style={styles.inlineConfirmOverlay}>
                                <View style={styles.confirmCard}>
                                    <View style={[styles.confirmIconWrap, { backgroundColor: confirm.type === 'approve' ? '#DBEAFE' : '#FEE2E2' }]}>
                                        <Ionicons
                                            name={confirm.type === 'approve' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                                            size={40}
                                            color={confirm.type === 'approve' ? '#42A4F5' : '#EF4444'}
                                        />
                                    </View>
                                    <Text style={styles.confirmTitle}>
                                        {confirm.type === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                                    </Text>
                                    <Text style={styles.confirmMsg}>
                                        {confirm.type === 'approve'
                                            ? `Bạn có chắc chắn muốn duyệt khiếu nại của "${confirm.item.nickName ?? confirm.item.name}"?`
                                            : `Bạn có chắc chắn muốn từ chối khiếu nại của "${confirm.item.nickName ?? confirm.item.name}"?`
                                        }
                                    </Text>
                                    <View style={styles.confirmActions}>
                                        <TouchableOpacity
                                            style={[styles.confirmCancelBtn, verifying && { opacity: 0.5 }]}
                                            onPress={() => setConfirm(null)}
                                            disabled={verifying}
                                        >
                                            <Text style={styles.confirmCancelText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.confirmOkBtn, { backgroundColor: confirm.type === 'approve' ? '#42A4F5' : '#EF4444' }, verifying && { opacity: 0.7 }]}
                                            onPress={confirmAction}
                                            disabled={verifying}
                                        >
                                            {verifying
                                                ? <ActivityIndicator size="small" color="#fff" />
                                                : <Text style={styles.confirmOkText}>{confirm.type === 'approve' ? 'Duyệt' : 'Từ chối'}</Text>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}


// ─── Avatar styles ────────────────────────────────────────────────────────────
const aStyles = StyleSheet.create({
    wrap: { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    initials: { fontWeight: '700', color: '#42A4F5' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#42A4F5' },

    header: {
        backgroundColor: '#42A4F5',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

    summaryBar: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#EBF5FF', paddingHorizontal: 16, paddingVertical: 10,
    },
    summaryText: { fontSize: 13, color: '#1E40AF', fontWeight: '600' },

    listContent: { padding: 14, gap: 14, backgroundColor: '#F3F4F6', flexGrow: 1 },

    center: { flex: 1, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#94A3B8' },
    errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { backgroundColor: '#42A4F5', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
    retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    emptyWrap: { flex: 1, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },

    // ── Card ───────────────────────────────────────────────────
    card: {
        backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    cardDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusChipText: { fontSize: 11, fontWeight: '700' },

    // Hour badge
    hourBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#EBF5FF', borderRadius: 12, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#BFDBFE',
    },
    hourIconWrap: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#42A4F5', alignItems: 'center', justifyContent: 'center',
    },
    hourBadgeLabel: { fontSize: 11, color: '#42A4F5', fontWeight: '600', marginBottom: 2 },
    hourBadgeValue: { fontSize: 18, fontWeight: '800', color: '#1E40AF' },

    attachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    attachText: { fontSize: 12, color: '#64748B', flex: 1 },

    actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    detailBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: '#3B82F6', borderRadius: 10, paddingVertical: 11,
    },
    detailBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    approveBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center' },
    rejectBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },

    // ── Detail Modal ───────────────────────────────────────────
    detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    detailSheet: { backgroundColor: '#F3F4F6', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
    detailHeader: {
        backgroundColor: '#42A4F5', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    detailCloseBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
    },
    detailHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    detailContent: { padding: 16, gap: 12, paddingBottom: 32 },

    detailPersonRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14 },
    detailName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    detailDate: { fontSize: 12, color: '#94A3B8', marginTop: 3 },

    infoBox: {
        backgroundColor: '#FFF1F2', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#FEC5C8', gap: 10,
    },
    infoBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    infoBoxTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    infoLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
    infoField: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    infoFieldText: { fontSize: 14, color: '#334155', lineHeight: 20 },

    evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    evidenceImg: { width: 140, height: 100, borderRadius: 10, backgroundColor: '#E2E8F0' },

    detailActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    detailActionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, borderRadius: 12, paddingVertical: 14,
    },
    detailActionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    // ── Inline Confirm Overlay (inside detail modal) ────────────
    inlineConfirmOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        zIndex: 10,
    },
    confirmCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 28,
        alignItems: 'center', gap: 12, width: '100%',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    },
    confirmIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
    confirmTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    confirmMsg: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21 },
    confirmActions: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
    confirmCancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12,
        borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center',
    },
    confirmCancelText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
    confirmOkBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    confirmOkText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

