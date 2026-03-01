import Auth from "@/app/screen/login"
import Register from "@/app/screen/register"
import AuthProvider, { useAuth } from "@/context/AuthContext"
import { ActivityIndicator, View } from "react-native"
import 'react-native-url-polyfill/auto'

function AppContent() {
    const { isLoggedIn, isLoading } = useAuth()

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#42A4F5" />
            </View>
        )
    }

    // TODO: swap Register for your main screen once routing is set up
    return isLoggedIn ? <Register /> : <Auth />
}

export default function Index() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

