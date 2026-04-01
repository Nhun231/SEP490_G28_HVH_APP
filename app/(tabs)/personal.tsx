import { useAuth } from '@/context/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── Service menu items ────────────────────────────────────────────────────────
const SERVICES = [
    { icon: 'calendar-outline', label: 'Hoạt động\nđã báo danh', color: '#F97316', bg: '#FFF3EB' },
    { icon: 'checkmark-circle-outline', label: 'Hoạt động\nđã điểm danh', color: '#14B8A6', bg: '#E6FAF8' },
    { icon: 'share-social-outline', label: 'Khoảnh\nkhắc của tôi', color: '#8B5CF6', bg: '#F3EEFF' },
    { icon: 'card-outline', label: 'Dụng thẻ\ncộng tác', color: '#3B82F6', bg: '#EBF2FF' },
    { icon: 'chatbubble-outline', label: 'Đánh giá\ncủa tôi', color: '#A855F7', bg: '#F5F0FF' },
    { icon: 'lock-closed-outline', label: 'Đổi mật\nkhẩu', color: '#8B5CF6', bg: '#F3EEFF' },
] as const

export default function Personal() {
    const { logout, session, isLoggedIn } = useAuth()
    const router = useRouter()

    const handleLogout = () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc muốn đăng xuất không?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        await logout()
                        router.replace('/(tabs)/home' as any)
                    },
                },
            ]
        )
    }

    const email = session?.user?.email ?? ''
    const memberId = session?.user?.id ?? ''

    // ── Guest view ─────────────────────────────────────────────────────────────
    if (!isLoggedIn) {
        return (
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scrollContent, styles.guestContent]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTopRow} />
                        <View style={styles.profileRow}>
                            <View style={styles.avatarRing}>
                                <View style={styles.avatar}>
                                    <Ionicons name="person" size={32} color="#42A4F5" />
                                </View>
                            </View>
                            <View style={styles.profileInfo}>
                                <Text style={styles.profileName}>Khách</Text>
                                <Text style={styles.profileMotto}>Đăng nhập để trải nghiệm đầy đủ tính năng</Text>
                            </View>
                        </View>
                    </View>

                    {/* Guest CTA card */}
                    <View style={styles.section}>
                        <View style={styles.card}>
                            <View style={styles.guestIllustration}>
                                <Ionicons name="person-circle-outline" size={72} color="#42A4F5" />
                            </View>
                            <Text style={styles.guestTitle}>Chào mừng bạn!</Text>
                            <Text style={styles.guestSubtitle}>
                                Đăng nhập để xem hồ sơ, theo dõi hoạt động tình nguyện và nhận chứng chỉ.
                            </Text>

                            {/* Login button */}
                            <TouchableOpacity
                                style={styles.loginBtn}
                                activeOpacity={0.85}
                                onPress={() => router.push('/screen/login' as any)}
                            >
                                <Ionicons name="log-in-outline" size={20} color="#fff" />
                                <Text style={styles.loginBtnText}>Đăng nhập</Text>
                            </TouchableOpacity>

                            {/* Register link */}
                            <View style={styles.registerRow}>
                                <Text style={styles.registerPrompt}>Chưa có tài khoản? </Text>
                                <TouchableOpacity onPress={() => router.push('/screen/register' as any)}>
                                    <Text style={styles.registerLink}>Đăng ký ngay</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 24 }} />
                </ScrollView>
            </SafeAreaView>
        )
    }

    // ── Logged-in view ─────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Teal gradient header ──────────────────────────── */}
                <View style={styles.header}>
                    {/* Top row: back + chat */}
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile row */}
                    <View style={styles.profileRow}>
                        {/* Avatar placeholder */}
                        <View style={styles.avatarRing}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={32} color="#42A4F5" />
                            </View>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>Tình nguyện viên</Text>
                            <Text style={styles.profileMotto}>Làm công ích sống, sống ý nghĩa công ích</Text>
                        </View>
                    </View>

                    {/* ── Card 1: Member ID ───────────────────────────── */}
                    <View style={styles.card}>
                        <View style={styles.memberIdRow}>
                            <View>
                                <Text style={styles.cardLabel}>MÃ TÌNH NGUYỆN VIÊN</Text>
                                <View style={styles.memberIdValueRow}>
                                    <Text style={styles.memberId}>{memberId}</Text>
                                    <TouchableOpacity style={styles.copyBtn}>
                                        <Ionicons name="copy-outline" size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.profileBtn}>
                                <Ionicons name="create-outline" size={14} color="#42A4F5" />
                                <Text style={styles.profileBtnText}>Thông tin cá nhân</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── Card 2: Certificate store ─────────────────────── */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
                        <View style={styles.certRow}>
                            <View style={styles.certIcon}>
                                <Ionicons name="ribbon" size={22} color="#fff" />
                            </View>
                            <View style={styles.certInfo}>
                                <Text style={styles.certTitle}>Kho chứng chỉ</Text>
                                <Text style={styles.certSub}>Bạn đã nhận được 0 chứng chỉ</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── Card 3: Services grid ─────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Dịch vụ của tôi</Text>
                        <View style={styles.serviceGrid}>
                            {SERVICES.map((svc, idx) => (
                                <TouchableOpacity key={idx} style={styles.serviceItem} activeOpacity={0.7}>
                                    <View style={[styles.serviceIconWrap, { backgroundColor: svc.bg }]}>
                                        <Ionicons name={svc.icon as any} size={24} color={svc.color} />
                                    </View>
                                    <Text style={styles.serviceLabel}>{svc.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── Card 4: Logout ────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
                            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                            <Text style={styles.logoutText}>Đăng xuất</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>
        </SafeAreaView>
    )
}

const TEAL = '#42A4F5'

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: TEAL,
    },
    scroll: {
        flex: 1,
        backgroundColor: '#E3F2FD',
    },
    content: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
        gap: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        color: '#1f2937',
    },
    logoutButton: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    logoutText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },
    scrollContent: {
        backgroundColor: '#F3F4F6',
    },

    // ── Header (teal bg) ─────────────────────────────────────────────────────
    header: {
        backgroundColor: TEAL,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        marginTop: 4,
    },
    iconBtn: {
        padding: 4,
    },

    // Profile
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E0F2FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: { flex: 1 },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    profileMotto: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 17,
    },

    // Card (white box)
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 3,
    },

    // Member ID card
    memberIdRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    memberIdValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    memberId: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    copyBtn: { padding: 2 },
    profileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#42A4F5',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 4,
    },
    profileBtnText: {
        fontSize: 12,
        color: '#42A4F5',
        fontWeight: '600',
    },

    // Section spacing
    section: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    // Certificate card
    certRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    certIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    certInfo: { flex: 1 },
    certTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    certSub: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },

    // Services grid
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 16,
    },
    serviceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceItem: {
        width: '22%',
        alignItems: 'center',
        marginBottom: 8,
    },
    serviceIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    serviceLabel: {
        fontSize: 11,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 15,
    },

    // Logout row
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
    },

    // ── Guest view ──────────────────────────────────────────────────────────
    guestContent: {
        flexGrow: 1,
    },
    guestIllustration: {
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    guestTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    guestSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
    },
    loginBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#42A4F5',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
        marginBottom: 16,
    },
    loginBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    registerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerPrompt: {
        fontSize: 14,
        color: '#6B7280',
    },
    registerLink: {
        fontSize: 14,
        fontWeight: '700',
        color: '#42A4F5',
    },
})