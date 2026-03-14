import { useAuth } from "@/context/AuthContext"
import { useRouter } from "expo-router"
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const HostPersonal = () => {
    const { logout } = useAuth()
    const router = useRouter()

    const handleLogout = () => {
        Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đăng xuất',
                style: 'destructive',
                onPress: async () => {
                    await logout()
                    router.replace('/screen/login')
                },
            },
        ])
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Cá nhân (Host)</Text>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E3F2FD' },
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
})

export default HostPersonal
