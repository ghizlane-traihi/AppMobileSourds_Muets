import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "signlink:theme-preference";

// ─── Color palettes ─────────────────────────────────────────────────────────

const lightColors = {
  // Backgrounds
  background: "#F5F2FB",
  navigationBackground: "#F0ECF8",
  surface: "#FFFFFF",
  surfaceMuted: "#F8F5FF",
  surfaceAccent: "#EDE8FF",
  surfaceElevated: "#FFFFFF",
  hero: "#1E1348",
  heroAccent: "#2A1B5E",

  // Glass effects
  glassBg: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(140,100,255,0.18)",
  glassCardBg: "rgba(255,255,255,0.85)",
  glassCardBorder: "rgba(140,100,255,0.12)",

  // Gradient backgrounds
  gradientStart: "#E8E0F8",
  gradientMid: "#DDD4F4",
  gradientEnd: "#D0C4EE",

  // Text
  text: "#1A1035",
  textSecondary: "#5E5480",
  textMuted: "#8B80A8",
  textOnDark: "#FFFFFF",

  // Borders
  border: "#E0D8F0",

  // Brand
  primary: "#7C5CFC",
  primarySoft: "#EDE8FF",
  primarySofter: "#F5F2FF",
  primaryText: "#FFFFFF",
  accent: "#4FD1FF",

  // Status
  success: "#18744E",
  successSoft: "#DCFCE7",
  warning: "#A76B11",
  warningSoft: "#FFF9EF",
  warningBorder: "#E6D8BC",
  danger: "#B42318",
  dangerSoft: "#FFF2EF",
  dangerBorder: "#F7C7BD",

  // Misc
  overlay: "rgba(15, 23, 42, 0.5)",
  shadow: "rgba(100, 60, 200, 0.08)",
  idle: "#10B981",
  recording: "#DC2626",
  white: "#FFFFFF",

  // Kicker / eyebrow
  kicker: "#7C5CFC",
  kickerGlow: "rgba(124,92,252,0.3)",
};

const darkColors = {
  // Backgrounds
  background: "#07071F",
  navigationBackground: "#07071F",
  surface: "#0F0F2E",
  surfaceMuted: "#131340",
  surfaceAccent: "#1A1A50",
  surfaceElevated: "#151545",
  hero: "#09131F",
  heroAccent: "#122338",

  // Glass effects
  glassBg: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.1)",
  glassCardBg: "rgba(255,255,255,0.05)",
  glassCardBorder: "rgba(255,255,255,0.08)",

  // Gradient backgrounds
  gradientStart: "#07071F",
  gradientMid: "#0A0A2E",
  gradientEnd: "#111044",

  // Text
  text: "#F8FAFC",
  textSecondary: "#C5D0DB",
  textMuted: "#8B99AB",
  textOnDark: "#FFFFFF",

  // Borders
  border: "#1E1E4A",

  // Brand
  primary: "#7C5CFC",
  primarySoft: "#1E1650",
  primarySofter: "#141038",
  primaryText: "#FFFFFF",
  accent: "#89DDFF",

  // Status
  success: "#4ADE80",
  successSoft: "#173624",
  warning: "#FBBF24",
  warningSoft: "#3A2A0F",
  warningBorder: "#5A4316",
  danger: "#F87171",
  dangerSoft: "#3A1717",
  dangerBorder: "#6B2626",

  // Misc
  overlay: "rgba(2, 6, 23, 0.94)",
  shadow: "rgba(2, 6, 23, 0.42)",
  idle: "#34D399",
  recording: "#F87171",
  white: "#FFFFFF",

  // Kicker / eyebrow
  kicker: "#89DDFF",
  kickerGlow: "rgba(137,221,255,0.4)",
};

// ─── Theme context ──────────────────────────────────────────────────────────

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  isDark: boolean;
  themeMode: ThemeMode;
  colors: typeof darkColors;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  themeMode: "system",
  colors: darkColors,
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const isDark =
    themeMode === "system"
      ? systemScheme === "dark"
      : themeMode === "dark";

  const value: ThemeContextValue = {
    isDark,
    themeMode,
    colors: isDark ? darkColors : lightColors,
    setThemeMode,
  };

  if (!loaded) return null;

  return React.createElement(ThemeContext.Provider, { value }, children);
};

export const useAppTheme = () => useContext(ThemeContext);

export type AppThemeColors = typeof darkColors;
