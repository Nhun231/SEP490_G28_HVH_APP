import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { MyEventStatus, EventDetailResponse } from '@/services/event-types';
import { getEventDetailByHost, deleteEvent } from '@/services/host-event-service';
import { getApiErrorMessage, resolveSupabaseUrl } from '@/services/api-helpers';
import servedTargetsData from '@/assets/served_targets/doi_tuong_phuc_vu.json';
import servedPlacesData from '@/assets/served_places/dia_diem_phuc_vu.json';
import InfoRow from '@/app/components/host/event-details/InfoRow';
import ServiceGrid, { ServiceOption } from '@/app/components/host/event-details/ServiceGrid';
import EventSessionModal from '@/app/components/host/event-details/EventSessionModal';
import CancelEventModal from '@/app/components/host/event-details/CancelEventModal';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=400&fit=crop';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// lookup map
const SERVED_TARGET_LABEL: Record<string, string> = Object.fromEntries(
    servedTargetsData.doi_tuong_phuc_vu.map(item => [item.value, item.label])
);

const SERVING_PLACE_LABEL: Record<string, string> = Object.fromEntries(
    servedPlacesData.dia_diem_phuc_vu.map(item => [item.value, item.label])
);

// parse iso into date and time
function parseIsoDateTime(iso: string): { date: string; time: string } {
    const [datePart, timePart] = iso.split('T');
    const [y, m, d] = datePart.split('-');
    const time = timePart?.slice(0, 5) ?? '';
    return { date: `${d}/${m}/${y}`, time };
}

