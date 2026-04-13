import React, { ReactNode, useEffect } from "react";
import { ColorValue, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "../theme";

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

type GlassCardProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  featured?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

type GlassButtonProps = {
  children: ReactNode;
  colors?: GradientColors;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  soft?: boolean;
  style?: StyleProp<ViewStyle>;
};

const CARD_EDGE_COLORS: GradientColors = [
  "rgba(255,255,255,0.36)",
  "rgba(134,218,255,0.16)",
  "rgba(190,87,255,0.56)",
  "rgba(93,68,255,0.22)",
  "rgba(255,255,255,0.14)",
];

const CARD_SURFACE_COLORS: GradientColors = [
  "rgba(48,35,101,0.38)",
  "rgba(28,21,67,0.5)",
  "rgba(12,9,34,0.72)",
];

const LIGHT_CARD_EDGE_COLORS: GradientColors = [
  "rgba(255,255,255,0.78)",
  "rgba(123,97,255,0.16)",
  "rgba(79,209,255,0.12)",
  "rgba(91,61,245,0.14)",
  "rgba(255,255,255,0.54)",
];

const LIGHT_CARD_SURFACE_COLORS: GradientColors = [
  "rgba(255,255,255,0.7)",
  "rgba(248,245,255,0.6)",
  "rgba(238,232,255,0.48)",
];

const BUTTON_EDGE_COLORS: GradientColors = [
  "rgba(255,255,255,0.14)",
  "rgba(123,97,255,0.28)",
  "rgba(91,61,245,0.52)",
  "rgba(63,43,191,0.32)",
];

const DEFAULT_BUTTON_COLORS: GradientColors = ["#7B61FF", "#5B3DF5", "#3F2BBF"];

export const GlassCard = ({
  children,
  contentStyle,
  featured = false,
  radius = 24,
  style,
}: GlassCardProps) => {
  const { isDark } = useAppTheme();
  const shimmerX = useSharedValue(-120);
  const cardEdgeColors = isDark ? CARD_EDGE_COLORS : LIGHT_CARD_EDGE_COLORS;
  const cardSurfaceColors = isDark ? CARD_SURFACE_COLORS : LIGHT_CARD_SURFACE_COLORS;

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(240, {
        duration: featured ? 4800 : 6200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [featured, shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { rotate: "12deg" }],
  }));

  return (
    <View
      style={[
        styles.cardShell,
        featured ? styles.cardShellFeatured : styles.cardShellSoft,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.cardOuterGlow,
          featured ? styles.cardOuterGlowFeatured : styles.cardOuterGlowSoft,
          { borderRadius: radius + 3 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.cardAmbientLift,
          featured ? styles.cardAmbientLiftFeatured : styles.cardAmbientLiftSoft,
          { borderRadius: radius + 7 },
        ]}
      />
      <LinearGradient
        colors={
          isDark
            ? (["rgba(255,255,255,0.16)", "rgba(196,87,255,0.09)", "rgba(123,97,255,0)"] as const)
            : (["rgba(255,255,255,0.58)", "rgba(123,97,255,0.1)", "rgba(79,209,255,0)"] as const)
        }
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={[styles.cardSoftEdgeHalo, { borderRadius: radius + 4 }]}
      />
      <LinearGradient
        colors={cardEdgeColors}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.cardEdgeLayer, { borderRadius: radius }]}
      >
        <LinearGradient
          colors={cardSurfaceColors}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[styles.cardSurface, { borderRadius: radius - 1 }, contentStyle]}
        >
          <LinearGradient
            colors={
              isDark
                ? (["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0)"] as const)
                : (["rgba(255,255,255,0.36)", "rgba(255,255,255,0.14)", "rgba(255,255,255,0)"] as const)
            }
            end={{ x: 0.8, y: 0.85 }}
            pointerEvents="none"
            start={{ x: 0.02, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={
              isDark
                ? (["rgba(142,78,255,0.1)", "rgba(98,36,190,0.05)", "rgba(8,5,27,0)"] as const)
                : (["rgba(123,97,255,0.06)", "rgba(79,209,255,0.04)", "rgba(255,255,255,0)"] as const)
            }
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
            start={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.cardTopRightLight} />
          <View pointerEvents="none" style={styles.cardLowerVioletLight} />
          <Animated.View pointerEvents="none" style={[styles.cardMovingRefraction, shimmerStyle]}>
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.09)", "rgba(255,255,255,0)"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View
            pointerEvents="none"
            style={[
              styles.innerHighlight,
              { borderRadius: radius - 2 },
            ]}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.42)", "rgba(180,226,255,0.1)", "rgba(255,255,255,0)"]}
            end={{ x: 1, y: 0 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={styles.topEdgeRefraction}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.22)", "rgba(181,118,255,0.08)", "rgba(255,255,255,0)"]}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={styles.leftEdgeRefraction}
          />
          <LinearGradient
            colors={["rgba(79,209,255,0.18)", "rgba(193,91,255,0.08)", "rgba(123,97,255,0)"]}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            start={{ x: 1, y: 0 }}
            style={styles.rightEdgeRefraction}
          />
          <LinearGradient
            colors={["rgba(123,97,255,0)", "rgba(190,73,255,0.12)"]}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            start={{ x: 0, y: 0 }}
            style={styles.bottomEdgeBleed}
          />
          {children}
        </LinearGradient>
      </LinearGradient>
    </View>
  );
};

