import * as Notifications from 'expo-notifications'
import { Platform, NativeModules } from 'react-native'
import * as Application from 'expo-application'
import baseAxios from '@/lib/baseAxios'

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
})

function isFirebaseAvailable(): boolean {
    return !!NativeModules.RNFBAppModule
}

export async function requestNotificationPermission(): Promise<boolean> {
    try {
        if (Platform.OS === 'ios' && isFirebaseAvailable()) {
            const messaging = require('@react-native-firebase/messaging').default
            const authStatus = await messaging().requestPermission()
            return (
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL
            )
        }
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            const { status } = await Notifications.requestPermissionsAsync()
            return status === 'granted'
        }
        return true 
    } catch (error) {
        console.error('[Notification] Permission request failed:', error)
        return false
    }
}

// Get FCM token and register with BE (call after login)
// Returns token string so caller can pass it to unregisterFcmToken() on logout
export async function registerFcmToken(): Promise<string | null> {
    if (!isFirebaseAvailable()) return null

    try {
        const granted = await requestNotificationPermission()
        if (!granted) return null

        const messaging = require('@react-native-firebase/messaging').default
        const fcmToken: string | null = await messaging().getToken()
        if (!fcmToken) return null

        let deviceId: string
        if (Platform.OS === 'android') {
            deviceId = (await Application.getAndroidId()) ?? Application.applicationId ?? 'unknown-android'
        } else {
            deviceId = (await Application.getIosIdForVendorAsync()) ?? Application.applicationId ?? 'unknown-ios'
        }

        await baseAxios.post('/api/v1/notifications/register-token', {
            token: fcmToken,
            platform: Platform.OS.toUpperCase(),
            deviceId,
        })

        return fcmToken
    } catch (error) {
        console.error('[Notification] Failed to register FCM token:', error)
        return null
    }
}

// Unregister device token on logout so BE stops sending to this device
export async function unregisterFcmToken(token: string): Promise<void> {
    if (!token) return
    try {
        await baseAxios.put(`/api/v1/notifications/unregister-token?token=${encodeURIComponent(token)}`)
    } catch (error) {
        console.warn('[Notification] Failed to unregister FCM token:', error)
    }
}

// Show in-app banner for FCM messages received while app is foregrounded
// Call once from root layout; returns cleanup function
export function setupForegroundMessageHandler(): () => void {
    if (!isFirebaseAvailable()) return () => {}

    const messaging = require('@react-native-firebase/messaging').default
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: remoteMessage.notification?.title ?? 'Thông báo mới',
                body: remoteMessage.notification?.body ?? '',
                data: remoteMessage.data,
            },
            trigger: null,
        })
    })

    return unsubscribe
}

// Must be called at module level (top of _layout.tsx), outside any component
export function setupBackgroundMessageHandler(): void {
    if (!isFirebaseAvailable()) return

    const messaging = require('@react-native-firebase/messaging').default
    messaging().setBackgroundMessageHandler(async (_remoteMessage: any) => {})
}
