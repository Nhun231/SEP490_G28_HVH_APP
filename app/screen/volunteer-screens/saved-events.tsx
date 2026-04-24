import { EventSimpleResponse } from '@/services/event-types'
import { getSavedEvents, saveEventForVolunteer } from '@/services/vol-event-service'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const PAGE_SIZE = 10

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

function isRecruiting(endDate: string): boolean {
    if (!endDate) return false
    return new Date(endDate) >= new Date()
}

function getFullImageUrl(path: string | null | undefined): string {
    if (!path) return 'https://placehold.co/400x300/e2e8f0/64748b.png?text=No+Image'
    if (path.startsWith('http')) return path
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co'
    if (path.startsWith('/storage/v1')) return `${supabaseUrl}${path}`
    if (path.startsWith('/object/')) return `${supabaseUrl}/storage/v1${path}`
    return `${supabaseUrl}/storage/v1/object/public/hvh-bucket/${path}`
}

// ─── card ─────────────────────────────────────────────────────────────────────

interface SavedEventCardProps {
    item: EventSimpleResponse
    onPress: () => void
    onUnsave: (item: EventSimpleResponse) => void
}

function SavedEventCard({ item, onPress, onUnsave }: SavedEventCardProps) {
    const recruiting = isRecruiting(item.recruitmentEndDate)
    const imageUri = getFullImageUrl(item.imageUrl)

    return (
        <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
            {/* Status stripe */}
            <View style={[cardStyles.statusStripe, { backgroundColor: recruiting ? '#42A4F5' : '#9CA3AF' }]} />

            <View style={cardStyles.cardBody}>
                {/* Thumbnail */}
                <Image
                    source={imageUri}
                    style={cardStyles.thumbnail}
                    contentFit="cover"
                    transition={200}
                    placeholder={{ uri: 'https://placehold.co/400x300/e2e8f0/64748b.png?text=Loading' }}
                />

                {/* Content */}
                <View style={cardStyles.content}>
                    {/* Event name */}
                    <Text style={cardStyles.eventName} numberOfLines={2}>
                        {item.name}
                    </Text>

                    {/* Org row */}
                    <View style={cardStyles.infoRow}>
                        <View style={cardStyles.orgDot} />
                        <Text style={cardStyles.orgText} numberOfLines={1}>
                            {item.orgName}
                        </Text>
                    </View>

                    {/* Address row */}
                    {!!item.address && (
                        <View style={cardStyles.infoRow}>
                            <Ionicons name="location-outline" size={13} color="#6B7280" />
                            <Text style={cardStyles.infoText} numberOfLines={1}>
                                {item.address}
                            </Text>
                        </View>
                    )}

                    {/* Date chip */}
                    <View style={cardStyles.sessionChip}>
                        <Ionicons name="calendar-outline" size={12} color="#2563EB" />
                        <Text style={cardStyles.sessionText}>{formatDate(item.startDate)}</Text>
                    </View>

                    {/* Footer: status badge + unsave button */}
                    <View style={cardStyles.cardFooter}>
                        <View style={[cardStyles.badge, { backgroundColor: recruiting ? '#EBF5FF' : '#F3F4F6' }]}>
                            <Ionicons
                                name={recruiting ? 'megaphone-outline' : 'time-outline'}
                                size={13}
                                color={recruiting ? '#42A4F5' : '#6B7280'}
                            />
                            <Text style={[cardStyles.badgeText, { color: recruiting ? '#42A4F5' : '#6B7280' }]}>
                                {recruiting ? 'Đang tuyển' : 'Hết hạn'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={cardStyles.unsaveBtn}
                            onPress={() => onUnsave(item)}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="bookmark" size={14} color="#FFFFFF" />
                            <Text style={cardStyles.unsaveBtnText}>Bỏ lưu</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
}

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14,
        marginBottom: 12,
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    statusStripe: {
        height: 4,
        width: '100%',
    },
    cardBody: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
    },
    thumbnail: {
        width: 88,
        height: 88,
        borderRadius: 10,
        flexShrink: 0,
    },
    content: {
        flex: 1,
        gap: 6,
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
    orgDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
    },
    orgText: {
        flex: 1,
        fontSize: 12,
        color: '#4B5563',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 17,
    },
    sessionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    sessionText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#2563EB',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    unsaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#42A4F5',
        elevation: 2,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
    },
    unsaveBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
})

// ─── screen ───────────────────────────────────────────────────────────────────

const SavedEvents = () => {
    const [items, setItems] = useState<EventSimpleResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [currentPage, setCurrentPage] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    const fetchPage = useCallback(async (page: number, append = false) => {
        const res = await getSavedEvents({ pageNumber: page, pageSize: PAGE_SIZE })
        const content = res.content ?? []
        if (append) {
            setItems(prev => [...prev, ...content])
        } else {
            setItems(content)
        }
        const pNum = res.page?.number ?? 0
        const pTotal = res.page?.totalPages ?? 1
        setCurrentPage(pNum)
        setTotalPages(pTotal)
    }, [])

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true)
                try { await fetchPage(0) } catch { if (active) setItems([]) }
                finally { if (active) setLoading(false) }
            })()
            return () => { active = false }
        }, [fetchPage])
    )

    const handleRefresh = useCallback(async () => {
        setRefreshing(true)
        try { await fetchPage(0) } catch { /* silent */ }
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

    const handleCardPress = useCallback((item: EventSimpleResponse) => {
        router.push({
            pathname: '/screen/volunteer-screens/event-detail-vol',
            params: { eventId: item.id },
        } as any)
    }, [])

    const handleUnsave = useCallback((item: EventSimpleResponse) => {
        Alert.alert(
            'Bỏ lưu sự kiện',
            `Bạn có muốn bỏ lưu "${item.name}" không?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Bỏ lưu',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await saveEventForVolunteer(item.id)
                            // Optimistically remove from list
                            setItems(prev => prev.filter(e => e.id !== item.id))
                        } catch {
                            Alert.alert('Lỗi', 'Không thể bỏ lưu sự kiện. Vui lòng thử lại.')
                        }
                    },
                },
            ]
        )
    }, [])

    const handleGoBack = () => {
        if (router.canGoBack()) router.back()
        else router.replace('/(vol-tabs)/personal' as any)
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* ═══ HEADER ═══ */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sự kiện đã lưu</Text>
                <View style={styles.headerBtn} />
            </View>

            {/* ═══ CONTENT ═══ */}
            <View style={styles.contentArea}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <SavedEventCard
                                item={item}
                                onPress={() => handleCardPress(item)}
                                onUnsave={handleUnsave}
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
                                colors={['#42A4F5']}
                                tintColor="#42A4F5"
                            />
                        }
                        ListFooterComponent={
                            loadingMore ? (
                                <ActivityIndicator style={{ padding: 16 }} size="small" color="#42A4F5" />
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="bookmark-outline" size={52} color="#9CA3AF" />
                                <Text style={styles.emptyText}>Chưa có sự kiện nào được lưu</Text>
                                <Text style={styles.emptySubText}>
                                    Nhấn biểu tượng lưu trên trang chi tiết để lưu sự kiện yêu thích.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    )
}

export default SavedEvents

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },
    contentArea: {
        flex: 1,
        backgroundColor: '#E3F2FD',
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#42A4F5',
        paddingHorizontal: 12,
        paddingBottom: 14,
    },
    headerBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* ── List ── */
    listContent: {
        paddingTop: 14,
        paddingBottom: 28,
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

    /* ── Empty ── */
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginTop: 14,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 20,
    },
})
