import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Modal, Image, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HonorRequest {
    id: string;
    name: string;
    avatarUrl: string | null;
    sentDate: string;      // "DD/MM/YYYY"
    requestedHours: number;
    attachmentCount: number;
    reason: string;
    detail: string;
    evidenceImages: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK: HonorRequest[] = [
    {
        id: '1',
        name: 'Nguyễn Văn An',
        avatarUrl: null,
        sentDate: '29/01/2024',
        requestedHours: 2,
        attachmentCount: 2,
        reason: 'Tham gia thêm buổi chuẩn bị và dọn dẹp sau sự kiện',
        detail: 'Tôi đã tham gia từ 5h sáng để chuẩn bị vật dụng và ở lại đến 14h để dọn dẹp, tổng cộng 9 giờ thay vì 6 giờ như ghi nhận.',
        evidenceImages: [
            'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400',
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400',
        ],
        status: 'PENDING',
    },
    {
        id: '2',
        name: 'Trần Thị Bình',
        avatarUrl: null,
        sentDate: '26/01/2024',
        requestedHours: 1,
        attachmentCount: 1,
        reason: 'Hỗ trợ vận chuyển thiết bị sau giờ kết thúc',
        detail: 'Tôi đã ở lại sau sự kiện để giúp vận chuyển các thiết bị âm thanh và ánh sáng đến kho lưu trữ, mất thêm khoảng 1 giờ so với thời gian ghi nhận.',
        evidenceImages: [
            'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400',
        ],
        status: 'PENDING',
    },
    {
        id: '3',
        name: 'Lê Hoàng Minh',
        avatarUrl: null,
        sentDate: '22/01/2024',
        requestedHours: 2,
        attachmentCount: 2,
        reason: 'Thực hiện công việc hỗ trợ y tế ngoài ca chính thức',
        detail: 'Là tình nguyện viên y tế, tôi đã phải ở lại thêm 2 giờ để hỗ trợ sơ cứu cho 3 người tham gia bị say nắng sau khi ca chính thức của tôi kết thúc.',
        evidenceImages: [
            'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=400',
            'https://images.unsplash.com/photo-1559181567-c3190ca9d40d?w=400',
        ],
        status: 'PENDING',
    },
];

const PRIMARY = '#42A4F5';

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
            <Text style={styles.hourBadgeLabel}>Yêu cầu bổ sung</Text>
            <Text style={styles.hourBadgeValue}>{hours} giờ</Text>
        </View>
    </View>
);

