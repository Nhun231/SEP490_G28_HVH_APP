import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_ASKED_KEY = 'false';

export async function requestUserPermission() {
    try {
        const hasAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
        if (hasAsked) {
            return;
        }

        if (Platform.OS === 'android') {
            if (Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: 'Notification permission',
                        message: 'App needs access to send notifications',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    },
                );

                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('Notification permission granted');
                } else {
                    console.log('Notification permission denied');
                }
            } else {
                console.log('Notification permission granted by default on older Android');
            }
        } else if (Platform.OS === 'ios') {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                console.log('Authorization status:', authStatus);
            }
        } else {
            console.log("Unknown platform")
        }

        await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    } catch (error) {
        console.log("Error requesting notification permission:", error);
    }
}
