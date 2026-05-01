import React, { useCallback, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { getActiveCheckin } from '@/services/checkin-service'

const CheckinTab = () => {
    const [checking, setChecking] = useState(true)

    // Every time this tab gains focus, check if the user already has an active
    // check-in session. If yes → redirect straight to the timer screen.
    useFocusEffect(
        useCallback(() => {
            let cancelled = false
            setChecking(true)
            getActiveCheckin().then(session => {
                if (cancelled) return
                setChecking(false)
                if (session) {
                    router.replace({
                        pathname: '/screen/volunteer-screens/checkin-timer' as any,
                        params: {
                            applicationId: session.applicationId,
                            eventName: session.eventName,
                            sessionId: session.eventSessionId,
                            sessionEndTime: session.sessionEndTime ?? '',
                            checkinLat: String(session.latCheckInLocation),
                            checkinLng: String(session.lngCheckInLocation),
                            // Key fix: pass the real check-in timestamp so the
                            // timer computes elapsed from check-in, not from now
                            checkinTime: session.checkInTime,
                        },
                    })
                }
            })
            return () => { cancelled = true }
        }, [])
    )

    const handleStartCheckin = () => {
        router.push('/screen/volunteer-screens/checkin-code' as any)
    }

    if (checking) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color="#42A4F5" />
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ width: 36 }} />
                    <View>
                        <Text style={styles.headerTitle}>Điểm danh</Text>
                        <Text style={styles.headerSub}>Ghi nhận thời gian tình nguyện của bạn</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => router.push('/screen/volunteer-screens/notifications' as any)}
                    >
                        <Ionicons name="notifications-outline" size={24} color="#42A4F5" />
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCard}>
                    {/* Decorative circles */}
                    <View style={styles.circleDecorLg} />
                    <View style={styles.circleDecorSm} />

                    <View style={styles.heroIconWrap}>
                        <Ionicons name="checkmark-circle" size={56} color="#FFFFFF" />
                    </View>
                    <Text style={styles.heroTitle}>Bắt đầu điểm danh</Text>
                    <Text style={styles.heroDesc}>
                        Nhập mã được cung cấp bởi ban tổ chức để bắt đầu ghi nhận thời gian tình nguyện của bạn
                    </Text>
                </View>

                {/* Steps */}
                <View style={styles.stepsContainer}>
                    <Text style={styles.stepsTitle}>Các bước thực hiện</Text>

                    <View style={styles.stepRow}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>1</Text>
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepLabel}>Nhận mã điểm danh</Text>
                            <Text style={styles.stepDesc}>Lấy mã 6 chữ số từ ban tổ chức sự kiện</Text>
                        </View>
                    </View>

                    <View style={styles.stepConnector} />

                    <View style={styles.stepRow}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>2</Text>
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepLabel}>Nhập mã điểm danh</Text>
                            <Text style={styles.stepDesc}>Điền mã vào ô nhập liệu để xác nhận tham gia</Text>
                        </View>
                    </View>

                    <View style={styles.stepConnector} />

                    <View style={styles.stepRow}>
                        <View style={styles.stepBadge}>
                            <Ionicons name="timer-outline" size={16} color="#FFFFFF" />
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepLabel}>Đồng hồ tự động chạy</Text>
                            <Text style={styles.stepDesc}>Thời gian tình nguyện được ghi nhận tự động</Text>
                        </View>
                    </View>

                    <View style={styles.stepConnector} />

                    <View style={styles.stepRow}>
                        <View style={[styles.stepBadge, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="log-out-outline" size={16} color="#42A4F5" />
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepLabel}>Check-out khi hoàn thành</Text>
                            <Text style={styles.stepDesc}>Bấm nút kết thúc để lưu thời gian vào hệ thống</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* CTA Button */}
            <View style={styles.ctaContainer}>
                <TouchableOpacity
                    style={styles.ctaButton}
                    activeOpacity={0.85}
                    onPress={handleStartCheckin}
                >
                    <Ionicons name="qr-code-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.ctaText}>Nhập mã điểm danh</Text>
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
    loadingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    headerIconBtn: {
        width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#42A4F5',
        letterSpacing: -0.5,
    },
    headerSub: {
        fontSize: 13,
        color: '#5C8AC8',
        marginTop: 2,
    },

    /* Hero card */
    heroCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#42A4F5',
        elevation: 6,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    circleDecorLg: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -40,
        right: -40,
    },
    circleDecorSm: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -20,
        left: -10,
    },
    heroIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    heroDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        lineHeight: 20,
    },

    /* Steps */
    stepsContainer: {
        margin: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    stepsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#42A4F5',
        marginBottom: 14,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    stepContent: {
        flex: 1,
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    stepDesc: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    stepConnector: {
        width: 2,
        height: 16,
        backgroundColor: '#BBDEFB',
        marginLeft: 15,
        marginVertical: 4,
    },

    /* CTA */
    ctaContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 24,
        paddingTop: 12,
        backgroundColor: '#F0F6FF',
        borderTopWidth: 1,
        borderTopColor: '#BBDEFB',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#42A4F5',
        borderRadius: 14,
        paddingVertical: 16,
        elevation: 4,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    ctaText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
})

export default CheckinTab