type ConfirmType = 'approve' | 'reject';

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HonorHourRequestsScreen() {
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [requests, setRequests] = useState<HonorRequest[]>(MOCK);
    const [detailItem, setDetailItem] = useState<HonorRequest | null>(null);
    const [confirm, setConfirm] = useState<{ item: HonorRequest; type: ConfirmType } | null>(null);

    const handleApprove = (item: HonorRequest) => setConfirm({ item, type: 'approve' });
    const handleReject = (item: HonorRequest) => setConfirm({ item, type: 'reject' });

    const confirmAction = () => {
        if (!confirm) return;
        const { item, type } = confirm;
        setRequests(prev => prev.map(r =>
            r.id === item.id ? { ...r, status: type === 'approve' ? 'APPROVED' : 'REJECTED' } : r
        ));
        setConfirm(null);
        setDetailItem(null);
        Alert.alert(
            type === 'approve' ? 'Đã duyệt' : 'Đã từ chối',
            type === 'approve'
                ? `Khiếu nại của "${item.name}" đã được duyệt.`
                : `Khiếu nại của "${item.name}" đã bị từ chối.`,
        );
    };

    const pendingList = requests.filter(r => r.status === 'PENDING');

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
            <View style={styles.summaryBar}>
                <Ionicons name="hourglass-outline" size={16} color={PRIMARY} />
                <Text style={styles.summaryText}>{pendingList.length} yêu cầu chờ xét duyệt</Text>
            </View>

            {/* List */}
            {requests.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Ionicons name="checkmark-done-circle-outline" size={64} color="#BFDBFE" />
                    <Text style={styles.emptyText}>Không có yêu cầu nào</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={r => r.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            {/* Card header */}
                            <View style={styles.cardHeader}>
                                <Avatar uri={item.avatarUrl} name={item.name} size={48} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.cardName}>{item.name}</Text>
                                    <Text style={styles.cardDate}>Đã gửi: {item.sentDate}</Text>
                                </View>
                                {item.status !== 'PENDING' && (
                                    <View style={[styles.statusChip, { backgroundColor: item.status === 'APPROVED' ? '#DBEAFE' : '#FEE2E2' }]}>
                                        <Text style={[styles.statusChipText, { color: item.status === 'APPROVED' ? '#1E40AF' : '#991B1B' }]}>
                                            {item.status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Hour badge */}
                            <HourBadge hours={item.requestedHours} />

                            {/* Attachment count */}
                            <View style={styles.attachRow}>
                                <Ionicons name="attach-outline" size={15} color="#64748B" />
                                <Text style={styles.attachText}>{item.attachmentCount} minh chứng đính kèm</Text>
                            </View>

                            {/* Action buttons */}
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.detailBtn} onPress={() => setDetailItem(item)} activeOpacity={0.8}>
                                    <Ionicons name="eye-outline" size={16} color="#fff" />
                                    <Text style={styles.detailBtnText}>Chi tiết</Text>
                                </TouchableOpacity>
                                {item.status === 'PENDING' && (<>
                                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)} activeOpacity={0.8}>
                                        <Ionicons name="checkmark" size={20} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)} activeOpacity={0.8}>
                                        <Ionicons name="close" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </>)}
                            </View>
                        </View>
                    )}
                />
            )}

            {/* ── Detail Modal ─────────────────────────────────────────── */}
            <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={() => setDetailItem(null)}>
                <View style={styles.detailOverlay}>
                    <View style={styles.detailSheet}>
                        {/* Detail header */}
                        <View style={styles.detailHeader}>
                            <TouchableOpacity onPress={() => setDetailItem(null)} style={styles.detailCloseBtn}>
                                <Ionicons name="close" size={20} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.detailHeaderTitle}>Chi tiết khiếu nại</Text>
                        </View>

                        {detailItem && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
                                {/* Person info */}
                                <View style={styles.detailPersonRow}>
                                    <Avatar uri={detailItem.avatarUrl} name={detailItem.name} size={56} />
                                    <View style={{ flex: 1, marginLeft: 14 }}>
                                        <Text style={styles.detailName}>{detailItem.name}</Text>
                                        <Text style={styles.detailDate}>Đã gửi: {detailItem.sentDate}</Text>
                                    </View>
                                </View>

                                {/* Hour badge */}
                                <HourBadge hours={detailItem.requestedHours} />

                                {/* Complaint info box */}
                                <View style={styles.infoBox}>
                                    <View style={styles.infoBoxHeader}>
                                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                                        <Text style={styles.infoBoxTitle}>Thông tin khiếu nại</Text>
                                    </View>

                                    <Text style={styles.infoLabel}>Lý do khiếu nại <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <View style={styles.infoField}>
                                        <Text style={styles.infoFieldText}>{detailItem.reason}</Text>
                                    </View>

                                    <Text style={styles.infoLabel}>Giải trình chi tiết <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <View style={[styles.infoField, { minHeight: 88 }]}>
                                        <Text style={styles.infoFieldText}>{detailItem.detail}</Text>
                                    </View>

                                    <Text style={styles.infoLabel}>Minh chứng <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <View style={styles.evidenceGrid}>
                                        {detailItem.evidenceImages.map((uri, i) => (
                                            <Image key={i} source={{ uri }} style={styles.evidenceImg} />
                                        ))}
                                    </View>
                                </View>

                                {/* Action buttons in detail */}
                                {detailItem.status === 'PENDING' && (
                                    <View style={styles.detailActions}>
                                        <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#EF4444' }]}
                                            onPress={() => handleReject(detailItem)} activeOpacity={0.85}>
                                            <Ionicons name="close-circle-outline" size={18} color="#fff" />
                                            <Text style={styles.detailActionBtnText}>Từ chối</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: PRIMARY }]}
                                            onPress={() => handleApprove(detailItem)} activeOpacity={0.85}>
                                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                                            <Text style={styles.detailActionBtnText}>Duyệt</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Confirm Modal ─────────────────────────────────────────── */}
            <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <View style={[styles.confirmIconWrap, { backgroundColor: confirm?.type === 'approve' ? '#DBEAFE' : '#FEE2E2' }]}>
                            <Ionicons
                                name={confirm?.type === 'approve' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                                size={40}
                                color={confirm?.type === 'approve' ? PRIMARY : '#EF4444'}
                            />
                        </View>
                        <Text style={styles.confirmTitle}>
                            {confirm?.type === 'approve' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                        </Text>
                        <Text style={styles.confirmMsg}>
                            {confirm?.type === 'approve'
                                ? `Bạn có chắc chắn muốn duyệt khiếu nại của "${confirm?.item.name}"?`
                                : `Bạn có chắc chắn muốn từ chối khiếu nại của "${confirm?.item.name}"?`
                            }
                        </Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirm(null)}>
                                <Text style={styles.confirmCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmOkBtn, { backgroundColor: confirm?.type === 'approve' ? PRIMARY : '#EF4444' }]}
                                onPress={confirmAction}>
                                <Text style={styles.confirmOkText}>
                                    {confirm?.type === 'approve' ? 'Duyệt' : 'Từ chối'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ─── Avatar styles ────────────────────────────────────────────────────────────
const aStyles = StyleSheet.create({
    wrap: { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    initials: { fontWeight: '700', color: PRIMARY },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: PRIMARY },

    header: {
        backgroundColor: PRIMARY,
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

    listContent: { padding: 14, gap: 14 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
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
        backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    },
    hourBadgeLabel: { fontSize: 11, color: PRIMARY, fontWeight: '600', marginBottom: 2 },
    hourBadgeValue: { fontSize: 18, fontWeight: '800', color: '#1E40AF' },

    attachRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    attachText: { fontSize: 12, color: '#64748B' },

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
        backgroundColor: PRIMARY, borderTopLeftRadius: 24, borderTopRightRadius: 24,
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

    // Info box
    infoBox: {
        backgroundColor: '#FFF1F2', borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#FEC5C8', gap: 10,
    },
    infoBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    infoBoxTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    infoLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
    infoField: {
        backgroundColor: '#fff', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: '#E2E8F0',
    },
    infoFieldText: { fontSize: 14, color: '#334155', lineHeight: 20 },

    evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    evidenceImg: { width: 140, height: 100, borderRadius: 10, backgroundColor: '#E2E8F0' },

    noticeBox: {
        flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB',
        borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FDE68A',
    },
    noticeTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 4 },
    noticeItem: { fontSize: 12, color: '#92400E', lineHeight: 18 },

    detailActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    detailActionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, borderRadius: 12, paddingVertical: 14,
    },
    detailActionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    // ── Confirm Modal ──────────────────────────────────────────
    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 32 },
    confirmCard: {
        backgroundColor: '#fff', borderRadius: 24, padding: 28,
        alignItems: 'center', gap: 12,
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
