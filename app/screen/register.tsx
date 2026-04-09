import { completeRegistration, sendOtp } from '@/services/register-service'
import { getFileExtension, getMimeType } from '@/services/upload-service'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DocumentUploadBox, { DocumentUpload } from '../components/register-vol/DocumentUploadBox'

const OTP_RESEND_COOLDOWN_SECONDS = 60

export default function Register() {
    // Form fields
    const [citizenId, setCitizenId] = useState('')
    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')

    // OTP state
    const [otpSent, setOtpSent] = useState(false)
    const [otpLoading, setOtpLoading] = useState(false)
    const [otpTimer, setOtpTimer] = useState(0)

    // Registration state
    const [loading, setLoading] = useState(false)
    const [imageVerification, setImageVerification] = useState(false)

    // Document uploads
    const [frontIdCard, setFrontIdCard] = useState<DocumentUpload>({ uri: null, fileName: null, mimeType: null })
    const [backIdCard, setBackIdCard] = useState<DocumentUpload>({ uri: null, fileName: null, mimeType: null })
    const [selfieWithId, setSelfieWithId] = useState<DocumentUpload>({ uri: null, fileName: null, mimeType: null })

    // Upload progress
    const [uploadProgress, setUploadProgress] = useState<{
        front: number
        back: number
        holding: number
    }>({ front: 0, back: 0, holding: 0 })

    // OTP Timer countdown
    useEffect(() => {
        if (otpTimer > 0) {
            const interval = setInterval(() => {
                setOtpTimer((prev) => prev - 1)
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [otpTimer])

    const pickImage = async (setDocument: React.Dispatch<React.SetStateAction<DocumentUpload>>) => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()

            if (permissionResult.granted === false) {
                Alert.alert('Lỗi', 'Vui lòng cấp quyền truy cập thư viện ảnh.')
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
            })

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0]
                const uri = asset.uri

                // Get filename from URI or use default
                const fileName = uri.split('/').pop() || `image_${Date.now()}.jpg`
                let extension = '.jpg'
                let mimeType = 'image/jpeg'

                try {
                    const match = fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/)
                    if (match) {
                        extension = match[0]
                        mimeType = getMimeType(extension)
                    } else {
                        // If no extension in filename, try to detect from MIME type in asset
                        if (asset.mimeType) {
                            mimeType = asset.mimeType
                            if (mimeType.includes('png')) {
                                extension = '.png'
                            } else {
                                extension = '.jpg'
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Could not detect file extension, using default .jpg', err)
                }

                const docData = { uri, fileName, mimeType }
                setDocument(docData)

                Alert.alert('Thành công', 'Đã tải ảnh lên.')
            }
        } catch (error) {
            Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể chọn ảnh.')
        }
    }

    const handleSendOtp = async () => {
        if (!email) {
            Alert.alert('Lỗi', 'Vui lòng nhập email.')
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            Alert.alert('Lỗi', 'Email không hợp lệ.')
            return
        }

        setOtpLoading(true)
        try {
            await sendOtp({ email })
            setOtpSent(true)
            setOtpTimer(OTP_RESEND_COOLDOWN_SECONDS)
            Alert.alert('Thành công', 'Mã OTP đã được gửi đến email.')
        } catch (error) {
            Alert.alert('Lỗi', (error as Error).message)
        } finally {
            setOtpLoading(false)
        }
    }

    const handleRegister = async () => {
        // Validation
        if (!citizenId || !fullName || !phone || !email || !otp) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.')
            return
        }

        if (!/^\d{12}$/.test(citizenId)) {
            Alert.alert('Lỗi', 'Số CCCD phải có đủ 12 số.')
            return
        }

        // Validate fullName: each word starts with uppercase, no digits/special chars
        if (!/^[A-ZÀ-Ỹ][a-zà-ỹ]*(?:\s[A-ZÀ-Ỹ][a-zà-ỹ]*)*$/.test(fullName)) {
            Alert.alert('Lỗi', 'Họ tên không hợp lệ. Vui lòng viết hoa chữ cái đầu mỗi từ.')
            return
        }

        if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phone)) {
            Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.')
            return
        }

        if (!/^\d{6}$/.test(otp)) {
            Alert.alert('Lỗi', 'Mã OTP phải có đủ 6 số.')
            return
        }

        if (!frontIdCard.uri || !backIdCard.uri || !selfieWithId.uri) {
            Alert.alert('Lỗi', 'Vui lòng tải lên đầy đủ hình ảnh.')
            return
        }

        if (!imageVerification) {
            Alert.alert('Lỗi', 'Vui lòng đồng ý với Điều khoản sử dụng.')
            return
        }

        try {
            setLoading(true)
            setUploadProgress({ front: 0, back: 0, holding: 0 })

            const cidFrontFileExtension = getFileExtension(frontIdCard.uri, frontIdCard.mimeType)
            const cidBackFileExtension = getFileExtension(backIdCard.uri, backIdCard.mimeType)
            const cidHoldingFileExtension = getFileExtension(selfieWithId.uri, selfieWithId.mimeType)

            await completeRegistration(
                {
                    otp,
                    email,
                    phone,
                    cid: citizenId,
                    fullName,
                    cidFrontFileExtension,
                    cidBackFileExtension,
                    cidHoldingFileExtension,
                },
                {
                    front: {
                        uri: frontIdCard.uri,
                        fileName: frontIdCard.fileName!,
                        mimeType: frontIdCard.mimeType!,
                    },
                    back: {
                        uri: backIdCard.uri,
                        fileName: backIdCard.fileName!,
                        mimeType: backIdCard.mimeType!,
                    },
                    holding: {
                        uri: selfieWithId.uri,
                        fileName: selfieWithId.fileName!,
                        mimeType: selfieWithId.mimeType!,
                    },
                },
                (fileType, progress) => {
                    setUploadProgress((prev) => ({
                        ...prev,
                        [fileType]: progress,
                    }))
                }
            )
            Alert.alert('Thành công', 'Đăng ký thành công! Vui lòng chờ xét duyệt.')
            // TODO: Navigate to success screen or login
        } catch (error) {
            Alert.alert('Lỗi', (error as Error).message || JSON.stringify(error))
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Tạo tài khoản</Text>
                    <Text style={styles.headerSubtitle}>Dành cho Tình nguyện viên</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formContainer}>
                        {/* Registration Information Section */}
                        <Text style={styles.sectionTitle}>Thông tin đăng ký</Text>

                        {/* Citizen ID Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Số Căn cước công dân <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="card-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={citizenId}
                                    onChangeText={setCitizenId}
                                    placeholder="001234567890"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    maxLength={12}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Full Name Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Họ và tên <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Nguyễn Văn A"
                                    placeholderTextColor="#9CA3AF"
                                    editable={!loading}
                                />
                            </View>
                            <Text style={styles.helperText}>Viết hoa chữ cái đầu mỗi từ (VD: Nguyễn Văn A)</Text>
                        </View>

                        {/* Phone Number Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Số điện thoại <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="call-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="0912345678"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    editable={!loading}
                                />
                            </View>
                            <Text style={styles.helperText}>Số điện thoại bạn đang dùng để liên lạc</Text>
                        </View>

                        {/* Email Input with OTP Button */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                Email <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.emailRow}>
                                <View style={[styles.inputWrapper, styles.inputWrapperFlex]}>
                                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={email}
                                        onChangeText={setEmail}
                                        placeholder="email@example.com"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!loading}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.otpButton,
                                        (otpLoading || otpTimer > 0) && styles.otpButtonDisabled
                                    ]}
                                    onPress={handleSendOtp}
                                    disabled={otpLoading || otpTimer > 0 || loading}
                                >
                                    {otpLoading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : otpTimer > 0 ? (
                                        <Text style={styles.otpButtonText}>{formatTime(otpTimer)}</Text>
                                    ) : (
                                        <Text style={styles.otpButtonText}>Nhận mã OTP</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.helperText}>Chúng mình sẽ gửi mã xác nhận (OTP) vào email này</Text>
                        </View>

                        {/* OTP Input - Only show after OTP is sent */}
                        {otpSent && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>
                                    Mã OTP <Text style={styles.required}>*</Text>
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="key-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        value={otp}
                                        onChangeText={setOtp}
                                        placeholder="123456"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        maxLength={6}
                                        editable={!loading}
                                    />
                                </View>
                                <Text style={styles.helperText}>Nhập mã 6 số để xác thực</Text>
                            </View>
                        )}

                        {/* Image Verification Section */}
                        <View style={styles.verificationSection}>
                            <View style={styles.verificationHeader}>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#42A4F5" />
                                <Text style={styles.verificationTitle}>Upload ảnh xác minh danh tính</Text>
                            </View>
                            <View style={styles.verificationContent}>
                                <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                                <Text style={styles.verificationText}>
                                    Hình ảnh cần rõ nét, không bị chói lóa. Thông tin của bạn sẽ được bảo mật tuyệt đối.
                                </Text>
                            </View>
                        </View>

                        {/* Document Upload Sections */}
                        <DocumentUploadBox
                            label="Mặt trước Căn cước công dân *"
                            subtitle="Chụp rõ nét mặt trước CCCD của bạn"
                            document={frontIdCard}
                            onPress={() => pickImage(setFrontIdCard)}
                            onRemove={() => setFrontIdCard({ uri: null, fileName: null, mimeType: null })}
                            uploadProgress={uploadProgress.front}
                            disabled={loading}
                        />

                        <DocumentUploadBox
                            label="Mặt sau Căn cước công dân *"
                            subtitle="Chụp rõ nét mặt sau CCCD của bạn"
                            document={backIdCard}
                            onPress={() => pickImage(setBackIdCard)}
                            onRemove={() => setBackIdCard({ uri: null, fileName: null, mimeType: null })}
                            uploadProgress={uploadProgress.back}
                            disabled={loading}
                        />

                        <DocumentUploadBox
                            label="Ảnh chân dung chụp cùng CCCD *"
                            subtitle="Chụp một tấm hình bạn đang cầm CCCD sát bên mình"
                            document={selfieWithId}
                            onPress={() => pickImage(setSelfieWithId)}
                            onRemove={() => setSelfieWithId({ uri: null, fileName: null, mimeType: null })}
                            uploadProgress={uploadProgress.holding}
                            disabled={loading}
                        />

                        {/* Image Verification Checkbox */}
                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setImageVerification(!imageVerification)}
                            activeOpacity={0.7}
                            disabled={loading}
                        >
                            <View style={[styles.checkbox, imageVerification && styles.checkboxChecked]}>
                                {imageVerification && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </View>
                            <Text style={styles.checkboxText}>
                                Tôi đồng ý với{' '}
                                <Text style={styles.linkText}>Điều khoản sử dụng</Text> và Chính sách bảo mật
                            </Text>
                        </TouchableOpacity>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleRegister}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.registerButtonText}>Đăng ký</Text>
                            )}
                        </TouchableOpacity>

                        {/* Timer Display */}
                        {otpTimer > 0 && (
                            <Text style={styles.timerText}>
                                Có thể gửi lại OTP sau: {formatTime(otpTimer)}
                            </Text>
                        )}

                        {/* Footer */}
                        <Text style={styles.footerText}>
                            Đã có tài khoản?{' '}
                            <Text style={styles.linkText}>Đăng nhập!</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    header: {
        backgroundColor: '#42A4F5',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#E3F2FD',
        marginTop: 2,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 16,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 8,
    },
    required: {
        color: '#EF4444',
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputWrapperFlex: {
        flex: 1,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000000',
        padding: 0,
    },
    helperText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 6,
        marginLeft: 4,
    },
    otpButton: {
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    otpButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    verificationSection: {
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    verificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    verificationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginLeft: 8,
    },
    verificationContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    verificationText: {
        flex: 1,
        fontSize: 12,
        color: '#6B7280',
        marginLeft: 8,
        lineHeight: 18,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        marginRight: 10,
        marginTop: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    checkboxText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 20,
    },
    linkText: {
        color: '#42A4F5',
        fontWeight: '500',
    },
    registerButton: {
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    registerButtonDisabled: {
        opacity: 0.6,
    },
    registerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    timerText: {
        fontSize: 13,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '500',
    },
    footerText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
})
