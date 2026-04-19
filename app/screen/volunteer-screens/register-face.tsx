/**
 * register-face.tsx
 * Screen for volunteers to register their face biometric data.
 * Called POST /api/v1/vol/volunteers/register-face-id (multipart: file)
 */

import React, { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { registerVolunteerFace } from '@/services/vol-event-service'
import { getApiErrorMessage } from '@/services/api-helpers'

interface FacePhoto {
    uri: string | null
    fileName: string | null
    mimeType: string | null
}

const GUIDELINES = [
    { icon: 'face-man' as const, text: 'Nhìn thẳng vào camera, không nghiêng đầu' },
    { icon: 'glasses' as const, text: 'Tháo kính ra trước khi chụp' },
    { icon: 'weather-sunny' as const, text: 'Đảm bảo ánh sáng đủ và đồng đều' },
    { icon: 'image-filter-center-focus' as const, text: 'Khuôn mặt chiếm ít nhất 70% khung hình' },
    { icon: 'hat-fedora' as const, text: 'Không đội mũ, không che mặt' },
    { icon: 'emoticon-neutral-outline' as const, text: 'Biểu cảm tự nhiên, không nhăn mặt' },
]

export default function RegisterFaceScreen() {
    const [photo, setPhoto] = useState<FacePhoto>({ uri: null, fileName: null, mimeType: null })
    const [uploading, setUploading] = useState(false)

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Thiếu quyền', 'Cần cấp quyền truy cập thư viện ảnh để tiếp tục.')
            return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        })
        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0]
            setPhoto({
                uri: asset.uri,
                fileName: asset.fileName ?? `face_${Date.now()}.jpg`,
                mimeType: asset.mimeType ?? 'image/jpeg',
            })
        }
    }

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Thiếu quyền', 'Cần cấp quyền camera để chụp ảnh.')
            return
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        })
        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0]
            setPhoto({
                uri: asset.uri,
                fileName: asset.fileName ?? `face_${Date.now()}.jpg`,
                mimeType: asset.mimeType ?? 'image/jpeg',
            })
        }
    }

    const handleRemovePhoto = () => {
        setPhoto({ uri: null, fileName: null, mimeType: null })
    }

    const handleSubmit = async () => {
        if (!photo.uri) {
            Alert.alert('Chưa có ảnh', 'Vui lòng chọn hoặc chụp ảnh khuôn mặt trước khi đăng ký.')
            return
        }
        setUploading(true)
        try {
            await registerVolunteerFace({
                uri: photo.uri,
                fileName: photo.fileName ?? 'face.jpg',
                mimeType: photo.mimeType ?? 'image/jpeg',
            })
            Alert.alert(
                'Đăng ký thành công! 🎉',
                'Dữ liệu khuôn mặt của bạn đã được đăng ký. Bạn có thể đăng ký tham gia hoạt động ngay bây giờ.',
                [{ text: 'Tuyệt vời', onPress: () => router.back() }]
            )
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err) || 'Đăng ký thất bại. Vui lòng thử lại.'
            Alert.alert('Lỗi', msg)
        } finally {
            setUploading(false)
        }
    }

    const handleBack = () => {
        if (router.canGoBack()) router.back()
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đăng ký khuôn mặt</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* ── Info banner ── */}
                <View style={styles.infoBanner}>
                    <Ionicons name="shield-checkmark" size={20} color="#42A4F5" />
                    <Text style={styles.infoBannerText}>
                        Dữ liệu khuôn mặt được mã hóa và chỉ dùng để xác thực điểm danh
                    </Text>
                </View>

                {/* ── Photo upload box ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        Ảnh khuôn mặt <Text style={styles.required}>*</Text>
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                        Tải lên hoặc chụp ảnh chân dung rõ nét của bạn
                    </Text>

                    {photo.uri ? (
                        /* Preview */
                        <View style={styles.previewContainer}>
                            <Image
                                source={{ uri: photo.uri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                            {/* Overlay actions */}
                            <View style={styles.previewOverlay}>
                                <TouchableOpacity
                                    style={styles.previewAction}
                                    onPress={handlePickPhoto}
                                    disabled={uploading}
                                >
                                    <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.previewActionText}>Thay đổi</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.previewAction, styles.removeAction]}
                                    onPress={handleRemovePhoto}
                                    disabled={uploading}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.previewActionText}>Xóa</Text>
                                </TouchableOpacity>
                            </View>
                            {/* Success badge */}
                            <View style={styles.successBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                <Text style={styles.successBadgeText}>Đã chọn ảnh</Text>
                            </View>
                        </View>
                    ) : (
                        /* Upload area */
                        <View style={styles.uploadArea}>
                            <View style={styles.uploadIconWrap}>
                                <Ionicons name="person-circle-outline" size={52} color="#42A4F5" />
                            </View>
                            <Text style={styles.uploadAreaTitle}>Thêm ảnh khuôn mặt</Text>
                            <Text style={styles.uploadAreaSub}>PNG, JPG — Tối đa 5 MB</Text>

                            <View style={styles.uploadBtnRow}>
                                <TouchableOpacity
                                    style={styles.uploadBtn}
                                    onPress={handlePickPhoto}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="cloud-upload-outline" size={18} color="#42A4F5" />
                                    <Text style={styles.uploadBtnText}>Thư viện</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.uploadBtn, styles.uploadBtnSolid]}
                                    onPress={handleTakePhoto}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="camera" size={18} color="#FFFFFF" />
                                    <Text style={styles.uploadBtnSolidText}>Chụp ảnh</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>

                {/* ── Guidelines ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Yêu cầu ảnh khuôn mặt</Text>

                    <View style={styles.guidelinesCard}>
                        {GUIDELINES.map((g, i) => (
                            <View key={i} style={[styles.guidelineRow, i < GUIDELINES.length - 1 && styles.guidelineDivider]}>
                                <View style={styles.guidelineIconWrap}>
                                    <MaterialCommunityIcons name={g.icon} size={20} color="#42A4F5" />
                                </View>
                                <Text style={styles.guidelineText}>{g.text}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Example good / bad ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ví dụ về ảnh</Text>
                    <View style={styles.exampleRow}>
                        <View style={styles.exampleItem}>
                            <View style={[styles.exampleBox, styles.exampleGood]}>
                                <Ionicons name="person" size={48} color="#10B981" />
                                <View style={styles.exampleBadge}>
                                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                </View>
                            </View>
                            <Text style={styles.exampleLabel}>✅ Đúng</Text>
                            <Text style={styles.exampleSub}>Mặt rõ, nhìn thẳng,{'\n'}đủ sáng</Text>
                        </View>

                        <View style={styles.exampleItem}>
                            <View style={[styles.exampleBox, styles.exampleBad]}>
                                <MaterialCommunityIcons name="glasses" size={32} color="#EF4444" />
                                <Ionicons name="person" size={40} color="#EF4444" style={{ opacity: 0.5 }} />
                                <View style={[styles.exampleBadge, styles.exampleBadgeBad]}>
                                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                                </View>
                            </View>
                            <Text style={[styles.exampleLabel, { color: '#EF4444' }]}>❌ Sai</Text>
                            <Text style={styles.exampleSub}>Đeo kính, góc nghiêng,{'\n'}thiếu sáng</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Submit button ── */}
            <View style={styles.ctaContainer}>
                <TouchableOpacity
                    style={[styles.submitBtn, (!photo.uri || uploading) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!photo.uri || uploading}
                    activeOpacity={0.85}
                >
                    {uploading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.submitText}>Đăng ký khuôn mặt</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#42A4F5',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* Scroll */
    scroll: {
        flex: 1,
        backgroundColor: '#F0F6FF',
    },
    scrollContent: {
        padding: 16,
    },

    /* Info banner */
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E3F2FD',
        elevation: 1,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#42A4F5',
        fontWeight: '500',
        lineHeight: 18,
    },

    /* Sections */
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    required: {
        color: '#EF4444',
    },

    /* Upload area (empty state) */
    uploadArea: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#BBDEFB',
        paddingVertical: 28,
        paddingHorizontal: 20,
        gap: 6,
    },
    uploadIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    uploadAreaTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    uploadAreaSub: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 8,
    },
    uploadBtnRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        backgroundColor: '#FFFFFF',
    },
    uploadBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#42A4F5',
    },
    uploadBtnSolid: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    uploadBtnSolidText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    /* Preview */
    previewContainer: {
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#42A4F5',
        alignSelf: 'center',
        width: 200,
        height: 200,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    previewAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#42A4F5',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
    },
    previewActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    removeAction: {
        backgroundColor: '#EF4444',
    },
    successBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.92)',
        paddingVertical: 6,
    },
    successBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#065F46',
    },

    /* Guidelines */
    guidelinesCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E3F2FD',
        overflow: 'hidden',
        elevation: 1,
    },
    guidelineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    guidelineDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    guidelineIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    guidelineText: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
    },

    /* Examples */
    exampleRow: {
        flexDirection: 'row',
        gap: 12,
    },
    exampleItem: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    exampleBox: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    exampleGood: {
        backgroundColor: '#D1FAE5',
        borderWidth: 2,
        borderColor: '#10B981',
    },
    exampleBad: {
        backgroundColor: '#FEE2E2',
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    exampleBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
    },
    exampleBadgeBad: {
        // inherits position from exampleBadge
    },
    exampleLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10B981',
    },
    exampleSub: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 16,
    },

    /* CTA */
    ctaContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F0F6FF',
        borderTopWidth: 1,
        borderTopColor: '#E3F2FD',
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
        backgroundColor: '#BDBDBD',
        elevation: 0,
        shadowOpacity: 0,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
})
