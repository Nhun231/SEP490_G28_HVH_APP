import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import "./globals.css";
import {SafeAreaProvider} from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <>
        <SafeAreaProvider>
      <StatusBar hidden={true} />

      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
        </SafeAreaProvider>
    </>
  );
}