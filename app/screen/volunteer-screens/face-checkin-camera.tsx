import * as Application from 'expo-application'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Device from 'expo-device'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Alert,
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { SafeAreaView } from 'react-native-safe-area-context'
import { faceCheckIn } from '@/services/checkin-service'
import { getApiErrorMessage } from '@/services/api-helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = {
    sessionId: string
    checkinLat: string
    checkinLng: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECORD_DURATION_SEC = 10   // seconds to auto-record

// ─── CountdownArc ─────────────────────────────────────────────────────────────

const ARC_R = 28
const ARC_STROKE = 4
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_R
const ARC_SIZE = (ARC_R + ARC_STROKE) * 2

function CountdownArc({ total, remaining }: { total: number; remaining: number }) {
    const progress = remaining / total                         // 1 → 0
    const dashOffset = ARC_CIRCUMFERENCE * (1 - progress)    // fills as time passes
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: ARC_SIZE, height: ARC_SIZE }}>
            <Svg width={ARC_SIZE} height={ARC_SIZE} style={{ position: 'absolute' }}>
                {/* Background track */}
                <Circle
                    cx={ARC_SIZE / 2} cy={ARC_SIZE / 2} r={ARC_R}
                    stroke="rgba(255,255,255,0.2)" strokeWidth={ARC_STROKE} fill="none"
                />
                {/* Progress arc */}
                <Circle
                    cx={ARC_SIZE / 2} cy={ARC_SIZE / 2} r={ARC_R}
                    stroke="#42A4F5" strokeWidth={ARC_STROKE} fill="none"
                    strokeDasharray={ARC_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${ARC_SIZE / 2}, ${ARC_SIZE / 2}`}
                />
            </Svg>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>{remaining}</Text>
        </View>
    )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FaceCheckinCameraScreen() {
    const params = useLocalSearchParams<Params>()
    const [permission, requestPermission] = useCameraPermissions()
    const cameraRef = useRef<CameraView>(null)

    const [phase, setPhase] = useState<'idle' | 'recording' | 'uploading' | 'done'>('idle')
    const [countdown, setCountdown] = useState(RECORD_DURATION_SEC)

    // Animated oval border pulse
    const pulseAnim = useRef(new Animated.Value(1)).current
    const breatheLoop = useRef<Animated.CompositeAnimation | null>(null)

    const startBreathe = useCallback(() => {
        breatheLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        )
        breatheLoop.current.start()
    }, [pulseAnim])

    const stopBreathe = useCallback(() => {
        breatheLoop.current?.stop()
        pulseAnim.setValue(1)
    }, [pulseAnim])

    // Auto-start when camera is ready and permission granted
    useEffect(() => {
        if (permission?.granted) startRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permission?.granted])

    const startRecording = async () => {
        try {
            setPhase('recording')
            setCountdown(RECORD_DURATION_SEC)
            startBreathe()

            // Countdown timer
            let remaining = RECORD_DURATION_SEC
            const interval = setInterval(() => {
                remaining -= 1
                setCountdown(remaining)
                if (remaining <= 0) clearInterval(interval)
            }, 1000)

            // Start video recording — auto-stop after duration
            const video = await cameraRef.current?.recordAsync({
                maxDuration: RECORD_DURATION_SEC,
            })

            stopBreathe()
            clearInterval(interval)

            if (!video?.uri) {
                setPhase('idle')
                return
            }

            // Upload
            await uploadVideo(video.uri)
        } catch (err) {
            stopBreathe()
            setPhase('idle')
            Alert.alert('Lỗi quay video', getApiErrorMessage(err) || 'Không thể quay video. Vui lòng thử lại.')
        }
    }

    const uploadVideo = async (uri: string) => {
        setPhase('uploading')
        try {
            // Build device metadata
            let deviceId: string
            if (Platform.OS === 'android') {
                deviceId = (await Application.getAndroidId()) ?? Application.applicationId ?? 'unknown-android'
            } else {
                deviceId = (await Application.getIosIdForVendorAsync()) ?? Application.applicationId ?? 'unknown-ios'
            }
            const apVersion = Application.nativeApplicationVersion ?? '1.0.0'
            const osVersion = `${Device.osName ?? 'OS'} ${Device.osVersion ?? ''}`

            // [TESTING] Mock GPS to event centre
            // TODO: replace with real GPS
            const lat = parseFloat(params.checkinLat ?? '0')
            const lng = parseFloat(params.checkinLng ?? '0')

            await faceCheckIn({
                uri,
                eventSessionId: params.sessionId,
                deviceId,
                apVersion,
                osVersion,
                currentPlaceLat: lat,
                currentPlaceLng: lng,
            })

            setPhase('done')

            // Navigate to timer (same destination as quick check-in)
            router.replace({
                pathname: '/screen/volunteer-screens/checkin-timer',
                params: {
                    sessionId: params.sessionId,
                    checkinLat: params.checkinLat,
                    checkinLng: params.checkinLng,
                },
            } as any)
        } catch (err) {
            setPhase('idle')
            const msg = getApiErrorMessage(err) || 'Xác thực khuôn mặt thất bại. Vui lòng thử lại.'
            Alert.alert('Lỗi điểm danh', msg, [
                { text: 'Thử lại', onPress: () => startRecording() },
                { text: 'Hủy', style: 'cancel', onPress: () => router.back() },
            ])
        }
    }

    // ── Permission gate ──────────────────────────────────────────────────────

    if (!permission) {
        return (
            <View style={styles.fullCenter}>
                <Text style={styles.permText}>Đang kiểm tra quyền camera...</Text>
            </View>
        )
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.permScreen} edges={['top', 'bottom']}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.fullCenter}>
                    <Text style={styles.permTitle}>Cần quyền truy cập camera</Text>
                    <Text style={styles.permDesc}>
                        Ứng dụng cần camera trước để quay video xác thực khuôn mặt.
                    </Text>
                    <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                        <Text style={styles.permBtnText}>Cấp quyền</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.permCancelBtn} onPress={() => router.back()}>
                        <Text style={styles.permCancelText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    // ── Phase labels ─────────────────────────────────────────────────────────

    const phaseLabel = (() => {
        if (phase === 'recording') return `Đang ghi hình... ${countdown}s`
        if (phase === 'uploading') return 'Đang xác thực, vui lòng chờ...'
        if (phase === 'done') return 'Hoàn tất!'
        return 'Đặt khuôn mặt vào khung'
    })()

    const ovalBorderColor = phase === 'recording' ? '#42A4F5' : '#FFFFFF'

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Camera ── */}
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
                mode="video"
                videoQuality="720p"
            />

            {/* ── Dark overlay with oval cut-out effect ── */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {/* Top mask */}
                <View style={styles.maskTop} />

                {/* Middle row: left mask + oval border + right mask */}
                <View style={styles.maskMiddleRow}>
                    <View style={styles.maskSide} />
                    <Animated.View
                        style={[
                            styles.oval,
                            { borderColor: ovalBorderColor },
                            { transform: [{ scale: pulseAnim }] },
                        ]}
                    />
                    <View style={styles.maskSide} />
                </View>

                {/* Bottom mask */}
                <View style={styles.maskBottom} />
            </View>

            {/* ── Top bar ── */}
            <SafeAreaView style={styles.topBar} edges={['top']}>
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => router.back()}
                    disabled={phase === 'uploading'}
                >
                    <Text style={styles.closeBtnText}>✕ Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.topTitle}>Xác thực khuôn mặt</Text>
                <View style={styles.closeBtn} />
            </SafeAreaView>

            {/* ── Bottom instructions ── */}
            <View style={styles.bottomBar}>
                {/* Countdown arc progress */}
                {phase === 'recording' && (
                    <CountdownArc total={RECORD_DURATION_SEC} remaining={countdown} />
                )}

                {/* Uploading spinner */}
                {phase === 'uploading' && (
                    <View style={styles.uploadingDot}>
                        <Text style={styles.uploadingIcon}>⏳</Text>
                    </View>
                )}

                <Text style={styles.instructionText}>{phaseLabel}</Text>

                {phase === 'idle' && (
                    <TouchableOpacity style={styles.startBtn} onPress={startRecording} activeOpacity={0.85}>
                        <Text style={styles.startBtnText}>Bắt đầu</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const OVAL_W = 240
const OVAL_H = 310

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },

    /* Masks to create oval window illusion */
    maskTop: {
        height: '18%',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    maskMiddleRow: {
        flexDirection: 'row',
        height: OVAL_H,
        alignItems: 'center',
    },
    maskSide: {
        flex: 1,
        height: OVAL_H,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    oval: {
        width: OVAL_W,
        height: OVAL_H,
        borderRadius: OVAL_W / 2,
        borderWidth: 3,
        backgroundColor: 'transparent',
    },
    maskBottom: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },

    /* Top bar */
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 10,
    },
    closeBtn: { width: 70, alignItems: 'flex-start' },
    closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },

    /* Bottom bar */
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingBottom: 48, paddingTop: 24,
        alignItems: 'center', gap: 16,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    countdownRing: {
        width: 60, height: 60, borderRadius: 30,
        borderWidth: 3, borderColor: '#42A4F5',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(66,164,245,0.15)',
    },
    countdownNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
    uploadingDot: {
        width: 60, height: 60, borderRadius: 30,
        alignItems: 'center', justifyContent: 'center',
    },
    uploadingIcon: { fontSize: 32 },
    instructionText: {
        fontSize: 15, fontWeight: '600', color: '#fff',
        textAlign: 'center', paddingHorizontal: 24,
    },
    startBtn: {
        backgroundColor: '#42A4F5',
        borderRadius: 14,
        paddingHorizontal: 48, paddingVertical: 14,
        elevation: 3,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },
    startBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    /* Permission screen */
    permScreen: { flex: 1, backgroundColor: '#42A4F5' },
    fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    permTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
    permDesc: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21, marginBottom: 32 },
    permText: { color: '#fff', fontSize: 14 },
    permBtn: {
        backgroundColor: '#fff',
        borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14, marginBottom: 12,
    },
    permBtnText: { fontSize: 15, fontWeight: '700', color: '#42A4F5' },
    permCancelBtn: { paddingVertical: 10 },
    permCancelText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
})
