import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Dimensions,
    StyleSheet,
    Linking,
    Platform,
    Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
    EventDetailsResponse,
    EventSessionResponse,
    SERVED_TARGET_LABELS,
    SERVING_PLACE_LABELS,
} from '@/services/event-types';
import { getEventDetails } from '@/services/public-event-service';
import { saveEventForVolunteer, applyEventSession } from '@/services/vol-event-service';
import { getApiErrorMessage } from '@/services/api-helpers';
import { useAuth } from '@/context/AuthContext';
import ImageViewerModal from '../../components/volunteer/even-details/ImageViewerModal';
import EventSessionCard from '../../components/volunteer/even-details/EventSessionCard';
import ApplyConfirmModal from '../../components/volunteer/application/ApplyConfirmModal';
import SessionPickerSheet from '../../components/volunteer/application/SessionPickerSheet';


const { width: SCREEN_W } = Dimensions.get('window');
const IMAGE_HEIGHT = 280;

function formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function getCountdown(endDate: string): string {
    if (!endDate) return '';
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Đã hết hạn';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `Hạn đăng ký còn ${days} ngày ${hours} giờ ${mins} phút`;
}

function getFullImageUrl(path: string | null | undefined): string {
    if (!path) return 'https://placehold.co/800x400/e2e8f0/64748b.png?text=No+Image';
    if (path.startsWith('http')) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co';
    if (path.startsWith('/storage/v1')) return `${supabaseUrl}${path}`;
    if (path.startsWith('/object/')) return `${supabaseUrl}/storage/v1${path}`;
    return `${supabaseUrl}/storage/v1/object/public/hvh-bucket/${path}`;
}


