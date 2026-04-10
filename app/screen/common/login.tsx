import { signInWithEmail as signInAPI } from '@/services/login-service'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type AccountType = 'volunteer' | 'host'

export default function Auth() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [accountType, setAccountType] = useState<AccountType>('volunteer')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)

    async function signInWithEmail() {
        setLoading(true)
        try {
            const { session } = await signInAPI({ email, password })

            // Decode JWT payload to get the freshest app_metadata claims
            const jwt = session?.access_token
            const payload = jwt
                ? JSON.parse(atob(jwt.split('.')[1]))
                : null
            const role = payload?.app_metadata?.role

            if (role === 'VOL') {
                router.replace('/(vol-tabs)/home')
            } else if (role === 'HOST') {
                router.replace('/(host-tabs)/dashboard' as any)
            } else {
                Alert.alert(
                    'Tài khoản chưa có vai trò',
                    `Role nhận được: "${role}". Vui lòng liên hệ quản trị viên.`
                )
            }
        } catch (error) {
            Alert.alert((error as Error).message)
        }
        setLoading(false)
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        {/* Header */}
                        <Text style={styles.title}>Đăng nhập</Text>
                        <Text style={styles.subtitle}>Chọn loại tài khoản để tiếp tục</Text>

                        {/* Account Type Toggle */}
                        <View style={styles.toggleContainer}>
                            <Pressable
                                style={[
                                    styles.toggleButton,
                                    styles.toggleButtonLeft,
                                    accountType === 'volunteer' && styles.toggleButtonActive
                                ]}
                                onPress={() => setAccountType('volunteer')}
                            >
                                <Ionicons
                                    name="person"
                                    size={20}
                                    color={accountType === 'volunteer' ? '#42A4F5' : '#6B7280'}
                                    style={styles.toggleIcon}
                                />
                                <Text style={[
                                    styles.toggleText,
                                    accountType === 'volunteer' && styles.toggleTextActive
                                ]}>
                                    Tình nguyện viên
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.toggleButton,
                                    styles.toggleButtonRight,
                                    accountType === 'host' && styles.toggleButtonActive
                                ]}
                                onPress={() => setAccountType('host')}
                            >
                                <Ionicons
                                    name="briefcase"
                                    size={20}
                                    color={accountType === 'host' ? '#42A4F5' : '#6B7280'}
                                    style={styles.toggleIcon}
                                />
                                <Text style={[
                                    styles.toggleText,
                                    accountType === 'host' && styles.toggleTextActive
                                ]}>
                                    Người tổ chức
                                </Text>
                            </Pressable>
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    onChangeText={setEmail}
                                    value={email}
                                    placeholder="email@example.com"
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                    textContentType="emailAddress"
                                />
                            </View>
                            <Text style={styles.helperText}>
                                {accountType === 'volunteer' 
                                    ? 'Nhập email của tình nguyện viên' 
                                    : 'Nhập email của người tổ chức'}
                            </Text>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Mật khẩu</Text>
                                <TouchableOpacity onPress={() => router.push('/screen/common/forgot-password' as any)}>
                                    <Text style={styles.forgotPassword}>Quên mật khẩu?</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    onChangeText={setPassword}
                                    value={password}
                                    secureTextEntry={!showPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="none"
                                    autoComplete="password"
                                    textContentType="password"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                                        size={20}
                                        color="#9CA3AF"
                                        style={styles.eyeIcon}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Remember Me */}
                        <TouchableOpacity
                            style={styles.rememberMeContainer}
                            onPress={() => setRememberMe(!rememberMe)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                            <Text style={styles.rememberMeText}>Ghi nhớ đăng nhập</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={signInWithEmail}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.loginButtonText}>
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </Text>
                        </TouchableOpacity>

                        {/* Footer */}
                        {accountType === 'volunteer' ? (
                            <TouchableOpacity onPress={() => router.push('/screen/register')}>
                                <Text style={styles.footerText}>
                                    Chưa có tài khoản?{' '}
                                    <Text style={{ color: '#42A4F5' }}>Đăng ký ngay</Text>
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.footerText}>
                                Chưa có tài khoản? Hãy yêu cầu tài khoản{'\n'}từ người quản lí tổ chức
                            </Text>
                        )
                        }

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 32,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    toggleButtonLeft: {
        marginRight: 2,
    },
    toggleButtonRight: {
        marginLeft: 2,
    },
    toggleButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleIcon: {
        marginRight: 8,
    },
    toggleText: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
    },
    toggleTextActive: {
        color: '#42A4F5',
        fontWeight: '600',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    forgotPassword: {
        fontSize: 14,
        color: '#42A4F5',
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000000',
        padding: 0,
        margin: 0,
    },
    eyeIcon: {
        marginLeft: 8,
    },
    helperText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 6,
        marginLeft: 4,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    rememberMeText: {
        fontSize: 14,
        color: '#6B7280',
    },
    loginButton: {
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    footerText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
})