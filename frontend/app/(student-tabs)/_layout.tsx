import { Tabs } from "expo-router";
import { LayoutDashboard, Target, Apple, TrendingUp } from "lucide-react-native";
import { useTheme } from "@/src/theme";
import { Platform } from "react-native";

export default function StudentTabsLayout() {
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
          height: Platform.OS === "ios" ? 85 : 60,
          paddingBottom: Platform.OS === "ios" ? 25 : 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="evolution"
        options={{
          title: "Evolução",
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Dieta",
          tabBarIcon: ({ color }) => <Apple size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Metas",
          tabBarIcon: ({ color }) => <Target size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
