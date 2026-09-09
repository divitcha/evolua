import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { useTheme } from "@/src/theme";

export default function Index() {
  const { token, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return <Redirect href={token ? "/(tabs)" : "/login"} />;
}
