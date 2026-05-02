/**
 * claim-hours.tsx — UC034: Claim Event's Honor Hours (Khiếu nại giờ)
 *
 * Two-phase upload flow:
 *  1. POST /api/v1/vol/event-claims  → BE saves claim, returns signed PUT URLs
 *  2. PUT each evidence image to its signed URL
 *
 * Constraints (from BE ClaimEventHourRequest):
 *  - eventSessionId: UUID (required)
 *  - honorHours: Short > 0, must not exceed session duration
 *  - reason: max 100 chars
 *  - detailReason: max 300 chars
 *  - evidences: space-separated file extensions, max 5 (e.g. "jpg png jpg")
 *  - Claim window: within 7 days after session endDateTime
 */

import { claimEventHour } from '@/services/vol-event-service';
import { getApiErrorMessage } from '@/services/api-helpers';
import { uploadImageToSupabase } from '@/services/upload-service';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
function resolveUploadUrl(url: string): string {
    if (url.startsWith('http')) return url
    if (url.startsWith('/storage/v1')) return `${SUPABASE_URL}${url}`
    if (url.startsWith('/object/')) return `${SUPABASE_URL}/storage/v1${url}`
    return `${SUPABASE_URL}${url}`
}
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_IMAGES = 5;
const MAX_REASON = 100;
const MAX_DETAIL = 300;

interface EvidenceImage {
    uri: string;
    extension: string; 
    mimeType: string;
}

function getExtensionFromUri(uri: string, mimeType?: string | null): string {
    const fromUri = uri.split('.').pop()?.toLowerCase();
    if (fromUri && ['jpg', 'jpeg', 'png'].includes(fromUri)) {
        return fromUri === 'jpeg' ? 'jpg' : fromUri;
    }
    if (mimeType?.includes('png')) return 'png';
    return 'jpg';
}

