import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";

export default function StudentGoalsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface, marginTop: 24 }}>
        Metas
      </Text>
    </View>
  );
}
