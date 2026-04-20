import * as Notifications from 'expo-notifications';
import { Platform, NativeModules } from 'react-native';
import * as Application from 'expo-application';
import baseAxios from '@/lib/baseAxios';

//config for notification
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Check if Firebase native module is available (not available in Expo Go)
function isFirebaseAvailable(): boolean {
  return !!NativeModules.RNFBAppModule;
}

//Request permission
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios' && isFirebaseAvailable()) {
      const messaging = require('@react-native-firebase/messaging').default;
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return enabled;
    }

    //android 13+
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    }

    // android<13
    return true;
  } catch (error) {
    console.error('[Notification] Permission request failed:', error);
    return false;
  }
}

//Get FCM token & register with backend
export async function registerFcmToken(): Promise<string | null> {
  if (!isFirebaseAvailable()) {
    console.warn('[Notification] Firebase not available (Expo Go). Skipping FCM token registration.');
    return null;
  }

  try {
    const granted = await requestNotificationPermission();
    if (!granted) {      return null;
    }

    const messaging = require('@react-native-firebase/messaging').default;
    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      console.warn('[Notification] Could not get FCM token.');
      return null;
    }

    // Resolve a stable device identifier to satisfy BE @NotBlank @Size(min=20)
    let deviceId: string
    if (Platform.OS === 'android') {
      deviceId = (await Application.getAndroidId()) ?? Application.applicationId ?? 'unknown-android'
    } else {
      deviceId = (await Application.getIosIdForVendorAsync()) ?? Application.applicationId ?? 'unknown-ios'
    }

    // Send token to your backend so it can push notifications to this device
    await baseAxios.post('/api/v1/notifications/register-token', {
      token: fcmToken,
      platform: Platform.OS.toUpperCase(),
      deviceId,
    });
    return fcmToken;
  } catch (error) {
    console.error('[Notification] Failed to register FCM token:', error);
    return null;
  }
}

// This will be called once from root layout to display in-app banners
export function setupForegroundMessageHandler(): () => void {
  if (!isFirebaseAvailable()) {
    console.warn('[Notification] Firebase not available (Expo Go). Skipping foreground handler.');
    return () => {}; // no-op cleanup
  }

  const messaging = require('@react-native-firebase/messaging').default;
  const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification?.title ?? 'Thông báo mới',
        body: remoteMessage.notification?.body ?? '',
        data: remoteMessage.data,
      },
      trigger: null, // show immediately
    });
  });

  return unsubscribe;
}

// Background / quit-state handler
// Must be called outside of any component, at the module level (top of _layout.tsx)
export function setupBackgroundMessageHandler(): void {
  if (!isFirebaseAvailable()) {
    console.warn('[Notification] Firebase not available (Expo Go). Skipping background handler.');
    return;
  }

  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {  });
}