function getDaysRemaining(sessionEndDateTime: string): number {
    if (!sessionEndDateTime) return 7;
    const end = new Date(sessionEndDateTime);
    const deadline = new Date(end.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function ClaimHours() {
    const {
        applicationId,
        eventSessionId,
        eventName,
        honorHour,
        sessionEndDateTime,
    } = useLocalSearchParams<{
        applicationId: string;
        eventSessionId: string;
        eventName: string;
        honorHour: string;
        sessionEndDateTime: string;
    }>();

    const currentHours = parseInt(honorHour ?? '0', 10);
    const daysRemaining = useMemo(
        () => getDaysRemaining(sessionEndDateTime ?? ''),
        [sessionEndDateTime]
    );
    const isExpired = daysRemaining <= 0;

    // ── Form state ─────────────────────────────────────────────────────────────
    const [hours, setHours] = useState('');
    const [reason, setReason] = useState('');
    const [detail, setDetail] = useState('');
    const [images, setImages] = useState<EvidenceImage[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // ── Image picker ───────────────────────────────────────────────────────────
    const handlePickImage = async () => {
        if (images.length >= MAX_IMAGES) {
            Alert.alert('Tối đa 5 ảnh', 'Bạn chỉ có thể tải lên tối đa 5 ảnh minh chứng.');
            return;
        }
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Lỗi', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: MAX_IMAGES - images.length,
            quality: 0.85,
        });
        if (!result.canceled && result.assets.length > 0) {
    const newImages: EvidenceImage[] = result.assets.map(asset => {
                const mime = asset.mimeType ?? 'image/jpeg'
                const raw = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
                const ext = raw === 'jpeg' ? '.jpg' : `.${raw}`
                return { uri: asset.uri, extension: ext, mimeType: mime };
            });
            setImages(prev => [...prev, ...newImages].slice(0, MAX_IMAGES));
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    // ── Validation ─────────────────────────────────────────────────────────────
    const validate = (): string | null => {
        const h = parseInt(hours, 10);
        if (!hours || isNaN(h) || h <= 0) return 'Vui lòng nhập số giờ yêu cầu bổ sung (> 0).';
        if (!reason.trim()) return 'Vui lòng nhập lý do khiếu nại.';
        if (reason.length > MAX_REASON) return `Lý do không được quá ${MAX_REASON} ký tự.`;
        if (!detail.trim()) return 'Vui lòng nhập giải trình chi tiết.';
        if (detail.length > MAX_DETAIL) return `Giải trình không được quá ${MAX_DETAIL} ký tự.`;
        if (images.length === 0) return 'Vui lòng tải lên ít nhất 1 ảnh minh chứng.';
        return null;
    };

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (isExpired) {
            Alert.alert('Hết hạn', 'Thời hạn khiếu nại đã hết.');
            return;
        }
        const err = validate();
        if (err) {
            Alert.alert('Thiếu thông tin', err);
            return;
        }

        setSubmitting(true);
        try {
            // Phase 1: POST claim → get signed upload URLs
            const evidencesString = images.map(img =>
                img.extension.startsWith('.') ? img.extension : `.${img.extension}`
            ).join(' ');
            const response = await claimEventHour({
                eventSessionId: eventSessionId!,
                honorHours: parseInt(hours, 10),
                reason: reason.trim(),
                detailReason: detail.trim(),
                evidences: evidencesString,
            });

            // Phase 2: upload each evidence to its signed Supabase URL
            await Promise.all(
                response.evidencesUploadUrls.map((url, i) => {
                    const img = images[i];
                    if (!url || !img) return Promise.resolve();
                    const resolvedUrl = resolveUploadUrl(url);
                    return uploadImageToSupabase(resolvedUrl, {
                        uri: img.uri,
                        mimeType: img.mimeType,
                    });
                })
            );

            Alert.alert(
                'Khiếu nại thành công!',
                'Khiếu nại của bạn đã được ghi nhận. Tổ chức sẽ xem xét trong vòng 3–5 ngày.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            Alert.alert('Gửi thất bại', getApiErrorMessage(err) || 'Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Khiếu nại giờ</Text>
                <View style={styles.headerBtn} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Deadline Banner ── */}
                    <View style={[styles.deadlineBanner, isExpired && styles.deadlineBannerExpired]}>
                        <Ionicons
                            name={isExpired ? 'close-circle-outline' : 'time-outline'}
                            size={18}
                            color={isExpired ? '#DC2626' : '#92400E'}
                        />
                        <Text style={[styles.deadlineText, isExpired && styles.deadlineTextExpired]}>
                            {isExpired
                                ? 'Đã hết thời hạn khiếu nại'
                                : `Thời hạn khiếu nại: còn ${daysRemaining} ngày (7 ngày kể từ khi kết thúc ca)`}
                        </Text>
                    </View>

                    {/* ── Event Info Card ── */}
                    <View style={styles.eventCard}>
                        <View style={styles.eventCardContent}>
                            <View style={styles.eventIconBox}>
                                <Ionicons name="calendar" size={22} color="#42A4F5" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.eventName} numberOfLines={2}>
                                    {eventName}
                                </Text>
                                <View style={styles.statsRow}>
                                    <View style={styles.statChip}>
                                        <Ionicons name="time-outline" size={13} color="#42A4F5" />
                                        <Text style={styles.statText}>
                                            Giờ nhận được: <Text style={styles.statBold}>{currentHours}h</Text>
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── Form ── */}
                    <View style={styles.formCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
                            <Text style={styles.sectionTitle}>Thông tin khiếu nại</Text>
                        </View>

                        {/* Hours */}
                        <View style={styles.field}>
                            <Text style={styles.label}>
                                Số giờ yêu cầu bổ sung <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.input, styles.inputFlex]}
                                    value={hours}
                                    onChangeText={t => setHours(t.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    placeholder={`Nhập số giờ (hiện tại: ${currentHours}h)`}
                                    placeholderTextColor="#9CA3AF"
                                    editable={!submitting && !isExpired}
                                />
                                <View style={styles.unitBadge}>
                                    <Text style={styles.unitText}>giờ</Text>
                                </View>
                            </View>
                        </View>

                        {/* Reason */}
                        <View style={styles.field}>
                            <Text style={styles.label}>
                                Lý do khiếu nại <Text style={styles.required}>*</Text>
                                <Text style={styles.charCount}> ({reason.length}/{MAX_REASON})</Text>
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={reason}
                                onChangeText={t => setReason(t.slice(0, MAX_REASON))}
                                placeholder="VD: Giờ ghi nhận chưa đúng với thực tế"
                                placeholderTextColor="#9CA3AF"
                                editable={!submitting && !isExpired}
                            />
                        </View>

                        {/* Detail */}
                        <View style={styles.field}>
                            <Text style={styles.label}>
                                Giải trình chi tiết <Text style={styles.required}>*</Text>
                                <Text style={styles.charCount}> ({detail.length}/{MAX_DETAIL})</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={detail}
                                onChangeText={t => setDetail(t.slice(0, MAX_DETAIL))}
                                placeholder="Mô tả chi tiết lý do khiếu nại…"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                editable={!submitting && !isExpired}
                            />
                        </View>

                        {/* Evidence Images */}
                        <View style={styles.field}>
                            <Text style={styles.label}>
                                Minh chứng <Text style={styles.required}>*</Text>
                                <Text style={styles.charCount}> ({images.length}/{MAX_IMAGES})</Text>
                            </Text>
                            <Text style={styles.helper}>
                                Tải lên ảnh chụp màn hình, ảnh điểm danh hoặc bằng chứng liên quan.
                            </Text>

                            {/* Thumbnails */}
                            {images.length > 0 && (
                                <View style={styles.thumbnailRow}>
                                    {images.map((img, i) => (
                                        <View key={i} style={styles.thumbnailWrap}>
                                            <Image
                                                source={img.uri}
                                                style={styles.thumbnail}
                                                contentFit="cover"
                                            />
                                            <TouchableOpacity
                                                style={styles.removeBtn}
                                                onPress={() => handleRemoveImage(i)}
                                            >
                                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {images.length < MAX_IMAGES && (
                                <TouchableOpacity
                                    style={styles.uploadBtn}
                                    onPress={handlePickImage}
                                    disabled={submitting || isExpired}
                                    activeOpacity={0.75}
                                >
                                    <Ionicons name="cloud-upload-outline" size={18} color="#42A4F5" />
                                    <Text style={styles.uploadBtnText}>
                                        Tải ảnh lên ({images.length}/{MAX_IMAGES})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ── Important Notes ── */}
                    <View style={styles.noteBox}>
                        <Text style={styles.noteTitle}>⚠️ Lưu ý quan trọng</Text>
                        <Text style={styles.noteItem}>• Minh chứng phải rõ ràng và chính xác.</Text>
                        <Text style={styles.noteItem}>• Khiếu nại sai sự thật sẽ bị trừ điểm uy tín.</Text>
                        <Text style={styles.noteItem}>• Tổ chức sẽ xem xét trong vòng 3–5 ngày.</Text>
                        <Text style={styles.noteItem}>• Số giờ yêu cầu không được vượt quá thời lượng thực tế của ca.</Text>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Submit Button ── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitBtn, (submitting || isExpired) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting || isExpired}
                    activeOpacity={0.85}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.submitBtnText}>
                                {isExpired ? 'Hết hạn khiếu nại' : 'Gửi khiếu nại'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },

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

    scroll: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scrollContent: {
        paddingHorizontal: 14,
        paddingTop: 14,
    },

    /* Deadline Banner */
    deadlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FCD34D',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
    },
    deadlineBannerExpired: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FCA5A5',
    },
    deadlineText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#92400E',
        lineHeight: 18,
    },
    deadlineTextExpired: {
        color: '#DC2626',
    },

    /* Event Card */
    eventCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    eventCardContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    eventIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 6,
        lineHeight: 21,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statText: {
        fontSize: 12,
        color: '#374151',
    },
    statBold: {
        fontWeight: '700',
        color: '#1D4ED8',
    },

    /* Form Card */
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
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
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
    },

    /* Fields */
    field: {
        marginBottom: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    required: {
        color: '#EF4444',
    },
    charCount: {
        fontSize: 12,
        fontWeight: '400',
        color: '#9CA3AF',
    },
    helper: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 10,
        lineHeight: 17,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    inputFlex: {
        flex: 1,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111827',
    },
    textArea: {
        minHeight: 100,
        paddingTop: 12,
    },
    unitBadge: {
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    unitText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1D4ED8',
    },

    /* Evidence Images */
    thumbnailRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 10,
    },
    thumbnailWrap: {
        position: 'relative',
        width: 72,
        height: 72,
        borderRadius: 10,
        overflow: 'visible',
    },
    thumbnail: {
        width: 72,
        height: 72,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    removeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        borderStyle: 'dashed',
        borderRadius: 10,
        paddingVertical: 12,
        backgroundColor: '#EFF6FF',
    },
    uploadBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#42A4F5',
    },

    /* Notes */
    noteBox: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    noteTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 8,
    },
    noteItem: {
        fontSize: 12,
        color: '#78350F',
        lineHeight: 20,
    },

    /* Footer */
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        elevation: 8,
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#42A4F5',
        borderRadius: 14,
        paddingVertical: 15,
        elevation: 3,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    submitBtnDisabled: {
        backgroundColor: '#9CA3AF',
        elevation: 0,
        shadowOpacity: 0,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
