import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';


const TEAL = '#42A4F5';
const ORANGE_START = '#F7941D';
const ORANGE_END = '#F9C74F';


interface RatingData {
    averageRating: number;
    totalReviews: number;
    registered: number;
    checkedIn: number;
    checkInRate: number; // 0-100
    distribution: { stars: number; count: number }[]; // 5 -> 1
    momentsShared: number;
}

const MOCK: RatingData = {
    averageRating: 4.7,
    totalReviews: 98,
    registered: 120,
    checkedIn: 115,
    checkInRate: 96,
    distribution: [
        { stars: 5, count: 65 },
        { stars: 4, count: 28 },
        { stars: 3, count: 5 },
        { stars: 2, count: 0 },
        { stars: 1, count: 0 },
    ],
    momentsShared: 45,
};


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_MAX_WIDTH = SCREEN_WIDTH - 32 - 16 * 2 - 60; // chart bar area width

function StarRow({ count }: { count: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                    key={i}
                    name={i < Math.floor(count) ? 'star' : i < count ? 'star-half' : 'star-outline'}
                    size={22}
                    color="#F9C74F"
                />
            ))}
        </View>
    );
}


const BAR_HEIGHT = 22;
const CHART_INNER_WIDTH = SCREEN_WIDTH - 80; // available for bars inside the card
const MAX_CHART_VALUE = 80;

function BarChart({ distribution }: { distribution: RatingData['distribution'] }) {
    // Sort descending stars for chart (5,4,3,2,1) — already provided this way
    const reversed = [...distribution].sort((a, b) => a.stars - b.stars); // 1->5 for chart (1 on top as in image)
    const maxVal = Math.max(...distribution.map(d => d.count), 1);

    return (
        <View style={styles.chartContainer}>
            {reversed.map(({ stars, count }) => {
                const barWidth = (count / maxVal) * (CHART_INNER_WIDTH * 0.55);
                return (
                    <View key={stars} style={styles.chartRow}>
                        <View style={styles.chartStarLabel}>
                            <Text style={styles.chartStarText}>{stars}</Text>
                            <Ionicons name="star" size={12} color="#F9C74F" />
                        </View>
                        <View style={styles.chartBarBg}>
                            {count > 0 && (
                                <View
                                    style={[
                                        styles.chartBar,
                                        { width: Math.max(barWidth, 6) },
                                    ]}
                                />
                            )}
                            {count === 0 && (
                                <View style={[styles.chartBar, { width: 4, opacity: 0.3 }]} />
                            )}
                        </View>
                    </View>
                );
            })}
            {/* X-axis labels */}
            <View style={styles.chartXAxis}>
                {[0, 20, 40, 60, 80].map(val => (
                    <Text key={val} style={styles.chartXLabel}>{val}</Text>
                ))}
            </View>
        </View>
    );
}


function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
    const pct = total > 0 ? count / total : 0;
    return (
        <View style={styles.ratingBarRow}>
            <Text style={styles.ratingBarStar}>{stars}</Text>
            <Ionicons name="star" size={14} color="#F9C74F" />
            <View style={styles.ratingBarBg}>
                <View style={[styles.ratingBarFill, { width: `${pct * 100}%` as any }]} />
            </View>
            <Text style={styles.ratingBarCount}>{count}</Text>
        </View>
    );
}


function SummaryRow({
    label,
    value,
    valueColor,
}: {
    label: string;
    value: string;
    valueColor: string;
}) {
    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={[styles.summaryValue, { color: valueColor }]}>{value}</Text>
        </View>
    );
}


