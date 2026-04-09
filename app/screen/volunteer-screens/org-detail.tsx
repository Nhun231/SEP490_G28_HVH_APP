import {
    EOrgType,
    ORG_TYPE_SHORT_LABELS,
    OrganizationDetailsResponse,
    getOrganizationDetails,
} from '@/services/organization-service';
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

// ─── Constants ───────────────────────────────────────────────────────────────

const MOCK_RATING = 3.2;
const { width: SCREEN_W } = Dimensions.get('window');
const COVER_HEIGHT = 240;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFullImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co';
    if (path.startsWith('/storage/v1')) return `${supabaseUrl}${path}`;
    if (path.startsWith('/object/')) return `${supabaseUrl}/storage/v1${path}`;
    return `${supabaseUrl}/storage/v1/object/public/hvh-bucket/${path}`;
}

import StarRating from '@/app/components/volunteer/organization/StarRating';

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrgDetail() {
    const { orgId } = useLocalSearchParams<{ orgId: string; orgName?: string }>();
    const [org, setOrg] = useState<OrganizationDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

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

    useEffect(() => { fetchOrg(); }, [fetchOrg]);

    const handleBack = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(vol-tabs)/benefit' as any);
    };

    const coverUrl = getFullImageUrl(org?.coverImageUrl);
    const avatarUrl = getFullImageUrl(org?.avatarImageUrl);
    const orgTypeLabel = org?.orgType
        ? (ORG_TYPE_SHORT_LABELS[org.orgType as EOrgType] ?? org.orgType)
        : null;

    // ── Loading ──
    if (loading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#42A4F5" />
                <Text style={styles.loadingText}>Đang tải...</Text>
            </SafeAreaView>
        );
    }

    // ── Error ──
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

                    {/* Back + Save overlay */}
                    <View style={styles.headerOverlay}>
                        <TouchableOpacity style={styles.circleBtn} onPress={handleBack}>
                            <Ionicons name="arrow-back" size={22} color="#1F2937" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.circleBtn} onPress={() => setSaved(v => !v)}>
                            <Ionicons
                                name={saved ? 'heart' : 'heart-outline'}
                                size={22}
                                color={saved ? '#EF4444' : '#1F2937'}
                            />
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
                        <View style={styles.statChip}>
                            <Ionicons name="people-outline" size={20} color="#42A4F5" />
                            <Text style={styles.statValue}>—</Text>
                            <Text style={styles.statLabel}>Số thành viên</Text>
                        </View>
                        <View style={styles.statChip}>
                            <Ionicons name="time-outline" size={20} color="#42A4F5" />
                            <Text style={styles.statValue}>
                                {org.totalHonorHours != null
                                    ? org.totalHonorHours.toLocaleString('vi-VN')
                                    : '—'}
                            </Text>
                            <Text style={styles.statLabel}>Giờ uy tín</Text>
                        </View>
                    </View>

                    {/* ── Hoạt động gần đây ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
                        <View style={styles.comingSoonBox}>
                            <Ionicons name="construct-outline" size={28} color="#42A4F5" />
                            <Text style={styles.comingSoonTitle}>Đang phát triển</Text>
                            <Text style={styles.comingSoonSub}>
                                Tính năng này sẽ sớm được cập nhật.
                            </Text>
                        </View>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
        justifyContent: 'space-between',
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
    statLabel: { fontSize: 11, color: '#9CA3AF' },

    /* ── Section ── */
    section: { marginBottom: 20 },
    sectionTitle: {
        fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12,
    },

    /* Coming soon */
    comingSoonBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
        gap: 8,
    },
    comingSoonTitle: {
        fontSize: 14, fontWeight: '700', color: '#42A4F5',
    },
    comingSoonSub: {
        fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19,
    },

    /* Intro */
    introText: {
        fontSize: 14, color: '#4B5563', lineHeight: 22,
    },
});
