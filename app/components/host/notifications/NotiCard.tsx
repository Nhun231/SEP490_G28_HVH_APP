import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { NotificationItem } from '@/services/notification-types'

type NotiStyle = { icon: string; color: string; bg: string }

export function resolveNotiStyle(
    title: string,
    data: Record<string, string> | null
): NotiStyle {
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
    if (type.includes('REGISTER') || type.includes('VOLUNTEER'))
        return { icon: 'person-add', color: '#42A4F5', bg: '#EBF5FF' }

    return { icon: 'notifications', color: '#42A4F5', bg: '#EBF5FF' }
}

export function relativeTime(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'Vừa xong'
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`
    return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

interface NotiCardProps {
    item: NotificationItem
}

export default function NotiCard({ item }: NotiCardProps) {
    const style = resolveNotiStyle(item.title, item.data)

    return (
        <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: style.bg }]}>
                <Ionicons name={style.icon as any} size={22} color={style.color} />
            </View>
            <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {!!item.body && (
                    <Text style={styles.bodyText} numberOfLines={3}>{item.body}</Text>
                )}
                <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
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
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    body: {
        flex: 1,
        gap: 3
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        lineHeight: 20
    },
    bodyText: {
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 19
    },
    time: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2
    },
})
