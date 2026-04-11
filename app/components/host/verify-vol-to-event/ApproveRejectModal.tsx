import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VolunteerApplication } from './VolunteerCard';
import { approveVolunteerApplication, rejectVolunteerApplication } from '@/services/host-event-service';
import { getApiErrorMessage } from '@/services/api-helpers';

// get initials for avatar default
function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

// format relative time from ISO string to Vietnamese
function formatRelativeTime(isoString: string): string {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSecs < 60) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return '1 ngày trước';
    return `${diffDays} ngày trước`;
}

export type ModalAction = 'approve' | 'reject';

export interface ApproveRejectModalProps {
    visible: boolean;
    action: ModalAction;
    volunteer: VolunteerApplication | null;
    onCancel: () => void;
    onConfirm: (rejectReason?: string) => void;
}

const ApproveRejectModal: React.FC<ApproveRejectModalProps> = ({
    visible,
    action,
    volunteer,
    onCancel,
    onConfirm,
}) => {
    const [rejectReason, setRejectReason] = useState('');
    const [loading, setLoading] = useState(false);
    const MAX_CHARS = 300;

    if (!volunteer) return null;

    const isApprove = action === 'approve';
    const accentColor = isApprove ? '#42A4F5' : '#EF4444';
    const iconName = isApprove ? 'checkmark-circle' : 'close-circle';
    const title = isApprove ? 'Xác nhận phê duyệt?' : 'Xác nhận từ chối?';
    const description = isApprove
        ? 'Bạn có chắc chắn muốn phê duyệt tình nguyện viên này tham gia sự kiện không?'
        : 'Bạn có chắc chắn muốn từ chối tình nguyện viên này không?';
    const confirmLabel = isApprove ? 'Xác nhận duyệt' : 'Xác nhận từ chối';
    const totalHours = volunteer.creditScore + volunteer.honorScore;
    const initials = getInitials(volunteer.name);
    const displayAddress = volunteer.address || 'Chưa cập nhật';

    const handleCancel = () => {
        if (loading) return;
        setRejectReason('');
        onCancel();
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            if (isApprove) {
                await approveVolunteerApplication(volunteer.id);
            } else {
                await rejectVolunteerApplication(volunteer.id, rejectReason.trim());
            }
            setRejectReason('');
            onConfirm(isApprove ? undefined : rejectReason.trim());
        } catch (err) {
            Alert.alert(
                'Thao tác thất bại',
                getApiErrorMessage(err),
                [{ text: 'OK' }],
            );
        } finally {
            setLoading(false);
        }
    };

    const isConfirmDisabled = loading || (!isApprove && rejectReason.trim().length === 0);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        {/* Icon */}
                        <View style={[styles.iconCircle, { backgroundColor: isApprove ? '#EFF6FF' : '#FEE2E2' }]}>
                            <Ionicons name={iconName as any} size={32} color={accentColor} />
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.description}>{description}</Text>

                        {/* Volunteer preview */}
                        <View style={styles.previewCard}>
                            {/* Avatar */}
                            <View style={[styles.avatar, { backgroundColor: '#42A4F5' }]}>
                                {volunteer.avatarUrl ? (
                                    <Image source={{ uri: volunteer.avatarUrl }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={styles.avatarText}>{initials}</Text>
                                )}
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.previewName}>{volunteer.name}</Text>
                                <View style={styles.previewRow}>
                                    <Ionicons name="time-outline" size={13} color="#64748B" />
                                    <Text style={styles.previewLabel}>Số giờ tình nguyện: </Text>
                                    <Text style={[styles.previewHours, { color: '#42A4F5' }]}>{totalHours}h</Text>
                                </View>
                                <View style={styles.previewRow}>
                                    <Ionicons name="location-outline" size={13} color="#64748B" />
                                    <Text style={styles.previewAddress} numberOfLines={1}>{displayAddress}</Text>
                                </View>
                                <Text style={styles.previewTime}>
                                    Đăng ký: {formatRelativeTime(volunteer.createdAt)}
                                </Text>
                            </View>
                        </View>

                        {/* Reject reason */}
                        {!isApprove && (
                            <View style={styles.reasonWrapper}>
                                <View style={styles.reasonLabelRow}>
                                    <Ionicons name="chatbox-ellipses-outline" size={15} color='#42A4F5' />
                                    <Text style={styles.reasonLabel}>Lý do từ chối</Text>
                                </View>
                                <View style={[
                                    styles.reasonInputBox,
                                    rejectReason.length > 0 && styles.reasonInputBoxFocused,
                                ]}>
                                    <TextInput
                                        style={styles.reasonInput}
                                        placeholder="Nhập lý do từ chối tình nguyện viên..."
                                        placeholderTextColor="#CBD5E1"
                                        value={rejectReason}
                                        onChangeText={t => t.length <= MAX_CHARS && setRejectReason(t)}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        returnKeyType="default"
                                        autoCorrect={false}
                                    />
                                    <Text style={[
                                        styles.charCount,
                                        rejectReason.length >= MAX_CHARS && styles.charCountMax,
                                    ]}>
                                        {rejectReason.length}/{MAX_CHARS}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Buttons */}
                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={handleCancel}
                                activeOpacity={0.8}
                                disabled={loading}
                            >
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: accentColor }, isConfirmDisabled && styles.confirmBtnDisabled]}
                                onPress={handleConfirm}
                                activeOpacity={0.8}
                                disabled={isConfirmDisabled}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default ApproveRejectModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 12,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 20,
    },

    /* Preview card */
    previewCard: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    previewName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
        gap: 4,
    },
    previewLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    previewHours: {
        fontSize: 12,
        fontWeight: '700',
    },
    previewAddress: {
        fontSize: 12,
        color: '#64748B',
        flex: 1,
    },
    previewTime: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 3,
    },

    /* Reject reason */
    reasonWrapper: {
        width: '100%',
        marginBottom: 20,
    },
    reasonLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    reasonLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    reasonOptional: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
    },
    reasonInputBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 8,
        minHeight: 110,
    },
    reasonInputBoxFocused: {
        borderColor: '#EF4444',
        backgroundColor: '#FFF5F5',
    },
    reasonInput: {
        fontSize: 14,
        color: '#1E293B',
        lineHeight: 20,
        minHeight: 72,
    },
    charCount: {
        fontSize: 11,
        color: '#CBD5E1',
        textAlign: 'right',
        marginTop: 4,
    },
    charCountMax: {
        color: '#EF4444',
        fontWeight: '700',
    },

    /* Buttons */
    btnRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnDisabled: {
        opacity: 0.4,
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
