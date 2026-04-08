import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { getMyEvents, MyEventStatus, MyEventsResponse } from '@/services/event-service';

const { width: W } = Dimensions.get('window');

/* Constants */
const WAVE_COLOR = '#42A4F5';
const HEADER_FLAT_H = 100;   // solid colour block above the wave
const WAVE_AMP = 25;          // amplitude: how far wave rises/dips from baseline
const LOGO_SIZE = 90;
const TOTAL_HEADER_H = HEADER_FLAT_H + WAVE_AMP + LOGO_SIZE / 2;

function buildWavePath(): string {
    const H = HEADER_FLAT_H;
    const A = WAVE_AMP;
    return [
        `M 0 0`,
        `L ${W} 0`,
        `L ${W} ${H + A}`,          // right edge: teal dips LOW
        // Single cubic bezier S-curve from right-low to left-high:
        `C ${W * 0.65} ${H + A} ${W * 0.35} ${H - A} 0 ${H - A}`,
        `Z`,
    ].join(' ');
}

/* Stat types */
type StatKey =
    | 'RECRUITING' | 'UPCOMING' | 'ONGOING'
    | 'ENDED' | 'EDITING' | 'VOLUNTEERS'
    | 'REJECTED_BY_MNG' | 'REJECTED_BY_AD' | 'CANCELLED';

// Map each StatKey → MyEventStatus to fetch.
const STAT_FETCH: Array<[StatKey, MyEventStatus | null]> = [
    ['RECRUITING', 'RECRUITING'],
    ['UPCOMING', 'UPCOMING'],
    ['ONGOING', 'ONGOING'],
    ['ENDED', 'ENDED'],
    ['EDITING', 'EDITING'],
    ['REJECTED_BY_MNG', 'REJECTED_BY_MNG'],
    ['REJECTED_BY_AD', 'REJECTED_BY_AD'],
    ['CANCELLED', 'CANCELLED'],
    // ['VOLUNTEERS', ???]  ← separate API – handled below
];

type StatCounts = Record<StatKey, number | null>;
const INITIAL_COUNTS: StatCounts = {
    RECRUITING: 0, UPCOMING: 0, ONGOING: 0, ENDED: 0,
    EDITING: 0, VOLUNTEERS: null,   // null = pending API
    REJECTED_BY_MNG: 0, REJECTED_BY_AD: 0, CANCELLED: 0,
};

/* Quick-action config */
const QUICK_ACTIONS = [
    {
        key: 'my-events',
        label: 'Sự kiện\ncủa tôi',
        icon: 'calendar' as const,
        color: '#FF6D3F',
        onPress: (router: ReturnType<typeof useRouter>) =>
            router.push('/(host-tabs)/events' as any),
    },
    {
        key: 'create',
        label: 'Tạo sự\nkiện mới',
        icon: 'create' as const,
        color: '#4CAF50',
        onPress: (router: ReturnType<typeof useRouter>) =>
            router.push('/screen/create-event' as any),
    },
    {
        key: 'volunteers',
        label: 'Danh sách\nTNV',
        icon: 'people' as const,
        color: '#00BCD4',
        onPress: async (router: ReturnType<typeof useRouter>) => {
            try {
                const res = await getMyEvents({ pageSize: 1, pageNumber: 0, status: 'ONGOING' });
                if (res.content && res.content.length > 0) {
                    const eventId = res.content[0].id;
                    router.push({
                        pathname: '/screen/event-detail',
                        params: { id: eventId, openSessionModal: 'true' }
                    });
                } else {
                    Alert.alert('Thông báo', 'Không có sự kiện nào đang diễn ra.');
                }
            } catch (err) {
                Alert.alert('Lỗi', 'Không thể lấy thông tin sự kiện.');
            }
        },
    },
    {
        key: 'profile',
        label: 'Cập nhật\nthông tin\ncá nhân',
        icon: 'person-circle' as const,
        color: '#F5A623',
        onPress: () => { /* TODO */ },
    },
];

/* Stat grid */
interface StatCell { key: StatKey; label: string; }
const STAT_GRID: StatCell[][] = [
    [
        { key: 'RECRUITING', label: 'Sự kiện đang tuyển' },
        { key: 'UPCOMING', label: 'Sự kiện sắp diễn ra' },
        { key: 'ONGOING', label: 'Sự kiện đang diễn ra' },
    ],
    [
        { key: 'ENDED', label: 'Sự kiện đã kết thúc' },
        { key: 'EDITING', label: 'Sự kiện đã tạo' },
        { key: 'VOLUNTEERS', label: 'Tình nguyện viên đã\nđược đánh giá' },
    ],
    [
        { key: 'REJECTED_BY_MNG', label: 'Sự kiện bị tổ chức\ntừ chối' },
        { key: 'REJECTED_BY_AD', label: 'Sự kiện bị quản trị\nviên từ chối' },
        { key: 'CANCELLED', label: 'Sự kiện đã hủy' },
    ],
];

