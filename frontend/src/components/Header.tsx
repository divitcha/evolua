import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../theme";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  testID?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  testID = "screen-header",
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12),
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && (
            <Pressable
              testID={`${testID}-back-button`}
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={22} color={colors.onSurface} />
            </Pressable>
          )}
          <View style={styles.titleContainer}>
            <Text testID={`${testID}-title`} style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text testID={`${testID}-subtitle`} style={[styles.subtitle, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
});
