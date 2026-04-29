import "../global.css";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { WebSocketProvider } from "../context/WebSocketContext";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

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

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const conversationId = response.notification.request.content.data?.conversation_id as string | undefined;
      if (conversationId) {
        router.push(`/inbox?conversationId=${conversationId}`);
      }
    });
    return () => sub.remove();
  }, []);

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
