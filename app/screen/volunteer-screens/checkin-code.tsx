import React, { useState, useRef, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Vibration,
    Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { checkEventByCode } from '@/services/checkin-service'
import { getApiErrorMessage } from '@/services/event-service'

const { width: SCREEN_W } = Dimensions.get('window')
const CODE_LENGTH = 6

const CheckinCodeScreen = () => {
    const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const shakeAnim = useRef(new Animated.Value(0)).current
    const filledCount = code.filter(c => c !== '').length

    // Auto-submit when all 6 digits are filled
    useEffect(() => {
        if (filledCount === CODE_LENGTH) {
            handleSubmit()
        }
    }, [filledCount])

    const handleKeyPress = (key: string) => {
        if (loading) return
        setError(null)

        if (key === 'DEL') {
            const lastIdx = [...code].reverse().findIndex(c => c !== '')
            if (lastIdx === -1) return
            const idx = CODE_LENGTH - 1 - lastIdx
            const next = [...code]
            next[idx] = ''
            setCode(next)
            return
        }

        const idx = code.findIndex(c => c === '')
        if (idx === -1) return
        const next = [...code]
        next[idx] = key
        setCode(next)
    }

    const handleSubmit = async () => {
        const fullCode = code.join('')
        if (fullCode.length < CODE_LENGTH) return

        setLoading(true)
        setError(null)

        try {
            const result = await checkEventByCode(fullCode)
            router.replace({
                pathname: '/screen/volunteer-screens/checkin-timer' as any,
                params: {
                    code: fullCode,
                    eventName: result.eventName ?? '',
                    eventId: result.eventId ?? '',
                    applicationId: result.applicationId ?? '',
                    sessionId: result.sessionId ?? '',
                },
            })
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err) || 'Mã điểm danh không hợp lệ. Vui lòng thử lại.'
            setError(msg)
            Vibration.vibrate(200)
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start()
            setCode(Array(CODE_LENGTH).fill(''))
        } finally {
            setLoading(false)
        }
    }

    const numpadKeys = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['', '0', 'DEL'],
    ]

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#42A4F5" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nhập mã điểm danh</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Instruction banner */}
            <View style={styles.instructionBanner}>
                <Ionicons name="information-circle" size={16} color="#FFFFFF" />
                <Text style={styles.instructionText}>
                    Nhập mã 6 chữ số được ban tổ chức cung cấp
                </Text>
            </View>

            {/* Code boxes */}
            <Animated.View
                style={[styles.codeRow, { transform: [{ translateX: shakeAnim }] }]}
            >
                {code.map((digit, i) => (
                    <View
                        key={i}
                        style={[
                            styles.codeBox,
                            digit ? styles.codeBoxFilled : styles.codeBoxEmpty,
                            i === filledCount && !loading ? styles.codeBoxActive : null,
                            error ? styles.codeBoxError : null,
                        ]}
                    >
                        {loading && i === 0 ? (
                            <ActivityIndicator size="small" color="#42A4F5" />
                        ) : (
                            <Text style={styles.codeDigit}>{digit || ''}</Text>
                        )}
                    </View>
                ))}
            </Animated.View>

            {/* Error message */}
            {error ? (
                <View style={styles.errorWrap}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            {/* Notes card */}
            <View style={styles.noteCard}>
                <View style={styles.noteHeader}>
                    <Ionicons name="information-circle-outline" size={18} color="#42A4F5" />
                    <Text style={styles.noteTitle}>Lưu ý</Text>
                </View>
                <Text style={styles.noteItem}>
                    {'• '}Mã điểm danh gồm 6 chữ số, do người phát hành hoạt động cung cấp
                </Text>
                <Text style={styles.noteItem}>
                    {'• '}Mã điểm danh sẽ được công khai tại địa điểm hoạt động và các nền tảng liên quan
                </Text>
                <Text style={styles.noteItem}>
                    {'• '}Mỗi mã chỉ hợp lệ trong thời gian diễn ra sự kiện
                </Text>
            </View>

            {/* Numpad */}
            <View style={styles.numpadContainer}>
                {numpadKeys.map((row, rIdx) => (
                    <View key={rIdx} style={styles.numpadRow}>
                        {row.map((key, kIdx) => {
                            if (!key) return <View key={kIdx} style={styles.numpadEmpty} />
                            if (key === 'DEL') {
                                return (
                                    <TouchableOpacity
                                        key={kIdx}
                                        style={styles.numpadKey}
                                        onPress={() => handleKeyPress('DEL')}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="backspace-outline" size={22} color="#4B5563" />
                                    </TouchableOpacity>
                                )
                            }
                            return (
                                <TouchableOpacity
                                    key={kIdx}
                                    style={styles.numpadKey}
                                    onPress={() => handleKeyPress(key)}
                                    activeOpacity={0.7}
                                    disabled={loading}
                                >
                                    <Text style={styles.numpadKeyText}>{key}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                ))}

                {/* Manual confirm button (shown when code is filled) */}
                {filledCount === CODE_LENGTH && !loading && (
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSubmit}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.submitText}>Xác nhận mã</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F6FF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E3F2FD',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E3F2FD',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#42A4F5',
    },

    /* Instruction */
    instructionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        margin: 16,
        backgroundColor: '#42A4F5',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    instructionText: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '500',
        flex: 1,
    },

    /* Code boxes */
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    codeBox: {
        width: (SCREEN_W - 32 - 50) / CODE_LENGTH,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    codeBoxEmpty: {
        backgroundColor: '#FFFFFF',
        borderColor: '#BBDEFB',
    },
    codeBoxFilled: {
        backgroundColor: '#E3F2FD',
        borderColor: '#42A4F5',
    },
    codeBoxActive: {
        borderColor: '#42A4F5',
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
    },
    codeBoxError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    codeDigit: {
        fontSize: 22,
        fontWeight: '800',
        color: '#42A4F5',
        letterSpacing: 1,
    },

    /* Error */
    errorWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorText: {
        fontSize: 13,
        color: '#EF4444',
        flex: 1,
    },

    /* Notes */
    noteCard: {
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    noteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    noteTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#42A4F5',
    },
    noteItem: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 20,
    },

    /* Numpad */
    numpadContainer: {
        marginTop: 'auto',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E3F2FD',
    },
    numpadRow: {
        flexDirection: 'row',
    },
    numpadKey: {
        flex: 1,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: '#E5E7EB',
    },
    numpadEmpty: {
        flex: 1,
        height: 56,
        borderBottomWidth: 1,
        borderRightWidth: 1,
        borderColor: '#E5E7EB',
    },
    numpadKeyText: {
        fontSize: 22,
        fontWeight: '500',
        color: '#1F2937',
    },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        margin: 12,
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingVertical: 14,
    },
    submitText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
})

export default CheckinCodeScreen
