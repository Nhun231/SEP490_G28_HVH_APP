import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { reviewVolunteer } from '@/services/host-event-service';
import { getApiErrorMessage } from '@/services/api-helpers';
import StarRow from '@/app/components/host/review-vol/StarRow';

interface RatingCriterion {
    key: string;
    title: string;
    description: string;
}

const CRITERIA: RatingCriterion[] = [
    {
        key: 'attitude',
        title: 'Thái độ & tác phong chuyên nghiệp',
        description: 'Thái độ và tác phong của người tham gia',
    },
    {
        key: 'responsibility',
        title: 'Tinh thần trách nhiệm & đúng giờ',
        description: 'Tinh thần làm việc của người tham gia',
    },
    {
        key: 'efficiency',
        title: 'Hiệu quả công việc',
        description: 'Năng suất công việc của người tham gia',
    },
    {
        key: 'teamwork',
        title: 'Tinh thần làm việc nhóm & giao tiếp',
        description: 'Khả năng làm việc nhóm và giao tiếp của người tham gia',
    },
    {
        key: 'adaptability',
        title: 'Khả năng thích ứng & giải quyết vấn đề',
        description: 'Kỹ năng thích ứng với từng hoàn cảnh và giải quyết vấn đề',
    },
];

const MAX_COMMENT = 250;

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ReviewVolunteers = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        applicationId,
        volunteerName,
        volunteerAvatar,
        volunteerEmail,
        volunteerPhone,
    } = useLocalSearchParams<{
        applicationId?: string;
        volunteerName?: string;
        volunteerAvatar?: string;
        volunteerEmail?: string;
        volunteerPhone?: string;
    }>();

    // Ratings: key → 0-5
    const [ratings, setRatings] = useState<Record<string, number>>(
        Object.fromEntries(CRITERIA.map(c => [c.key, 0])),
    );
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const totalScore = Object.values(ratings).reduce((a, b) => a + b, 0);
    const averageScore = (totalScore / CRITERIA.length).toFixed(1);
    const hasRated = Object.values(ratings).some(v => v > 0);

    const setRating = (key: string, value: number) => {
        setRatings(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!hasRated) {
            Alert.alert('Thông báo', 'Vui lòng đánh giá ít nhất một tiêu chí trước khi gửi.');
            return;
        }
        if (isSubmitting) return;

        Alert.alert(
            'Xác nhận đánh giá',
            'Bạn có chắc chắn muốn gửi đánh giá này? Hành động không thể hoàn tác.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Gửi', style: 'default', onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            await reviewVolunteer({
                                eventApplicationId: applicationId!,
                                professionalAttitudeRating: ratings['attitude'],
                                responsibilityPunctualityRating: ratings['responsibility'],
                                workEffectivenessRating: ratings['efficiency'],
                                teamworkCommunicationRating: ratings['teamwork'],
                                adaptabilityProblemSolvingRating: ratings['adaptability'],
                                comment: comment.trim() || undefined,
                            });
                            Alert.alert('Thành công', 'Đã gửi đánh giá tình nguyện viên thành công', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (e) {
                            Alert.alert('Thông báo', getApiErrorMessage(e) || 'Không thể gửi đánh giá. Vui lòng thử lại.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                },
            ],
        );
    };

    const displayName = volunteerName || 'Tình nguyện viên';
    const initials = getInitials(displayName);

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.root}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Đánh giá tình nguyện viên</Text>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Volunteer info card */}
                    <View style={styles.volunteerCard}>
                        {volunteerAvatar ? (
                            <Image source={{ uri: volunteerAvatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                        )}
                        <View style={styles.volunteerInfo}>
                            <Text style={styles.volunteerName}>{displayName}</Text>
                            {!!volunteerEmail && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="mail-outline" size={13} color="#64748B" />
                                    <Text style={styles.infoText}>{volunteerEmail}</Text>
                                </View>
                            )}
                            {!!volunteerPhone && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="call-outline" size={13} color="#64748B" />
                                    <Text style={styles.infoText}>{volunteerPhone}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Rating section */}
                    <View style={styles.ratingCard}>
                        {/* Section header */}
                        <View style={styles.ratingCardHeader}>
                            <Text style={styles.ratingCardTitle}>Đánh giá chi tiết</Text>
                            <View style={styles.totalBadge}>
                                <Ionicons name="star" size={14} color="#F59E0B" />
                                <Text style={styles.totalBadgeText}>{averageScore}</Text>
                            </View>
                        </View>

                        {/* Criteria */}
                        {CRITERIA.map((criterion, idx) => (
                            <View key={criterion.key} style={[styles.criterionBlock, idx < CRITERIA.length - 1 && styles.criterionDivider]}>
                                <Text style={styles.criterionTitle}>{criterion.title}</Text>
                                <Text style={styles.criterionDesc}>{criterion.description}</Text>
                                <StarRow value={ratings[criterion.key]} onChange={v => setRating(criterion.key, v)} />
                                <View style={styles.scoreRow}>
                                    <Ionicons name="star" size={12} color="#F59E0B" />
                                    <Text style={styles.scoreText}>{ratings[criterion.key]}/5</Text>
                                </View>
                            </View>
                        ))}

                        {/* Comment */}
                        <View style={styles.commentBlock}>
                            <Text style={styles.commentLabel}>Đánh giá chi tiết <Text style={styles.optional}>(Tùy chọn)</Text></Text>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Nhập đánh giá chi tiết của bạn về tình nguyện viên..."
                                placeholderTextColor="#9CA3AF"
                                value={comment}
                                onChangeText={t => setComment(t.slice(0, MAX_COMMENT))}
                                multiline
                                maxLength={MAX_COMMENT}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCounter}>{comment.length}/{MAX_COMMENT}</Text>
                        </View>
                    </View>

                    {/* Guideline banner */}
                    <View style={styles.guidelineBanner}>
                        <Ionicons name="warning-outline" size={18} color="#D97706" style={{ marginTop: 1, flexShrink: 0 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.guidelineTitle}>Hướng dẫn đánh giá</Text>
                            <Text style={styles.guidelineText}>
                                Vui lòng đánh giá tình nguyện viên một cách khách quan dựa trên thái độ làm việc, tinh thần trách nhiệm, kỹ năng và đóng góp thực tế trong hoạt động.
                            </Text>
                        </View>
                    </View>

                    {/* Submit button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, !hasRated && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        activeOpacity={hasRated ? 0.85 : 1}
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? <ActivityIndicator size="small" color="#FFFFFF" />
                            : (
                                <View style={styles.submitBtnInner}>
                                    <Ionicons name="send" size={18} color="#FFFFFF" />
                                    <Text style={styles.submitBtnText}>Gửi đánh giá</Text>
                                </View>
                            )
                        }
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F0F7FF'
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#42A4F5',
        paddingHorizontal: 16,
        paddingBottom: 14,
        marginTop: -14,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        flex: 1
    },

    // Scroll
    scroll: {
        flex: 1
    },
    scrollContent: {
        padding: 16,
        gap: 14
    },

    // Volunteer card
    volunteerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28
    },
    avatarFallback: {
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700'
    },
    volunteerInfo: {
        flex: 1
    },
    volunteerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 2
    },
    infoText: { fontSize: 13, color: '#64748B', flex: 1 },

    // Rating card
    ratingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    ratingCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    ratingCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B'
    },
    totalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    totalBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#D97706'
    },

    // Criterion
    criterionBlock: {
        paddingVertical: 12
    },
    criterionDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    criterionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center'
    },
    criterionDesc: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 2
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 2,
    },
    scoreText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },

    // Comment
    commentBlock: {
        marginTop: 16
    },
    commentLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8
    },
    optional: {
        color: '#9CA3AF',
        fontWeight: '400'
    },
    commentInput: {
        minHeight: 90,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 14,
        color: '#1F2937',
        backgroundColor: '#FAFAFA',
    },
    charCounter: {
        textAlign: 'right',
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4
    },

    // Guideline banner
    guidelineBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FCD34D',
        borderRadius: 12,
        padding: 14,
    },
    guidelineTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#D97706',
        marginBottom: 4
    },
    guidelineText: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 18
    },

    // Submit button
    submitBtn: {
        backgroundColor: '#42A4F5',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnDisabled: {
        backgroundColor: '#93C5FD',
        shadowOpacity: 0
    },
    submitBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
});

export default ReviewVolunteers;