// reverse geocode lat lng 
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`;
        const res = await fetch(url, { headers: { 'User-Agent': 'HVH-App/1.0' } });
        if (!res.ok) return null;
        const data = await res.json();
        const addr = data.address as Record<string, string> | undefined;
        if (addr) {
            const parts = [
                addr.road || addr.pedestrian || addr.footway || addr.path,
                addr.suburb || addr.quarter || addr.neighbourhood,
                addr.city_district || addr.district || addr.county,
                addr.city || addr.town || addr.state,
            ].filter(Boolean) as string[];
            if (parts.length > 0) return parts.join(', ');
        }
        return (data.display_name as string) ?? null;
    } catch {
        return null;
    }
}

export type EventStatus = MyEventStatus;

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bgColor: string }> = {
    EDITING: { label: 'Đang soạn thảo', color: '#6B7280', bgColor: '#F3F4F6' },
    SUBMITTED: { label: 'Chờ phê duyệt', color: '#3B82F6', bgColor: '#DBEAFE' },
    APPROVED_BY_MNG: { label: 'Quản lý đã duyệt', color: '#10B981', bgColor: '#D1FAE5' },
    REJECTED_BY_MNG: { label: 'Quản lý từ chối', color: '#EF4444', bgColor: '#FEE2E2' },
    REJECTED_BY_AD: { label: 'Admin từ chối', color: '#DC2626', bgColor: '#FEE2E2' },
    RECRUITING: { label: 'Đang tuyển TNV', color: '#7C3AED', bgColor: '#EDE9FE' },
    UPCOMING: { label: 'Sắp diễn ra', color: '#D97706', bgColor: '#FEF3C7' },
    ONGOING: { label: 'Đang diễn ra', color: '#059669', bgColor: '#D1FAE5' },
    ENDED: { label: 'Đã kết thúc', color: '#6B7280', bgColor: '#F3F4F6' },
    COMPLETED: { label: 'Hoàn thành', color: '#0EA5E9', bgColor: '#E0F2FE' },
    CANCELLED: { label: 'Đã hủy', color: '#9CA3AF', bgColor: '#F9FAFB' },
};

const EventDetailScreen = () => {
    const router = useRouter();
    const { id, openSessionModal } = useLocalSearchParams<{ id: string; openSessionModal?: string }>();
    const [showCheckinCode, setShowCheckinCode] = useState(false);
    const [sessionModalVisible, setSessionModalVisible] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);

    // API state
    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reverse-geocoded check-in address
    const [checkinAddress, setCheckinAddress] = useState<string | null>(null);

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getEventDetailByHost(id);
            setEvent(data);

            if (openSessionModal === 'true') {
                setSessionModalVisible(true);
            }

            // Reverse-geocode check-in location in background
            reverseGeocode(data.latCheckInLocation, data.lngCheckInLocation)
                .then(addr => setCheckinAddress(addr));
        } catch (e) {            setError(getApiErrorMessage(e) || 'Không thể tải thông tin sự kiện');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    // Re-fetch whenever this screen regains focus (e.g. returning from update-event / create-event)
    // Skip the very first focus (initial mount already handled by useEffect above)
    const isMountedRef = useRef(false);
    useFocusEffect(
        useCallback(() => {
            if (!isMountedRef.current) {
                isMountedRef.current = true;
                return;
            }
            fetchDetail();
        }, [fetchDetail])
    );

    // Pull-to-refresh handler
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchDetail();
        setRefreshing(false);
    }, [fetchDetail]);

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
                        <ActivityIndicator size="large" color={'#42A4F5'} />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                </SafeAreaView>
            </>
        );
    }

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

    // delete event
    const handleDelete = () => Alert.alert(
        'Xác nhận xóa',
        'Bạn có chắc muốn xóa sự kiện này? Hành động này không thể hoàn tác.',
        [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive', onPress: async () => {
                    try {
                        await deleteEvent(event.id);
                        Alert.alert('Thành công', 'Sự kiện đã được xóa.', [
                            { text: 'OK', onPress: () => router.back() },
                        ]);
                    } catch (e) {
                        Alert.alert('Thông báo', getApiErrorMessage(e) || 'Không thể xóa sự kiện. Vui lòng thử lại.');
                    }
                },
            },
        ],
    );

    // cancel event — opens reason modal
    const handleCancelEvent = () => setCancelModalVisible(true);

    // update event — opens update form (only allows editing non-classification fields)
    const handleUpdate = () => router.push({
        pathname: '/screen/host-screens/update-event' as any,
        params: {
            eventId: event.id,
            eventData: JSON.stringify({ ...event, resolvedCheckinAddress: checkinAddress }),
        },
    });

    // edit event
    const handleEdit = () => router.push({
        pathname: '/screen/host-screens/create-event' as any,
        params: {
            eventId: event.id,
            eventData: JSON.stringify({ ...event, resolvedCheckinAddress: checkinAddress }),
        },
    });

    const handleParticipants = () => setSessionModalVisible(true);
    const handleCheckin = () => setShowCheckinCode(prev => !prev);
    const handleReviews = () => router.push({ pathname: '/screen/host-screens/event-rating' as any, params: { eventId: event.id } });
    const handleMoments = () => router.push({ pathname: '/screen/host-screens/event-moments' as any, params: { eventId: event.id } });
    const handleComplaint = () => {};

    const serviceOptions: ServiceOption[] = (() => {
        const s = event.status;

        if (['EDITING', 'REJECTED_BY_MNG', 'REJECTED_BY_AD'].includes(s)) {
            return [
                { key: 'delete', label: 'Xóa sự kiện', icon: 'trash-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleDelete },
                { key: 'edit', label: 'Chỉnh sửa', icon: 'create-outline', iconColor: '#3B82F6', bgColor: '#DBEAFE', onPress: handleEdit },
            ];
        }

        if (s === 'SUBMITTED') {
            return [
                { key: 'edit', label: 'Chỉnh sửa', icon: 'create-outline', iconColor: '#3B82F6', bgColor: '#DBEAFE', onPress: handleEdit },
            ];
        }

        if (s === 'APPROVED_BY_MNG') return [];

        if (s === 'RECRUITING') {
            return [
                { key: 'cancel', label: 'Hủy sự kiện', icon: 'close-circle-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleCancelEvent },
                { key: 'update', label: 'Cập nhật', icon: 'refresh-outline', iconColor: '#059669', bgColor: '#D1FAE5', onPress: handleUpdate },
                { key: 'participants', label: 'Danh sách đăng ký', icon: 'people-outline', iconColor: '#7C3AED', bgColor: '#EDE9FE', onPress: handleParticipants },
            ];
        }

        if (s === 'UPCOMING') {
            return [
                { key: 'cancel', label: 'Hủy sự kiện', icon: 'close-circle-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleCancelEvent },
            ];
        }

        if (s === 'ONGOING') {
            return [
                { key: 'cancel', label: 'Hủy sự kiện', icon: 'close-circle-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleCancelEvent },
                { key: 'checkin', label: 'Tạo mã check-in', icon: 'qr-code-outline', iconColor: '#059669', bgColor: '#D1FAE5', onPress: handleCheckin },
                { key: 'participants', label: 'Danh sách đăng ký', icon: 'people-outline', iconColor: '#7C3AED', bgColor: '#EDE9FE', onPress: handleParticipants },

            ];
        }

        if (['ENDED', 'COMPLETED'].includes(s)) {
            return [
                { key: 'reviews', label: 'Xem đánh giá', icon: 'star-outline', iconColor: '#F59E0B', bgColor: '#FEF3C7', onPress: handleReviews },
                { key: 'moments', label: 'Khoảnh khắc', icon: 'images-outline', iconColor: '#EC4899', bgColor: '#FCE7F3', onPress: handleMoments },
                { key: 'participants', label: 'Danh sách đăng ký', icon: 'people-outline', iconColor: '#7C3AED', bgColor: '#EDE9FE', onPress: handleParticipants },
                { key: 'complaint', label: 'Khiếu nại điểm', icon: 'alert-circle-outline', iconColor: '#EF4444', bgColor: '#FEE2E2', onPress: handleComplaint },
            ];
        }

        if (s === 'CANCELLED') return [];

        return [];
    })();

    const hasNote = !!event.note && event.note.trim().length > 0;

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

                {/* ── Note warning banner (hiển thị ngay dưới header khi có lỗi) ── */}
                {hasNote && (
                    <View style={styles.noteBanner}>
                        <Ionicons name="warning-outline" size={18} color="#92400E" style={{ marginTop: 1 }} />
                        <Text style={styles.noteBannerText}>{event.note}</Text>
                    </View>
                )}

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#42A4F5']}
                            tintColor="#42A4F5"
                        />
                    }
                >
                    {/* Title card (with event image on top) */}
                    <View style={styles.titleCard}>
                        {/* Event image */}
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            style={styles.bannerScroll}
                        >
                            {(event.imageUrls.length > 0 ? event.imageUrls : [DEFAULT_IMAGE]).map((uri, idx) => (
                                <Image
                                    key={idx}
                                    source={{ uri: resolveSupabaseUrl(uri) || DEFAULT_IMAGE }}
                                    style={styles.bannerImage}
                                    resizeMode="cover"
                                />
                            ))}
                        </ScrollView>

                        {/* Name & status */}
                        <View style={styles.titleCardBody}>
                            <Text style={styles.eventTitle} numberOfLines={3}>{event.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bgColor }]}>
                                <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                                    {statusCfg.label}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* My services */}
                    {serviceOptions.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Tính năng của tôi</Text>
                            <ServiceGrid options={serviceOptions} />
                        </View>
                    )}

                    {/* Time & Schedule */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Thời gian</Text>
                        {event.recruitmentEndDate && (
                            <>
                                <InfoRow
                                    icon="time-outline"
                                    label="Ngày hết hạn đăng ký"
                                    value={parseIsoDateTime(event.recruitmentEndDate).date}
                                />
                                <View style={styles.rowDivider} />
                            </>
                        )}
                        <InfoRow
                            icon="calendar-outline"
                            label="Tổng số ngày diễn ra"
                            value={`${days} ngày`}
                        />
                        <View style={styles.rowDivider} />

                        {/* Per-session detail */}
                        {sessions.map((session, idx) => (
                            <View key={idx}>
                                {idx > 0 && <View style={styles.rowDivider} />}
                                <View style={styles.sessionCard}>
                                    <View style={styles.sessionHeader}>
                                        <View style={styles.sessionIndexBadge}>
                                            <Text style={styles.sessionIndexText}>{idx + 1}</Text>
                                        </View>
                                        <Text style={styles.sessionDateText}>{session.date}</Text>
                                        <Text style={styles.sessionTimeText}>
                                            {session.startTime} – {session.endTime}
                                        </Text>
                                    </View>
                                    <View style={styles.sessionStats}>
                                        <View style={styles.sessionStatItem}>
                                            <Ionicons name="person-outline" size={13} color="#7C3AED" />
                                            <Text style={styles.sessionStatLabel}>TNV dự kiến</Text>
                                            <Text style={[styles.sessionStatValue, { color: '#7C3AED' }]}>
                                                {session.volunteerCount}
                                            </Text>
                                        </View>
                                        <View style={styles.sessionStatDivider} />
                                        <View style={styles.sessionStatItem}>
                                            <Ionicons name="people-outline" size={13} color="#059669" />
                                            <Text style={styles.sessionStatLabel}>Người phục vụ</Text>
                                            <Text style={[styles.sessionStatValue, { color: '#059669' }]}>
                                                {session.servedCount}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Location */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Địa điểm</Text>
                        <InfoRow
                            icon="location-outline"
                            label="Loại địa điểm"
                            value={SERVING_PLACE_LABEL[event.servingPlaceType] ?? event.servingPlaceType}
                        />
                        <View style={styles.rowDivider} />
                        <InfoRow
                            icon="map-outline"
                            label="Khu vực diễn ra sự kiện"
                            value={event.address}
                        />
                        <View style={styles.rowDivider} />
                        <InfoRow
                            icon="flag-outline"
                            label="Địa chỉ cụ thể"
                            value={event.detailAddress}
                        />
                        <View style={styles.rowDivider} />
                        <InfoRow
                            icon="navigate-outline"
                            label="Địa điểm điểm danh"
                            value={checkinAddress ?? `${event.latCheckInLocation}, ${event.lngCheckInLocation}`}
                        />
                    </View>

                    {/* Check-in code - display when "Create check-in code" is pressed */}
                    {showCheckinCode && (
                        <View style={[styles.card, styles.checkinCard]}>
                            <View style={styles.checkinLeft}>
                                <Ionicons name="qr-code-outline" size={20} color={'#42A4F5'} />
                                <Text style={styles.checkinLabel}>Mã check-in</Text>
                            </View>
                            <Text style={styles.checkinCode}>{event.checkInCode}</Text>
                        </View>
                    )}

                    {/* Detail */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>

                        {/* Activity field */}
                        <InfoRow
                            icon="leaf-outline"
                            label="Lĩnh vực hoạt động"
                            value={event.activitySubDomain}
                        />

                        <View style={styles.rowDivider} />

                        {/* Served target */}
                        <InfoRow
                            icon="heart-outline"
                            label="Đối tượng phục vụ"
                            value={SERVED_TARGET_LABEL[event.servedTarget] ?? event.servedTarget}
                        />

                        <View style={styles.rowDivider} />
                        {/* Description */}
                        <InfoRow
                            icon="document-text-outline"
                            label="Mô tả chi tiết"
                            value={event.description}
                        />
                    </View>

                    {/* Bottom padding */}
                    <View style={{ height: 32 }} />
                </ScrollView>
            </SafeAreaView>

            <EventSessionModal
                visible={sessionModalVisible}
                onClose={() => setSessionModalVisible(false)}
                eventName={event.name}
                eventStatus={event.status}
                sessions={event.eventSessions}
            />

            <CancelEventModal
                visible={cancelModalVisible}
                eventId={event.id}
                onCancel={() => setCancelModalVisible(false)}
                onConfirmed={() => {
                    setCancelModalVisible(false);
                    fetchDetail();
                }}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },

    // Header
    header: {
        backgroundColor: '#42A4F5',
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
    scroll: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    scrollContent: {
        paddingTop: 12,
        paddingHorizontal: 16,
        paddingBottom: 24
    },

    // Note warning banner
    noteBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#FEF3C7',
        borderBottomWidth: 1,
        borderBottomColor: '#FDE68A',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    noteBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        lineHeight: 18,
        fontWeight: '500',
    },

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
        backgroundColor: '#42A4F5',
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
    titleCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    bannerScroll: {
        height: 200,
    },
    titleCardBody: {
        padding: 16,
        gap: 8,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
        lineHeight: 26,
        marginBottom: 4,
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

    // Banner Image
    bannerImage: {
        width: SCREEN_WIDTH,
        height: 220,
    },

    // Info rows
    rowDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 10,
    },

    // Session cards
    sessionCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sessionIndexBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionIndexText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    sessionDateText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
    },
    sessionTimeText: {
        fontSize: 13,
        color: '#42A4F5',
        fontWeight: '600',
    },
    sessionStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
        padding: 8,
    },
    sessionStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    sessionStatDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#BFDBFE',
        marginHorizontal: 8,
    },
    sessionStatLabel: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
    },
    sessionStatValue: {
        fontSize: 16,
        fontWeight: '800',
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
        color: '#42A4F5',
        letterSpacing: 1,
    },

});

export default EventDetailScreen;