import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { resolveSupabaseUrl } from '@/services/api-helpers';
import { getVolunteerPublicInfo, getVolunteerReviews, VolunteerPublicInfo, VolunteerReview } from '@/services/profile-service';
import CertViewer from './CertViewer';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.80;

const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const CRITERIA: { key: keyof VolunteerReview; label: string }[] = [
    { key: 'professionalAttitudeRating', label: 'Thái độ chuyên nghiệp' },
    { key: 'responsibilityPunctualityRating', label: 'Trách nhiệm & đúng giờ' },
    { key: 'workEffectivenessRating', label: 'Hiệu quả công việc' },
    { key: 'teamworkCommunicationRating', label: 'Làm việc nhóm' },
    { key: 'adaptabilityProblemSolvingRating', label: 'Linh hoạt & xử lý vấn đề' },
];

function StarRating({ rating }: { rating: number }) {
    const filled = Math.floor(rating);
    const hasHalf = rating - filled >= 0.5;
    return (
        <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Ionicons
                    key={i}
                    name={i <= filled ? 'star' : i === filled + 1 && hasHalf ? 'star-half' : 'star-outline'}
                    size={16}
                    color="#F59E0B"
                />
            ))}
        </View>
    );
}

interface VolunteerProfileModalProps {
    visible: boolean;
    volunteerId: string | null | undefined;
    onClose: () => void;
}

