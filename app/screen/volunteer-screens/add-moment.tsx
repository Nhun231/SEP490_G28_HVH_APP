/**
 * add-moment.tsx
 * Compose screen for sharing a moment.
 *
 * Flow:
 *  1. User writes a caption (up to 500 chars) and picks up to 5 images.
 *  2. On submit, call POST /api/v1/vol/event-moments to get signed upload URLs.
 *  3. Upload each image to its corresponding signed URL.
 *  4. Navigate back to the feed after success.
 *
 * Route params:
 *   eventName     — display string
 *   sessionId     — UUID, required by BE
 *   applicationId — UUID, for display / context
 */

import { getApiErrorMessage } from '@/services/api-helpers'
import { getFileExtension, uploadImageToSupabase } from '@/services/upload-service'
import { shareMoment } from '@/services/moment-service'

// Supabase base URL — moment signed URLs are returned as relative paths
// BE returns "/object/upload/sign/..." (without /storage/v1) — must insert it
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
function resolveUploadUrl(url: string): string {
    if (url.startsWith('http')) return url
    if (url.startsWith('/storage/v1')) return `${SUPABASE_URL}${url}`
    if (url.startsWith('/object/')) return `${SUPABASE_URL}/storage/v1${url}`
    return `${SUPABASE_URL}${url}`
}
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router, useLocalSearchParams } from 'expo-router'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const MAX_IMAGES = 5   // hard limit on the backend (legal_order == 6 break)
const MAX_CHARS = 500

interface PickedImage {
    uri: string
    mimeType: string
    extension: string // e.g. ".jpg" — with leading dot, as required by BE @AllowedFileExtension
}

// ─── image slot ───────────────────────────────────────────────────────────────

function ImageSlot({
    image,
    onAdd,
    onRemove,
    index,
}: {
    image: PickedImage | null
    onAdd: () => void
    onRemove: () => void
    index: number
}) {
    if (image) {
        return (
            <View style={slotStyles.slot}>
                <Image
                    source={{ uri: image.uri }}
                    style={slotStyles.img}
                    contentFit="cover"
                    transition={150}
                />
                <TouchableOpacity style={slotStyles.removeBtn} onPress={onRemove} activeOpacity={0.8}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
            </View>
        )
    }
    return (
        <TouchableOpacity style={slotStyles.empty} onPress={onAdd} activeOpacity={0.7}>
            <Ionicons name="add" size={28} color="#9CA3AF" />
            <Text style={slotStyles.emptyLabel}>Ảnh {index + 1}</Text>
        </TouchableOpacity>
    )
}

const slotStyles = StyleSheet.create({
    slot: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E5E7EB',
        position: 'relative',
    },
    img: { flex: 1 },
    removeBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 11,
    },
    empty: {
        width: '31%',
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#F9FAFB',
    },
    emptyLabel: { fontSize: 11, color: '#9CA3AF' },
})

// ─── main screen ──────────────────────────────────────────────────────────────

