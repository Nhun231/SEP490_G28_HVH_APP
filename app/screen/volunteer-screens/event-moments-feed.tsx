/**
 * event-moments-feed.tsx
 * "Vòng khoảnh khắc" — feed of all moments shared for an event session.
 */

import { EventMomentItem } from '@/services/event-types'
import { getEventMomentsFeed, getMyMomentsFeed } from '@/services/moment-service'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import ImageViewerModal from '../../components/volunteer/even-details/ImageViewerModal'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
function resolveStorageUrl(url: string | null | undefined): string | null {
    if (!url) return null
    if (url.startsWith('http')) return url                             
    if (url.startsWith('/storage/v1')) return `${SUPABASE_URL}${url}` 
    if (url.startsWith('/object/')) return `${SUPABASE_URL}/storage/v1${url}` 
    return `${SUPABASE_URL}${url}`                                     
}
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const PAGE_SIZE = 10

// ─── helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'Vừa xong'
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
    return `${Math.floor(diff / 86400)} ngày trước`
}

function displayName(item: EventMomentItem): string {
    return item.volNickName || item.volName || 'Tình nguyện viên'
}


function ImageGrid({ urls, onPress }: { urls: string[], onPress: (index: number) => void }) {
    if (urls.length === 0) return null
    const resolved = urls.map(u => resolveStorageUrl(u)).filter(Boolean) as string[]
    const visible = resolved.slice(0, 4)
    const overflow = resolved.length - 4

    return (
        <View style={gridStyles.grid}>
            {visible.map((url, idx) => (
                <Pressable
                    key={idx}
                    style={gridStyles.cell}
                    onPress={() => {
                        console.log('[ImageGrid] pressed idx', idx, 'url:', url)
                        onPress(idx)
                    }}
                >
                    <Image
                        source={{ uri: url }}
                        style={gridStyles.img}
                        contentFit="cover"
                        transition={150}
                        onError={(e) => console.warn('[MomentFeed] image load error', url, e)}
                    />
                    {idx === 3 && overflow > 0 && (
                        <View style={gridStyles.overlay}>
                            <Text style={gridStyles.overlayText}>+{overflow}</Text>
                        </View>
                    )}
                </Pressable>
            ))}
        </View>
    )
}


const gridStyles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    cell: {
        width: '48.5%',
        aspectRatio: 1,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
    },
    img: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
    },
})

// ─── moment card ──────────────────────────────────────────────────────────────

function MomentCard({ item, showEventChip = false }: { item: EventMomentItem; showEventChip?: boolean }) {
    console.log('[MomentCard] item.momentPicturesUrls:', item.momentPicturesUrls)
    const name = displayName(item)
    const words = name.trim().split(/\s+/)
    const initials = words.length >= 2
        ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase()
    const location = [item.eventDetailAddress, item.eventAddress].filter(Boolean).join(', ')

    const resolvedUrls = item.momentPicturesUrls
        .map(u => resolveStorageUrl(u))
        .filter(Boolean) as string[]

    const [viewerVisible, setViewerVisible] = useState(false)
    const [viewerIndex, setViewerIndex] = useState(0)

    const handleImagePress = (index: number) => {
        setViewerIndex(index)
        setViewerVisible(true)
    }

    return (
        <View style={cardStyles.card}>
            {/* Author row */}
            <View style={cardStyles.authorRow}>
                <TouchableOpacity
                    onPress={() => {
                        if (item.volunteerId) {
                            router.push({
                                pathname: '/screen/volunteer-screens/vol-public-profile',
                                params: { volunteerId: item.volunteerId },
                            } as any)
                        }
                    }}
                    activeOpacity={0.8}
                >
                    {resolveStorageUrl(item.avatarUrl) ? (
                        <Image
                            source={{ uri: resolveStorageUrl(item.avatarUrl)! }}
                            style={cardStyles.avatar}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={cardStyles.avatarFallback}>
                            <Text style={cardStyles.avatarInitials}>{initials}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <View style={cardStyles.authorInfo}>
                    <View style={cardStyles.nameRow}>
                        <TouchableOpacity
                            onPress={() => {
                                if (item.volunteerId) {
                                    router.push({
                                        pathname: '/screen/volunteer-screens/vol-public-profile',
                                        params: { volunteerId: item.volunteerId },
                                    } as any)
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={cardStyles.authorName}>{name}</Text>
                        </TouchableOpacity>
                        <View style={cardStyles.volBadge}>
                            <Text style={cardStyles.volBadgeText}>TNV</Text>
                        </View>
                    </View>
                    {showEventChip && !!item.eventName && (
                        <View style={cardStyles.eventChip}>
                            <Ionicons name="calendar-outline" size={11} color="#42A4F5" />
                            <Text style={cardStyles.eventChipText} numberOfLines={1}>{item.eventName}</Text>
                        </View>
                    )}
                    <Text style={cardStyles.timeText}>{relativeTime(item.createdAt)}</Text>
                </View>
            </View>

            {/* Content */}
            {!!item.momentContent && (
                <Text style={cardStyles.content}>{item.momentContent}</Text>
            )}

            {/* Images */}
            <ImageGrid urls={item.momentPicturesUrls} onPress={handleImagePress} />

            {/* Full-screen viewer */}
            <ImageViewerModal
                visible={viewerVisible}
                images={resolvedUrls}
                initialIndex={viewerIndex}
                onClose={() => setViewerVisible(false)}
            />

            {/* Event name */}
            {!!item.eventName && (
                <View style={cardStyles.eventNameRow}>
                    <Ionicons name="calendar-outline" size={13} color="#42A4F5" />
                    <Text style={cardStyles.eventNameText} numberOfLines={1}>{item.eventName}</Text>
                </View>
            )}

            {/* Location */}
            {!!location && (
                <View style={cardStyles.locationRow}>
                    <Ionicons name="location-outline" size={13} color="#6B7280" />
                    <Text style={cardStyles.locationText} numberOfLines={1}>{location}</Text>
                </View>
            )}
        </View>
    )
}

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 12,
        marginBottom: 10,
        borderRadius: 16,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        marginRight: 10,
    },
    avatarFallback: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarInitials: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    authorInfo: { flex: 1 },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    authorName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    volBadge: {
        backgroundColor: '#EBF5FF',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    volBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#42A4F5',
    },
    timeText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    content: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 21,
        marginTop: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
    },
    locationText: {
        flex: 1,
        fontSize: 12,
        color: '#6B7280',
    },
    eventNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
    },
    eventNameText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#2563EB',
    },
    eventChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F0F7FF',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        marginTop: 2,
        marginBottom: 1,
    },
    eventChipText: {
        fontSize: 11,
        color: '#2563EB',
        fontWeight: '500',
    },
})

