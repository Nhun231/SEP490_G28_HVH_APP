import {
    getVolunteerCertificates,
    VolunteerCertificate,
} from '@/services/certificate-service'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useFocusEffect } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Linking,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://kbmxlrqkzgjbtkmlbaei.supabase.co'

/** Resolve a potentially-relative Supabase storage URL to a full https URL. */
function resolveUrl(url: string | null | undefined): string | null {
    if (!url) return null
    if (url.startsWith('http')) return url
    if (url.startsWith('/storage/v1')) return `${SUPABASE_URL}${url}`
    if (url.startsWith('/object/')) return `${SUPABASE_URL}/storage/v1${url}`
    return `${SUPABASE_URL}/storage/v1/object/public/hvh-bucket/${url}`
}

/** Convert a hex color + alpha (0-255) to rgba string for cross-platform compat. */
function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
}

const PAGE_SIZE = 10
const BLUE = '#42A4F5'
const GOLD = '#F59E0B'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
}

/** Short cert-code display: show first 8 chars + '...' if longer */
function shortCode(code: string): string {
    return code.length > 12 ? `${code.substring(0, 12)}…` : code
}

// ─── CertCard ────────────────────────────────────────────────────────────────

interface CertCardProps {
    item: VolunteerCertificate
    onCopyCode: (code: string) => void
    onView: (item: VolunteerCertificate) => void
}

function CertCard({ item, onCopyCode, onView }: CertCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 25,
            bounciness: 4,
        }).start()
    }

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 6,
        }).start()
    }

    const ribbonColor = BLUE

    return (
        <Animated.View style={[certStyles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => onView(item)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={certStyles.card}
            >
                {/* Accent stripe */}
                <View style={[certStyles.accentStripe, { backgroundColor: ribbonColor }]} />

                <View style={certStyles.cardBody}>
                    {/* Icon badge */}
                    <View style={[certStyles.iconBadge, { backgroundColor: hexToRgba(ribbonColor, 0.15) }]}>
                        <Ionicons name="ribbon" size={28} color={ribbonColor} />
                    </View>

                    {/* Content */}
                    <View style={certStyles.contentArea}>
                        {/* Event name */}
                        <Text style={certStyles.eventName} numberOfLines={2}>
                            {item.eventName}
                        </Text>

                        {/* Org */}
                        <View style={certStyles.infoRow}>
                            <Ionicons name="business-outline" size={13} color="#6B7280" />
                            <Text style={certStyles.orgText} numberOfLines={1}>
                                {item.organizationName}
                            </Text>
                        </View>

                        {/* Issue date */}
                        <View style={certStyles.infoRow}>
                            <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                            <Text style={certStyles.dateText}>
                                Cấp ngày {formatDateTime(item.issuedAt)}
                            </Text>
                        </View>

                        {/*/!* Code row *!/*/}
                        {/*<View style={certStyles.codeRow}>*/}
                        {/*    <View style={certStyles.codeChip}>*/}
                        {/*        <Ionicons name="qr-code-outline" size={12} color={BLUE} />*/}
                        {/*        <Text style={certStyles.codeText}>{shortCode(item.certCode)}</Text>*/}
                        {/*    </View>*/}
                        {/*    <TouchableOpacity*/}
                        {/*        style={certStyles.copyBtn}*/}
                        {/*        onPress={() => onCopyCode(item.certCode)}*/}
                        {/*        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}*/}
                        {/*    >*/}
                        {/*        <Ionicons name="copy-outline" size={14} color={BLUE} />*/}
                        {/*        <Text style={certStyles.copyText}>Sao chép</Text>*/}
                        {/*    </TouchableOpacity>*/}
                        {/*</View>*/}
                    </View>
                </View>

                {/* Footer: view button */}
                {!!item.certSignedUrl && (
                    <TouchableOpacity
                        style={[certStyles.viewBtn, { backgroundColor: ribbonColor }]}
                        onPress={() => onView(item)}
                        activeOpacity={0.8}
                    >
                        <Text style={certStyles.viewBtnText}>Xem chứng chỉ</Text>
                        <Ionicons name="chevron-forward" size={15} color="#fff" />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        </Animated.View>
    )
}

const certStyles = StyleSheet.create({
    cardWrapper: {
        marginHorizontal: 14,
        marginBottom: 14,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 8,
    },
    accentStripe: {
        height: 5,
        width: '100%',
    },
    cardBody: {
        flexDirection: 'row',
        padding: 14,
        gap: 12,
        alignItems: 'flex-start',
    },
    iconBadge: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    contentArea: {
        flex: 1,
        gap: 5,
    },
    eventName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    orgText: {
        flex: 1,
        fontSize: 12,
        color: '#4B5563',
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    codeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EBF5FF',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    codeText: {
        fontSize: 11,
        fontWeight: '700',
        color: BLUE,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#EBF5FF',
    },
    copyText: {
        fontSize: 11,
        fontWeight: '600',
        color: BLUE,
    },
    viewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginHorizontal: 14,
        marginBottom: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    viewBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
    },
})

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <View style={emptyStyles.container}>
            <View style={emptyStyles.iconWrap}>
                <Ionicons name="ribbon-outline" size={60} color="#D1D5DB" />
            </View>
            <Text style={emptyStyles.title}>Chưa có chứng chỉ nào</Text>
            <Text style={emptyStyles.sub}>
                Hoàn thành các sự kiện tình nguyện để nhận chứng chỉ xác nhận đóng góp của bạn.
            </Text>
        </View>
    )
}