const AddMoment = () => {
    const { eventName, sessionId } = useLocalSearchParams<{
        eventName: string
        sessionId: string
        applicationId: string
    }>()

    const [content, setContent] = useState('')
    const [images, setImages] = useState<(PickedImage | null)[]>(
        Array(MAX_IMAGES).fill(null)
    )
    const [submitting, setSubmitting] = useState(false)

    const filledImages = images.filter(Boolean) as PickedImage[]
    const charCount = content.length

    const pickImage = async (index: number) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập thư viện ảnh.')
            return
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: false,
        })
        if (result.canceled || !result.assets.length) return
        const asset = result.assets[0]
        const mimeType = asset.mimeType ?? 'image/jpeg'
        // getFileExtension returns e.g. ".jpg" — but normalize defensively
        let extension = getFileExtension(asset.uri, mimeType)
        if (!extension.startsWith('.')) extension = `.${extension}`
        const updated = [...images]
        updated[index] = { uri: asset.uri, mimeType, extension }
        setImages(updated)
    }

    const removeImage = (index: number) => {
        const updated = [...images]
        updated[index] = null
        setImages(updated)
    }

    const handleSubmit = async () => {
        if (!content.trim()) {
            Alert.alert('Thiếu nội dung', 'Vui lòng nhập nội dung khoảnh khắc.')
            return
        }
        if (filledImages.length === 0) {
            Alert.alert('Thiếu ảnh', 'Vui lòng chọn ít nhất một ảnh.')
            return
        }

        setSubmitting(true)
        try {
            // Build space-separated extension string — each token must start with a dot
            // e.g. ".jpg .png .jpg" as required by BE @AllowedFileExtension
            const extensions = filledImages
                .map(img => img.extension.startsWith('.') ? img.extension : `.${img.extension}`)
                .join(' ')

            console.log('[add-moment] momentPictures →', extensions)

            // Step 1: register the moment, get upload URLs
            const res = await shareMoment({
                eventSessionId: sessionId,
                momentContent: content.trim(),
                momentPictures: extensions,
            })

            const uploadUrls = res.momentPicturesUploadUrls || []

            // Step 2: upload each image to its signed URL
            // The moment BE returns relative paths — resolve to absolute Supabase URLs
            await Promise.all(
                filledImages.map((img, i) => {
                    const signedUrl = resolveUploadUrl(uploadUrls[i] ?? '')
                    if (!uploadUrls[i]) return Promise.resolve()
                    return uploadImageToSupabase(signedUrl, {
                        uri: img.uri,
                        mimeType: img.mimeType,
                    })
                })
            )

            Alert.alert('Đã chia sẻ!', 'Khoảnh khắc của bạn đã được đăng thành công.', [
                {
                    text: 'OK',
                    onPress: () => {
                        if (router.canGoBack()) router.back()
                    },
                },
            ])
        } catch (err) {
            const msg = getApiErrorMessage(err) || 'Không thể chia sẻ khoảnh khắc. Vui lòng thử lại.'
            Alert.alert('Lỗi', msg)
        } finally {
            setSubmitting(false)
        }
    }

    const handleGoBack = () => {
        if (router.canGoBack()) router.back()
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.headerBtn} disabled={submitting}>
                    <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chia sẻ khoảnh khắc</Text>
                {/* Post button */}
                <TouchableOpacity
                    style={[styles.postBtn, submitting && styles.postBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.postBtnText}>Đăng</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Event context pill */}
                <View style={styles.eventPill}>
                    <Ionicons name="calendar-outline" size={14} color="#42A4F5" />
                    <Text style={styles.eventPillText} numberOfLines={1}>
                        {eventName || 'Sự kiện tình nguyện'}
                    </Text>
                </View>

                {/* Text editor */}
                <View style={styles.editorCard}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Chia sẻ cảm xúc và kỷ niệm của bạn về hoạt động hôm nay..."
                        placeholderTextColor="#9CA3AF"
                        value={content}
                        onChangeText={t => setContent(t.slice(0, MAX_CHARS))}
                        multiline
                        textAlignVertical="top"
                        maxLength={MAX_CHARS}
                    />
                    <Text style={[styles.charCount, charCount >= MAX_CHARS && styles.charCountMax]}>
                        {charCount}/{MAX_CHARS}
                    </Text>
                </View>

                {/* Image upload section */}
                <View style={styles.imageSection}>
                    <View style={styles.imageSectionHeader}>
                        <Ionicons name="images-outline" size={18} color="#42A4F5" />
                        <Text style={styles.imageSectionTitle}>
                            Hình ảnh ({filledImages.length}/{MAX_IMAGES})
                        </Text>
                    </View>
                    <Text style={styles.imageSectionHint}>
                        Thêm tối đa {MAX_IMAGES} ảnh để khoảnh khắc thêm sinh động
                    </Text>

                    <View style={styles.imageGrid}>
                        {images.map((img, idx) => (
                            <ImageSlot
                                key={idx}
                                image={img}
                                index={idx}
                                onAdd={() => pickImage(idx)}
                                onRemove={() => removeImage(idx)}
                            />
                        ))}
                    </View>
                </View>

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Ionicons name="information-circle-outline" size={16} color="#42A4F5" />
                    <Text style={styles.tipsText}>
                        Bạn chỉ có thể chia sẻ một khoảnh khắc cho mỗi phiên sự kiện.
                        Hãy chọn những khoảnh khắc ý nghĩa nhất!
                    </Text>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    )
}

export default AddMoment

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#42A4F5' },

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
    postBtn: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 7,
        minWidth: 60,
        alignItems: 'center',
    },
    postBtnDisabled: { opacity: 0.6 },
    postBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* Scroll */
    scroll: { flex: 1, backgroundColor: '#F0F6FF' },
    scrollContent: { padding: 14, gap: 14 },

    /* Event pill */
    eventPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EBF5FF',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    eventPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2563EB',
        maxWidth: 260,
    },

    /* Editor */
    editorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    textInput: {
        fontSize: 15,
        color: '#1F2937',
        minHeight: 140,
        lineHeight: 23,
    },
    charCount: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'right',
        marginTop: 8,
    },
    charCountMax: { color: '#EF4444' },

    /* Images */
    imageSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    imageSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    imageSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    imageSectionHint: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 12,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    /* Tips */
    tipsCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EBF5FF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    tipsText: {
        flex: 1,
        fontSize: 13,
        color: '#1E40AF',
        lineHeight: 20,
    },
})
