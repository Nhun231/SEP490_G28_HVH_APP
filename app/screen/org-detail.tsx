import {
    EOrgType,
    ORG_TYPE_LABELS,
    OrganizationDetailsResponse,
    getOrganizationDetails,
} from '@/services/organization-service';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFullImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co';
    if (path.startsWith('/storage/v1')) return `${supabaseUrl}${path}`;
    if (path.startsWith('/object/')) return `${supabaseUrl}/storage/v1${path}`;
    return `${supabaseUrl}/storage/v1/object/public/hvh-bucket/${path}`;
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return '—'; }
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon as any} size={18} color="#42A4F5" style={styles.infoIcon} />
            <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrgDetail() {
    const { orgId, orgName } = useLocalSearchParams<{ orgId: string; orgName?: string }>();
    const [org, setOrg] = useState<OrganizationDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        else router.replace('/(tabs)/benefit' as any);
    };

    const handleCallManager = () => {
        if (org?.managerPhone) Linking.openURL(`tel:${org.managerPhone}`);
    };

    const coverUrl = getFullImageUrl(org?.coverImageUrl);
    const avatarUrl = getFullImageUrl(org?.avatarImageUrl);
    const orgTypeLabel = org?.orgType ? (ORG_TYPE_LABELS[org.orgType as EOrgType] ?? org.orgType) : null;

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
                        <View style={styles.coverPlaceholder}>
                            <Ionicons name="business" size={52} color="rgba(255,255,255,0.5)" />
                        </View>
                    )}

                    {/* Back button overlay */}
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <Ionicons name="close" size={22} color="#1F2937" />
                    </TouchableOpacity>
                </View>

                {/* ── CONTENT ── */}
                <View style={styles.content}>

                    {/* Avatar + name header */}
                    <View style={styles.titleRow}>
                        <View style={styles.avatarWrap}>
                            {avatarUrl ? (
                                <Image source={avatarUrl} style={styles.avatar} contentFit="cover" />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="business" size={28} color="#42A4F5" />
                                </View>
                            )}
                        </View>
                        <View style={styles.titleTexts}>
                            <Text style={styles.orgName}>{org.name}</Text>
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
                            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                            <Text style={styles.dhaBadgeText}>Đã đăng ký với cơ quan nhà nước (DHA)</Text>
                        </View>
                    )}

                    {/* Stats chips */}
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Ionicons name="time-outline" size={18} color="#42A4F5" />
                            <Text style={styles.statValue}>
                                {org.totalHonorHours != null
                                    ? org.totalHonorHours.toLocaleString('vi-VN')
                                    : '—'}
                            </Text>
                            <Text style={styles.statLabel}>Giờ uy tín</Text>
                        </View>
                        <View style={styles.statChip}>
                            <Ionicons name="calendar-outline" size={18} color="#42A4F5" />
                            <Text style={styles.statValue}>{formatDate(org.createdAt)}</Text>
                            <Text style={styles.statLabel}>Ngày thành lập</Text>
                        </View>
                    </View>

                    {/* Introduction */}
                    {org.orgIntroduction ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Giới thiệu tổ chức</Text>
                            <Text style={styles.introText}>{org.orgIntroduction}</Text>
                        </View>
                    ) : null}

                    {/* Contact info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
                        {org.managerEmail && (
                            <InfoRow icon="mail-outline" label="Email quản lý" value={org.managerEmail} />
                        )}
                        {org.managerPhone && (
                            <TouchableOpacity onPress={handleCallManager}>
                                <InfoRow icon="call-outline" label="Số điện thoại" value={org.managerPhone} />
                            </TouchableOpacity>
                        )}
                        {!org.managerEmail && !org.managerPhone && (
                            <Text style={styles.noContact}>Chưa có thông tin liên hệ</Text>
                        )}
                    </View>

                    {/* Notes */}
                    {org.note ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Ghi chú</Text>
                            <Text style={styles.introText}>{org.note}</Text>
                        </View>
                    ) : null}

                    <View style={{ height: 32 }} />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const COVER_HEIGHT = 220;

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

    /* Cover */
    coverContainer: { position: 'relative', height: COVER_HEIGHT },
    coverImage: { width: '100%', height: COVER_HEIGHT },
    coverPlaceholder: {
        width: '100%', height: COVER_HEIGHT,
        backgroundColor: '#42A4F5', alignItems: 'center', justifyContent: 'center',
    },
    backBtn: {
        position: 'absolute', top: 48, left: 16,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.88)',
        alignItems: 'center', justifyContent: 'center',
        elevation: 3,
    },

    /* Content */
    content: { padding: 16 },

    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 },
    avatarWrap: { flexShrink: 0, marginTop: -44 },
    avatar: {
        width: 78, height: 78, borderRadius: 14,
        borderWidth: 3, borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
        width: 78, height: 78, borderRadius: 14,
        backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#FFFFFF', marginTop: -44,
    },
    titleTexts: { flex: 1, paddingTop: 4 },
    orgName: { fontSize: 18, fontWeight: '700', color: '#1F2937', lineHeight: 26, marginBottom: 6 },
    typeTag: {
        alignSelf: 'flex-start', backgroundColor: '#E3F2FD',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    typeTagText: { fontSize: 12, color: '#42A4F5', fontWeight: '600' },

    dhaBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 8, alignSelf: 'flex-start', marginBottom: 14,
    },
    dhaBadgeText: { fontSize: 12, color: '#065F46', fontWeight: '600' },

    statsRow: {
        flexDirection: 'row', gap: 12, marginBottom: 20,
    },
    statChip: {
        flex: 1, backgroundColor: '#F0F8FF',
        borderRadius: 12, padding: 14, alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: '#BBDEFB',
    },
    statValue: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
    statLabel: { fontSize: 11, color: '#9CA3AF' },

    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
    introText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
    noContact: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },

    infoRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: 12, marginBottom: 12,
        backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    infoIcon: { marginTop: 2 },
    infoTexts: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 3 },
    infoValue: { fontSize: 14, color: '#1F2937', fontWeight: '600' },
});
