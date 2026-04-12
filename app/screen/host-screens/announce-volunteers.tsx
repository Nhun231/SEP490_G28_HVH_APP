import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { announceVolunteers } from '@/services/host-event-service';
import { getApiErrorMessage } from '@/services/api-helpers';

const MAX_TITLE = 100;
const MAX_CONTENT = 1000;

const AnnounceVolunteers = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { eventId } = useLocalSearchParams<{ eventId?: string }>();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);

    const canSend = title.trim().length > 0 && content.trim().length > 0 && !isSending;

    const handleSend = async () => {
        if (!canSend) {
            if (!title.trim()) Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề thông báo');
            else if (!content.trim()) Alert.alert('Thông báo', 'Vui lòng nhập nội dung thông báo');
            return;
        }

        Alert.alert(
            'Xác nhận gửi',
            'Thông báo sẽ được gửi đến tất cả tình nguyện viên đã đăng ký sự kiện này. Bạn có chắc chắn?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Gửi', style: 'default', onPress: async () => {
                        setIsSending(true);
                        try {
                            await announceVolunteers(eventId!, {
                                title: title.trim(),
                                body: content.trim(),
                            });
                            Alert.alert('Thành công', 'Đã gửi thông báo đến tất cả tình nguyện viên', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (e) {
                            Alert.alert('Thông báo', getApiErrorMessage(e) || 'Không thể gửi thông báo. Vui lòng thử lại.');
                        } finally {
                            setIsSending(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.safeArea}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.headerTitle}>Gửi thông báo</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>Soạn tiêu đề và nội dung thông báo phía dưới</Text>
                    </View>
                </View>

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Info banner */}
                        <View style={styles.infoBanner}>
                            <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" style={{ marginTop: 1 }} />
                            <Text style={styles.infoBannerText}>
                                Thông báo sẽ được gửi đến tất cả tình nguyện viên đã đăng ký và đã được phê duyệt trong sự kiện này
                            </Text>
                        </View>

                        {/* Title input card */}
                        <View style={styles.card}>
                            <View style={styles.fieldHeader}>
                                <Text style={styles.fieldLabel}>Tiêu đề thông báo <Text style={styles.required}>*</Text></Text>
                            </View>
                            <TextInput
                                style={styles.titleInput}
                                placeholder="Nhập tiêu đề thông báo..."
                                placeholderTextColor="#9CA3AF"
                                value={title}
                                onChangeText={t => setTitle(t.slice(0, MAX_TITLE))}
                                maxLength={MAX_TITLE}
                                returnKeyType="next"
                            />
                            <Text style={styles.charCounter}>{title.length}/{MAX_TITLE} ký tự</Text>
                        </View>

                        {/* Content textarea card */}
                        <View style={styles.card}>
                            <View style={styles.fieldHeader}>
                                <Text style={styles.fieldLabel}>Nội dung thông báo <Text style={styles.required}>*</Text></Text>
                            </View>
                            <TextInput
                                style={styles.contentInput}
                                placeholder="Nhập nội dung thông báo cho tình nguyện viên..."
                                placeholderTextColor="#9CA3AF"
                                value={content}
                                onChangeText={t => setContent(t.slice(0, MAX_CONTENT))}
                                multiline
                                maxLength={MAX_CONTENT}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCounter}>{content.length}/{MAX_CONTENT} ký tự</Text>
                        </View>

                        {/* Send button */}
                        <TouchableOpacity
                            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            activeOpacity={canSend ? 0.8 : 1}
                            disabled={isSending}
                        >
                            {isSending
                                ? <ActivityIndicator size="small" color="#FFFFFF" />
                                : (
                                    <View style={styles.sendBtnInner}>
                                        <Ionicons name="send" size={18} color="#FFFFFF" />
                                        <Text style={styles.sendBtnText}>Gửi thông báo</Text>
                                    </View>
                                )
                            }
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    safeArea: {
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
        paddingVertical: 14,
        marginTop: -16
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextWrap: {
        flex: 1
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 1
    },

    // Scroll
    scroll: {
        flex: 1
    },
    scrollContent: {
        padding: 16,
        gap: 14,
        paddingBottom: 40
    },

    // Info banner
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 10,
        padding: 12,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#1D4ED8',
        lineHeight: 18
    },

    // Card
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937'
    },
    required: {
        color: '#EF4444'
    },

    // Title input
    titleInput: {
        height: 46,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        color: '#1F2937',
        backgroundColor: '#FAFAFA',
    },

    // Content textarea
    contentInput: {
        minHeight: 180,
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

    // Char counter
    charCounter: {
        textAlign: 'right',
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 6
    },

    // Send button
    sendBtn: {
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
    sendBtnDisabled: {
        backgroundColor: '#93C5FD',
        shadowOpacity: 0
    },
    sendBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    sendBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
});

export default AnnounceVolunteers;
