import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import { useTheme } from "../theme";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string | number;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  onPress?: () => void;
  accentColor?: string;
  testID?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  delta,
  deltaType = "neutral",
  icon,
  onPress,
  accentColor,
  testID = "metric-card",
}) => {
  const { colors } = useTheme();

  const getDeltaBadgeColor = () => {
    if (deltaType === "positive") return colors.success;
    if (deltaType === "negative") return colors.error;
    return colors.muted;
  };

  const CardWrapper = onPress ? Pressable : View;

  return (
    <CardWrapper
      testID={testID}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: accentColor || colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}
      </View>

      <View style={styles.valueRow}>
        <Text testID={`${testID}-value`} style={[styles.value, { color: colors.onSurface }]}>
          {value}
        </Text>
        {unit ? (
          <Text style={[styles.unit, { color: colors.onSurfaceSecondary }]}> {unit}</Text>
        ) : null}
      </View>

      {delta !== undefined && (
        <View style={styles.deltaRow}>
          <View
            style={[
              styles.deltaBadge,
              {
                backgroundColor:
                  deltaType === "positive"
                    ? "rgba(16, 185, 129, 0.15)"
                    : deltaType === "negative"
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(107, 114, 128, 0.15)",
              },
            ]}
          >
            {deltaType === "positive" ? (
              <TrendingUp size={12} color={colors.success} style={styles.deltaIcon} />
            ) : deltaType === "negative" ? (
              <TrendingDown size={12} color={colors.error} style={styles.deltaIcon} />
            ) : (
              <Minus size={12} color={colors.muted} style={styles.deltaIcon} />
            )}
            <Text
              style={[
                styles.deltaText,
                {
                  color: getDeltaBadgeColor(),
                },
              ]}
            >
              {typeof delta === "number" && delta > 0 ? `+${delta}` : delta}
            </Text>
          </View>
        </View>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flex: 1,
  },
  iconWrapper: {
    marginLeft: 6,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 13,
    fontWeight: "600",
  },
  deltaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  deltaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deltaIcon: {
    marginRight: 3,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
