/**
 * vol-public-profile.tsx
 * Public Volunteer Profile Card — viewable by anyone who taps an avatar
 * in the public moments feed or in-event moment feed.
 *
 * Route params: { volunteerId: string (UUID) }
 * API: GET /api/v1/volunteers/public-information/{volunteerId}
 *
 * Response shape (VolunteerPublicInformationResponse):
 *   vid, fullName, nickname, bio, dob, avatarUrl,
 *   creditScore, avgRating, activityCount, certificatesUrls[]
 */

import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import baseAxios from '@/lib/baseAxios'

const { width: SCREEN_W } = Dimensions.get('window')
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'


function resolveStorageUrl(url: string | null | undefined): string | null {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (url.startsWith('/storage/v1')) return `${SUPABASE_URL}${url}`
    if (url.startsWith('/object/')) return `${SUPABASE_URL}/storage/v1${url}`
    return `${SUPABASE_URL}${url}`
}

interface VolunteerPublicInfo {
    vid: string
    fullName: string
    nickname: string | null
    bio: string | null
    dob: string | null          // ISO date string
    avatarUrl: string | null
    creditScore: number
    avgRating: number | null
    activityCount: number
    certificatesUrls: string[]
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
    const filled = Math.floor(rating)
    const hasHalf = rating - filled >= 0.5
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Ionicons
                    key={i}
                    name={i <= filled ? 'star' : i === filled + 1 && hasHalf ? 'star-half' : 'star-outline'}
                    size={16}
                    color="#F59E0B"
                />
            ))}
        </View>
    )
}

// ─── Certificate Viewer Modal ─────────────────────────────────────────────────

function CertViewer({ urls, startIndex, visible, onClose }: {
    urls: string[]; startIndex: number; visible: boolean; onClose: () => void
}) {
    const [current, setCurrent] = useState(startIndex)
    useEffect(() => { if (visible) setCurrent(startIndex) }, [visible, startIndex])

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={certViewerStyles.bg}>
                <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                    <TouchableOpacity style={certViewerStyles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={certViewerStyles.counter}>{current + 1} / {urls.length}</Text>
                    <FlatList
                        data={urls}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={startIndex}
                        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
                        onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
                        keyExtractor={(_, i) => String(i)}
                        renderItem={({ item }) => (
                            <View style={{ width: SCREEN_W, justifyContent: 'center', alignItems: 'center' }}>
                                <Image
                                    source={{ uri: resolveStorageUrl(item) ?? item }}
                                    style={{ width: SCREEN_W, height: SCREEN_W * 1.4 }}
                                    contentFit="contain"
                                />
                            </View>
                        )}
                    />
                </SafeAreaView>
            </View>
        </Modal>
    )
}