const EventRatingScreen = () => {
    const router = useRouter();
    const data = MOCK;

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Đánh giá sự kiện</Text>
                    <View style={{ width: 38 }} />
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Average Rating Card ── */}
                    <LinearGradient
                        colors={[ORANGE_START, ORANGE_END]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.ratingCard}
                    >
                        <Ionicons name="ribbon-outline" size={28} color="rgba(255,255,255,0.9)" style={{ marginBottom: 4 }} />
                        <Text style={styles.ratingLabel}>Đánh giá trung bình</Text>
                        <Text style={styles.ratingNumber}>{data.averageRating.toFixed(1)}</Text>
                        <StarRow count={data.averageRating} />
                        <Text style={styles.ratingSubLabel}>Từ {data.totalReviews} đánh giá</Text>
                    </LinearGradient>

                    {/* ── Participation Stats ── */}
                    <View style={styles.card}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="people-outline" size={18} color={TEAL} />
                            <Text style={styles.sectionTitle}>Thống kê tham gia</Text>
                        </View>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: TEAL }]}>{data.registered}</Text>
                                <Text style={styles.statLabel}>Đăng ký</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: TEAL }]}>{data.checkedIn}</Text>
                                <Text style={styles.statLabel}>Check-in</Text>
                            </View>
                            <View style={[styles.statBox, styles.statBoxHighlight]}>
                                <Text style={[styles.statValue, { color: '#3B5BDB' }]}>{data.checkInRate}%</Text>
                                <Text style={styles.statLabel}>Tỷ lệ</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Bar Chart ── */}
                    <View style={styles.card}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="trending-up-outline" size={18} color={TEAL} />
                            <Text style={styles.sectionTitle}>Biểu đồ đánh giá</Text>
                        </View>
                        {data.distribution.map(({ stars, count }) => (
                            <RatingBar
                                key={stars}
                                stars={stars}
                                count={count}
                                total={data.totalReviews}
                            />
                        ))}
                    </View>

                    {/* ── Overview ── */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Tổng quan</Text>
                        <SummaryRow
                            label="Moments được chia sẻ"
                            value={String(data.momentsShared)}
                            valueColor="#7C3AED"
                        />
                        <View style={styles.divider} />
                        <SummaryRow
                            label="Tỷ lệ tham gia"
                            value={`${data.checkInRate}%`}
                            valueColor="#3B5BDB"
                        />
                        <View style={styles.divider} />
                        <SummaryRow
                            label="Tổng số đánh giá"
                            value={String(data.totalReviews)}
                            valueColor={ORANGE_START}
                        />
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
    scrollContent: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24 },

    // Rating card (gradient)
    ratingCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: ORANGE_START,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    ratingLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    ratingNumber: {
        color: '#fff',
        fontSize: 56,
        fontWeight: '900',
        lineHeight: 66,
    },
    ratingSubLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        marginTop: 8,
    },

    // White card
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },

    // Participation stats
    statsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        gap: 4,
    },
    statBoxHighlight: {
        backgroundColor: '#EEF2FF',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
    },

    // Bar chart
    chartContainer: {
        marginTop: 4,
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    chartStarLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 30,
        gap: 2,
        justifyContent: 'flex-end',
    },
    chartStarText: {
        fontSize: 12,
        color: '#374151',
    },
    chartBarBg: {
        flex: 1,
        height: BAR_HEIGHT,
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    chartBar: {
        height: BAR_HEIGHT,
        backgroundColor: TEAL,
        borderRadius: 6,
    },
    chartXAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        paddingLeft: 38,
    },
    chartXLabel: {
        fontSize: 10,
        color: '#94A3B8',
    },

    // Rating bars
    ratingBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    ratingBarStar: {
        fontSize: 14,
        color: '#374151',
        width: 14,
        textAlign: 'right',
    },
    ratingBarBg: {
        flex: 1,
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    ratingBarFill: {
        height: 8,
        backgroundColor: TEAL,
        borderRadius: 4,
    },
    ratingBarCount: {
        fontSize: 13,
        color: '#374151',
        width: 24,
        textAlign: 'right',
        fontWeight: '600',
    },

    // Summary
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#374151',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
});

export default EventRatingScreen;
