import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

// Dark-First Utility Theme for ApexTrainer OS (Personality #7)
const dark = {
  surface: "#121417",
  onSurface: "#F4F5F7",
  surfaceSecondary: "#1A1D23",
  onSurfaceSecondary: "#9CA3AF",
  surfaceTertiary: "#232730",
  onSurfaceTertiary: "#D1D5DB",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#121417",
  muted: "#6B7280",

  brand: "#FF5722",
  onBrand: "#FFFFFF",
  brandPrimary: "#FF5722",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FF7043",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(255, 87, 34, 0.15)",
  onBrandTertiary: "#FF5722",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#2A2F3A",
  borderStrong: "#FF5722",
  divider: "#1F242D",
  cardHover: "#262B35",
  accentCyan: "#06B6D4",
  accentAmber: "#F59E0B",
  accentPurple: "#8B5CF6",
};

const light = {
  surface: "#F8FAFC",
  onSurface: "#0F172A",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#475569",
  surfaceTertiary: "#F1F5F9",
  onSurfaceTertiary: "#334155",
  surfaceInverse: "#0F172A",
  onSurfaceInverse: "#FFFFFF",
  muted: "#64748B",

  brand: "#FF5722",
  onBrand: "#FFFFFF",
  brandPrimary: "#FF5722",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#FF7043",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(255, 87, 34, 0.12)",
  onBrandTertiary: "#FF5722",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#E2E8F0",
  borderStrong: "#FF5722",
  divider: "#E2E8F0",
  cardHover: "#F1F5F9",
  accentCyan: "#0891B2",
  accentAmber: "#D97706",
  accentPurple: "#7C3AED",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
