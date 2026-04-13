import React, { ReactNode, useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "../theme";

type AppBackgroundProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const PARTICLES = [
  { delay: 0, left: "8%", size: 1.5, top: "12%" },
  { delay: 700, left: "24%", size: 2, top: "19%" },
  { delay: 300, left: "72%", size: 1.4, top: "15%" },
  { delay: 1200, left: "88%", size: 2.1, top: "28%" },
  { delay: 900, left: "18%", size: 1.7, top: "43%" },
  { delay: 500, left: "49%", size: 1.2, top: "38%" },
  { delay: 1500, left: "79%", size: 1.8, top: "55%" },
  { delay: 400, left: "11%", size: 1.3, top: "68%" },
  { delay: 1100, left: "57%", size: 2, top: "78%" },
  { delay: 800, left: "86%", size: 1.5, top: "84%" },
] as const;

const AmbientParticle = ({
  delay,
  left,
  size,
  top,
}: (typeof PARTICLES)[number]) => {
  const drift = useSharedValue(0);
  const glow = useSharedValue(0.55);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, {
        duration: 5200 + delay,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    glow.value = withRepeat(
      withTiming(1, {
        duration: 3900 + delay,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [delay, drift, glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value * 0.14,
    transform: [
      { translateY: drift.value * -8 },
      { translateX: drift.value * 3 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          height: size,
          left,
          top,
          width: size,
        },
        animatedStyle,
      ]}
    />
  );
};

export const AppBackground = ({ children, style }: AppBackgroundProps) => {
  const { colors, isDark } = useAppTheme();

  const baseGradient = isDark
    ? (["#07071F", "#0A0A2E", "#111044"] as const)
    : (["#F8F5FF", "#ECE6FF", "#F7FDFF"] as const);

  const veilGradient = isDark
    ? ([
        "rgba(30,65,160,0.14)",
        "rgba(151,58,255,0.12)",
        "rgba(5,8,22,0.38)",
      ] as const)
    : ([
        "rgba(123,97,255,0.08)",
        "rgba(79,209,255,0.1)",
        "rgba(255,255,255,0.3)",
      ] as const);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }, style]}>
      <LinearGradient
        colors={baseGradient}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          styles.topGlow,
          isDark ? styles.topGlowDark : styles.topGlowLight,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          styles.centerGlow,
          isDark ? styles.centerGlowDark : styles.centerGlowLight,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          styles.lowerGlow,
          isDark ? styles.lowerGlowDark : styles.lowerGlowLight,
        ]}
      />
      <LinearGradient
        colors={veilGradient}
        end={{ x: 0.9, y: 1 }}
        locations={[0, 0.52, 1]}
        pointerEvents="none"
        start={{ x: 0.1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={
          isDark
            ? (["rgba(255,255,255,0.02)", "rgba(255,255,255,0)", "rgba(0,0,0,0.2)"] as const)
            : (["rgba(255,255,255,0.42)", "rgba(255,255,255,0.06)", "rgba(123,97,255,0.04)"] as const)
        }
        locations={[0, 0.5, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {PARTICLES.map((particle) => (
        <AmbientParticle key={`${particle.left}-${particle.top}`} {...particle} />
      ))}
      <View
        pointerEvents="none"
        style={[
          styles.grain,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.007)"
              : "rgba(123,97,255,0.01)",
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  centerGlow: {
    height: 360,
    left: -90,
    right: -90,
    top: "22%",
  },
  centerGlowDark: {
    backgroundColor: "rgba(124,58,237,0.16)",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.42,
    shadowRadius: 58,
  },
  centerGlowLight: {
    backgroundColor: "rgba(123,97,255,0.11)",
    shadowColor: "#7B61FF",
    shadowOpacity: 0.26,
    shadowRadius: 48,
  },
  glow: {
    borderRadius: 999,
    position: "absolute",
    shadowOffset: { width: 0, height: 0 },
  },
  grain: {
    ...StyleSheet.absoluteFillObject,
  },
  lowerGlow: {
    bottom: -150,
    height: 340,
    left: -80,
    right: -80,
  },
  lowerGlowDark: {
    backgroundColor: "rgba(79,209,255,0.05)",
    shadowColor: "#4FD1FF",
    shadowOpacity: 0.22,
    shadowRadius: 46,
  },
  lowerGlowLight: {
    backgroundColor: "rgba(79,209,255,0.08)",
    shadowColor: "#4FD1FF",
    shadowOpacity: 0.2,
    shadowRadius: 42,
  },
  particle: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 99,
    position: "absolute",
    shadowColor: "#C4B5FD",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.46,
    shadowRadius: 6,
  },
  root: {
    flex: 1,
    overflow: "hidden",
  },
  topGlow: {
    height: 240,
    right: -90,
    top: -70,
    width: 260,
  },
  topGlowDark: {
    backgroundColor: "rgba(137,221,255,0.08)",
    shadowColor: "#89DDFF",
    shadowOpacity: 0.28,
    shadowRadius: 44,
  },
  topGlowLight: {
    backgroundColor: "rgba(255,255,255,0.5)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.28,
    shadowRadius: 38,
  },
});
