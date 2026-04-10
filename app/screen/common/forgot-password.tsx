import React, { useState } from 'react'
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
import baseAxios from '@/lib/baseAxios'

// ─── types ────────────────────────────────────────────────────────────
type Step = 'email' | 'otp' | 'done'

// ─── API helpers ──────────────────────────────────────────────────────

/**
 * Step 1 — Request a 6-digit OTP sent to the user's email.
 * POST /api/v1/email-otp/verify-forgot-password?email=...
 */
const requestForgotPasswordOtp = async (email: string): Promise<void> => {
    await baseAxios.post('/api/v1/email-otp/verify-forgot-password', null, {
        params: { email },
    })
}

/**
 * Step 2 — Verify OTP. BE resets password to a random one and emails it.
 * PUT /api/v1/auth/forgot-password
 */
const verifyOtpAndReset = async (email: string, otp: string): Promise<void> => {
    await baseAxios.put('/api/v1/auth/forgot-password', { email, otp })
}

// ─── component ───────────────────────────────────────────────────────
export default function ForgotPassword() {
    const router = useRouter()

    const [step, setStep] = useState<Step>('email')
    const [loading, setLoading] = useState(false)

    // Step 1
    const [email, setEmail] = useState('')

    // Step 2
    const [otp, setOtp] = useState('')

    // Cooldown resend
    const [resendCooldown, setResendCooldown] = useState(0)

    // ── start countdown ───────────────────────────────────────────────
    const startCooldown = (seconds = 60) => {
        setResendCooldown(seconds)
        const timer = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    // ── step 1: send OTP ─────────────────────────────────────────────
    const handleSendOtp = async () => {
        const trimmed = email.trim()
        if (!trimmed) {
            Alert.alert('Vui lòng nhập email')
            return
        }
        setLoading(true)
        try {
            await requestForgotPasswordOtp(trimmed)
            setStep('otp')
            startCooldown(60)
        } catch (err: any) {
            const msg =
                err?.response?.data?.moreInfo?.business ||
                err?.response?.data?.message ||
                (err as Error).message ||
                'Không thể gửi mã OTP. Vui lòng thử lại.'
            Alert.alert('Lỗi', msg)
        } finally {
            setLoading(false)
        }
    }

    // ── step 2: resend OTP ───────────────────────────────────────────
    const handleResendOtp = async () => {
        if (resendCooldown > 0) return
        setLoading(true)
        try {
            await requestForgotPasswordOtp(email.trim())
            startCooldown(60)
            Alert.alert('Đã gửi lại', 'Vui lòng kiểm tra hộp thư của bạn.')
        } catch (err: any) {
            const msg =
                err?.response?.data?.moreInfo?.business ||
                err?.response?.data?.message ||
                (err as Error).message ||
                'Không thể gửi lại. Vui lòng thử lại.'
            Alert.alert('Lỗi', msg)
        } finally {
            setLoading(false)
        }
    }

    // ── step 2: verify OTP ───────────────────────────────────────────
    const handleVerifyOtp = async () => {
        if (otp.trim().length !== 6) {
            Alert.alert('Mã OTP không hợp lệ', 'Vui lòng nhập đúng 6 chữ số.')
            return
        }
        setLoading(true)
        try {
            await verifyOtpAndReset(email.trim(), otp.trim())
            setStep('done')
        } catch (err: any) {
            const msg =
                err?.response?.data?.moreInfo?.business ||
                err?.response?.data?.message ||
                (err as Error).message ||
                'Mã OTP không đúng hoặc đã hết hạn.'
            Alert.alert('Lỗi', msg)
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
            subtitle: 'Nhập email đăng ký của bạn. Chúng tôi sẽ gửi mã OTP 6 chữ số để xác minh.',
        },
        otp: {
            icon: 'keypad-outline' as const,
            iconColor: '#0D9488',
            iconBg: '#E0F2F1',
            title: 'Nhập mã OTP',
            subtitle: `Mã OTP 6 chữ số đã được gửi đến\n${email}\n\nMã có hiệu lực trong 5 phút.`,
        },
        done: {
            icon: 'checkmark-circle-outline' as const,
            iconColor: '#10B981',
            iconBg: '#D1FAE5',
            title: 'Thành công!',
            subtitle: 'Mật khẩu mới đã được gửi vào email của bạn.\nVui lòng đăng nhập với mật khẩu mới.',
        },
    }

    const stepIndex: Record<Step, number> = { email: 0, otp: 1, done: 2 }
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
                            else if (step === 'otp') setStep('email')
                            else router.replace('/screen/common/login')
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
                                            onSubmitEditing={handleSendOtp}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, loading && styles.btnDisabled]}
                                    onPress={handleSendOtp}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Gửi mã OTP</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.backToLogin} onPress={() => router.back()}>
                                    <Ionicons name="arrow-back-outline" size={15} color="#42A4F5" />
                                    <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── Step 2: Enter OTP ── */}
                        {step === 'otp' && (
                            <>
                                {/* Tips box */}
                                <View style={styles.tipsBox}>
                                    <View style={styles.tipRow}>
                                        <Ionicons name="time-outline" size={16} color="#0D9488" />
                                        <Text style={styles.tipText}>Mã có hiệu lực trong 5 phút</Text>
                                    </View>
                                    <View style={styles.tipRow}>
                                        <Ionicons name="alert-circle-outline" size={16} color="#0D9488" />
                                        <Text style={styles.tipText}>Tối đa 3 lần nhập sai — mã sẽ bị hủy nếu vượt quá</Text>
                                    </View>
                                    <View style={styles.tipRow}>
                                        <Ionicons name="checkmark-circle" size={16} color="#0D9488" />
                                        <Text style={styles.tipText}>Kiểm tra thư mục Spam nếu không thấy email</Text>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mã OTP (6 chữ số)</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="keypad-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, styles.otpInput]}
                                            value={otp}
                                            onChangeText={t => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
                                            placeholder="123456"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            returnKeyType="done"
                                            onSubmitEditing={handleVerifyOtp}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: '#0D9488' }, loading && styles.btnDisabled]}
                                    onPress={handleVerifyOtp}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Xác nhận OTP</Text>
                                    }
                                </TouchableOpacity>

                                {/* Resend */}
                                <TouchableOpacity
                                    style={[styles.backToLogin, resendCooldown > 0 && { opacity: 0.5 }]}
                                    onPress={handleResendOtp}
                                    disabled={resendCooldown > 0 || loading}
                                >
                                    <Ionicons name="refresh-outline" size={15} color="#42A4F5" />
                                    <Text style={styles.backToLoginText}>
                                        {resendCooldown > 0
                                            ? `Gửi lại sau ${resendCooldown}s`
                                            : 'Gửi lại mã OTP'
                                        }
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.backToLogin, { marginTop: 4 }]} onPress={() => setStep('email')}>
                                    <Ionicons name="create-outline" size={15} color="#42A4F5" />
                                    <Text style={styles.backToLoginText}>Đổi địa chỉ email</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── Step 3: Done ── */}
                        {step === 'done' && (
                            <>
                                <View style={styles.doneBox}>
                                    <Ionicons name="mail-unread-outline" size={32} color="#10B981" />
                                    <Text style={styles.doneBoxText}>
                                        Mật khẩu mới đã được gửi vào hộp thư{'\n'}
                                        <Text style={styles.doneEmail}>{email}</Text>
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: '#10B981' }]}
                                    onPress={() => router.replace('/screen/common/login')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.primaryBtnText}>Đăng nhập ngay</Text>
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
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        padding: 0,
    },
    otpInput: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 6,
        textAlign: 'center',
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

    /* Done box */
    doneBox: {
        width: '100%',
        backgroundColor: '#F0FDF4',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D1FAE5',
        padding: 20,
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    doneBoxText: {
        fontSize: 14,
        color: '#065F46',
        textAlign: 'center',
        lineHeight: 21,
    },
    doneEmail: {
        fontWeight: '700',
        color: '#047857',
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

    /* Back to login / secondary links */
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
})