const emptyStyles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 36,
    },
    iconWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#374151',
        textAlign: 'center',
        marginBottom: 8,
    },
    sub: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
})

// ─── screen ───────────────────────────────────────────────────────────────────

export default function MyCertificates() {
    const [items, setItems] = useState<VolunteerCertificate[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [totalElements, setTotalElements] = useState(0)
    const [search, setSearch] = useState('')
    const searchRef = useRef('')

    const fetchPage = useCallback(async (page: number, append = false, nameFilter?: string) => {
        const res = await getVolunteerCertificates({
            pageNumber: page,
            pageSize: PAGE_SIZE,
            eventName: nameFilter ?? searchRef.current,
        })
        const content = res.content ?? []
        if (append) {
            setItems(prev => [...prev, ...content])
        } else {
            setItems(content)
        }
        const pNum = res.page?.number ?? 0
        const pTotal = res.page?.totalPages ?? 1
        const pElements = res.page?.totalElements ?? 0
        setCurrentPage(pNum)
        setTotalPages(pTotal)
        setTotalElements(pElements)
    }, [])

    useFocusEffect(
        useCallback(() => {
            let active = true
            searchRef.current = ''
            setSearch('');
            (async () => {
                setLoading(true)
                try { await fetchPage(0, false, '') } catch { if (active) setItems([]) }
                finally { if (active) setLoading(false) }
            })()
            return () => { active = false }
        }, [fetchPage])
    )

    const handleRefresh = useCallback(async () => {
        setRefreshing(true)
        try { await fetchPage(0, false, searchRef.current) } catch { /* silent */ }
        setRefreshing(false)
    }, [fetchPage])

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || loading || refreshing) return
        const nextPage = currentPage + 1
        if (nextPage >= totalPages) return
        setLoadingMore(true)
        try { await fetchPage(nextPage, true) } catch { /* silent */ }
        setLoadingMore(false)
    }, [loadingMore, loading, refreshing, currentPage, totalPages, fetchPage])

    const handleSearch = useCallback(async (text: string) => {
        setSearch(text)
        searchRef.current = text
        setLoading(true)
        try { await fetchPage(0, false, text) } catch { /* silent */ }
        finally { setLoading(false) }
    }, [fetchPage])

    const handleCopyCode = useCallback((code: string) => {
        Alert.alert('Mã chứng chỉ', code, [
            { text: 'Đóng', style: 'cancel' },
        ])
    }, [])

    const handleView = useCallback((item: VolunteerCertificate) => {
        const url = resolveUrl(item.certSignedUrl)
        if (!url) {
            Alert.alert('Thông báo', 'Chứng chỉ chưa có file đính kèm.')
            return
        }
        // Wrap in Google Docs Viewer so the PDF renders properly on mobile
        // (direct Supabase URLs often lack Content-Type: application/pdf)
        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
        Linking.openURL(viewerUrl).catch(() => {
            Alert.alert('Lỗi', 'Không thể mở file chứng chỉ.')
        })
    }, [])

    const handleGoBack = () => {
        if (router.canGoBack()) router.back()
        else router.replace('/(vol-tabs)/personal' as any)
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ═══ HEADER ═══ */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Chứng chỉ của tôi</Text>
                    {totalElements > 0 && !loading && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{totalElements}</Text>
                        </View>
                    )}
                </View>

                {/* Spacer to balance back button */}
                <View style={styles.headerBtn} />
            </View>

            {/* ═══ SEARCH BAR ═══ */}
            <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm theo tên sự kiện…"
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={handleSearch}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* ═══ STATS BANNER ═══ */}
            {totalElements > 0 && !loading && (
                <View style={styles.statsBanner}>
                    <Ionicons name="ribbon" size={16} color={GOLD} />
                    <Text style={styles.statsText}>
                        Bạn đã nhận được{' '}
                        <Text style={styles.statsCount}>{totalElements}</Text>
                        {' '}chứng chỉ tình nguyện
                    </Text>
                </View>
            )}

            {/* ═══ CONTENT ═══ */}
            <View style={styles.contentArea}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={BLUE} />
                        <Text style={styles.loadingText}>Đang tải chứng chỉ…</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(item, i) => `${item.certCode}-${i}`}
                        renderItem={({ item, index }) => (
                            <CertCard
                                item={item}
                                onCopyCode={handleCopyCode}
                                onView={handleView}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[BLUE]}
                                tintColor={BLUE}
                            />
                        }
                        ListFooterComponent={
                            loadingMore ? (
                                <ActivityIndicator style={{ padding: 16 }} size="small" color={BLUE} />
                            ) : null
                        }
                        ListEmptyComponent={<EmptyState />}
                    />
                )}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BLUE,
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: BLUE,
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    headerBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    countBadge: {
        backgroundColor: GOLD,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },
    countText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    /* ── Search ── */
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14,
        marginBottom: 10,
        marginTop: 4,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
        padding: 0,
    },

    /* ── Stats banner ── */
    statsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFBEB',
        marginHorizontal: 14,
        marginBottom: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    statsText: {
        fontSize: 13,
        color: '#6B7280',
    },
    statsCount: {
        fontWeight: '800',
        color: GOLD,
    },

    /* ── List ── */
    listContent: {
        paddingTop: 14,
        paddingBottom: 32,
    },

    /* ── Loading ── */
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
})
