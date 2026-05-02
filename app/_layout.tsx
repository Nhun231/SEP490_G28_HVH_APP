import AuthProvider from "@/context/AuthContext";
import { setupBackgroundMessageHandler, setupForegroundMessageHandler } from "@/services/notification-service";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";

// Must be called at module level (outside component) for background/quit state
setupBackgroundMessageHandler();

export default function RootLayout() {
  useEffect(() => {
    // Listen for foreground messages and show them as banners
    const unsubscribe = setupForegroundMessageHandler();
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar hidden={true} />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          {/* Common */}
          <Stack.Screen name="screen/common/login" options={{ headerShown: false }} />
          <Stack.Screen name="screen/register" options={{ headerShown: false }} />
          <Stack.Screen name="screen/common/forgot-password" options={{ headerShown: false }} />
          {/* Volunteer screens */}
          <Stack.Screen name="screen/volunteer-screens/event-feed" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/event-detail-vol" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/my-applications" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/vol-profile" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/org-detail" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/org-events" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/checkin-code" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/checkin-timer" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/rating-event" options={{ headerShown: false }} />
          <Stack.Screen name="screen/volunteer-screens/register-face" options={{ headerShown: false }} />
          {/* Host screens */}
          <Stack.Screen name="screen/host-screens/event-detail-host" options={{ headerShown: false }} />
          <Stack.Screen name="screen/host-screens/create-event" options={{ headerShown: false }} />
          <Stack.Screen name="screen/host-screens/event-applications" options={{ headerShown: false }} />
          <Stack.Screen name="screen/host-screens/event-rating" options={{ headerShown: false }} />
          <Stack.Screen name="screen/host-screens/event-moments" options={{ headerShown: false }} />
          <Stack.Screen name="screen/host-screens/event-moment-detail" options={{ headerShown: false }} />
          <Stack.Screen name="screen/host-screens/honor-hour-requests" options={{ headerShown: false }} />
          {/* Tab groups — disable swipe-back: tab screens are root-level, should not be dismissable */}
          <Stack.Screen name="(vol-tabs)" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="(host-tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}