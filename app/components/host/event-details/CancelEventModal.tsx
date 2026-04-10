import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cancelEvent, getApiErrorMessage } from '@/services/event-service';

export interface CancelEventModalProps {
    visible: boolean;
    eventId: string;
    onCancel: () => void;
    onConfirmed: () => void;
}

const MAX_CHARS = 300;

const CancelEventModal: React.FC<CancelEventModalProps> = ({
    visible,
    eventId,
    onCancel,
    onConfirmed,
}) => {
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const isDisabled = loading || reason.trim().length === 0;

    const handleClose = () => {
        if (loading) return;
        setReason('');
        onCancel();
    };

    const handleConfirm = async () => {
        if (isDisabled) return;
        setLoading(true);
        try {
            await cancelEvent(eventId, reason.trim());
            setReason('');
            onConfirmed();
        } catch (err) {
            Alert.alert('Hủy sự kiện thất bại', getApiErrorMessage(err), [{ text: 'OK' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
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
                        <View style={styles.iconCircle}>
                            <Ionicons name="close-circle" size={32} color="#EF4444" />
                        </View>

                        <Text style={styles.title}>Xác nhận hủy sự kiện?</Text>
                        <Text style={styles.description}>Hành động này không thể hoàn tác.</Text>

                        {/* Reason input */}
                        <View style={styles.reasonWrapper}>
                            <View style={styles.reasonLabelRow}>
                                <Ionicons name="chatbox-ellipses-outline" size={15} color="#EF4444" />
                                <Text style={styles.reasonLabel}>Lý do hủy sự kiện</Text>
                                <Text style={styles.required}> *</Text>
                            </View>
                            <View style={[
                                styles.reasonInputBox,
                                reason.length > 0 && styles.reasonInputBoxFocused,
                            ]}>
                                <TextInput
                                    style={styles.reasonInput}
                                    placeholder="Nhập lý do hủy sự kiện..."
                                    placeholderTextColor="#CBD5E1"
                                    value={reason}
                                    onChangeText={t => t.length <= MAX_CHARS && setReason(t)}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    returnKeyType="default"
                                    autoCorrect={false}
                                    editable={!loading}
                                />
                                <Text style={[
                                    styles.charCount,
                                    reason.length >= MAX_CHARS && styles.charCountMax,
                                ]}>
                                    {reason.length}/{MAX_CHARS}
                                </Text>
                            </View>
                        </View>

                        {/* Buttons */}
                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={handleClose}
                                activeOpacity={0.8}
                                disabled={loading}
                            >
                                <Text style={styles.cancelBtnText}>Quay lại</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, isDisabled && styles.confirmBtnDisabled]}
                                onPress={handleConfirm}
                                activeOpacity={0.8}
                                disabled={isDisabled}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Hủy sự kiện</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default CancelEventModal;

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
        backgroundColor: '#FEE2E2',
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
        lineHeight: 22,
        marginBottom: 20,
    },
    eventName: {
        fontWeight: '700',
        color: '#1E293B',
    },
    /* Reason input */
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
    required: {
        fontSize: 14,
        color: '#EF4444',
        fontWeight: '700',
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
        backgroundColor: '#EF4444',
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
