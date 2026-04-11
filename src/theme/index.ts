import { useColorScheme } from "react-native";

const lightColors = {
  background: "#F7F4EE",
  navigationBackground: "#F6F1E8",
  surface: "#FFFFFF",
  surfaceMuted: "#FAF6EF",
  surfaceAccent: "#EEF5FF",
  surfaceElevated: "#FFFDFC",
  hero: "#10233B",
  heroAccent: "#18375B",
  text: "#10233B",
  textSecondary: "#5E6F80",
  textMuted: "#6D7D8C",
  border: "#E6DED1",
  primary: "#1B6EF3",
  primarySoft: "#DBEAFE",
  primarySofter: "#EEF5FF",
  primaryText: "#FFFFFF",
  success: "#18744E",
  successSoft: "#DCFCE7",
  warning: "#A76B11",
  warningSoft: "#FFF9EF",
  warningBorder: "#E6D8BC",
  danger: "#B42318",
  dangerSoft: "#FFF2EF",
  dangerBorder: "#F7C7BD",
  overlay: "rgba(15, 23, 42, 0.92)",
  shadow: "rgba(16, 35, 59, 0.12)",
  idle: "#10B981",
  recording: "#DC2626",
  white: "#FFFFFF",
};

const darkColors = {
  background: "#0B1522",
  navigationBackground: "#0A1320",
  surface: "#132235",
  surfaceMuted: "#182A3F",
  surfaceAccent: "#102846",
  surfaceElevated: "#17283D",
  hero: "#09131F",
  heroAccent: "#122338",
  text: "#F5F7FA",
  textSecondary: "#C5D0DB",
  textMuted: "#91A2B4",
  border: "#24384F",
  primary: "#60A5FA",
  primarySoft: "#163353",
  primarySofter: "#102846",
  primaryText: "#08121E",
  success: "#4ADE80",
  successSoft: "#173624",
  warning: "#FBBF24",
  warningSoft: "#3A2A0F",
  warningBorder: "#5A4316",
  danger: "#F87171",
  dangerSoft: "#3A1717",
  dangerBorder: "#6B2626",
  overlay: "rgba(2, 6, 23, 0.94)",
  shadow: "rgba(2, 6, 23, 0.42)",
  idle: "#34D399",
  recording: "#F87171",
  white: "#FFFFFF",
};

export const useAppTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
  };
};

export type AppThemeColors = ReturnType<typeof useAppTheme>["colors"];
