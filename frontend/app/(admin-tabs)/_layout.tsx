import { Tabs } from "expo-router";
import { Users, UserCog } from "lucide-react-native";
import { useTheme } from "@/src/theme";

export default function AdminTabLayout() {
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
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Personais",
          tabBarIcon: ({ color }) => <UserCog size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: "Todos Alunos",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
