import React, { useState, useEffect } from 'react'
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { requestPasswordReset, updatePassword } from '@/services/login-service'
import { useAuth } from '@/context/AuthContext'

// ─── types ────────────────────────────────────────────────────────────
type Step = 'email' | 'check-email' | 'new-password'

// ─── component ───────────────────────────────────────────────────────
export default function ForgotPassword() {
    const router = useRouter()
    const { isPasswordRecovery, clearPasswordRecovery } = useAuth()

    const [step, setStep] = useState<Step>('email')
    const [loading, setLoading] = useState(false)

    // Step 1
    const [email, setEmail] = useState('')

    // Step 3
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // ── Auto-advance to new-password when deep link returns ───────────
    useEffect(() => {
        if (isPasswordRecovery) {
            setStep('new-password')
        }
    }, [isPasswordRecovery])

    // ── handlers ─────────────────────────────────────────────────────
    const handleSendEmail = async () => {
        if (!email.trim()) {
            Alert.alert('Vui lòng nhập email')
            return
        }
        setLoading(true)
        try {
            await requestPasswordReset(email.trim())
            setStep('check-email')
        } catch (err: unknown) {
            Alert.alert('Lỗi', (err as Error).message || 'Không thể gửi email. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setLoading(true)
        try {
            await requestPasswordReset(email.trim())
            Alert.alert('Đã gửi lại', 'Vui lòng kiểm tra hộp thư của bạn.')
        } catch (err: unknown) {
            Alert.alert('Lỗi', (err as Error).message || 'Không thể gửi lại. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdatePassword = async () => {
        if (newPassword.length < 6) {
            Alert.alert('Mật khẩu phải có ít nhất 6 ký tự')
            return
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại mật khẩu xác nhận.')
            return
        }
        setLoading(true)
        try {
            await updatePassword(newPassword)
            clearPasswordRecovery()
            Alert.alert(
                'Thành công! ',
                'Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.',
                [{ text: 'Đăng nhập', onPress: () => router.replace('/screen/login') }]
            )
        } catch (err: unknown) {
            Alert.alert('Lỗi', (err as Error).message || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    // ── step meta ─────────────────────────────────────────────────────
    const stepMeta = {
        email: {
            icon: 'mail-outline' as const,
            iconColor: '#42A4F5',
            iconBg: '#E3F2FD',
            title: 'Quên mật khẩu?',
            subtitle: 'Nhập email đăng ký của bạn. Chúng tôi sẽ gửi link đặt lại mật khẩu.',
        },
        'check-email': {
            icon: 'paper-plane-outline' as const,
            iconColor: '#0D9488',
            iconBg: '#E0F2F1',
            title: 'Kiểm tra email',
            subtitle: `Chúng tôi đã gửi link đặt lại mật khẩu tới\n${email}\n\nVui lòng mở email và nhấn vào link để tiếp tục.`,
        },
        'new-password': {
            icon: 'lock-closed-outline' as const,
            iconColor: '#7C3AED',
            iconBg: '#EDE9FE',
            title: 'Tạo mật khẩu mới',
            subtitle: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        },
    }

    const stepIndex = { email: 0, 'check-email': 1, 'new-password': 2 }
    const meta = stepMeta[step]
    const currentIndex = stepIndex[step]

    // ── render ────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back button */}
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => {
                            if (step === 'email') router.back()
                            else if (step === 'check-email') setStep('email')
                            // On new-password step the user came via deep link, go to login
                            else router.replace('/screen/login')
                        }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#1F2937" />
                    </TouchableOpacity>

                    {/* Progress dots */}
                    <View style={styles.progressRow}>
                        {[0, 1, 2].map(i => (
                            <View
                                key={i}
                                style={[
                                    styles.progressDot,
                                    i === currentIndex
                                        ? styles.progressDotActive
                                        : i < currentIndex
                                            ? styles.progressDotDone
                                            : styles.progressDotInactive,
                                ]}
                            />
                        ))}
                    </View>

                    <View style={styles.card}>
                        {/* Icon */}
                        <View style={[styles.iconCircle, { backgroundColor: meta.iconBg }]}>
                            <Ionicons name={meta.icon} size={36} color={meta.iconColor} />
                        </View>

                        <Text style={styles.title}>{meta.title}</Text>
                        <Text style={styles.subtitle}>{meta.subtitle}</Text>

                        {/* ── Step 1: Email ── */}
                        {step === 'email' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="email@example.com"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoComplete="email"
                                            textContentType="emailAddress"
                                            returnKeyType="send"
                                            onSubmitEditing={handleSendEmail}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, loading && styles.btnDisabled]}
                                    onPress={handleSendEmail}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Gửi link đặt lại mật khẩu</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.backToLogin} onPress={() => router.back()}>
                                    <Ionicons name="arrow-back-outline" size={15} color="#42A4F5" />
                                    <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── Step 2: Check email ── */}
                        {step === 'check-email' && (
                            <>
                                {/* Tips box */}
                                <View style={styles.tipsBox}>
                                    <View style={styles.tipRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#0D9488" />
                                        <Text style={styles.tipText}>Kiểm tra thư mục Spam / Junk nếu không thấy email</Text>
                                    </View>
                                    <View style={styles.tipRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#0D9488" />
                                        <Text style={styles.tipText}>Link có hiệu lực trong 1 giờ</Text>
                                    </View>
                                    <View style={styles.tipRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#0D9488" />
                                        <Text style={styles.tipText}>Nhấn link trên thiết bị đã cài ứng dụng</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: '#0D9488' }, loading && styles.btnDisabled]}
                                    onPress={handleResend}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Gửi lại email</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.backToLogin} onPress={() => setStep('email')}>
                                    <Ionicons name="create-outline" size={15} color="#42A4F5" />
                                    <Text style={styles.backToLoginText}>Đổi địa chỉ email</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── Step 3: New password (shown after deep link) ── */}
                        {step === 'new-password' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mật khẩu mới</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            placeholder="••••••••"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showNew}
                                            autoCapitalize="none"
                                            textContentType="newPassword"
                                        />
                                        <TouchableOpacity onPress={() => setShowNew(v => !v)}>
                                            <Ionicons
                                                name={showNew ? 'eye-outline' : 'eye-off-outline'}
                                                size={20}
                                                color="#9CA3AF"
                                                style={styles.eyeIcon}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                                    <View style={[
                                        styles.inputWrapper,
                                        confirmPassword && newPassword !== confirmPassword && styles.inputWrapperError,
                                    ]}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            placeholder="••••••••"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showConfirm}
                                            autoCapitalize="none"
                                            textContentType="newPassword"
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                                            <Ionicons
                                                name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                                                size={20}
                                                color="#9CA3AF"
                                                style={styles.eyeIcon}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                    {confirmPassword && newPassword !== confirmPassword && (
                                        <Text style={styles.errorText}>Mật khẩu không khớp</Text>
                                    )}
                                </View>

                                {/* Password strength */}
                                {newPassword.length > 0 && (
                                    <View style={styles.strengthRow}>
                                        {[0, 1, 2, 3].map(i => (
                                            <View
                                                key={i}
                                                style={[
                                                    styles.strengthBar,
                                                    i < Math.min(Math.floor(newPassword.length / 3), 4) && styles.strengthBarFilled,
                                                    i < Math.min(Math.floor(newPassword.length / 3), 4) && (
                                                        newPassword.length >= 12 ? styles.strengthStrong
                                                            : newPassword.length >= 8 ? styles.strengthMedium
                                                                : styles.strengthWeak
                                                    ),
                                                ]}
                                            />
                                        ))}
                                        <Text style={styles.strengthLabel}>
                                            {newPassword.length >= 12 ? 'Mạnh' : newPassword.length >= 8 ? 'Trung bình' : 'Yếu'}
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: '#7C3AED' }, loading && styles.btnDisabled]}
                                    onPress={handleUpdatePassword}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Cập nhật mật khẩu</Text>
                                    }
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

// ─── styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 24,
    },

    /* Back button */
    backBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },

    /* Progress */
    progressRow: {
        flexDirection: 'row',
        gap: 8,
        alignSelf: 'center',
        marginBottom: 24,
    },
    progressDot: {
        height: 6,
        borderRadius: 3,
    },
    progressDotActive: {
        width: 24,
        backgroundColor: '#42A4F5',
    },
    progressDotInactive: {
        width: 10,
        backgroundColor: '#D1D5DB',
    },
    progressDotDone: {
        width: 10,
        backgroundColor: '#0D9488',
    },

    /* Card */
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
        alignItems: 'center',
    },

    /* Icon */
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 28,
    },

    /* Input */
    inputGroup: {
        width: '100%',
        marginBottom: 18,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },
    inputWrapperError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        padding: 0,
    },
    eyeIcon: {
        marginLeft: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 5,
        marginLeft: 4,
    },

    /* Tips box */
    tipsBox: {
        width: '100%',
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1FAE5',
        padding: 16,
        gap: 10,
        marginBottom: 24,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: '#065F46',
        lineHeight: 19,
    },

    /* Primary button */
    primaryBtn: {
        width: '100%',
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        minHeight: 52,
    },
    btnDisabled: {
        opacity: 0.55,
    },
    primaryBtnText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* Back to login */
    backToLogin: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 18,
    },
    backToLoginText: {
        fontSize: 14,
        color: '#42A4F5',
        fontWeight: '500',
    },

    /* Password strength */
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    strengthBar: {
        height: 4,
        width: 36,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
    },
    strengthBarFilled: {
        backgroundColor: '#D1D5DB',
    },
    strengthWeak: {
        backgroundColor: '#EF4444',
    },
    strengthMedium: {
        backgroundColor: '#F59E0B',
    },
    strengthStrong: {
        backgroundColor: '#10B981',
    },
    strengthLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 2,
    },
})
