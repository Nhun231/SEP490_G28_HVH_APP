import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { getUserNotifications } from '@/services/notification-service'
import type { NotificationItem } from '@/services/notification-types'
import NotiCard from './NotiCard'

const PAGE_SIZE = 15

export default function NotifFeed() {
    const [items, setItems] = useState<NotificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [nextPage, setNextPage] = useState(0)

    const fetchPage = useCallback(async (page: number, append = false) => {
        const data = await getUserNotifications(page, PAGE_SIZE)
        const fetched = data.content ?? []
        if (append) setItems(prev => [...prev, ...fetched])
        else setItems(fetched)
        setHasMore(!data.last)
        setNextPage(page + 1)
    }, [])

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
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#42A4F5" />
            </View>
        )
    }

    return (
        <FlatList
            style={styles.flatList}
            data={items}
            keyExtractor={item => item.notificationId}
            renderItem={({ item }) => <NotiCard item={item} />}
            contentContainerStyle={styles.list}
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
                <View style={styles.empty}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="notifications-off-outline" size={48} color="#42A4F5" />
                    </View>
                    <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
                    <Text style={styles.emptySub}>Các thông báo sẽ xuất hiện ở đây.</Text>
                </View>
            }
        />
    )
}

const styles = StyleSheet.create({
    flatList: {
        flex: 1
    },
    list: {
        paddingTop: 14,
        paddingBottom: 32,
        flexGrow: 1
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 32
    },
    emptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#EBF5FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6
    },
    emptySub: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center'
    },
})