const Dashboard = () => {
    const router = useRouter();
    const [counts, setCounts] = useState<StatCounts>(INITIAL_COUNTS);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            setError(null);

            // Extract total count from nested page object
            const getCount = (res: MyEventsResponse): number => res.page.totalElements;

            // Fetch all status counts in parallel (pageSize=1 → minimal bandwidth)
            const results = await Promise.all(
                STAT_FETCH.map(([, status]) =>
                    status
                        ? getMyEvents({ pageSize: 1, pageNumber: 0, status })
                        : Promise.resolve({ content: [], page: { totalElements: 0, totalPages: 0, size: 0, number: 0 } } as MyEventsResponse)
                )
            );

            const newCounts = { ...INITIAL_COUNTS };
            STAT_FETCH.forEach(([key], idx) => {
                newCounts[key] = getCount(results[idx]);
            });
            // VOLUNTEERS stays null until a dedicated API is integrated

            setCounts(newCounts);
        } catch (e) {
            console.log('[Dashboard] fetch error:', e);
            setError('Không thể tải dữ liệu tổng quan');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchStats();
        }, [fetchStats])
    );

    const wavePath = buildWavePath();

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchStats(); }}
                        colors={['#42A4F5']}
                        tintColor="#42A4F5"
                    />
                }
            >
                {/* Wave Header Block */}
                <View style={{ height: TOTAL_HEADER_H }}>

                    {/* SVG: S-curve teal shape fills left-high → right-low */}
                    <Svg
                        width={W}
                        height={HEADER_FLAT_H + WAVE_AMP}
                        style={StyleSheet.absoluteFill}
                    >
                        <Path d={wavePath} fill={WAVE_COLOR} />
                    </Svg>

                    {/* Logo centred horizontally at the S-curve crossover (y = HEADER_FLAT_H) */}
                    <View
                        style={[
                            styles.logoCircle,
                            {
                                position: 'absolute',
                                top: HEADER_FLAT_H - LOGO_SIZE / 2,
                                left: (W - LOGO_SIZE) / 2,
                            },
                        ]}
                    >
                        <Image
                            source={require('@/assets/images/logo.jpg')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* App name */}
                <Text style={styles.appName}>Hà Nội Thiện Nguyện</Text>

                {/* Quick Actions */}
                <View style={styles.quickRow}>
                    {QUICK_ACTIONS.map(action => (
                        <TouchableOpacity
                            key={action.key}
                            style={styles.quickBtn}
                            onPress={() => (action.onPress as any)(router)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.quickIcon, { backgroundColor: action.color }]}>
                                <Ionicons name={action.icon} size={28} color="#FFFFFF" />
                            </View>
                            <Text style={styles.quickLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Stat Grid */}
                {loading && !refreshing ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#42A4F5" />
                        <Text style={styles.loadingText}>Đang tải thống kê...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="cloud-offline-outline" size={40} color="#CBD5E1" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => { setLoading(true); fetchStats(); }}
                        >
                            <Text style={styles.retryBtnText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.statGrid}>
                        {STAT_GRID.map((row, rowIdx) => (
                            <View
                                key={rowIdx}
                                style={[
                                    styles.statRow,
                                    rowIdx < STAT_GRID.length - 1 && styles.statRowBorder,
                                ]}
                            >
                                {row.map((cell, cellIdx) => (
                                    <View
                                        key={cell.key}
                                        style={[
                                            styles.statCell,
                                            cellIdx < row.length - 1 && styles.statCellBorder,
                                        ]}
                                    >
                                        <Text style={styles.statCount}>
                                            {counts[cell.key] === null ? '–' : counts[cell.key]}
                                        </Text>
                                        <Text style={styles.statLabel}>{cell.label}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
    },

    /* Logo */
    logoCircle: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 2.5,
        borderColor: 'rgba(66,164,245,0.15)',
        overflow: 'hidden',
    },
    logoImage: {
        width: LOGO_SIZE - 16,
        height: LOGO_SIZE - 16,
        marginLeft: 4,
    },

    /* App name */
    appName: {
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: -10,
        marginBottom: 24,
    },

    /* Quick Actions */
    quickRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        marginBottom: 20,
    },
    quickBtn: {
        alignItems: 'center',
        width: (W - 16) / 4,
    },
    quickIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    quickLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
        lineHeight: 16,
    },

    /* Divider */
    divider: {
        height: 20,
        backgroundColor: '#F1F5F9',
    },

    /* Stat Grid */
    statGrid: {
        backgroundColor: '#FFFFFF',
    },
    statRow: {
        flexDirection: 'row',
    },
    statRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#E9EEF4',
    },
    statCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 22,
        paddingHorizontal: 6,
    },
    statCellBorder: {
        borderRightWidth: 1,
        borderRightColor: '#E9EEF4',
    },
    statCount: {
        fontSize: 30,
        fontWeight: '900',
        color: '#42A4F5',
        lineHeight: 36,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 15,
        marginTop: 5,
        fontWeight: '500',
    },

    /* Loading / Error */
    loadingBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    loadingText: { fontSize: 14, color: '#94A3B8' },
    errorBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
        gap: 10,
    },
    errorText: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
    retryBtn: {
        marginTop: 4,
        backgroundColor: '#42A4F5',
        paddingHorizontal: 28,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

export default Dashboard;
