import React from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { useTheme } from "../theme";

export interface ChipOption {
  id: string;
  label: string;
  count?: number;
  badgeColor?: string;
}

interface FilterChipRowProps {
  options: ChipOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  testIDPrefix?: string;
}

/**
 * P0 ZERO TOLERANCE: Filter chip row is chrome, not content.
 * Fixed sizes: chip 36pt, row 56pt.
 * flexShrink: 0 on each chip.
 * Selected chip changes color/border only, never its size or padding.
 */
export const FilterChipRow: React.FC<FilterChipRowProps> = ({
  options,
  selectedId,
  onSelect,
  testIDPrefix = "filter-chip",
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.rowContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              testID={`${testIDPrefix}-${option.id}`}
              onPress={() => onSelect(option.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.brandPrimary : colors.surfaceSecondary,
                  borderColor: isSelected ? colors.brandPrimary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? colors.onBrandPrimary : colors.onSurfaceSecondary,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {option.label}
              </Text>
              {typeof option.count === "number" && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isSelected
                        ? "rgba(255, 255, 255, 0.25)"
                        : option.badgeColor || colors.surfaceTertiary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: isSelected ? "#FFFFFF" : colors.onSurface },
                    ]}
                  >
                    {option.count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    height: 56,
    borderBottomWidth: 1,
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  chip: {
    height: 36,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
