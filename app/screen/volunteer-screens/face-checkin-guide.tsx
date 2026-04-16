import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import React from 'react'
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── Types ───────────────────────────────────────────────────────────────────

type Params = {
    sessionId: string
    checkinLat: string
    checkinLng: string
    name?: string
}

// ─── Data ────────────────────────────────────────────────────────────────────

const TIPS = [
    'Cầm điện thoại ngang tầm mắt ở khoảng 30–40 cm',
    'Thực hiện trong môi trường có đủ ánh sáng',
    'Cần rõ mắt, miệng, không rung mờ',
    'Không đeo khẩu trang, kính râm hoặc che mặt',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function FaceCheckinGuideScreen() {
    const params = useLocalSearchParams<Params>()

    const handleContinue = () => {
        router.push({
            pathname: '/screen/volunteer-screens/face-checkin-camera',
            params: {
                sessionId: params.sessionId,
                checkinLat: params.checkinLat,
                checkinLng: params.checkinLng,
            },
        } as any)
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Xác thực khuôn mặt</Text>
                <View style={styles.backBtn} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* ── Section title ── */}
                <Text style={styles.sectionTitle}>Các bước xác thực khuôn mặt</Text>

                {/* ── Steps card ── */}
                <View style={styles.stepsCard}>
                    {/* Step 1 */}
                    <View style={styles.stepCol}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>1. Đưa ra xa</Text>
                        </View>
                        <View style={styles.stepIllustration}>
                            <Ionicons name="arrow-back-outline" size={32} color="#42A4F5" style={{ marginBottom: 8 }} />
                            <View style={styles.phoneWrapper}>
                                <View style={styles.phoneMock}>
                                    <Ionicons name="phone-portrait-outline" size={60} color="#42A4F5" />
                                </View>
                                <View style={styles.faceCircleSmall}>
                                    <Ionicons name="person" size={22} color="#42A4F5" />
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.stepDivider} />

                    {/* Step 2 */}
                    <View style={styles.stepCol}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>2. Đưa lại gần</Text>
                        </View>
                        <View style={styles.stepIllustration}>
                            <Ionicons name="arrow-forward-outline" size={32} color="#42A4F5" style={{ marginBottom: 8 }} />
                            <View style={styles.phoneWrapper}>
                                <View style={styles.phoneMock}>
                                    <Ionicons name="phone-portrait-outline" size={60} color="#42A4F5" />
                                </View>
                                <View style={styles.faceCircleLarge}>
                                    <Ionicons name="person" size={32} color="#42A4F5" />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── Tips card ── */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>Lưu ý để thực hiện dễ dàng hơn</Text>
                    {TIPS.map((tip, i) => (
                        <View key={i} style={styles.tipRow}>
                            <View style={styles.tipIcon}>
                                <Ionicons name="checkmark" size={14} color="#fff" />
                            </View>
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* ── CTA ── */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.ctaBtn} onPress={handleContinue} activeOpacity={0.85}>
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.ctaBtnText}>Đã hiểu, tiếp tục</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const BLUE = '#42A4F5'

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: BLUE },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: BLUE,
    },
    backBtn: {
        width: 38, height: 38,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17, fontWeight: '700', color: '#fff',
    },

    /* Scroll */
    scroll: { flex: 1, backgroundColor: '#F0F9FF' },
    scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 20 },

    sectionTitle: {
        fontSize: 17, fontWeight: '700', color: '#1F2937',
        textAlign: 'center', marginBottom: 16,
    },

    /* Steps card */
    stepsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
    },
    stepCol: { flex: 1, alignItems: 'center' },
    stepBadge: {
        backgroundColor: '#EBF5FF',
        borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
        marginBottom: 14,
    },
    stepBadgeText: { fontSize: 13, fontWeight: '700', color: BLUE },
    stepIllustration: { alignItems: 'center', gap: 4 },
    phoneWrapper: { alignItems: 'center', justifyContent: 'center', position: 'relative', width: 80, height: 90 },
    phoneMock: {
        position: 'absolute',
        alignItems: 'center', justifyContent: 'center',
    },
    faceCircleSmall: {
        position: 'absolute', top: 6,
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: '#EBF5FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: BLUE,
    },
    faceCircleLarge: {
        position: 'absolute', top: 0,
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: '#EBF5FF',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: BLUE,
    },
    stepDivider: {
        width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 8,
    },

    /* Tips */
    tipsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        gap: 14,
    },
    tipsTitle: {
        fontSize: 15, fontWeight: '700', color: '#1F2937',
    },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    tipIcon: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#10B981',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
    },
    tipText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

    /* Footer */
    footer: {
        paddingHorizontal: 20, paddingVertical: 16,
        backgroundColor: '#F0F9FF',
        borderTopWidth: 1, borderTopColor: '#E0EFFE',
    },
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10,
        backgroundColor: BLUE,
        borderRadius: 14,
        paddingVertical: 15,
        elevation: 3,
        shadowColor: BLUE,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
})
