import React, { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { rateEvent } from '@/services/vol-event-service'
import { getApiErrorMessage } from '@/services/api-helpers'

// ─── Rating categories ──────────────────────────────────────────────────────
interface RatingCategory {
    key: keyof RatingValues
    label: string
    description: string
    icon: string
}

const RATING_CATEGORIES: RatingCategory[] = [
    {
        key: 'organizationQualityRating',
        label: 'Chất lượng tổ chức',
        description: 'Mức độ chuyên nghiệp trong khâu tổ chức, điều phối',
        icon: 'business-outline',
    },
    {
        key: 'professionalismRating',
        label: 'Tính chuyên nghiệp',
        description: 'Thái độ và năng lực của ban tổ chức',
        icon: 'ribbon-outline',
    },
    {
        key: 'workEnvironmentRating',
        label: 'Môi trường hoạt động',
        description: 'Điều kiện làm việc và hỗ trợ trang thiết bị',
        icon: 'construct-outline',
    },
    {
        key: 'valueImpactRating',
        label: 'Giá trị & Tác động',
        description: 'Mức độ đóng góp thực tế cho cộng đồng',
        icon: 'heart-outline',
    },
    {
        key: 'supportConnectionRating',
        label: 'Hỗ trợ & Kết nối',
        description: 'Sự hỗ trợ từ ban tổ chức trong suốt hoạt động',
        icon: 'people-outline',
    },
]

interface RatingValues {
    organizationQualityRating: number
    professionalismRating: number
    workEnvironmentRating: number
    valueImpactRating: number
    supportConnectionRating: number
}

const INITIAL_RATINGS: RatingValues = {
    organizationQualityRating: 0,
    professionalismRating: 0,
    workEnvironmentRating: 0,
    valueImpactRating: 0,
    supportConnectionRating: 0,
}

// ─── Star row component ──────────────────────────────────────────────────────
interface StarRowProps {
    value: number
    onChange: (v: number) => void
}

function StarRow({ value, onChange }: StarRowProps) {
    return (
        <View style={starStyles.row}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
                    <Ionicons
                        name={value >= star ? 'star' : 'star-outline'}
                        size={32}
                        color={value >= star ? '#F59E0B' : '#D1D5DB'}
                    />
                </TouchableOpacity>
            ))}
        </View>
    )
}

const starStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 10,
    },
})

// ─── Rating category card ────────────────────────────────────────────────────
interface CategoryCardProps {
    category: RatingCategory
    value: number
    onChange: (v: number) => void
}

const STAR_LABELS = ['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Xuất sắc']

function CategoryCard({ category, value, onChange }: CategoryCardProps) {
    return (
        <View style={cardStyles.card}>
            <View style={cardStyles.headerRow}>
                <View style={cardStyles.iconWrap}>
                    <Ionicons name={category.icon as any} size={20} color="#42A4F5" />
                </View>
                <View style={cardStyles.textGroup}>
                    <Text style={cardStyles.label}>{category.label}</Text>
                    <Text style={cardStyles.description} numberOfLines={2}>
                        {category.description}
                    </Text>
                </View>
            </View>
            <View style={cardStyles.starSection}>
                <StarRow value={value} onChange={onChange} />
                {value > 0 && (
                    <Text style={cardStyles.starLabel}>{STAR_LABELS[value]}</Text>
                )}
            </View>
        </View>
    )
}

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    textGroup: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 3,
    },
    description: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 17,
    },
    starSection: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    starLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F59E0B',
        marginTop: 10,
    },
})

// ─── Average stars display ────────────────────────────────────────────────────
function AvgStars({ avg }: { avg: number }) {
    const filled = Math.round(avg)
    return (
        <View style={{ flexDirection: 'row', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                    key={s}
                    name={filled >= s ? 'star' : 'star-outline'}
                    size={18}
                    color={filled >= s ? '#F59E0B' : '#D1D5DB'}
                />
            ))}
        </View>
    )
}

