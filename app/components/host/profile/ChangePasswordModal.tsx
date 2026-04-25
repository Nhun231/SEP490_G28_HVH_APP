import React, { useState, useMemo } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changePassword } from '@/services/profile-service';
import { getApiErrorMessage } from '@/services/api-helpers';

// Matches exactly the allowed set in backend regex:
// [A-Za-z\d!@#$%^&*.,:;']{8,}
const SPECIAL_DISPLAY = "! @ # $ % ^ & * . , : ; '";

type Rule = { label: string; test: (pw: string) => boolean };

const RULES: Rule[] = [
    { label: 'Ít nhất 8 ký tự', test: pw => pw.length >= 8 },
    { label: 'Chứa ít nhất một chữ cái (A–Z hoặc a–z)', test: pw => /[A-Za-z]/.test(pw) },
    { label: 'Chứa chữ số (0–9)', test: pw => /[0-9]/.test(pw) },
    { label: "Chứa ký tự đặc biệt (!@#$%^&*.,:;')", test: pw => /[!@#$%^&*.,:;']/.test(pw) },
    {
        // Password must consist ONLY of allowed chars (mirrors full BE regex character class)
        label: 'Chỉ dùng ký tự được phép',
        test: pw => pw.length > 0 && /^[A-Za-z\d!@#$%^&*.,:;']+$/.test(pw),
    },
];

type Props = {
    visible: boolean;
    onClose: () => void;
};

const ChangePasswordModal: React.FC<Props> = ({ visible, onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const ruleResults = useMemo(() => RULES.map(r => r.test(newPassword)), [newPassword]);
    const allRulesPassed = ruleResults.every(Boolean);
    const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword;
    const canSubmit = allRulesPassed && passwordsMatch;

    const reset = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowOld(false);
        setShowNew(false);
        setShowConfirm(false);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleSubmit = async () => {
        if (!oldPassword.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại.');
            return;
        }
        if (!allRulesPassed) {
            const failed = RULES
                .filter((_, i) => !ruleResults[i])
                .map(r => `• ${r.label}`)
                .join('\n');
            Alert.alert('Mật khẩu không hợp lệ', `Mật khẩu mới chưa đáp ứng:\n${failed}`);
            return;
        }
        if (confirmPassword !== newPassword) {
            Alert.alert('Lỗi', 'Xác nhận mật khẩu không khớp.');
            return;
        }
        if (oldPassword === newPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải khác mật khẩu hiện tại.');
            return;
        }

        setLoading(true);
        try {
            await changePassword({ oldPassword, newPassword });
            Alert.alert('Thành công', 'Mật khẩu đã được cập nhật.', [
                { text: 'OK', onPress: handleClose },
            ]);
        } catch (e: any) {
            Alert.alert('Lỗi', getApiErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.card}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Đổi mật khẩu</Text>
                        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Old password */}
                    <Text style={styles.label}>Mật khẩu hiện tại</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={oldPassword}
                            onChangeText={setOldPassword}
                            placeholder="Nhập mật khẩu hiện tại"
                            placeholderTextColor="#CBD5E1"
                            secureTextEntry={!showOld}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowOld(v => !v)} style={styles.eyeBtn}>
                            <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    {/* New password */}
                    <Text style={styles.label}>Mật khẩu mới</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Nhập mật khẩu mới"
                            placeholderTextColor="#CBD5E1"
                            secureTextEntry={!showNew}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleSubmit}
                        />
                        <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                            <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    {/* Confirm new password */}
                    <Text style={styles.label}>XÁC NHẬN MẬT KHẨU MỚI</Text>
                    <View style={[
                        styles.inputRow,
                        confirmPassword.length > 0 && {
                            borderColor: passwordsMatch ? '#22C55E' : '#EF4444',
                        },
                    ]}>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Nhập lại mật khẩu mới"
                            placeholderTextColor="#CBD5E1"
                            secureTextEntry={!showConfirm}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleSubmit}
                        />
                        <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                        </TouchableOpacity>
                        {confirmPassword.length > 0 && (
                            <Ionicons
                                name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                                size={18}
                                color={passwordsMatch ? '#22C55E' : '#EF4444'}
                                style={{ marginRight: 6 }}
                            />
                        )}
                    </View>

                    {/* Real-time requirement checklist */}
                    <View style={styles.hintBox}>
                        <Text style={styles.hintTitle}>Yêu cầu mật khẩu mới:</Text>
                        {RULES.map((rule, i) => (
                            <View key={i} style={styles.hintRow}>
                                <Ionicons
                                    name={ruleResults[i] ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={14}
                                    color={ruleResults[i] ? '#22C55E' : '#CBD5E1'}
                                />
                                <Text style={[styles.hintText, ruleResults[i] && styles.hintTextMet]}>
                                    {rule.label}
                                </Text>
                            </View>
                        ))}
                        <Text style={styles.hintSpecial}>
                            {'Ký tự đặc biệt được phép: '}{SPECIAL_DISPLAY}
                        </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
                            <Text style={styles.cancelText}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={loading || !canSubmit}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.submitText}>Cập nhật</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default ChangePasswordModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B'
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        marginBottom: 12,
        paddingRight: 4,
    },
    input: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1E293B',
    },
    eyeBtn: { padding: 8 },

    // Hint checklist
    hintBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        marginBottom: 16,
        gap: 5,
    },
    hintTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    hintText: {
        fontSize: 12,
        color: '#94A3B8',
        flex: 1
    },
    hintTextMet: {
        color: '#22C55E'
    },
    hintSpecial: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 6,
        lineHeight: 18,
    },

    // Actions
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B'
    },
    submitBtn: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: '#90CAF9'
    },
    submitText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff'
    },
});
