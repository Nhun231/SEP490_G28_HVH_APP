import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Alert,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
    MyEventStatus,
    EventDetailResponse,
    getEventDetail,
    getApiErrorMessage,
} from '@/services/event-service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Parse an ISO datetime string into { date, startTime, endTime } display values.
 * e.g. "2026-04-10T07:00:00" → { date: "10/04/2026", time: "07:00" }
 */
function parseIsoDateTime(iso: string): { date: string; time: string } {
    const [datePart, timePart] = iso.split('T');
    const [y, m, d] = datePart.split('-');
    const time = timePart?.slice(0, 5) ?? '';
    return { date: `${d}/${m}/${y}`, time };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InfoRowProps {
    icon: string;
    label?: string;
    value: string;
    valueColor?: string;
    bold?: boolean;
}

const InfoRow = ({ icon, label, value, valueColor, bold }: InfoRowProps) => (
    <View style={styles.infoRow}>
        <Ionicons name={icon as any} size={17} color="#42A4F5" style={{ marginTop: 1 }} />
        <View style={{ flex: 1, marginLeft: 10 }}>
            {label ? <Text style={styles.infoLabel}>{label}</Text> : null}
            <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}, bold ? { fontWeight: '700' } : {}]}>
                {value}
            </Text>
        </View>
    </View>
);

export type EventStatus = MyEventStatus;

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bgColor: string }> = {
    EDITING:         { label: 'Đang soạn thảo',   color: '#6B7280', bgColor: '#F3F4F6' },
    SUBMITTED:       { label: 'Chờ phê duyệt',    color: '#3B82F6', bgColor: '#DBEAFE' },
    APPROVED_BY_MNG: { label: 'Quản lý đã duyệt', color: '#10B981', bgColor: '#D1FAE5' },
    REJECTED_BY_MNG: { label: 'Quản lý từ chối', color: '#EF4444', bgColor: '#FEE2E2' },
    REJECTED_BY_AD:  { label: 'Admin từ chối',    color: '#DC2626', bgColor: '#FEE2E2' },
    RECRUITING:      { label: 'Đang tuyển TNV',    color: '#7C3AED', bgColor: '#EDE9FE' },
    UPCOMING:        { label: 'Sắp diễn ra',       color: '#D97706', bgColor: '#FEF3C7' },
    ONGOING:         { label: 'Đang diễn ra',       color: '#059669', bgColor: '#D1FAE5' },
    ENDED:           { label: 'Đã kết thúc',       color: '#6B7280', bgColor: '#F3F4F6' },
    COMPLETED:       { label: 'Hoàn thành',         color: '#0EA5E9', bgColor: '#E0F2FE' },
    CANCELLED:       { label: 'Đã hủy',            color: '#9CA3AF', bgColor: '#F9FAFB' },
};

interface ServiceOption {
    key: string;
    label: string;
    icon: string;
    iconColor: string;
    bgColor: string;
    onPress: () => void;
}

interface ServiceGridProps {
    options: ServiceOption[];
}

