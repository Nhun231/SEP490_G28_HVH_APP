import {
    EOrgType,
    ORG_TYPE_SHORT_LABELS,
    OrganizationDetailsResponse,
    getOrganizationDetails,
    getEventsByOrg,
} from '@/services/organization-service';
import type { EventSimpleResponse } from '@/services/event-types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


const MOCK_RATING = 3.2;
const { width: SCREEN_W } = Dimensions.get('window');
const COVER_HEIGHT = 240;
const EVENT_CARD_W = 210;


function getFullImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co';
    if (path.startsWith('/storage/v1')) return `${supabaseUrl}${path}`;
    if (path.startsWith('/object/')) return `${supabaseUrl}/storage/v1${path}`;
    return `${supabaseUrl}/storage/v1/object/public/hvh-bucket/${path}`;
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

import StarRating from '@/app/components/volunteer/organization/StarRating';


function EventCard({
    event,
    onPress,
}: {
    event: EventSimpleResponse;
    onPress: () => void;
}) {
    const imgUrl = getFullImageUrl(event.imageUrl);
    return (
        <TouchableOpacity style={ecStyles.card} onPress={onPress} activeOpacity={0.82}>
            {/* Thumbnail */}
            <View style={ecStyles.imgWrap}>
                {imgUrl ? (
                    <Image source={imgUrl} style={ecStyles.img} contentFit="cover" transition={200} />
                ) : (
                    <View style={ecStyles.imgPlaceholder}>
                        <Ionicons name="calendar-outline" size={30} color="#42A4F5" />
                    </View>
                )}
                {/* Date badge */}
                <View style={ecStyles.dateBadge}>
                    <Ionicons name="calendar" size={10} color="#fff" />
                    <Text style={ecStyles.dateBadgeText}>{formatDate(event.startDate)}</Text>
                </View>
            </View>

            {/* Info */}
            <View style={ecStyles.info}>
                <Text style={ecStyles.name} numberOfLines={2}>{event.name}</Text>

                <View style={ecStyles.metaRow}>
                    <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                    <Text style={ecStyles.metaText} numberOfLines={1}>{event.address || '—'}</Text>
                </View>

                <View style={ecStyles.metaRow}>
                    <Ionicons name="time-outline" size={12} color="#F59E0B" />
                    <Text style={[ecStyles.metaText, { color: '#F59E0B' }]} numberOfLines={1}>
                        Hạn ĐK: {formatDate(event.recruitmentEndDate)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

/** Card acting as a "Xem thêm" shortcut at the end of the scroll */
function SeeMoreCard({ count, onPress }: { count: number; onPress: () => void }) {
    return (
        <TouchableOpacity style={ecStyles.seeMoreCard} onPress={onPress} activeOpacity={0.8}>
            <View style={ecStyles.seeMoreCircle}>
                <Ionicons name="arrow-forward" size={28} color="#42A4F5" />
            </View>
            <Text style={ecStyles.seeMoreTitle}>Xem thêm</Text>
            <Text style={ecStyles.seeMoreSub}>{count} sự kiện khác</Text>
        </TouchableOpacity>
    );
}

const ecStyles = StyleSheet.create({
    card: {
        width: EVENT_CARD_W,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: '#EDF2F7',
    },
    imgWrap: {
        position: 'relative',
        height: 110,
        backgroundColor: '#E3F2FD',
    },
    img: { width: '100%', height: '100%' },
    imgPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E3F2FD',
    },
    dateBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(66,164,245,0.92)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    dateBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

    info: { padding: 10, gap: 6 },
    name: { fontSize: 13, fontWeight: '700', color: '#1F2937', lineHeight: 18 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: '#9CA3AF', flex: 1 },

    /* See-more card */
    seeMoreCard: {
        width: 110,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginRight: 4,
    },
    seeMoreCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#EBF5FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#BFDBFE',
    },
    seeMoreTitle: { fontSize: 13, fontWeight: '700', color: '#42A4F5' },
    seeMoreSub: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
});


export default function OrgDetail() {
    const { orgId, numberOfHostedEvents, creditHour } =
        useLocalSearchParams<{
            orgId: string;
            orgName?: string;
            numberOfHostedEvents?: string;
            creditHour?: string;
        }>();

    // Parse numeric stats passed from the org list (Expo Router params are always strings)
    const hostedEventsCount = numberOfHostedEvents != null ? parseInt(numberOfHostedEvents, 10) : null;
    const creditHourCount   = creditHour         != null ? parseFloat(creditHour)            : null;

    const [org, setOrg] = useState<OrganizationDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Events state — only needed for the 3 recent-event cards
    const [recentEvents, setRecentEvents] = useState<EventSimpleResponse[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);

    const fetchOrg = useCallback(async () => {
        if (!orgId) return;
        try {
            setLoading(true);
            const data = await getOrganizationDetails(orgId);
            setOrg(data);
        } catch (err: any) {
            setError(err.message || 'Không thể tải thông tin tổ chức');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    const fetchEvents = useCallback(async () => {
        if (!orgId) return;
        try {
            setEventsLoading(true);
            const data = await getEventsByOrg(orgId, { pageNumber: 0, pageSize: 3 });
            setRecentEvents(data.content ?? []);
        } catch {
            setRecentEvents([]);
        } finally {
            setEventsLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        fetchOrg();
        fetchEvents();
    }, [fetchOrg, fetchEvents]);

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(vol-tabs)/benefit' as any);
    };

    const handleViewAllEvents = () => {
        router.push({
            pathname: '/screen/volunteer-screens/org-events',
            params: { orgId, orgName: org?.name ?? '' },
        } as any);
    };

    const handleEventPress = (eventId: string) => {
        router.push({
            pathname: '/screen/volunteer-screens/event-detail-vol',
            params: { eventId },
        } as any);
    };

    const coverUrl = getFullImageUrl(org?.coverImageUrl);
    const avatarUrl = getFullImageUrl(org?.avatarImageUrl);
    const orgTypeLabel = org?.orgType
        ? (ORG_TYPE_SHORT_LABELS[org.orgType as EOrgType] ?? org.orgType)
        : null;

    // extraCount drives the inline "Xem thêm" tail card
    // Use the param value (authoritative count from org list) so it shows correctly
    // even before all 3 recent-event cards have loaded.
    const extraCount = (hostedEventsCount ?? 0) - recentEvents.length;

    if (loading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#42A4F5" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </SafeAreaView>
        );
    }

    if (error || !org) {
        return (
            <SafeAreaView style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error || 'Không tìm thấy tổ chức'}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleBack}>
                    <Text style={styles.retryBtnText}>Quay lại</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

                {/* ── COVER IMAGE ── */}
                <View style={styles.coverContainer}>
                    {coverUrl ? (
                        <Image
                            source={coverUrl}
                            style={styles.coverImage}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : (
                        <View style={styles.coverPlaceholder} />
                    )}

                    {/* Back button overlay */}
                    <View style={styles.headerOverlay}>
                        <TouchableOpacity style={styles.circleBtn} onPress={handleBack}>
                            <Ionicons name="arrow-back" size={22} color="#1F2937" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── CONTENT ── */}
                <View style={styles.content}>

                    {/* Avatar + name row */}
                    <View style={styles.titleRow}>
                        <View style={styles.avatarWrap}>
                            {avatarUrl ? (
                                <Image source={avatarUrl} style={styles.avatar} contentFit="cover" />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="business" size={28} color="#42A4F5" />
                                </View>
                            )}
                            {org.dhaRegistered && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                </View>
                            )}
                        </View>

                        <View style={styles.titleTexts}>
                            <Text style={styles.orgName}>{org.name}</Text>

                            {/* Star rating */}
                            <StarRating rating={MOCK_RATING} />

                            {/* Org type badge */}
                            {orgTypeLabel && (
                                <View style={styles.typeTag}>
                                    <Text style={styles.typeTagText}>{orgTypeLabel}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* DHA badge */}
                    {org.dhaRegistered && (
                        <View style={styles.dhaBadge}>
                            <Ionicons name="shield-checkmark" size={15} color="#10B981" />
                            <Text style={styles.dhaBadgeText}>Đã đăng ký với cơ quan nhà nước (DHA)</Text>
                        </View>
                    )}

                    {/* ── STATS ── */}
                    <View style={styles.statsRow}>
                        {/* Sự kiện đã tổ chức — from org list param */}
                        <View style={styles.statChip}>
                            <Ionicons name="calendar-outline" size={20} color="#10B981" />
                            <Text style={[styles.statValue, { color: '#10B981' }]}>
                                {hostedEventsCount != null
                                    ? hostedEventsCount.toLocaleString('vi-VN')
                                    : '—'}
                            </Text>
                            <Text style={styles.statLabel}>Sự kiện đã tổ chức</Text>
                        </View>
                        {/* Giờ uy tín — from org list param */}
                        <View style={styles.statChip}>
                            <Ionicons name="ribbon-outline" size={20} color="#42A4F5" />
                            <Text style={[styles.statValue, { color: '#42A4F5' }]}>
                                {creditHourCount != null
                                    ? creditHourCount.toLocaleString('vi-VN')
                                    : '—'}
                            </Text>
                            <Text style={styles.statLabel}>Giờ uy tín</Text>
                        </View>
                    </View>

                    {/* ── Hoạt động gần đây ── */}
                    <View style={styles.section}>
                        {/* Section header */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
                            {(hostedEventsCount ?? 0) > 0 && (
                                <TouchableOpacity onPress={handleViewAllEvents} activeOpacity={0.7}>
                                    <Text style={styles.seeMoreLink}>Xem thêm</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {eventsLoading ? (
                            <ActivityIndicator
                                size="small"
                                color="#42A4F5"
                                style={{ marginVertical: 24 }}
                            />
                        ) : recentEvents.length === 0 ? (
                            <View style={styles.noEventsBox}>
                                <Ionicons name="calendar-outline" size={30} color="#D1D5DB" />
                                <Text style={styles.noEventsText}>Chưa có hoạt động nào</Text>
                            </View>
                        ) : (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.eventsScroll}
                                decelerationRate="fast"
                            >
                                {recentEvents.map(ev => (
                                    <EventCard
                                        key={ev.id}
                                        event={ev}
                                        onPress={() => handleEventPress(ev.id)}
                                    />
                                ))}
                                {/* Inline "Xem thêm" card at end of scroll */}
                                {extraCount > 0 && (
                                    <SeeMoreCard count={extraCount} onPress={handleViewAllEvents} />
                                )}
                            </ScrollView>
                        )}
                    </View>

                    {/* ── Giới thiệu tổ chức ── */}
                    {org.orgIntroduction ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Giới thiệu tổ chức</Text>
                            <Text style={styles.introText}>{org.orgIntroduction}</Text>
                        </View>
                    ) : null}

                    {/* Note */}
                    {org.note ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Ghi chú</Text>
                            <Text style={styles.introText}>{org.note}</Text>
                        </View>
                    ) : null}

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },

    centered: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFFFFF', padding: 24,
    },
    loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
    errorText: { marginTop: 12, fontSize: 15, color: '#EF4444', textAlign: 'center' },
    retryBtn: {
        marginTop: 20, backgroundColor: '#42A4F5',
        paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8,
    },
    retryBtnText: { color: '#FFF', fontWeight: '600' },

    /* ── Cover ── */
    coverContainer: { position: 'relative', height: COVER_HEIGHT },
    coverImage: { width: SCREEN_W, height: COVER_HEIGHT },
    coverPlaceholder: {
        width: SCREEN_W, height: COVER_HEIGHT, backgroundColor: '#E3F2FD',
    },
    headerOverlay: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 36,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
    },
    circleBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },

    /* ── Content ── */
    content: { padding: 16 },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 12,
    },
    avatarWrap: { position: 'relative', flexShrink: 0, marginTop: -44 },
    avatar: {
        width: 76, height: 76, borderRadius: 14,
        borderWidth: 3, borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
        width: 76, height: 76, borderRadius: 14,
        backgroundColor: '#E3F2FD',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#FFFFFF',
    },
    verifiedBadge: {
        position: 'absolute', bottom: -4, right: -4,
        backgroundColor: '#fff', borderRadius: 10, padding: 1,
    },
    titleTexts: { flex: 1, paddingTop: 4, gap: 6 },
    orgName: {
        fontSize: 18, fontWeight: '700', color: '#1F2937', lineHeight: 26,
    },
    typeTag: {
        alignSelf: 'flex-start', backgroundColor: '#E3F2FD',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    typeTagText: { fontSize: 12, color: '#42A4F5', fontWeight: '600' },

    dhaBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16,
    },
    dhaBadgeText: { fontSize: 12, color: '#065F46', fontWeight: '600' },

    /* ── Stats ── */
    statsRow: {
        flexDirection: 'row', gap: 12, marginBottom: 20,
    },
    statChip: {
        flex: 1, backgroundColor: '#F0F8FF',
        borderRadius: 12, padding: 14,
        alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: '#BBDEFB',
    },
    statValue: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
    statLabel: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },

    /* ── Section ── */
    section: { marginBottom: 20 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16, fontWeight: '700', color: '#1F2937',
    },
    seeMoreLink: {
        fontSize: 13, fontWeight: '600', color: '#42A4F5',
    },

    /* Events horizontal scroll */
    eventsScroll: {
        paddingRight: 4,
    },

    /* No events */
    noEventsBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 8,
    },
    noEventsText: {
        fontSize: 13, color: '#9CA3AF',
    },

    /* Intro */
    introText: {
        fontSize: 14, color: '#4B5563', lineHeight: 22,
    },
});