// ─── screen ───────────────────────────────────────────────────────────────────

/**
 * Modes:
 *   'event'  — moments for a specific event session (filterd by eventName); shows add-moment button
 *   'public' — all moments from all events (public feed); no add button
 *   'my'     — current volunteer's own moments; no add button
 */
type FeedMode = 'event' | 'public' | 'my'

const EventMomentsFeed = () => {
    const { eventName, sessionId, applicationId, mode: modeParam } = useLocalSearchParams<{
        eventName: string
        sessionId: string
        applicationId: string
        mode: string
    }>()

    const mode: FeedMode = (modeParam as FeedMode) || 'event'
    const showEventChip = mode === 'public' || mode === 'my'
    const showAddBtn = mode === 'event'

    // Header title and accent colour per mode
    const headerTitle = mode === 'my'
        ? 'Khoảnh khắc của tôi'
        : mode === 'public'
            ? 'Khoảnh khắc tình nguyện'
            : 'Khoảnh khắc'
    const accentColor = '#42A4F5'

    const [items, setItems] = useState<EventMomentItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [nextPage, setNextPage] = useState(0)

    const fetchPage = useCallback(async (page: number, append = false) => {
        let moments: EventMomentItem[] = []
        let hasMoreResult = false

        if (mode === 'my') {
            const res = await getMyMomentsFeed({ pageNumber: page, pageSize: PAGE_SIZE })
            moments = res.eventMoments || []
            hasMoreResult = res.hasMore ?? false
        } else {
            // 'event' filters by eventName; 'public' passes no eventName
            const res = await getEventMomentsFeed({
                pageNumber: page,
                pageSize: PAGE_SIZE,
                eventName: mode === 'event' ? (eventName || undefined) : undefined,
            })
            moments = res.eventMoments || []
            hasMoreResult = res.hasMore ?? false
        }

        if (append) setItems(prev => [...prev, ...moments])
        else setItems(moments)
        setHasMore(hasMoreResult)
        setNextPage(page + 1)
    }, [mode, eventName])

    useFocusEffect(
        useCallback(() => {
            let active = true
            ;(async () => {
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
        if (loadingMore || loading || refreshing || !hasMore) return
        setLoadingMore(true)
        try { await fetchPage(nextPage, true) } catch { /* silent */ }
        setLoadingMore(false)
    }, [loadingMore, loading, refreshing, hasMore, nextPage, fetchPage])

    const handleGoBack = () => {
        if (router.canGoBack()) router.back()
        else router.replace('/(vol-tabs)/checkin' as any)
    }

    const handleAddMoment = () => {
        router.push({
            pathname: '/screen/volunteer-screens/add-moment',
            params: { eventName, sessionId, applicationId },
        } as any)
    }

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: accentColor }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: accentColor }]}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{headerTitle}</Text>
                {showAddBtn ? (
                    <TouchableOpacity onPress={handleAddMoment} style={styles.addBtn} activeOpacity={0.85}>
                        <Ionicons name="add" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerBtn} />
                )}
            </View>

            <View style={styles.contentArea}>
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.loadingText}>Đang tải...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={item => item.eventMomentId}
                        renderItem={({ item }) => <MomentCard item={item} showEventChip={showEventChip} />}
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
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons name="images-outline" size={52} color="#42A4F5" />
                                </View>
                                <Text style={styles.emptyTitle}>
                                    {showAddBtn ? 'Hãy là người đầu tiên chia sẻ' : 'Chưa có khoảnh khắc nào'}
                                </Text>
                                <Text style={styles.emptySubText}>
                                    {showAddBtn
                                        ? `Chia sẻ khoảnh khắc tình nguyện của bạn\nđể truyền cảm hứng cho cộng đồng!`
                                        : `Các khoảnh khắc sẽ xuất hiện ở đây\nkhi tình nguyện viên chia sẻ.`}
                                </Text>
                                {showAddBtn && (
                                    <TouchableOpacity
                                        style={styles.emptyAction}
                                        onPress={handleAddMoment}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                                        <Text style={styles.emptyActionText}>Chia sẻ ngay</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    )
}

export default EventMomentsFeed

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#42A4F5' },
    contentArea: { flex: 1, backgroundColor: '#F0F6FF' },

    /* Header */
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
    addBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* List */
    listContent: { paddingTop: 14, paddingBottom: 32 },

    /* Loading/Empty */
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: { fontSize: 14, color: '#6B7280' },

    emptyContainer: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#EBF5FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
    },
    emptyAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 13,
        elevation: 3,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    emptyActionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
})
