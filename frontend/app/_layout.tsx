import { useEffect } from "react";
import { Platform } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { LogBox } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
// import * as Notifications from "expo-notifications";
const Notifications: any = {
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async () => {},
  deleteNotificationChannelAsync: async () => {},
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  dismissAllNotificationsAsync: async () => {},
  setBadgeCountAsync: async () => {},
  getLastNotificationResponseAsync: async () => null,
  useLastNotificationResponse: () => null,
  removeNotificationSubscription: () => {},
  AndroidImportance: { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5, NONE: 0, UNSPECIFIED: 0 },
  AndroidNotificationPriority: { MIN: "min", LOW: "low", DEFAULT: "default", HIGH: "high", MAX: "max" },
  AndroidNotificationVisibility: { UNKNOWN: 0, PUBLIC: 1, PRIVATE: 2, SECRET: 3 },
  SchedulableTriggerInputTypes: { DATE: "date", DAILY: "daily", WEEKLY: "weekly", YEARLY: "yearly", TIME_INTERVAL: "timeInterval", MONTHLY: "monthly" },
  requestPermissionsAsync: async () => ({ status: "denied" }),
  getPermissionsAsync: async () => ({ status: "denied" }),
  getExpoPushTokenAsync: async () => ({ data: "" }),
  scheduleNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
};
import * as Linking from "expo-linking";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth/AuthContext";
import { api } from "@/src/api/client";

// Disable logbox errors etc so that users can see the app
LogBox.ignoreAllLogs(true);

// Push: foreground handler (module scope, native only)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Push: Android channel (module scope)
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

async function registerForPush(userId: string) {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tokenResp = await Notifications.getDevicePushTokenAsync();
    await api.registerPush(userId, Platform.OS, String(tokenResp.data));
  } catch {
    // non-blocking
  }
}

function RootNavigator() {
  const { token, user, role, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const onLogin = segments[0] === "login";
    if (!token && !onLogin) {
      router.replace("/login");
    } else if (token && onLogin) {
      if (role === "student") {
        router.replace("/(student-tabs)");
      } else {
        router.replace("/");
      }
    }
  }, [token, role, loading, segments]);

  // Register for push + tap handlers once authenticated
  useEffect(() => {
    if (Platform.OS === "web" || !token || !user) return;

    registerForPush(user.id);

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data || {};
      const url = (data.action_url || data.deeplink) as string | undefined;
      if (!url) return;
      url.startsWith("http") ? Linking.openURL(url) : router.push(url as any);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = response.notification.request.content.data || {};
      const url = (data.action_url || data.deeplink) as string | undefined;
      if (url) {
        url.startsWith("http") ? Linking.openURL(url) : router.push(url as any);
      }
    });

    return () => {
      tapSub.remove();
    };
  }, [token, user]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(student-tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="students/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="students/new" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="students/[id]/assessment/new" options={{ headerShown: false }} />
      <Stack.Screen name="students/[id]/workout/new" options={{ headerShown: false }} />
      <Stack.Screen name="students/[id]/anamnesis" options={{ headerShown: false }} />
      <Stack.Screen name="students/[id]/chat" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
