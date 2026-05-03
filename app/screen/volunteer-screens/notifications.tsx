/**
 * notifications.tsx
 * Notification centre for the volunteer.
 *
 * Two tabs:
 *   "Của tôi"   → GET /api/v1/notifications/user        (personal)
 *   "Chung"     → GET /api/v1/notifications/user-topics  (topic/broadcast)
 */

import baseAxios from '@/lib/baseAxios'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useFocusEffect } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationItem {
    notificationId: string
    title: string
    body: string
    data: Record<string, string> | null
    createdAt: string
}

interface NotificationPage {
    content: NotificationItem[]
    last: boolean
    totalElements: number
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'
const PAGE_SIZE = 15

// ─── Notification type → icon + colour ───────────────────────────────────────

type NotiStyle = { icon: string; color: string; bg: string }

function resolveStyle(title: string, data: Record<string, string> | null): NotiStyle {
    const type = data?.type ?? ''

    if (type.includes('APPROVED') || type.includes('CERTIFICATE'))
        return { icon: 'checkmark-circle', color: '#059669', bg: '#D1FAE5' }
    if (type.includes('REJECTED') || type.includes('CANCELLED') || type.includes('DELETED'))
        return { icon: 'close-circle', color: '#DC2626', bg: '#FEE2E2' }
    if (type.includes('CLAIM'))
        return { icon: 'document-text', color: '#7C3AED', bg: '#EDE9FE' }
    if (type.includes('CHECK_IN') || type.includes('CHECKIN'))
        return { icon: 'qr-code', color: '#0EA5E9', bg: '#E0F2FE' }
    if (type.includes('ANNOUNCEMENT') || type.includes('SESSION'))
        return { icon: 'megaphone', color: '#F59E0B', bg: '#FEF3C7' }
    if (type.includes('REVIEW') || type.includes('RATED'))
        return { icon: 'star', color: '#F59E0B', bg: '#FEF3C7' }

    return { icon: 'notifications', color: '#42A4F5', bg: '#EBF5FF' }
}

function relativeTime(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'Vừa xong'
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Notification Card ────────────────────────────────────────────────────────

function NotiCard({ item }: { item: NotificationItem }) {
    const style = resolveStyle(item.title, item.data)
    return (
        <View style={cardStyles.card}>
            <View style={[cardStyles.iconWrap, { backgroundColor: style.bg }]}>
                <Ionicons name={style.icon as any} size={22} color={style.color} />
            </View>
            <View style={cardStyles.body}>
                <Text style={cardStyles.title} numberOfLines={2}>{item.title}</Text>
                {!!item.body && (
                    <Text style={cardStyles.bodyText} numberOfLines={3}>{item.body}</Text>
                )}
                <Text style={cardStyles.time}>{relativeTime(item.createdAt)}</Text>
            </View>
        </View>
    )
}

const cardStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14,
        marginBottom: 10,
        borderRadius: 14,
        padding: 14,
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    iconWrap: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    body: { flex: 1, gap: 3 },
    title: { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 },
    bodyText: { fontSize: 13, color: '#4B5563', lineHeight: 19 },
    time: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
})

// ─── Tab Feed ─────────────────────────────────────────────────────────────────

function NotifFeed({ endpoint }: { endpoint: string }) {
    const [items, setItems] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [nextPage, setNextPage] = useState(0)

    const fetchPage = useCallback(async (page: number, append = false) => {
        const res = await baseAxios.get<NotificationPage>(
            `${API_BASE}${endpoint}?pageNumber=${page}&pageSize=${PAGE_SIZE}`
        )
        const data = res.data
        const items = data.content ?? []
        if (append) setItems(prev => [...prev, ...items])
        else setItems(items)
        setHasMore(!data.last)
        setNextPage(page + 1)
    }, [endpoint])

    useFocusEffect(
        useCallback(() => {
            let active = true
                ; (async () => {
                    setLoading(true)
                    try { await fetchPage(0) } catch { if (active) setItems([]) }
                    finally { if (active) setLoading(false) }
                })()
            return () => { active = false }
        }, [fetchPage])
    )

    const handleRefresh = async () => {
        setRefreshing(true)
        try { await fetchPage(0) } catch { /* silent */ }
        finally { setRefreshing(false) }
    }

    const handleLoadMore = async () => {
        if (loadingMore || loading || refreshing || !hasMore) return
        setLoadingMore(true)
        try { await fetchPage(nextPage, true) } catch { /* silent */ }
        finally { setLoadingMore(false) }
    }

    if (loading) {
        return (
            <View style={feedStyles.center}>
                <ActivityIndicator size="large" color="#42A4F5" />
            </View>
        )
    }

    return (
        <FlatList
            style={feedStyles.flatList}
            data={items}
            keyExtractor={item => item.notificationId}
            renderItem={({ item }) => <NotiCard item={item} />}
            contentContainerStyle={feedStyles.list}
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
                loadingMore && hasMore
                    ? <ActivityIndicator style={{ padding: 16 }} size="small" color="#42A4F5" />
                    : null
            }
            ListEmptyComponent={
                <View style={feedStyles.empty}>
                    <View style={feedStyles.emptyIcon}>
                        <Ionicons name="notifications-off-outline" size={48} color="#42A4F5" />
                    </View>
                    <Text style={feedStyles.emptyTitle}>Chưa có thông báo</Text>
                    <Text style={feedStyles.emptySub}>Các thông báo sẽ xuất hiện ở đây.</Text>
                </View>
            }
        />
    )
}

const feedStyles = StyleSheet.create({
    flatList: { flex: 1 },
    list: { paddingTop: 14, paddingBottom: 32, flexGrow: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
    emptyIcon: {
        width: 88, height: 88, borderRadius: 44,
        backgroundColor: '#EBF5FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
    emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
})

// ─── Screen ───────────────────────────────────────────────────────────────────

const TABS = [
    { label: 'Của tôi', endpoint: '/api/v1/notifications/user' },
    { label: 'Chung', endpoint: '/api/v1/notifications/user-topics' },
]

export default function NotificationsScreen() {
    const [activeTab, setActiveTab] = useState(0)

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.canGoBack() ? router.back() : router.replace('/(vol-tabs)/home' as any)}
                    style={styles.headerBtn}
                >
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông báo</Text>
                <View style={styles.headerBtn} />
            </View>

            {/* Tab bar */}
            <View style={styles.tabBar}>
                {TABS.map((tab, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={[styles.tab, activeTab === idx && styles.tabActive]}
                        onPress={() => setActiveTab(idx)}
                        activeOpacity={0.75}
                    >
                        <Text style={[styles.tabLabel, activeTab === idx && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Feed */}
            <View style={styles.content}>
                <NotifFeed key={activeTab} endpoint={TABS[activeTab].endpoint} />
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#42A4F5' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#42A4F5',
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 13,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: '#42A4F5' },
    tabLabel: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    tabLabelActive: { color: '#42A4F5' },

    content: { flex: 1, backgroundColor: '#F3F4F6' },
})
