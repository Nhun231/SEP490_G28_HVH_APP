import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Animated,
    AppState,
    AppStateStatus,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { quickCheckIn } from '@/services/checkin-service'
import { getApiErrorMessage } from '@/services/api-helpers'

// ─── helpers ────────────────────────────────────────────────────────────────
function padTwo(n: number): string {
    return n < 10 ? `0${n}` : `${n}`
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${padTwo(h)}:${padTwo(m)}:${padTwo(s)}`
    return `${padTwo(m)}:${padTwo(s)}`
}

// ─── component ────────────────────────────────────────────────────────────────
const CheckinTimerScreen = () => {
    const params = useLocalSearchParams<{
        code: string
        eventName: string
        eventId: string
        applicationId: string
        sessionId: string
    }>()

    const [elapsed, setElapsed] = useState(0)
    const [checkingOut, setCheckingOut] = useState(false)
    const [checkedOut, setCheckedOut] = useState(false)
    const startTimeRef = useRef<Date>(new Date())
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const pulseAnim = useRef(new Animated.Value(1)).current

    // Pulse animation for the live dot
    useEffect(() => {
        if (checkedOut) return
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        )
        pulse.start()
        return () => pulse.stop()
    }, [checkedOut])

    // Ticker
    useEffect(() => {
        if (checkedOut) return
        startTimeRef.current = new Date()
        intervalRef.current = setInterval(() => {
            const diff = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
            setElapsed(diff)
        }, 1000)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [checkedOut])

    // Sync timer when app returns from background
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active' && !checkedOut) {
                setElapsed(Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000))
            }
        })
        return () => sub.remove()
    }, [checkedOut])

    const handleCheckout = () => {
        Alert.alert(
            'Xác nhận check-out',
            `Bạn đã tình nguyện được ${formatDuration(elapsed)}. Xác nhận kết thúc?`,
            [
                { text: 'Chưa xong', style: 'cancel' },
                { text: 'Kết thúc', style: 'destructive', onPress: doCheckout },
            ],
            { cancelable: true }
        )
    }

    const doCheckout = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setCheckingOut(true)
        try {
            await quickCheckIn({ code: params.code, applicationId: params.applicationId })
            setCheckedOut(true)
        } catch (err: unknown) {
            // Resume timer if checkout fails
            startTimeRef.current = new Date(new Date().getTime() - elapsed * 1000)
            intervalRef.current = setInterval(() => {
                setElapsed(Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000))
            }, 1000)
            const msg = getApiErrorMessage(err) || 'Không thể ghi nhận. Vui lòng thử lại.'
            Alert.alert('Lỗi check-out', msg)
        } finally {
            setCheckingOut(false)
        }
    }

    const handleGoHome = () => {
        router.replace('/(vol-tabs)/checkin' as any)
    }

    // ── Success state ─────────────────────────────────────────────────────────
    if (checkedOut) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successScreen}>
                    {/* Top blue area */}
                    <View style={styles.successTop}>
                        <View style={styles.successIconWrap}>
                            <Ionicons name="checkmark-circle" size={72} color="#FFFFFF" />
                        </View>
                        <Text style={styles.successTitle}>Điểm danh hoàn tất!</Text>
                        <Text style={styles.successSub}>Cảm ơn bạn đã đóng góp thời gian tình nguyện</Text>
                    </View>

                    {/* Duration card */}
                    <View style={styles.successCard}>
                        <Text style={styles.successCardLabel}>Thời gian đóng góp</Text>
                        <Text style={styles.successDuration}>{formatDuration(elapsed)}</Text>
                        {params.eventName ? (
                            <Text style={styles.successEventName} numberOfLines={2}>
                                {params.eventName}
                            </Text>
                        ) : null}
                    </View>

                    <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome}>
                        <Ionicons name="home-outline" size={18} color="#42A4F5" />
                        <Text style={styles.homeBtnText}>Về trang điểm danh</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    // ── Active timer ──────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* Header bar */}
            <View style={styles.timerHeader}>
                <View style={styles.timerHeaderTop}>
                    <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                    <Text style={styles.liveLabel}>ĐANG ĐIỂM DANH</Text>
                </View>
                <Text style={styles.timerDisplay}>{formatDuration(elapsed)}</Text>
                <Text style={styles.timerSubLabel}>Thời gian tình nguyện</Text>
            </View>

            {/* Event info */}
            <View style={styles.eventCard}>
                <View style={styles.eventIconWrap}>
                    <Ionicons name="calendar" size={28} color="#42A4F5" />
                </View>
                <View style={styles.eventInfo}>
                    <Text style={styles.eventLabel}>Sự kiện</Text>
                    <Text style={styles.eventName} numberOfLines={2}>
                        {params.eventName || 'Sự kiện tình nguyện'}
                    </Text>
                </View>
            </View>

            {/* Code chips */}
            <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>Mã điểm danh của bạn</Text>
                <View style={styles.codeDisplay}>
                    {(params.code || '').split('').map((ch, i) => (
                        <View key={i} style={styles.codeChip}>
                            <Text style={styles.codeChipText}>{ch}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Ionicons name="time-outline" size={24} color="#42A4F5" />
                    <Text style={styles.statValue}>{padTwo(Math.floor(elapsed / 3600))}</Text>
                    <Text style={styles.statLabel}>Giờ</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                    <Ionicons name="timer-outline" size={24} color="#42A4F5" />
                    <Text style={styles.statValue}>{padTwo(Math.floor((elapsed % 3600) / 60))}</Text>
                    <Text style={styles.statLabel}>Phút</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                    <Ionicons name="stopwatch-outline" size={24} color="#42A4F5" />
                    <Text style={styles.statValue}>{padTwo(elapsed % 60)}</Text>
                    <Text style={styles.statLabel}>Giây</Text>
                </View>
            </View>

            {/* Note */}
            <View style={styles.noteBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#42A4F5" />
                <Text style={styles.noteText}>
                    Thời gian đang được theo dõi. Bấm "Check-out" khi bạn hoàn thành tình nguyện.
                </Text>
            </View>

            {/* Checkout button */}
            <View style={styles.checkoutContainer}>
                <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={handleCheckout}
                    disabled={checkingOut}
                    activeOpacity={0.85}
                >
                    {checkingOut ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
                            <Text style={styles.checkoutText}>Check-out</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F6FF',
    },

    /* Timer header */
    timerHeader: {
        backgroundColor: '#42A4F5',
        paddingTop: 20,
        paddingBottom: 28,
        alignItems: 'center',
    },
    timerHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#4ADE80',
    },
    liveLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 2,
    },
    timerDisplay: {
        fontSize: 64,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -2,
        fontVariant: ['tabular-nums'],
    },
    timerSubLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 4,
    },

    /* Event card */
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    eventIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eventInfo: { flex: 1 },
    eventLabel: {
        fontSize: 11,
        color: '#42A4F5',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    eventName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 22,
    },

    /* Code display */
    codeCard: {
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    codeLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 10,
    },
    codeDisplay: {
        flexDirection: 'row',
        gap: 8,
    },
    codeChip: {
        width: 38,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    codeChipText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#42A4F5',
    },

    /* Stats */
    statsRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        gap: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#42A4F5',
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 11,
        color: '#9CA3AF',
    },

    /* Note */
    noteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#E3F2FD',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    noteText: {
        fontSize: 12,
        color: '#42A4F5',
        flex: 1,
        lineHeight: 18,
    },

    /* Checkout */
    checkoutContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        marginTop: 'auto',
    },
    checkoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 16,
        elevation: 4,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    checkoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* Success */
    successScreen: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#F0F6FF',
    },
    successTop: {
        width: '100%',
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    successIconWrap: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
    },
    successSub: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
    },
    successCard: {
        width: '88%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginTop: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    successCardLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 8,
    },
    successDuration: {
        fontSize: 48,
        fontWeight: '800',
        color: '#42A4F5',
        letterSpacing: -1,
        fontVariant: ['tabular-nums'],
    },
    successEventName: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
    },
    homeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        elevation: 2,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    homeBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#42A4F5',
    },
})

export default CheckinTimerScreen