export default function VolunteerProfileModal({
    visible,
    volunteerId,
    onClose,
}: VolunteerProfileModalProps) {
    const [profile, setProfile] = useState<VolunteerPublicInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [certViewerOpen, setCertViewerOpen] = useState(false);
    const [certStartIdx, setCertStartIdx] = useState(0);

    // Reviews
    const [reviews, setReviews] = useState<VolunteerReview[]>([]);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [reviewsPage, setReviewsPage] = useState(0);
    const [hasMoreReviews, setHasMoreReviews] = useState(false);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);

    const load = useCallback(async () => {
        if (!volunteerId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getVolunteerPublicInfo(volunteerId);
            setProfile(data);
        } catch {
            setError('Không thể tải thông tin tình nguyện viên.');
        } finally {
            setLoading(false);
        }
    }, [volunteerId]);

    const loadReviews = useCallback(async (page = 0) => {
        if (!volunteerId) return;
        page === 0 ? setReviewsLoading(true) : setLoadingMoreReviews(true);
        try {
            const data = await getVolunteerReviews(volunteerId, page, 5);
            setReviews(prev => page === 0 ? data.content : [...prev, ...data.content]);
            setReviewsTotal(data.page.totalElements);
            setReviewsPage(page);
            setHasMoreReviews(page + 1 < data.page.totalPages);
        } catch {
            // silently ignore — profile still usable
        } finally {
            page === 0 ? setReviewsLoading(false) : setLoadingMoreReviews(false);
        }
    }, [volunteerId]);

    // Reset and fetch whenever the modal opens with a (possibly new) volunteerId
    useEffect(() => {
        if (visible && volunteerId) {
            setProfile(null);
            setError(null);
            setReviews([]);
            setReviewsTotal(0);
            setHasMoreReviews(false);
            load();
            loadReviews(0);
        }
    }, [visible, volunteerId]);


    const avatarUrl = resolveSupabaseUrl(profile?.avatarUrl ?? null);
    const displayName = profile?.fullName || 'Tình nguyện viên';
    const initials = (() => {
        const n = profile?.fullName || displayName;
        const words = n.trim().split(/\s+/);
        return words.length >= 2
            ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
            : n.slice(0, 2).toUpperCase();
    })();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Tappable backdrop — tap to close */}
                <Pressable style={styles.backdrop} onPress={onClose} />

                {/* Bottom sheet */}
                <View style={styles.sheet}>
                    {/* ── Content ── */}
                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#42A4F5" />
                            <Text style={styles.loadingText}>Đang tải...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.center}>
                            <Ionicons name="alert-circle-outline" size={52} color="#EF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={load}>
                                <Text style={styles.retryText}>Thử lại</Text>
                            </TouchableOpacity>
                        </View>
                    ) : profile ? (
                        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                            {/* ── Hero Section ── */}
                            <View style={styles.hero}>
                                <View style={styles.heroBg} />

                                {/* Close button — top-right corner of hero */}
                                <TouchableOpacity
                                    style={styles.heroCloseBtn}
                                    onPress={onClose}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="close" size={20} color="#FFFFFF" />
                                </TouchableOpacity>

                                <View style={styles.heroContent}>
                                    {/* Avatar */}
                                    <View style={styles.avatarRing}>
                                        {avatarUrl ? (
                                            <Image
                                                source={{ uri: avatarUrl }}
                                                style={styles.avatar}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View style={styles.avatarFallback}>
                                                <Text style={styles.avatarInitials}>{initials}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Name + verified */}
                                    <View style={styles.nameRow}>
                                        <Text style={styles.name}>{displayName}</Text>
                                    </View>
                                    {profile.nickname && profile.fullName !== profile.nickname && (
                                        <Text style={styles.fullName}>{profile.nickname}</Text>
                                    )}

                                    {/* Bio */}
                                    {!!profile.bio && (
                                        <Text style={styles.bio}>{profile.bio}</Text>
                                    )}
                                </View>
                            </View>

                            {/* ── Stats Row ── */}
                            <View style={styles.statsCard}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{profile.activityCount}</Text>
                                    <Text style={styles.statLabel}>Hoạt động</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{profile.creditScore}</Text>
                                    <Text style={styles.statLabel}>Điểm uy tín</Text>
                                </View>
                                {profile.avgRating != null && (
                                    <>
                                        <View style={styles.statDivider} />
                                        <View style={styles.statItem}>
                                            <Text style={styles.statValue}>
                                                {Number(profile.avgRating).toFixed(1)}
                                            </Text>
                                            <StarRating rating={Number(profile.avgRating)} />
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* ── Certificates ── */}
                            {profile.certificatesUrls && profile.certificatesUrls.length > 0 ? (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="ribbon-outline" size={18} color="#F59E0B" />
                                        <Text style={styles.sectionTitle}>Chứng chỉ</Text>
                                        <Text style={styles.certCount}>
                                            {profile.certificatesUrls.length} chứng chỉ
                                        </Text>
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.certScroll}
                                    >
                                        {profile.certificatesUrls.map((url, i) => (
                                            <Pressable
                                                key={i}
                                                style={styles.certThumb}
                                                onPress={() => {
                                                    setCertStartIdx(i);
                                                    setCertViewerOpen(true);
                                                }}
                                            >
                                                <Image
                                                    source={{ uri: resolveSupabaseUrl(url) ?? url }}
                                                    style={styles.certImg}
                                                    contentFit="cover"
                                                    transition={200}
                                                />
                                                <View style={styles.certOverlay}>
                                                    <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
                                                </View>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="ribbon-outline" size={18} color="#9CA3AF" />
                                        <Text style={[styles.sectionTitle, { color: '#9CA3AF' }]}>
                                            Chứng chỉ
                                        </Text>
                                    </View>
                                    <Text style={styles.noCert}>Chưa có chứng chỉ</Text>
                                </View>
                            )}

                            {/* ── Reviews ── */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="star" size={17} color="#F59E0B" />
                                    <Text style={styles.sectionTitle}>Đánh giá</Text>
                                    {reviewsTotal > 0 && (
                                        <Text style={styles.certCount}>{reviewsTotal} đánh giá</Text>
                                    )}
                                </View>

                                {reviewsLoading ? (
                                    <ActivityIndicator size="small" color="#42A4F5" style={{ marginVertical: 12 }} />
                                ) : reviews.length === 0 ? (
                                    <Text style={styles.noCert}>Chưa có đánh giá nào</Text>
                                ) : (
                                    <>
                                        {reviews.map((review, idx) => (
                                            <View
                                                key={review.id}
                                                style={[
                                                    styles.reviewCard,
                                                    idx < reviews.length - 1 && styles.reviewCardDivider,
                                                ]}
                                            >
                                                <Text style={styles.reviewEventName} numberOfLines={2}>
                                                    {review.eventName}
                                                </Text>
                                                <Text style={styles.reviewDate}>
                                                    {fmtDate(review.sessionStartDateTime)}
                                                </Text>

                                                <View style={styles.reviewRatingRow}>
                                                    <StarRating rating={review.avgRating} />
                                                    <Text style={styles.reviewAvgScore}>
                                                        {Number(review.avgRating).toFixed(1)}
                                                    </Text>
                                                </View>

                                                <View style={styles.criteriaGrid}>
                                                    {CRITERIA.map(({ key, label }) => (
                                                        <View key={key} style={styles.criteriaRow}>
                                                            <Text style={styles.criteriaLabel} numberOfLines={1}>{label}</Text>
                                                            <View style={{ flexDirection: 'row', gap: 2 }}>
                                                                {[1, 2, 3, 4, 5].map(i => (
                                                                    <Ionicons
                                                                        key={i}
                                                                        name={i <= (review[key] as number) ? 'star' : 'star-outline'}
                                                                        size={11}
                                                                        color="#F59E0B"
                                                                    />
                                                                ))}
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>

                                                {!!review.comment && (
                                                    <Text style={styles.reviewComment}>“{review.comment}”</Text>
                                                )}
                                            </View>
                                        ))}

                                        {hasMoreReviews && (
                                            <TouchableOpacity
                                                style={styles.loadMoreBtn}
                                                onPress={() => loadReviews(reviewsPage + 1)}
                                                disabled={loadingMoreReviews}
                                            >
                                                {loadingMoreReviews
                                                    ? <ActivityIndicator size="small" color="#42A4F5" />
                                                    : <Text style={styles.loadMoreText}>Xem thêm đánh giá</Text>
                                                }
                                            </TouchableOpacity>
                                        )}
                                    </>
                                )}
                            </View>

                            <View style={{ height: 40 }} />

                        </ScrollView>
                    ) : null}
                </View>

                {/* Certificate full-screen viewer — outside sheet so it overlays full screen */}
                {profile && (
                    <CertViewer
                        urls={profile.certificatesUrls}
                        startIndex={certStartIdx}
                        visible={certViewerOpen}
                        onClose={() => setCertViewerOpen(false)}
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    /* Bottom sheet overlay */
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    sheet: {
        backgroundColor: '#F3F4F6',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: SHEET_HEIGHT,     // fixed height so flex:1 children expand correctly
        overflow: 'hidden',
    },
    dragIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 2,
    },

    /* Close button row */
    closeRow: {
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#F3F4F6',
    },
    closeBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },

    scroll: {
        flex: 1,
        backgroundColor: '#F3F4F6'
    },

    /* Loading / Error */
    center: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280'
    },
    errorText: {
        fontSize: 15,
        color: '#EF4444',
        textAlign: 'center',
        paddingHorizontal: 32,
    },
    retryBtn: {
        backgroundColor: '#42A4F5',
        borderRadius: 10,
        paddingHorizontal: 24,
        paddingVertical: 10,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },

    /* Hero */
    hero: {
        backgroundColor: '#FFFFFF',
        marginBottom: 12,
        overflow: 'hidden'
    },
    heroBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: '#42A4F5',
    },
    heroCloseBtn: {
        position: 'absolute',
        top: 10,
        right: 12,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroContent: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    avatarRing: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        backgroundColor: '#E3F2FD',
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        marginBottom: 12,
    },
    avatar: {
        width: '100%',
        height: '100%'
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2
    },
    name: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827'
    },
    fullName: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 6
    },
    bio: {
        fontSize: 14,
        color: '#374151',
        textAlign: 'center',
        lineHeight: 21,
        marginTop: 6,
    },

    /* Stats */
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14,
        marginBottom: 12,
        borderRadius: 16,
        padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827'
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center'
    },

    /* Section */
    section: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 14,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        flex: 1
    },
    certCount: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500'
    },
    certScroll: {
        gap: 10,
        paddingBottom: 4
    },
    certThumb: {
        width: 130,
        height: 90,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
    },
    certImg: {
        width: '100%',
        height: '100%'
    },
    certOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: 6,
    },
    noCert: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingVertical: 8
    },

    /* Reviews */
    reviewCard: {
        paddingVertical: 12,
    },
    reviewCardDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    reviewEventName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    reviewDate: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 6,
    },
    reviewRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    reviewAvgScore: {
        fontSize: 14,
        fontWeight: '800',
        color: '#F59E0B',
    },
    criteriaGrid: {
        gap: 4,
        marginBottom: 6,
    },
    criteriaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    criteriaLabel: {
        fontSize: 11,
        color: '#6B7280',
        flex: 1,
        marginRight: 8,
    },
    reviewComment: {
        fontSize: 12,
        color: '#374151',
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 18,
    },
    loadMoreBtn: {
        alignItems: 'center',
        paddingVertical: 10,
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    loadMoreText: {
        fontSize: 13,
        color: '#42A4F5',
        fontWeight: '600',
    },
});