export const GlassButton = ({
  children,
  colors = DEFAULT_BUTTON_COLORS,
  contentStyle,
  radius = 24,
  soft = false,
  style,
}: GlassButtonProps) => {
  const sheenX = useSharedValue(-90);

  useEffect(() => {
    sheenX.value = withRepeat(
      withTiming(180, {
        duration: soft ? 5200 : 3600,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [sheenX, soft]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheenX.value }, { rotate: "10deg" }],
  }));

  return (
    <View style={[styles.buttonShell, soft ? styles.buttonShellSoft : styles.buttonShellStrong, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.buttonOuterGlow,
          soft ? styles.buttonOuterGlowSoft : styles.buttonOuterGlowStrong,
          { borderRadius: radius + 3 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.buttonUnderGlow,
          soft ? styles.buttonUnderGlowSoft : styles.buttonUnderGlowStrong,
          { borderRadius: radius + 5 },
        ]}
      />
      <LinearGradient
        colors={BUTTON_EDGE_COLORS}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[styles.buttonEdgeLayer, { borderRadius: radius }]}
      >
        <LinearGradient
          colors={colors}
          end={{ x: 1, y: 0.95 }}
          start={{ x: 0, y: 0 }}
          style={[styles.buttonSurface, { borderRadius: radius - 1 }, contentStyle]}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0)"]}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
            start={{ x: 0.5, y: 0 }}
            style={styles.buttonTopReflection}
          />
          <Animated.View pointerEvents="none" style={[styles.buttonMovingSheen, sheenStyle]}>
            <LinearGradient
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View
            pointerEvents="none"
            style={[styles.buttonInnerHighlight, { borderRadius: radius - 2 }]}
          />
          <View pointerEvents="none" style={styles.buttonTopStrip} />
          <View pointerEvents="none" style={styles.buttonInnerGlow} />
          <View pointerEvents="none" style={styles.buttonCoreGlow} />
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(0,0,0,0.2)"]}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
            start={{ x: 0.5, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {children}
        </LinearGradient>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    position: "relative",
    shadowColor: "#7B61FF",
    shadowOffset: { width: 0, height: 18 },
  },
  cardShellFeatured: {
    elevation: 18,
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  cardShellSoft: {
    elevation: 12,
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  cardOuterGlow: {
    bottom: -7,
    left: -7,
    position: "absolute",
    right: -7,
    shadowColor: "#7B61FF",
    shadowOffset: { width: 0, height: 0 },
    top: -7,
  },
  cardOuterGlowFeatured: {
    backgroundColor: "rgba(143,72,255,0.045)",
    shadowOpacity: 0.22,
    shadowRadius: 18,
  },
  cardOuterGlowSoft: {
    backgroundColor: "rgba(150,67,255,0.035)",
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  cardAmbientLift: {
    bottom: -12,
    left: 10,
    position: "absolute",
    right: 10,
    shadowColor: "#C44DFF",
    shadowOffset: { width: 0, height: 0 },
    top: 10,
  },
  cardAmbientLiftFeatured: {
    backgroundColor: "rgba(190,73,255,0.035)",
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  cardAmbientLiftSoft: {
    backgroundColor: "rgba(190,73,255,0.025)",
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  cardSoftEdgeHalo: {
    bottom: -3,
    left: -3,
    opacity: 0.34,
    position: "absolute",
    right: -3,
    top: -3,
  },
  cardEdgeLayer: {
    padding: 1.7,
  },
  cardSurface: {
    overflow: "hidden",
  },
  innerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
  },
  cardTopRightLight: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 90,
    height: 116,
    position: "absolute",
    right: -40,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    top: -56,
    width: 156,
  },
  cardLowerVioletLight: {
    backgroundColor: "rgba(196,73,255,0.1)",
    borderRadius: 100,
    bottom: -72,
    height: 120,
    left: 28,
    position: "absolute",
    right: 28,
    shadowColor: "#C44DFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  cardMovingRefraction: {
    bottom: -42,
    opacity: 0.52,
    position: "absolute",
    top: -42,
    width: 50,
  },
  topEdgeRefraction: {
    height: 4,
    left: 16,
    position: "absolute",
    right: 30,
    top: 1,
  },
  leftEdgeRefraction: {
    bottom: 28,
    left: 1,
    position: "absolute",
    top: 14,
    width: 2,
  },
  rightEdgeRefraction: {
    bottom: 18,
    position: "absolute",
    right: 0,
    top: 8,
    width: 2,
  },
  bottomEdgeBleed: {
    bottom: 0,
    height: 54,
    left: 0,
    position: "absolute",
    right: 0,
  },
  buttonShell: {
    position: "relative",
    shadowColor: "#5B3DF5",
    shadowOffset: { width: 0, height: 10 },
  },
  buttonShellStrong: {
    elevation: 9,
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  buttonShellSoft: {
    elevation: 6,
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  buttonOuterGlow: {
    bottom: -6,
    left: -6,
    position: "absolute",
    right: -6,
    shadowColor: "#5B3DF5",
    shadowOffset: { width: 0, height: 0 },
    top: -6,
  },
  buttonOuterGlowStrong: {
    backgroundColor: "rgba(91,61,245,0.06)",
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  buttonOuterGlowSoft: {
    backgroundColor: "rgba(91,61,245,0.04)",
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  buttonUnderGlow: {
    bottom: -9,
    left: 9,
    position: "absolute",
    right: 9,
    shadowColor: "#5B3DF5",
    shadowOffset: { width: 0, height: 0 },
    top: 8,
  },
  buttonUnderGlowStrong: {
    backgroundColor: "rgba(63,43,191,0.055)",
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  buttonUnderGlowSoft: {
    backgroundColor: "rgba(63,43,191,0.04)",
    shadowOpacity: 0.1,
    shadowRadius: 9,
  },
  buttonEdgeLayer: {
    padding: 1.5,
  },
  buttonSurface: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    overflow: "hidden",
  },
  buttonInnerHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
  },
  buttonTopStrip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    height: 1.6,
    left: 14,
    position: "absolute",
    right: 20,
    top: 1,
  },
  buttonMovingSheen: {
    bottom: -22,
    opacity: 0.5,
    position: "absolute",
    top: -22,
    width: 34,
  },
  buttonInnerGlow: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    height: 17,
    left: 10,
    position: "absolute",
    right: 14,
    top: 5,
  },
  buttonCoreGlow: {
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 999,
    bottom: 7,
    left: 18,
    position: "absolute",
    right: 18,
    top: 8,
  },
  buttonTopReflection: {
    height: "30%",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
