import AuthProvider from "@/context/AuthContext";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "./globals.css";
import { useEffect } from "react";
import { requestUserPermission } from "@/services/request-noti-permission";
export default function RootLayout() {
  useEffect(() => {
    requestUserPermission();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar hidden={true} />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="screen/login" options={{ headerShown: false }} />
          <Stack.Screen name="screen/register" options={{ headerShown: false }} />
          <Stack.Screen name="screen/event-feed" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(host-tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}