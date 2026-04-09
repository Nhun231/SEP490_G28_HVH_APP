import { useAuth } from "@/context/AuthContext"
import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import 'react-native-url-polyfill/auto'

function AppContent() {
    const { isLoggedIn, isLoading, role } = useAuth()

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#42A4F5" />
            </View>
        )
    }

    if (!isLoggedIn) return <Redirect href="/(vol-tabs)/home" />

    //check for role to navigate after login
    if (role === 'VOL') return <Redirect href="/(vol-tabs)/home" />
    if (role === 'HOST') return <Redirect href={"/(host-tabs)/dashboard" as any} />

    //unknown / unhandled role -> back to login
    return <Redirect href="/screen/login" />
}

export default function Index() {
    return <AppContent />
}
