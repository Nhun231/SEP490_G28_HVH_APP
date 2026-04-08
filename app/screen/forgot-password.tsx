import React, { useState, useRef, useEffect } from 'react'
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
import {
    requestPasswordReset,
    verifyResetOtp,
    updatePassword,
} from '@/services/login-service'

// ─── types ────────────────────────────────────────────────────────────
type Step = 'email' | 'otp' | 'new-password'

const OTP_LENGTH = 6

// ─── component ───────────────────────────────────────────────────────
export default function ForgotPassword() {
    const router = useRouter()

    const [step, setStep] = useState<Step>('email')
    const [loading, setLoading] = useState(false)

    // Step 1
    const [email, setEmail] = useState('')

    // Step 2 — OTP digits
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
    const otpRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null))
    const [resendCountdown, setResendCountdown] = useState(0)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Step 3
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    // ── countdown timer ───────────────────────────────────────────────
    const startCountdown = (seconds = 60) => {
        if (countdownRef.current) clearInterval(countdownRef.current)
        setResendCountdown(seconds)
        countdownRef.current = setInterval(() => {
            setResendCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current!)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current) }, [])

    // ── OTP helpers ───────────────────────────────────────────────────
    const handleOtpChange = (value: string, index: number) => {
        const cleaned = value.replace(/\D/g, '').slice(-1)
        const next = [...otp]
        next[index] = cleaned
        setOtp(next)
        if (cleaned && index < OTP_LENGTH - 1) {
            otpRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus()
        }
    }

    const otpValue = otp.join('')

    // ── handlers ─────────────────────────────────────────────────────
    const handleSendEmail = async () => {
        if (!email.trim()) {
            Alert.alert('Vui lòng nhập email')
            return
        }
        setLoading(true)
        try {
            await requestPasswordReset(email.trim())
            setStep('otp')
            startCountdown()
        } catch (err: unknown) {
            Alert.alert('Lỗi', (err as Error).message || 'Không thể gửi email. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (resendCountdown > 0) return
        setLoading(true)
        try {
            await requestPasswordReset(email.trim())
            startCountdown()
            setOtp(Array(OTP_LENGTH).fill(''))
            otpRefs.current[0]?.focus()
        } catch (err: unknown) {
            Alert.alert('Lỗi', (err as Error).message || 'Không thể gửi lại. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOtp = async () => {
        if (otpValue.length < OTP_LENGTH) {
            Alert.alert('Vui lòng nhập đủ mã xác nhận')
            return
        }
        setLoading(true)
        try {
            await verifyResetOtp(email.trim(), otpValue)
            setStep('new-password')
        } catch (err: unknown) {
            Alert.alert('Mã không hợp lệ', (err as Error).message || 'Mã xác nhận sai hoặc đã hết hạn.')
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
            Alert.alert(
                'Thành công! 🎉',
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
            subtitle: 'Nhập email đăng ký của bạn. Chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu.',
        },
        otp: {
            icon: 'shield-checkmark-outline' as const,
            iconColor: '#0D9488',
            iconBg: '#E0F2F1',
            title: 'Nhập mã xác nhận',
            subtitle: `Mã 6 chữ số đã được gửi tới\n${email}`,
        },
        'new-password': {
            icon: 'lock-closed-outline' as const,
            iconColor: '#7C3AED',
            iconBg: '#EDE9FE',
            title: 'Tạo mật khẩu mới',
            subtitle: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        },
    }

    const meta = stepMeta[step]

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
                            else if (step === 'otp') setStep('email')
                            else setStep('otp')
                        }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#1F2937" />
                    </TouchableOpacity>

                    {/* Progress dots */}
                    <View style={styles.progressRow}>
                        {(['email', 'otp', 'new-password'] as Step[]).map((s, i) => (
                            <View
                                key={s}
                                style={[
                                    styles.progressDot,
                                    step === s
                                        ? styles.progressDotActive
                                        : i < (['email', 'otp', 'new-password'] as Step[]).indexOf(step)
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
                                        : <Text style={styles.primaryBtnText}>Gửi mã xác nhận</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.backToLogin} onPress={() => router.back()}>
                                    <Ionicons name="arrow-back-outline" size={15} color="#42A4F5" />
                                    <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── Step 2: OTP ── */}
                        {step === 'otp' && (
                            <>
                                <View style={styles.otpRow}>
                                    {otp.map((digit, i) => (
                                        <TextInput
                                            key={i}
                                            ref={ref => { otpRefs.current[i] = ref }}
                                            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                                            value={digit}
                                            onChangeText={v => handleOtpChange(v, i)}
                                            onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                                            keyboardType="number-pad"
                                            maxLength={1}
                                            textAlign="center"
                                            selectTextOnFocus
                                        />
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, (loading || otpValue.length < OTP_LENGTH) && styles.btnDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={loading || otpValue.length < OTP_LENGTH}
                                    activeOpacity={0.8}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Xác nhận mã</Text>
                                    }
                                </TouchableOpacity>

                                <View style={styles.resendRow}>
                                    <Text style={styles.resendLabel}>Không nhận được mã? </Text>
                                    <TouchableOpacity onPress={handleResend} disabled={resendCountdown > 0 || loading}>
                                        <Text style={[
                                            styles.resendLink,
                                            (resendCountdown > 0 || loading) && styles.resendLinkDisabled,
                                        ]}>
                                            {resendCountdown > 0 ? `Gửi lại (${resendCountdown}s)` : 'Gửi lại'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* ── Step 3: New password ── */}
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

                                {/* Password strength hint */}
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

    /* OTP */
    otpRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    otpBox: {
        width: 46,
        height: 56,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
    },
    otpBoxFilled: {
        borderColor: '#42A4F5',
        backgroundColor: '#EFF8FF',
    },

    /* Resend */
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    resendLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    resendLink: {
        fontSize: 14,
        color: '#42A4F5',
        fontWeight: '600',
    },
    resendLinkDisabled: {
        color: '#9CA3AF',
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