const certViewerStyles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
    closeBtn: {
        position: 'absolute', top: Platform.OS === 'ios' ? 52 : 16, right: 16, zIndex: 100,
        backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 8,
    },
    counter: {
        position: 'absolute', top: Platform.OS === 'ios' ? 56 : 20,
        alignSelf: 'center', color: '#FFFFFF', fontSize: 14, fontWeight: '600', zIndex: 99,
    },
})

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function VolPublicProfile() {
    const { volunteerId } = useLocalSearchParams<{ volunteerId: string }>()

    const [profile, setProfile] = useState<VolunteerPublicInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [certViewerOpen, setCertViewerOpen] = useState(false)
    const [certStartIdx, setCertStartIdx] = useState(0)

    const load = useCallback(async () => {
        if (!volunteerId) return
        setLoading(true)
        setError(null)
        try {
            const res = await baseAxios.get<VolunteerPublicInfo>(
                `${API_BASE}/api/v1/volunteers/public-information/${volunteerId}`
            )
            setProfile(res.data)
        } catch (e) {
            setError('Không thể tải thông tin tình nguyện viên.')
        } finally {
            setLoading(false)
        }
    }, [volunteerId])

    useEffect(() => { load() }, [load])

    const avatarUrl = resolveStorageUrl(profile?.avatarUrl)
    const displayName = profile?.nickname || profile?.fullName || 'Tình nguyện viên'
    const initials = (() => {
        const n = profile?.fullName || displayName
        const words = n.trim().split(/\s+/)
        return words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : n.slice(0, 2).toUpperCase()
    })()

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hồ sơ tình nguyện viên</Text>
                <View style={styles.headerBtn} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#42A4F5" />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={52} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={load}>
                        <Text style={styles.retryText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : profile ? (
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* ── Hero Section ── */}
                    <View style={styles.hero}>
                        <View style={styles.heroBg} />
                        <View style={styles.heroContent}>
                            {/* Avatar */}
                            <View style={styles.avatarRing}>
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarInitials}>{initials}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Name + verified */}
                            <View style={styles.nameRow}>
                                <Text style={styles.name}>{displayName}</Text>
                                <Ionicons name="checkmark-circle" size={20} color="#42A4F5" />
                            </View>
                            {profile.nickname && profile.fullName !== profile.nickname && (
                                <Text style={styles.fullName}>{profile.fullName}</Text>
                            )}

                            {/* Bio */}
                            {!!profile.bio && (
                                <Text style={styles.bio}>{profile.bio}</Text>
                            )}
                        </View>
                    </View>

                    {/* ── Stats Row ── */}
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile.activityCount}</Text>
                            <Text style={styles.statLabel}>Hoạt động</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{profile.creditScore}</Text>
                            <Text style={styles.statLabel}>Điểm uy tín</Text>
                        </View>
                        {profile.avgRating != null && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{Number(profile.avgRating).toFixed(1)}</Text>
                                    <StarRating rating={Number(profile.avgRating)} />
                                </View>
                            </>
                        )}
                    </View>

                    {/* ── Certificates ── */}
                    {profile.certificatesUrls && profile.certificatesUrls.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="ribbon-outline" size={18} color="#F59E0B" />
                                <Text style={styles.sectionTitle}>Chứng chỉ</Text>
                                <Text style={styles.certCount}>{profile.certificatesUrls.length} chứng chỉ</Text>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.certScroll}>
                                {profile.certificatesUrls.map((url, i) => (
                                    <Pressable
                                        key={i}
                                        style={styles.certThumb}
                                        onPress={() => { setCertStartIdx(i); setCertViewerOpen(true) }}
                                    >
                                        <Image
                                            source={{ uri: resolveStorageUrl(url) ?? url }}
                                            style={styles.certImg}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                        <View style={styles.certOverlay}>
                                            <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
                                        </View>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {profile.certificatesUrls?.length === 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="ribbon-outline" size={18} color="#9CA3AF" />
                                <Text style={[styles.sectionTitle, { color: '#9CA3AF' }]}>Chứng chỉ</Text>
                            </View>
                            <Text style={styles.noCert}>Chưa có chứng chỉ</Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            ) : null}

            {/* Certificate full-screen viewer */}
            {profile && (
                <CertViewer
                    urls={profile.certificatesUrls}
                    startIndex={certStartIdx}
                    visible={certViewerOpen}
                    onClose={() => setCertViewerOpen(false)}
                />
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#42A4F5' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#42A4F5', paddingHorizontal: 12, paddingBottom: 12,
    },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

    scroll: { flex: 1, backgroundColor: '#F3F4F6' },

    /* Loading / Error */
    center: { flex: 1, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#6B7280' },
    errorText: { fontSize: 15, color: '#EF4444', textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: {
        backgroundColor: '#42A4F5', borderRadius: 10,
        paddingHorizontal: 24, paddingVertical: 10,
    },
    retryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

    /* Hero */
    hero: { backgroundColor: '#FFFFFF', marginBottom: 12, overflow: 'hidden' },
    heroBg: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 80,
        backgroundColor: '#42A4F5',
    },
    heroContent: { alignItems: 'center', paddingTop: 40, paddingBottom: 24, paddingHorizontal: 20 },
    avatarRing: {
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 4, borderColor: '#FFFFFF',
        backgroundColor: '#E3F2FD',
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        marginBottom: 12,
    },
    avatar: { width: '100%', height: '100%' },
    avatarFallback: {
        width: '100%', height: '100%',
        backgroundColor: '#42A4F5', alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    name: { fontSize: 20, fontWeight: '800', color: '#111827' },
    fullName: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
    bio: { fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 21, marginTop: 6 },

    /* Stats */
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14, marginBottom: 12,
        borderRadius: 16, padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
    statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
    statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', textAlign: 'center' },

    /* Section */
    section: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14, marginBottom: 12,
        borderRadius: 16, padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
    certCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    certScroll: { gap: 10, paddingBottom: 4 },
    certThumb: {
        width: 130, height: 90, borderRadius: 10, overflow: 'hidden',
        backgroundColor: '#E5E7EB',
    },
    certImg: { width: '100%', height: '100%' },
    certOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'flex-end', justifyContent: 'flex-end',
        padding: 6,
    },
    noCert: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
})
