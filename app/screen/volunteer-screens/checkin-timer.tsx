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
    Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { checkOutEvent } from '@/services/checkin-service'
import { getApiErrorMessage } from '@/services/api-helpers'
import * as Location from 'expo-location'
import * as Device from 'expo-device'
import * as Application from 'expo-application'

function padTwo(n: number): string {
    return n < 10 ? `0${n}` : `${n}`
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${padTwo(h)}:${padTwo(m)}:${padTwo(s)}`
}

const CheckinTimerScreen = () => {
    const params = useLocalSearchParams<{
        eventName: string
        applicationId: string
        sessionId: string
        sessionEndTime: string
        /** ISO-8601 timestamp when the volunteer checked in (from checkin log) */
        checkinTime: string
        /** Event check-in location — forwarded for GPS mock during checkout */
        checkinLat: string
        checkinLng: string
    }>()

    const [elapsed, setElapsed] = useState(0)
    const [checkingOut, setCheckingOut] = useState(false)
    // Resolved check-in start time: use the ISO param if available (so timer survives
    // navigating away and coming back), otherwise fall back to "right now".
    const resolvedCheckinTime = params.checkinTime
        ? new Date(params.checkinTime)
        : new Date()
    const startTimeRef = useRef<Date>(resolvedCheckinTime)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const pulseAnim = useRef(new Animated.Value(1)).current

    // Pulse animation for the live dot
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        )
        pulse.start()
        return () => pulse.stop()
    }, [])

    // Ticker — initialise once based on the resolved check-in timestamp
    useEffect(() => {
        // Compute initial elapsed from the real check-in time (not mount time)
        const computeElapsed = () =>
            Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
        setElapsed(computeElapsed())
        intervalRef.current = setInterval(() => {
            setElapsed(computeElapsed())
        }, 1000)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [])

    // Sync timer when app returns from background
    useEffect(() => {
        const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
            if (state === 'active') {
                setElapsed(Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000))
            }
        })
        return () => sub.remove()
    }, [])

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

            // 1. Get current GPS position (required by BE to verify radius)
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                throw new Error('Cần cấp quyền vị trí để check-out.')
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })

            // 2. Gather device metadata (Android vs iOS)
            let deviceId: string
            if (Platform.OS === 'android') {
                deviceId =
                    (await Application.getAndroidId()) ??
                    Application.applicationId ??
                    'unknown-android'
            } else {
                deviceId =
                    (await Application.getIosIdForVendorAsync()) ??
                    Application.applicationId ??
                    'unknown-ios'
            }
            const apVersion = Application.nativeApplicationVersion ?? '1.0.0'
            const osVersion = `${Device.osName ?? 'OS'} ${Device.osVersion ?? ''}`

            // 3. Call checkout API
            await checkOutEvent({
                eventSessionId: params.sessionId,
                deviceId,
                apVersion,
                osVersion,
                currentPlaceLat: loc.coords.latitude,
                currentPlaceLng: loc.coords.longitude,
            })

            // 4. Navigate to rating screen immediately after successful checkout
            router.replace({
                pathname: '/screen/volunteer-screens/rating-event',
                params: {
                    applicationId: params.applicationId,
                    eventName: params.eventName,
                    fromCheckout: 'true',
                },
            } as any)
        } catch (err: unknown) {
            // Resume timer if checkout fails
            startTimeRef.current = new Date(new Date().getTime() - elapsed * 1000)
            intervalRef.current = setInterval(() => {
                setElapsed(Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000))
            }, 1000)
            const msg =
                err instanceof Error
                    ? err.message
                    : getApiErrorMessage(err) || 'Không thể ghi nhận. Vui lòng thử lại.'
            Alert.alert('Lỗi check-out', msg)
        } finally {
            setCheckingOut(false)
        }
    }

    const handleGoHome = () => {
        router.replace('/(vol-tabs)/checkin' as any)
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header bar */}
            <View style={styles.timerHeader}>
                <View style={styles.timerHeaderTop}>
                    <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                    <Text style={styles.liveLabel}>ĐANG GHI NHẬN THỜI GIAN TÌNH NGUYỆN</Text>
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

            {/* End-time warning */}
            {!!params.sessionEndTime && (
                <View style={styles.warningBox}>
                    <Ionicons name="warning-outline" size={16} color="#D97706" />
                    <Text style={styles.warningText}>
                        Phiên sự kiện kết thúc lúc{' '}
                        <Text style={styles.warningHighlight}>
                            {new Date(params.sessionEndTime).toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                            })}
                        </Text>
                        . Vui lòng check-out trước thời điểm trên.
                    </Text>
                </View>
            )}

            {/* Checkout + Share row */}
            <View style={styles.checkoutContainer}>
                {/* Share moments button */}
                <TouchableOpacity
                    style={styles.shareBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                        router.push({
                            pathname: '/screen/volunteer-screens/event-moments-feed',
                            params: {
                                mode: 'event',
                                eventName: params.eventName ?? '',
                                sessionId: params.sessionId ?? '',
                                applicationId: params.applicationId ?? '',
                            },
                        } as any)
                    }}
                >
                    <Ionicons name="images-outline" size={20} color="#42A4F5" />
                    <Text style={styles.shareBtnText}>Chia sẻ khoảnh khắc</Text>
                    <Ionicons name="chevron-forward" size={16} color="#42A4F5" />
                </TouchableOpacity>

                {/* Checkout button */}
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

        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F6FF',
        paddingBottom: 20,
    },

    /* Timer header */
    timerHeader: {
        backgroundColor: '#42A4F5',
        paddingTop: 80,
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
        fontSize: 32,
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

    /* End-time warning */
    warningBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 8,
        backgroundColor: '#FFFBEB',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    warningText: {
        fontSize: 12,
        color: '#92400E',
        flex: 1,
        lineHeight: 18,
    },
    warningHighlight: {
        fontWeight: '700',
        color: '#B45309',
    },

    checkoutContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        marginTop: 'auto',
        gap: 10,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        elevation: 2,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    shareBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#42A4F5',
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
