import AuthProvider from "@/context/AuthContext";
import { setupBackgroundMessageHandler, setupForegroundMessageHandler, registerFcmToken } from "@/services/notification-service";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";

// Must be called at module level (outside component) for background/quit state
setupBackgroundMessageHandler();

export default function RootLayout() {
  useEffect(() => {
    // Request permission + get FCM token + register with backend
    registerFcmToken();

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
          <Stack.Screen name="screen/login" options={{ headerShown: false }} />
          <Stack.Screen name="screen/register" options={{ headerShown: false }} />
          <Stack.Screen name="screen/forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="screen/event-feed" options={{ headerShown: false }} />
          <Stack.Screen name="screen/event-detail" options={{ headerShown: false }} />
          <Stack.Screen name="screen/my-applications" options={{ headerShown: false }} />
          <Stack.Screen name="screen/org-detail" options={{ headerShown: false }} />
          <Stack.Screen name="(vol-tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(host-tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}