const ServiceGrid = ({ options }: ServiceGridProps) => (
    <View style={styles.serviceGrid}>
        {options.map(opt => (
            <TouchableOpacity
                key={opt.key}
                style={styles.serviceItem}
                onPress={opt.onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.serviceIconWrapper, { backgroundColor: opt.bgColor }]}>
                    <Ionicons name={opt.icon as any} size={22} color={opt.iconColor} />
                </View>
                <Text style={styles.serviceLabel}>{opt.label}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const EventDetailScreen = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [showCheckinCode, setShowCheckinCode] = useState(false);

    // API state
    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getEventDetail(id);
            setEvent(data);
        } catch (e) {
            setError(getApiErrorMessage(e) || 'Không thể tải thông tin sự kiện');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    // ── Loading state ─────────────────────────────────────────────────────────

    if (loading) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView style={styles.container} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Chi tiết sự kiện</Text>
                        <View style={styles.bellBtn} />
                    </View>
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color={BLUE} />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    // ── Error state ───────────────────────────────────────────────────────────

    if (error || !event) {
        return (
            <>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView style={styles.container} edges={['top']}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Chi tiết sự kiện</Text>
                        <View style={styles.bellBtn} />
                    </View>
                    <View style={styles.centerBox}>
                        <Ionicons name="cloud-offline-outline" size={52} color="#CBD5E1" />
                        <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
                        <Text style={styles.errorMsg}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail} activeOpacity={0.8}>
                            <Text style={styles.retryBtnText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    // ── Derive display values ─────────────────────────────────────────────────

    const statusCfg = STATUS_CONFIG[event.status] ?? {
        label: event.status, color: '#6B7280', bgColor: '#F3F4F6',
    };

    // Parse sessions for display
    const sessions = event.eventSessions.map(s => ({
        date: parseIsoDateTime(s.startDateTime).date,
        startTime: parseIsoDateTime(s.startDateTime).time,
        endTime: parseIsoDateTime(s.endDateTime).time,
        volunteerCount: s.expectedVolAmount,
        servedCount: s.expectedSerAmount,
    }));

    const uniqueDates = [...new Set(sessions.map(s => s.date))];
    const days = uniqueDates.length;
    const timeRange = sessions.length > 0
        ? `${sessions[0].startTime} - ${sessions[sessions.length - 1].endTime}`
        : '';
    const dateRange = sessions.length > 0
        ? (days === 1 ? sessions[0].date : `${sessions[0].date} - ${sessions[sessions.length - 1].date}`)
        : '';

    const handleCancel = () => Alert.alert('Xác nhận', 'Bạn có chắc muốn hủy sự kiện này?', [
        { text: 'Không', style: 'cancel' },
        { text: 'Hủy sự kiện', style: 'destructive', onPress: () => console.log('Cancel event', event.id) },
    ]);
    const handleUpdate = () => router.push({ pathname: '/screen/create-event', params: { eventId: event.id } });
    const handleHide = () => Alert.alert('Ẩn sự kiện', 'Sự kiện sẽ bị ẩn khỏi danh sách tuyển quân.');
    const handleParticipants = () => console.log('View participants', event.id);
    const handleCheckin = () => setShowCheckinCode(prev => !prev);
    // TODO: call API to generate/fetch check-in code, then setShowCheckinCode(true)
    const handleReviews = () => router.push({ pathname: '/screen/event-rating', params: { eventId: event.id } });
    const handleMoments = () => router.push({ pathname: '/screen/event-moments', params: { eventId: event.id } });
    const handleComplaint = () => console.log('Complain about points', event.id);

    const serviceOptions: ServiceOption[] = (() => {
        const s = event.status;

        // EDITING | SUBMITTED | APPROVED_BY_MNG | REJECTED_BY_MNG | REJECTED_BY_AD
        if (['EDITING', 'SUBMITTED', 'APPROVED_BY_MNG', 'REJECTED_BY_MNG', 'REJECTED_BY_AD'].includes(s)) {
            return [
                { key: 'cancel', label: 'Hủy sự kiện', icon: 'close-circle-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleCancel },
                { key: 'update', label: 'Cập nhật', icon: 'create-outline', iconColor: '#3B82F6', bgColor: '#DBEAFE', onPress: handleUpdate },
            ];
        }

        // RECRUITING | UPCOMING
        if (['RECRUITING', 'UPCOMING'].includes(s)) {
            return [
                { key: 'cancel', label: 'Hủy sự kiện', icon: 'close-circle-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleCancel },
                { key: 'update', label: 'Cập nhật', icon: 'create-outline', iconColor: '#3B82F6', bgColor: '#DBEAFE', onPress: handleUpdate },
                { key: 'hide', label: 'Ẩn', icon: 'eye-off-outline', iconColor: '#9CA3AF', bgColor: '#F3F4F6', onPress: handleHide },
                { key: 'participants', label: 'Người tham gia', icon: 'people-outline', iconColor: '#7C3AED', bgColor: '#EDE9FE', onPress: handleParticipants },
            ];
        }

        // ONGOING
        if (s === 'ONGOING') {
            return [
                { key: 'checkin', label: 'Tạo mã check-in', icon: 'qr-code-outline', iconColor: '#059669', bgColor: '#D1FAE5', onPress: handleCheckin },
                { key: 'update', label: 'Cập nhật', icon: 'create-outline', iconColor: '#3B82F6', bgColor: '#DBEAFE', onPress: handleUpdate },
                { key: 'hide', label: 'Ẩn', icon: 'eye-off-outline', iconColor: '#9CA3AF', bgColor: '#F3F4F6', onPress: handleHide },
                { key: 'participants', label: 'Người tham gia', icon: 'people-outline', iconColor: '#7C3AED', bgColor: '#EDE9FE', onPress: handleParticipants },
            ];
        }

        // ENDED | COMPLETED
        if (['ENDED', 'COMPLETED'].includes(s)) {
            return [
                { key: 'reviews', label: 'Xem đánh giá', icon: 'star-outline', iconColor: '#F59E0B', bgColor: '#FEF3C7', onPress: handleReviews },
                { key: 'moments', label: 'Khoảnh khắc', icon: 'images-outline', iconColor: '#EC4899', bgColor: '#FCE7F3', onPress: handleMoments },
                { key: 'participants', label: 'Người tham gia', icon: 'people-outline', iconColor: '#7C3AED', bgColor: '#EDE9FE', onPress: handleParticipants },
                { key: 'complaint', label: 'Khiếu nại điểm', icon: 'alert-circle-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleComplaint },
            ];
        }

        // CANCELLED
        if (s === 'CANCELLED') {
            return [
                { key: 'update', label: 'Cập nhật', icon: 'create-outline', iconColor: '#3B82F6', bgColor: '#DBEAFE', onPress: handleUpdate },
            ];
        }

        return [];
    })();


    // ── JSX ──────────────────────────────────────────────────────────────────

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chi tiết sự kiện</Text>
                    <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
                        <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Title card ── */}
                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <Text style={styles.eventTitle} numberOfLines={3}>{event.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bgColor }]}>
                                <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                                    {statusCfg.label}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.orgRow}>
                            <Ionicons name="business-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.orgName}>{event.orgName}</Text>
                        </View>
                    </View>

                    {/* ── Dịch vụ của tôi ── */}
                    {serviceOptions.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Dịch vụ của tôi</Text>
                            <ServiceGrid options={serviceOptions} />
                        </View>
                    )}

                    {/* ── Hình ảnh sự kiện ── */}
                    {event.imageUrls.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Hình ảnh sự kiện</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.imageRow}
                            >
                                {event.imageUrls.map((uri, idx) => (
                                    <Image
                                        key={idx}
                                        source={{ uri }}
                                        style={styles.eventImage}
                                        resizeMode="cover"
                                    />
                                ))}
                            </ScrollView>

                            {/* Activity domain */}
                            <View style={styles.domainRow}>
                                <View style={styles.domainIcon}>
                                    <Ionicons name="leaf-outline" size={15} color="#10B981" />
                                </View>
                                <View>
                                    <Text style={styles.domainLabel}>Hoạt động chính</Text>
                                    <Text style={styles.domainValue}>{event.activityDomain}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ── Thời gian ── */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Thời gian</Text>
                        <InfoRow
                            icon="calendar-outline"
                            label="Thời gian diễn ra"
                            value={days > 1 ? `${dateRange} (${days} ngày)` : dateRange}
                        />
                        <View style={styles.rowDivider} />
                        <InfoRow
                            icon="time-outline"
                            label="Giờ làm việc"
                            value={timeRange}
                        />
                        {sessions.length > 1 && (
                            <View style={styles.sessionsList}>
                                {sessions.map((session, idx) => (
                                    <View key={idx} style={styles.sessionItem}>
                                        <Text style={styles.sessionDay}>Ngày {idx + 1}: {session.date}</Text>
                                        <Text style={styles.sessionTime}>{session.startTime} – {session.endTime}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ── Địa điểm ── */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Địa điểm</Text>
                        <InfoRow icon="location-outline" label="Nơi diễn ra sự kiện" value={event.servingPlaceType} />
                        <View style={styles.rowDivider} />
                        <InfoRow icon="navigate-outline" label="Địa điểm check-in" value={`${event.checkInPlaceLat}, ${event.checkInPlaceLng}`} />
                        <View style={styles.rowDivider} />
                        <InfoRow icon="map-outline" label="Địa chỉ cụ thể" value={event.address} />
                    </View>

                    {/* ── Mã check-in — hiển thị khi nhấn "Tạo mã check-in" ── */}
                    {showCheckinCode && (
                        <View style={[styles.card, styles.checkinCard]}>
                            <View style={styles.checkinLeft}>
                                <Ionicons name="qr-code-outline" size={20} color={BLUE} />
                                <Text style={styles.checkinLabel}>Mã check-in</Text>
                            </View>
                            <Text style={styles.checkinCode}>{event.checkInCode}</Text>
                        </View>
                    )}

                    {/* ── Thống kê dự kiến ── */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Thống kê dự kiến</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Ionicons name="person-outline" size={16} color="#7C3AED" />
                                <Text style={styles.statLabel}>Tình nguyện viên</Text>
                                <Text style={[styles.statValue, { color: '#7C3AED' }]}>
                                    {event.totalVolunteers}
                                </Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={16} color="#059669" />
                                <Text style={styles.statLabel}>Số người phục vụ</Text>
                                <Text style={[styles.statValue, { color: '#059669' }]}>
                                    {event.totalServed}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.rowDivider} />

                        {/* Served target */}
                        <View style={styles.targetRow}>
                            <View style={styles.targetIcon}>
                                <Ionicons name="heart-outline" size={15} color="#EC4899" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Đối tượng phục vụ</Text>
                                <Text style={styles.infoValue}>{event.servedTarget}</Text>
                            </View>
                        </View>

                        <View style={styles.rowDivider} />

                        {/* Description */}
                        <View style={styles.descRow}>
                            <View style={styles.targetIcon}>
                                <Ionicons name="document-text-outline" size={15} color="#6B7280" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Mô tả chi tiết</Text>
                                <Text style={styles.descText}>{event.description}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Bottom padding */}
                    <View style={{ height: 32 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const BLUE = '#42A4F5';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Background is BLUE so SafeAreaView top inset matches the header (no white gap)
        backgroundColor: BLUE,
    },

    // Header
    header: {
        backgroundColor: BLUE,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        marginTop: -8,
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    bellBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    scroll: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 24 },

    // Loading / error center
    centerBox: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 12,
    },
    loadingText: {
        fontSize: 15,
        color: '#94A3B8',
        marginTop: 8,
    },
    errorTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#475569',
    },
    errorMsg: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        marginTop: 4,
        paddingHorizontal: 28,
        paddingVertical: 11,
        backgroundColor: BLUE,
        borderRadius: 10,
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // Card
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 14,
    },

    // Title card
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    eventTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        lineHeight: 26,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        alignSelf: 'flex-start',
        flexShrink: 0,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    orgRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    orgName: {
        fontSize: 13,
        color: '#64748B',
    },

    // Service grid
    serviceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    serviceItem: {
        width: '22%',
        alignItems: 'center',
        gap: 7,
    },
    serviceIconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serviceLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
        lineHeight: 15,
    },

    // Images
    imageRow: {
        gap: 8,
        marginBottom: 14,
    },
    eventImage: {
        width: 110,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
    },
    domainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        padding: 10,
    },
    domainIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    domainLabel: {
        fontSize: 11,
        color: '#6B7280',
        marginBottom: 2,
    },
    domainValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E40AF',
    },

    // Info rows
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    infoLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
        lineHeight: 20,
    },
    rowDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 10,
    },

    // Sessions
    sessionsList: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        gap: 6,
        marginTop: 4,
    },
    sessionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sessionDay: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    sessionTime: {
        fontSize: 13,
        color: BLUE,
        fontWeight: '600',
    },

    // Check-in card
    checkinCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#EFF6FF',
        borderWidth: 1.5,
        borderColor: '#BFDBFE',
    },
    checkinLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    checkinLabel: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '600',
    },
    checkinCode: {
        fontSize: 16,
        fontWeight: '800',
        color: BLUE,
        letterSpacing: 1,
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 52,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
    },

    // Served target & description
    targetRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    targetIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    descRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    descText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
    },
});

export default EventDetailScreen;
