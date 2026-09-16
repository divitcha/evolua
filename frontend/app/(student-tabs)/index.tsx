import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";

export default function StudentDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface, marginTop: 24 }}>
        Resumo do Aluno
      </Text>
      <Text style={{ fontSize: 16, color: colors.onSurfaceSecondary, marginTop: 8 }}>
        Em breve: Cards de evolução, hidratação e treinos!
      </Text>
    </View>
  );
}
