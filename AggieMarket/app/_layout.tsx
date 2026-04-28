import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { WebSocketProvider } from "../context/WebSocketContext";

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = ["login", "register", "verify-email", "index"].includes(
      segments[0] as string
    );

    if (user && inAuthGroup) {
      router.replace("/home");
    } else if (!user && !inAuthGroup && segments[0] !== undefined) {
      router.replace("/");
    }
  }, [user, isLoading, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <RootNavigator />
      </WebSocketProvider>
    </AuthProvider>
  );
}
