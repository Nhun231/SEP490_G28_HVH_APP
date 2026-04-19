import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';


const TEAL = '#42A4F5';


interface MomentDetail {
    id: string;
    userName: string;
    userRole: string; // e.g. "Trẻ em", "Tình nguyện viên"
    avatarUrl?: string;
    daysAgo: number;
    caption: string;
    imageUrl: string;
    eventName: string;
    eventCategory: string; // e.g. "sự kiện tình nguyện"
}


const MOCK_DETAIL: MomentDetail = {
    id: 'm1',
    userName: 'Nguyễn Thị Mai',
    userRole: 'Trẻ em',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    daysAgo: 1112,
    caption:
        'Hôm nay nhóm mình đã tổ chức hoạt động phát quà cho trẻ em vùng cao. Các em rất vui và hạnh phúc. Cảm ơn mọi người đã đồng hành cùng chúng mình! 💙',
    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600',
    eventName: 'Dọn dẹp bãi biển Vũng Tàu',
    eventCategory: 'sự kiện tình nguyện',
};


const { width: SCREEN_WIDTH } = Dimensions.get('window');

function daysAgoLabel(days: number): string {
    if (days < 1) return 'Hôm nay';
    if (days === 1) return '1 ngày trước';
    return `${days} ngày trước`;
}


const EventMomentDetailScreen = () => {
    const router = useRouter();
    const { momentId } = useLocalSearchParams<{ momentId?: string }>();

    // In real usage, fetch by momentId. Using mock for now.
    const detail: MomentDetail = MOCK_DETAIL;

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chi tiết khoảnh khắc</Text>
                    <View style={{ width: 38 }} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Post Card ── */}
                    <View style={styles.card}>
                        {/* User row */}
                        <View style={styles.userRow}>
                            {/* Avatar */}
                            {detail.avatarUrl ? (
                                <Image
                                    source={{ uri: detail.avatarUrl }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={[styles.avatar, styles.avatarFallback]}>
                                    <Ionicons name="person" size={20} color="#fff" />
                                </View>
                            )}

                            {/* Name + meta */}
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{detail.userName}</Text>
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaText}>{daysAgoLabel(detail.daysAgo)}</Text>
                                    <Text style={styles.metaDot}>•</Text>
                                    <Text style={[styles.metaText, styles.rolePill]}>
                                        {detail.userRole}
                                    </Text>
                                </View>
                            </View>

                            {/* More options */}
                            <TouchableOpacity activeOpacity={0.7} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                                <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Caption */}
                        <Text style={styles.caption}>{detail.caption}</Text>

                        {/* Full-width image */}
                        <Image
                            source={{ uri: detail.imageUrl }}
                            style={styles.momentImage}
                            resizeMode="cover"
                        />

                        {/* Event info row */}
                        <View style={styles.eventInfoRow}>
                            <Ionicons name="time-outline" size={16} color="#64748B" />
                            <Text style={styles.eventInfoText}>
                                <Text style={{ color: '#374151' }}>Sự kiện: </Text>
                                {detail.eventName}
                            </Text>
                        </View>

                        {/* Share banner */}
                        <View style={styles.shareBanner}>
                            <Ionicons name="information-circle-outline" size={16} color={TEAL} />
                            <Text style={styles.shareBannerText}>
                                Khoảnh khắc được chia sẻ từ {detail.eventCategory}
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 32 }} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
};


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: TEAL },

    // Header
    header: {
        backgroundColor: TEAL,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        marginTop: -8,
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    scroll: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollContent: { padding: 16 },

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },

    // User row
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 10,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#E2E8F0',
    },
    avatarFallback: {
        backgroundColor: '#94A3B8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfo: {
        flex: 1,
        gap: 3,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 12,
        color: '#64748B',
    },
    metaDot: {
        fontSize: 12,
        color: '#CBD5E1',
    },
    rolePill: {
        color: TEAL,
        fontWeight: '600',
    },

    // Caption
    caption: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
        paddingHorizontal: 14,
        paddingBottom: 12,
    },

    // Full-width image
    momentImage: {
        width: '100%',
        height: SCREEN_WIDTH - 32, // square-ish
        backgroundColor: '#E2E8F0',
    },

    // Event info
    eventInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    eventInfoText: {
        fontSize: 13,
        color: '#64748B',
        flex: 1,
    },

    // Share banner
    shareBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E6F7F7',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#CCEEEE',
    },
    shareBannerText: {
        fontSize: 13,
        color: TEAL,
        fontWeight: '500',
        flex: 1,
    },
});

export default EventMomentDetailScreen;
