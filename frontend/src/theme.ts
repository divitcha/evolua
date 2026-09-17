import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

// Dark-First Utility Theme for Treinaí
const dark = {
  surface: "#1A1D23", // Cinza Chumbo escuro
  onSurface: "#F4F5F7",
  surfaceSecondary: "#232730",
  onSurfaceSecondary: "#9CA3AF",
  surfaceTertiary: "#2E3440",
  onSurfaceTertiary: "#D1D5DB",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#1A1D23",
  muted: "#6B7280",

  brand: "#7C3AED", // Roxo (Modelo 2)
  onBrand: "#FFFFFF",
  brandPrimary: "#7C3AED",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#6D28D9",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(124, 58, 237, 0.15)",
  onBrandTertiary: "#7C3AED",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#374151",
  borderStrong: "#7C3AED",
  divider: "#2A2F3A",
  cardHover: "#2A2F3A",
  accentCyan: "#06B6D4",
  accentAmber: "#F59E0B",
  accentPurple: "#8B5CF6",
};

const light = {
  surface: "#F8FAFC",
  onSurface: "#1A1D23", // Cinza Chumbo escuro para textos
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#475569",
  surfaceTertiary: "#F1F5F9",
  onSurfaceTertiary: "#334155",
  surfaceInverse: "#1A1D23",
  onSurfaceInverse: "#FFFFFF",
  muted: "#64748B",

  brand: "#7C3AED", // Roxo (Modelo 2)
  onBrand: "#FFFFFF",
  brandPrimary: "#7C3AED",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#6D28D9",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "rgba(124, 58, 237, 0.12)",
  onBrandTertiary: "#7C3AED",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#E2E8F0",
  borderStrong: "#7C3AED",
  divider: "#E2E8F0",
  cardHover: "#F1F5F9",
  accentCyan: "#0891B2",
  accentAmber: "#D97706",
  accentPurple: "#7C3AED",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "light" satisfies ColorScheme;

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