// ─── Main screen ─────────────────────────────────────────────────────────────
const RatingEventScreen = () => {
    const params = useLocalSearchParams<{
        applicationId: string
        eventName?: string
        /** If 'true', came from checkout flow — show special success overlay */
        fromCheckout?: string
    }>()

    const [ratings, setRatings] = useState<RatingValues>({ ...INITIAL_RATINGS })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const allFilled = Object.values(ratings).every((v) => v > 0)
    const avg = allFilled
        ? Object.values(ratings).reduce((a, b) => a + b, 0) / 5
        : 0

    const setRating = (key: keyof RatingValues) => (v: number) => {
        setRatings((prev) => ({ ...prev, [key]: v }))
    }

    const handleSubmit = async () => {
        if (!allFilled) {
            Alert.alert('Chưa đủ đánh giá', 'Vui lòng đánh giá tất cả 5 tiêu chí trước khi gửi.')
            return
        }
        setSubmitting(true)
        try {
            await rateEvent({
                eventApplicationId: params.applicationId,
                organizationQualityRating: ratings.organizationQualityRating,
                professionalismRating: ratings.professionalismRating,
                workEnvironmentRating: ratings.workEnvironmentRating,
                valueImpactRating: ratings.valueImpactRating,
                supportConnectionRating: ratings.supportConnectionRating,
            })
            setSubmitted(true)
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err) || 'Không thể gửi đánh giá. Vui lòng thử lại.'
            Alert.alert('Lỗi', msg)
        } finally {
            setSubmitting(false)
        }
    }

    const handleGoHome = () => {
        if (params.fromCheckout === 'true') {
            router.replace('/(vol-tabs)/checkin' as any)
        } else {
            if (router.canGoBack()) router.back()
            else router.replace('/(vol-tabs)/home' as any)
        }
    }

    // ── Success state ─────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.successScreen}>
                    <View style={styles.successTop}>
                        <View style={styles.successIconWrap}>
                            <Ionicons name="star" size={60} color="#FFFFFF" />
                        </View>
                        <Text style={styles.successTitle}>Cảm ơn bạn!</Text>
                        <Text style={styles.successSub}>
                            Đánh giá của bạn giúp chúng tôi cải thiện chất lượng hoạt động tình nguyện
                        </Text>
                    </View>

                    <View style={styles.successCard}>
                        <Text style={styles.successCardLabel}>Điểm đánh giá trung bình</Text>
                        <Text style={styles.successAvg}>{avg.toFixed(1)}</Text>
                        <AvgStars avg={avg} />
                        {params.eventName ? (
                            <Text style={styles.successEventName} numberOfLines={2}>
                                {params.eventName}
                            </Text>
                        ) : null}
                    </View>

                    <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome}>
                        <Ionicons
                            name={params.fromCheckout === 'true' ? 'home-outline' : 'arrow-back-outline'}
                            size={18}
                            color="#42A4F5"
                        />
                        <Text style={styles.homeBtnText}>
                            {params.fromCheckout === 'true' ? 'Về trang điểm danh' : 'Quay lại'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    // ── Form state ────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBack} onPress={handleGoHome}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Đánh giá hoạt động</Text>
                    {params.eventName ? (
                        <Text style={styles.headerSub} numberOfLines={1}>
                            {params.eventName}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.headerBack} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress hint */}
                <View style={styles.progressBox}>
                    <Ionicons name="information-circle-outline" size={16} color="#42A4F5" />
                    <Text style={styles.progressText}>
                        {allFilled
                            ? `Điểm trung bình: ${avg.toFixed(1)} / 5.0 ★`
                            : `Đã đánh giá ${Object.values(ratings).filter((v) => v > 0).length}/5 tiêu chí`}
                    </Text>
                </View>

                {/* Rating categories */}
                {RATING_CATEGORIES.map((cat) => (
                    <CategoryCard
                        key={cat.key}
                        category={cat}
                        value={ratings[cat.key]}
                        onChange={setRating(cat.key)}
                    />
                ))}

                {/* Note */}
                <View style={styles.noteBox}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.noteText}>
                        Bạn có thể đánh giá trong vòng 7 ngày kể từ ngày kết thúc hoạt động.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Submit button */}
            <View style={styles.submitContainer}>
                <TouchableOpacity
                    style={[styles.submitBtn, !allFilled && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting || !allFilled}
                    activeOpacity={0.85}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="star" size={20} color="#FFFFFF" />
                            <Text style={styles.submitText}>Gửi đánh giá</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipBtn} onPress={handleGoHome}>
                    <Text style={styles.skipText}>Bỏ qua</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F6FF',
    },

    /* Header */
    header: {
        backgroundColor: '#42A4F5',
        paddingTop: 56,
        paddingBottom: 20,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBack: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    headerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        maxWidth: 220,
        textAlign: 'center',
    },

    /* Scroll */
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    /* Progress box */
    progressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    progressText: {
        fontSize: 13,
        color: '#42A4F5',
        fontWeight: '600',
        flex: 1,
    },

    /* Note */
    noteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginTop: 4,
    },
    noteText: {
        fontSize: 12,
        color: '#6B7280',
        lineHeight: 17,
        flex: 1,
    },

    /* Submit */
    submitContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 28,
        borderTopWidth: 1,
        borderTopColor: '#E3F2FD',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        gap: 10,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#42A4F5',
        borderRadius: 14,
        paddingVertical: 16,
        elevation: 4,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    submitBtnDisabled: {
        backgroundColor: '#93C5FD',
        elevation: 0,
        shadowOpacity: 0,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    skipBtn: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    skipText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '600',
    },

    /* Success */
    successScreen: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#F0F6FF',
    },
    successTop: {
        width: '100%',
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    successIconWrap: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    successSub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        lineHeight: 19,
    },
    successCard: {
        width: '88%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginTop: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    successCardLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 8,
    },
    successAvg: {
        fontSize: 48,
        fontWeight: '800',
        color: '#F59E0B',
        letterSpacing: -1,
        marginBottom: 6,
    },
    successEventName: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 10,
    },
    homeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        elevation: 2,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    homeBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#42A4F5',
    },
})

export default RatingEventScreen