export default function EventDetail() {
    const { eventId, fromSaved } = useLocalSearchParams<{ eventId: string; fromSaved?: string }>();
    const isFromSaved = fromSaved === 'true';
    const { isLoggedIn } = useAuth();
    const [event, setEvent] = useState<EventDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageIndex, setImageIndex] = useState(0);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerIndex, setImageViewerIndex] = useState(0);
    const [saved, setSaved] = useState(isFromSaved);
    const [saving, setSaving] = useState(false);

    const savedKey = eventId ? `saved_event_${eventId}` : null;

    useEffect(() => {
        // If coming from saved-events we already know it's saved; skip AsyncStorage check
        if (isFromSaved) return;
        if (!savedKey) return;
        AsyncStorage.getItem(savedKey).then(val => {
            if (val === 'true') setSaved(true);
        }).catch(() => { });
    }, [savedKey, isFromSaved]);

    const [applyModalVisible, setApplyModalVisible] = useState(false);
    const [sessionPickerVisible, setSessionPickerVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState<EventSessionResponse | null>(null);
    const [applying, setApplying] = useState(false);

    const carouselRef = useRef<FlatList>(null);

    const fetchEvent = useCallback(async () => {
        if (!eventId) return;
        try {
            setLoading(true);
            const data = await getEventDetails(eventId);
            setEvent(data);
        } catch (err: any) {
            console.error('Error fetching event details:', err);
            setError(err.message || 'Không thể tải chi tiết sự kiện');
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useFocusEffect(
        useCallback(() => {
            fetchEvent();
        }, [fetchEvent])
    );

    // image urls resolved
    const imageUrls = useMemo(() => {
        if (!event?.imageUrls?.length) return ['https://placehold.co/800x400/e2e8f0/64748b.png?text=No+Image'];
        return event.imageUrls.map(getFullImageUrl);
    }, [event]);


    const isRecruiting = useMemo(() => {
        if (!event?.recruitmentEndDate) return false;
        return new Date(event.recruitmentEndDate) >= new Date();
    }, [event]);

    const countdown = useMemo(() => {
        if (!event?.recruitmentEndDate) return '';
        return getCountdown(event.recruitmentEndDate);
    }, [event]);

    // carousel scroll handler
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) setImageIndex(viewableItems[0].index ?? 0);
    }).current;
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const handleGoBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(vol-tabs)/home');
    };

    const handleSaveEvent = async () => {
        if (!event?.id || saving || !isLoggedIn) {
            if (!isLoggedIn) {
                Alert.alert(
                    'Yêu cầu đăng nhập',
                    'Bạn cần đăng nhập để lưu sự kiện.',
                    [
                        { text: 'Huỷ', style: 'cancel' },
                        { text: 'Đăng nhập', onPress: () => router.push('/screen/common/login' as any) },
                    ]
                );
            }
            return;
        }
        // Optimistically toggle
        const nextSaved = !saved;
        setSaved(nextSaved);
        setSaving(true);
        try {
            // BE toggle: calling save-event saves if not saved, unsaves if already saved
            await saveEventForVolunteer(event.id);
            // Persist new state locally
            if (savedKey) {
                if (nextSaved) {
                    await AsyncStorage.setItem(savedKey, 'true');
                } else {
                    await AsyncStorage.removeItem(savedKey);
                }
            }
        } catch (err: any) {
            // Revert on failure
            setSaved(!nextSaved);
            Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể lưu sự kiện. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    const handleOpenMap = () => {
        if (!event?.detailAddress || !event?.address) return;
        const query = encodeURIComponent(event.detailAddress || event.address);

        const openGoogle = () =>
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => { });

        const openApple = () =>
            Linking.openURL(`maps://?q=${query}`).catch(openGoogle);

        if (Platform.OS === 'ios') {
            const { ActionSheetIOS } = require('react-native');
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Huỷ', 'Google Maps', 'Apple Maps'],
                    cancelButtonIndex: 0,
                },
                (idx: number) => {
                    if (idx === 1) openGoogle();
                    else if (idx === 2) openApple();
                }
            );
        } else {
            Alert.alert('Mở bản đồ', 'Chọn ứng dụng bản đồ', [
                { text: 'Google Maps', onPress: openGoogle },
                { text: 'Huỷ', style: 'cancel' },
            ]);
        }
    };

    const handleCallHost = () => {
        if (event?.hostPhone) {
            Linking.openURL(`tel:${event.hostPhone}`);
        }
    };

    const handleOpenImage = (index: number) => {
        setImageViewerIndex(index);
        setImageViewerVisible(true);
    };

    const handleApplyCta = () => {
        if (!isLoggedIn) {
            Alert.alert(
                'Yêu cầu đăng nhập',
                'Bạn cần đăng nhập để tham gia sự kiện.',
                [
                    { text: 'Huỷ', style: 'cancel' },
                    {
                        text: 'Đăng nhập',
                        onPress: () => router.push('/screen/login' as any),
                    },
                ]
            );
            return;
        }
        if (!event?.eventSessions?.length) return;
        if (event.eventSessions.length === 1) {
            setSelectedSession(event.eventSessions[0]);
            setApplyModalVisible(true);
        } else {
            setSessionPickerVisible(true);
        }
    };

    const handleSessionSelected = (session: EventSessionResponse) => {
        setSessionPickerVisible(false);
        setSelectedSession(session);
        setApplyModalVisible(true);
    };

    const handleConfirmApply = async () => {
        if (!selectedSession) return;
        setApplying(true);
        try {
            await applyEventSession(selectedSession.id);
            setApplyModalVisible(false);

            const isAutoApprove = event?.autoApprove === true;
            Alert.alert(
                'Đăng ký thành công!',
                isAutoApprove
                    ? 'Đơn đăng ký của bạn đã được xác nhận tự động. Hẹn gặp bạn tại sự kiện!'
                    : 'Đơn đăng ký của bạn đang chờ tổ chức xét duyệt. Chúng tôi sẽ thông báo kết quả sớm nhất!',
                [{ text: 'Tuyệt vời', style: 'default' }]
            );
        } catch (err: unknown) {
            // Detect face-not-registered error (BE code 1013)
            const isFaceNotRegistered =
                (err as any)?.response?.data?.code === 1013
            if (isFaceNotRegistered) {
                setApplyModalVisible(false);
                Alert.alert(
                    'Chưa đăng ký khuôn mặt',
                    'Bạn cần đăng ký dữ liệu khuôn mặt trước khi tham gia hoạt động. Bạn có muốn đăng ký ngay bây giờ không?',
                    [
                        { text: 'Để sau', style: 'cancel' },
                        {
                            text: 'Đăng ký ngay',
                            onPress: () =>
                                router.push('/screen/volunteer-screens/register-face' as any),
                        },
                    ]
                );
            } else {
                const msg = getApiErrorMessage(err) || 'Không thể đăng ký. Vui lòng thử lại sau.';
                Alert.alert('Đăng ký thất bại', msg, [{ text: 'Đóng', style: 'cancel' }]);
            }
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#42A4F5" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </SafeAreaView>
        );
    }

    if (error || !event) {
        return (
            <SafeAreaView style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error || 'Không tìm thấy sự kiện'}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleGoBack}>
                    <Text style={styles.retryBtnText}>Quay lại</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* ═══ IMAGE CAROUSEL ═══ */}
                <View style={styles.carouselContainer}>
                    <FlatList
                        ref={carouselRef}
                        data={imageUrls}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        keyExtractor={(_, i) => i.toString()}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => handleOpenImage(index)}
                            >
                                <Image
                                    source={item}
                                    style={styles.carouselImage}
                                    contentFit="cover"
                                    transition={200}
                                />
                            </TouchableOpacity>
                        )}
                    />

                    {/* Header overlay */}
                    <View style={styles.headerOverlay}>
                        <TouchableOpacity onPress={handleGoBack} style={styles.circleBtn}>
                            <Ionicons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                onPress={handleSaveEvent}
                                disabled={saving || (isFromSaved && !saved)}
                                style={[
                                    styles.circleBtn,
                                    isFromSaved && !saved && styles.circleBtnDisabled,
                                ]}
                            >
                                <Ionicons
                                    name={saved ? 'heart' : 'heart-outline'}
                                    size={22}
                                    color={isFromSaved && !saved ? '#D1D5DB' : saved ? '#EF4444' : '#1F2937'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Pagination dots */}
                    {imageUrls.length > 1 && (
                        <View style={styles.dotsContainer}>
                            {imageUrls.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        i === imageIndex ? styles.dotActive : styles.dotInactive,
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* ═══ CONTENT ═══ */}
                <View style={styles.content}>
                    {/* Title */}
                    <Text style={styles.title}>{event.name}</Text>

                    {/* Info rows */}
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                        <Text style={styles.infoText}>
                            Ngày hoạt động :{' '}
                            <Text style={styles.infoBold}>{formatDate(event.startDate)}</Text>
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={18} color="#6B7280" />
                        <Text style={styles.infoText} numberOfLines={3}>
                            {event.address}
                        </Text>
                    </View>

                    {/* ═══ ADDRESS DETAILS CARD ═══ */}
                    {(event.detailAddress || event.address) ? (
                        <TouchableOpacity
                            onPress={handleOpenMap}
                            style={styles.addressCard}
                            activeOpacity={0.75}
                        >
                            <View style={styles.addressCardLeft}>
                                <View style={styles.addressIconBox}>
                                    <Ionicons name="map" size={22} color="#42A4F5" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.addressCardLabel}>Địa chỉ chi tiết</Text>
                                    <Text style={styles.addressCardText} numberOfLines={4}>
                                        {event.detailAddress || event.address}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.mapLinkBtn}>
                                <Ionicons name="navigate" size={16} color="#42A4F5" />
                                <Text style={styles.mapLinkText}>Xem bản đồ</Text>
                            </View>
                        </TouchableOpacity>
                    ) : null}

                    {/* ═══ TAG CHIPS ═══ */}
                    <View style={styles.chipRow}>
                        <View style={styles.chip}>
                            <Text style={styles.chipLabel}>Lĩnh vực :</Text>
                            <Text style={styles.chipValue}>{event.activitySubDomain || '—'}</Text>
                        </View>
                        <View style={styles.chip}>
                            <Text style={styles.chipLabel}>Đối tượng :</Text>
                            <Text style={styles.chipValue}>
                                {SERVED_TARGET_LABELS[event.servedTarget] || event.servedTarget || '—'}
                            </Text>
                        </View>
                        <View style={styles.chip}>
                            <Text style={styles.chipLabel}>Địa điểm :</Text>
                            <Text style={styles.chipValue}>
                                {SERVING_PLACE_LABELS[event.servingPlaceType] || event.servingPlaceType || '—'}
                            </Text>
                        </View>
                    </View>

                    {/* ═══ ORG CARD ═══ */}
                    <View style={styles.orgCard}>
                        <View style={styles.orgLeft}>
                            <View style={styles.orgAvatar}>
                                <Ionicons name="business" size={24} color="#42A4F5" />
                            </View>
                            <View style={styles.orgInfo}>
                                <Text style={styles.orgName} numberOfLines={1}>
                                    {event.orgName}
                                </Text>
                            </View>
                        </View>
                        {event.hostPhone ? (
                            <TouchableOpacity onPress={handleCallHost} style={styles.callBtn}>
                                <Ionicons name="call" size={20} color="#42A4F5" />
                            </TouchableOpacity>
                        ) : null}
                    </View>


                    {/* ═══ EVENT SESSIONS ═══ */}
                    {event.eventSessions && event.eventSessions.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Lịch hoạt động</Text>
                            {event.eventSessions.map((session, idx) => (
                                <EventSessionCard
                                    key={session.id || idx}
                                    session={session}
                                    index={idx}
                                />
                            ))}
                        </View>
                    )}

                    {/* ═══ DESCRIPTION ═══ */}
                    {event.description ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Chi tiết hoạt động</Text>
                            <Text style={styles.descriptionText}>{event.description}</Text>
                        </View>
                    ) : null}

                    {/* Bottom spacer for CTA */}
                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* ═══ BOTTOM CTA ═══ */}
            <View style={styles.ctaContainer}>
                <View style={styles.ctaLeft}>
                    <TouchableOpacity onPress={handleCallHost} style={styles.ctaCallBtn}>
                        <Ionicons name="call-outline" size={22} color="#42A4F5" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[styles.ctaButton, !isRecruiting && styles.ctaButtonDisabled]}
                    activeOpacity={0.8}
                    disabled={!isRecruiting}
                    onPress={handleApplyCta}
                >
                    <Text style={styles.ctaButtonText}>
                        {isRecruiting ? 'Tôi muốn đăng ký' : 'Đã hết hạn đăng ký'}
                    </Text>
                    {isRecruiting && countdown ? (
                        <Text style={styles.ctaCountdown}>({countdown})</Text>
                    ) : null}
                </TouchableOpacity>
            </View>

            {/* ═══ IMAGE VIEWER MODAL ═══ */}
            <ImageViewerModal
                visible={imageViewerVisible}
                images={imageUrls}
                initialIndex={imageViewerIndex}
                onClose={() => setImageViewerVisible(false)}
            />

            {/* ═══ SESSION PICKER (multi-session) ═══ */}
            <SessionPickerSheet
                visible={sessionPickerVisible}
                sessions={event?.eventSessions ?? []}
                onSelect={handleSessionSelected}
                onClose={() => setSessionPickerVisible(false)}
            />

            {/* ═══ APPLY CONFIRMATION MODAL ═══ */}
            <ApplyConfirmModal
                visible={applyModalVisible}
                session={selectedSession}
                eventName={event?.name ?? ''}
                eventAddress={event?.address ?? ''}
                onClose={() => setApplyModalVisible(false)}
                onConfirm={handleConfirmApply}
                applying={applying}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    errorText: {
        marginTop: 12,
        fontSize: 15,
        color: '#EF4444',
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 20,
        backgroundColor: '#42A4F5',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryBtnText: {
        color: '#FFF',
        fontWeight: '600',
    },

    /* ── Carousel ── */
    carouselContainer: {
        position: 'relative',
    },
    carouselImage: {
        width: SCREEN_W,
        height: IMAGE_HEIGHT,
    },
    headerOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 36,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    circleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    circleBtnDisabled: {
        backgroundColor: 'rgba(200,200,200,0.6)',
        elevation: 0,
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        borderRadius: 4,
    },
    dotActive: {
        width: 20,
        height: 6,
        backgroundColor: '#42A4F5',
        borderRadius: 3,
    },
    dotInactive: {
        width: 6,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 3,
    },

    /* ── Content ── */
    content: {
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 28,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    infoBold: {
        fontWeight: '700',
        color: '#1F2937',
    },

    /* ── Tag chips ── */
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
        marginBottom: 16,
    },
    chip: {
        flex: 1,
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    chipLabel: {
        fontSize: 11,
        color: '#42A4F5',
        marginBottom: 4,
    },
    chipValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },

    /* ── Org card ── */
    orgCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    orgLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    orgAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    orgInfo: {
        flex: 1,
    },
    orgName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    callBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* ── Contact ── */
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    contactLabel: {
        fontSize: 13,
        color: '#6B7280',
    },
    contactPhone: {
        fontSize: 13,
        color: '#1F2937',
        fontWeight: '600',
    },

    /* ── Sections ── */
    section: {
        marginTop: 8,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 10,
    },
    descriptionText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
    },

    /* ── Address card ── */
    addressCard: {
        flexDirection: 'column',
        backgroundColor: '#F0F8FF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBDEFB',
        gap: 10,
    },
    addressCardLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        flex: 1,
    },
    addressIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    addressCardLabel: {
        fontSize: 11,
        color: '#42A4F5',
        fontWeight: '600',
        marginBottom: 4,
    },
    addressCardText: {
        fontSize: 13,
        color: '#1F2937',
        lineHeight: 18,
    },
    mapLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-end',
        backgroundColor: '#E3F2FD',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-end',
        backgroundColor: '#E3F2FD',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    mapLinkText: {
        fontSize: 13,
        color: '#42A4F5',
        fontWeight: '600',
    },
    mapLinkInline: {
        color: '#42A4F5',
        textDecorationLine: 'underline',
        flex: 1,
    },

    /* ── Sessions ── */
    /* ── Bottom CTA ── */
    ctaContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    ctaLeft: {
        marginRight: 12,
    },
    ctaCallBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaButton: {
        flex: 1,
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    ctaButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    ctaCountdown: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        marginTop: 2,
    },
});
