import { useAuth } from "@/context/AuthContext"
import { useRouter } from "expo-router"
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const HostPersonal = () => {
    const { logout } = useAuth()
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
                        router.replace('/screen/login')
                    },
                },
            ]
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Cá nhân (Host)</Text>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
    title: { fontSize: 18, fontWeight: '600' },
    logoutBtn: { backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default HostPersonal
