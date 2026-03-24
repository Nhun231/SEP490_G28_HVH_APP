import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
    EventDetailsResponse,
    getEventDetails,
    SERVED_TARGET_LABELS,
    SERVING_PLACE_LABELS,
} from '@/services/event-service';
import ImageViewerModal from '../components/ImageViewerModal';

const { width: SCREEN_W } = Dimensions.get('window');
const IMAGE_HEIGHT = 280;

// ─── helpers ─────────────────────────────────────────────────────────
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

function formatSessionTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${hh}:${mm} ${dd}/${mo}/${yy}`;
}

// ─── component ───────────────────────────────────────────────────────
export default function EventDetail() {
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const [event, setEvent] = useState<EventDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageIndex, setImageIndex] = useState(0);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerIndex, setImageViewerIndex] = useState(0);
    const [saved, setSaved] = useState(false);

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

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    // image urls resolved
    const imageUrls = useMemo(() => {
        if (!event?.imageUrls?.length) return ['https://placehold.co/800x400/e2e8f0/64748b.png?text=No+Image'];
        return event.imageUrls.map(getFullImageUrl);
    }, [event]);

    // total volunteers expected across sessions
    const totalVolunteers = useMemo(() => {
        if (!event?.eventSessions) return 0;
        return event.eventSessions.reduce((sum, s) => sum + s.expectedVolAmount, 0);
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
        else router.replace('/(tabs)/home');
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

    // ─── Loading / Error ─────────────────────────────────────────────
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

    // ─── Render ──────────────────────────────────────────────────────
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
                                onPress={() => setSaved(!saved)}
                                style={styles.circleBtn}
                            >
                                <Ionicons
                                    name={saved ? 'heart' : 'heart-outline'}
                                    size={22}
                                    color={saved ? '#EF4444' : '#1F2937'}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.circleBtn}>
                                <Ionicons name="share-social-outline" size={22} color="#1F2937" />
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
                        <Ionicons name="people-outline" size={18} color="#6B7280" />
                        <Text style={styles.infoText}>
                            Số người tham gia :{' '}
                            <Text style={styles.infoBold}>0/{totalVolunteers}</Text>
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                        <Text style={styles.infoText}>
                            Ngày hoạt động :{' '}
                            <Text style={styles.infoBold}>{formatDate(event.startDate)}</Text>
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={18} color="#6B7280" />
                        <Text style={styles.infoText} numberOfLines={2}>
                            {event.address}
                        </Text>
                    </View>

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

                    {/* Liên hệ hoạt động */}
                    {event.hostPhone ? (
                        <View style={styles.contactRow}>
                            <Text style={styles.contactLabel}>Liên hệ hoạt động : </Text>
                            <Text style={styles.contactPhone}>{event.hostPhone}</Text>
                            <TouchableOpacity onPress={handleCallHost}>
                                <Ionicons name="call" size={18} color="#42A4F5" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* ═══ EVENT SESSIONS ═══ */}
                    {event.eventSessions && event.eventSessions.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Lịch hoạt động</Text>
                            {event.eventSessions.map((session, idx) => (
                                <View key={session.id || idx} style={styles.sessionCard}>
                                    <View style={styles.sessionHeader}>
                                        <Ionicons name="time-outline" size={16} color="#42A4F5" />
                                        <Text style={styles.sessionLabel}>Buổi {idx + 1}</Text>
                                    </View>
                                    <Text style={styles.sessionTime}>
                                        {formatSessionTime(session.startDateTime)} – {formatSessionTime(session.endDateTime)}
                                    </Text>
                                    <Text style={styles.sessionMeta}>
                                        TNV cần: {session.expectedVolAmount}  •  Người phục vụ: {session.expectedSerAmount}
                                    </Text>
                                </View>
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
        </View>
    );
}

// ─── styles ──────────────────────────────────────────────────────────
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

    /* ── Sessions ── */
    sessionCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    sessionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#42A4F5',
    },
    sessionTime: {
        fontSize: 13,
        color: '#1F2937',
        marginBottom: 4,
    },
    sessionMeta: {
        fontSize: 12,
        color: '#6B7280',
    },

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
