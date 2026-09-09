import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { LayoutDashboard, Users, Activity, Dumbbell, Sparkles } from "lucide-react-native";
import { useTheme } from "@/src/theme";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: {
          alignSelf: "center",
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarTestID: "tab-dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Alunos",
          tabBarTestID: "tab-students",
          tabBarIcon: ({ color, size }) => <Users size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: "Avaliações",
          tabBarTestID: "tab-assessments",
          tabBarIcon: ({ color, size }) => <Activity size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: "Treinos",
          tabBarTestID: "tab-workouts",
          tabBarIcon: ({ color, size }) => <Dumbbell size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-coach"
        options={{
          title: "IA Coach",
          tabBarTestID: "tab-ai-coach",
          tabBarIcon: ({ color, size }) => <Sparkles size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
