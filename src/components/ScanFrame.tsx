import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type ScanFrameProps = {
  /** Show extra glow intensity when recording */
  isRecording?: boolean;
  /** Legacy square frame size. Width/height override this when provided. */
  size?: number;
  /** Rounded rectangle width. */
  width?: number;
  /** Rounded rectangle height. */
  height?: number;
  /** Boost shimmer and particles while translating. */
  loading?: boolean;
};

// ─── Animated corner ────────────────────────────────────────────────────────

const CORNER_LENGTH = 32;
const CORNER_THICKNESS = 3;

const Corner = ({
  position,
  color,
}: {
  position: "tl" | "tr" | "bl" | "br";
  color: string;
}) => {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";

  return (
    <View
      pointerEvents="none"
      style={[
        styles.corner,
        isTop ? { top: 0 } : { bottom: 0 },
        isLeft ? { left: 0 } : { right: 0 },
      ]}
    >
      {/* Horizontal bar */}
      <View
        style={[
          styles.cornerBar,
          {
            width: CORNER_LENGTH,
            height: CORNER_THICKNESS,
            backgroundColor: color,
            borderRadius: CORNER_THICKNESS,
          },
          isTop ? { top: 0 } : { bottom: 0 },
          isLeft ? { left: 0 } : { right: 0 },
        ]}
      />
      {/* Vertical bar */}
      <View
        style={[
          styles.cornerBar,
          {
            width: CORNER_THICKNESS,
            height: CORNER_LENGTH,
            backgroundColor: color,
            borderRadius: CORNER_THICKNESS,
          },
          isTop ? { top: 0 } : { bottom: 0 },
          isLeft ? { left: 0 } : { right: 0 },
        ]}
      />
    </View>
  );
};

// ─── Floating particle ──────────────────────────────────────────────────────

const Particle = ({
  delay,
  startX,
  startY,
  size: particleSize,
}: {
  delay: number;
  startX: number;
  startY: number;
  size: number;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 1200,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 1200,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -40,
            duration: 1000,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          width: particleSize,
          height: particleSize,
          borderRadius: particleSize / 2,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

// ─── ScanFrame ──────────────────────────────────────────────────────────────

export const ScanFrame = ({
  isRecording = false,
  loading = false,
  size = 280,
  width,
  height,
}: ScanFrameProps) => {
  const glowOpacity = useRef(new Animated.Value(0.35)).current;
  const scanLine = useRef(new Animated.Value(0)).current;

  const frameWidth = width ?? size;
  const frameHeight = height ?? size;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: isRecording || loading ? 0.85 : 0.6,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: isRecording || loading ? 0.5 : 0.3,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowOpacity, isRecording, loading]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: loading ? 1250 : 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: loading ? 1250 : 2100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loading, scanLine]);

  const neonColor = isRecording || loading
    ? "rgba(168,85,247,0.9)"
    : "rgba(124,92,252,0.85)";
  const scanLineTranslate = scanLine.interpolate({
    inputRange: [0, 1],
    outputRange: [-frameHeight / 2 + 18, frameHeight / 2 - 18],
  });

  return (
    <View style={[styles.wrapper, { width: frameWidth, height: frameHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.backHalo,
          {
            height: frameHeight + 58,
            width: frameWidth + 58,
          },
        ]}
      />

      {/* Outer glow layer */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.outerGlow,
          {
            width: frameWidth + 24,
            height: frameHeight + 24,
            borderRadius: 28,
            borderColor: neonColor,
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Subtle border */}
      <View
        pointerEvents="none"
        style={[
          styles.borderFrame,
          {
            width: frameWidth,
            height: frameHeight,
            borderRadius: 20,
            borderColor: isRecording || loading
              ? "rgba(168,85,247,0.5)"
              : "rgba(124,92,252,0.35)",
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.innerVioletWash,
          {
            borderRadius: 18,
            height: frameHeight - 8,
            width: frameWidth - 8,
          },
        ]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.scanLine,
          {
            opacity: loading ? 0.86 : 0.55,
            transform: [{ translateY: scanLineTranslate }],
            width: frameWidth - 26,
          },
        ]}
      />

      {/* Corner accents */}
      <Corner color={neonColor} position="tl" />
      <Corner color={neonColor} position="tr" />
      <Corner color={neonColor} position="bl" />
      <Corner color={neonColor} position="br" />

      {/* Floating particles */}
      <Particle delay={0} size={4} startX={20} startY={frameHeight - 30} />
      <Particle delay={400} size={3} startX={frameWidth - 40} startY={frameHeight - 20} />
      <Particle delay={800} size={5} startX={frameWidth / 2 - 10} startY={frameHeight - 10} />
      <Particle delay={200} size={3} startX={10} startY={frameHeight / 2} />
      <Particle delay={600} size={4} startX={frameWidth - 20} startY={frameHeight / 2 + 20} />
      <Particle delay={1000} size={3} startX={frameWidth / 3} startY={frameHeight - 15} />
      <Particle delay={300} size={4} startX={frameWidth - 50} startY={15} />
      <Particle delay={900} size={3} startX={30} startY={20} />
    </View>
  );
};

const styles = StyleSheet.create({
  backHalo: {
    backgroundColor: "rgba(124,92,252,0.08)",
    borderRadius: 34,
    position: "absolute",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 36,
  },
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  outerGlow: {
    position: "absolute",
    borderWidth: 2,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  borderFrame: {
    position: "absolute",
    borderWidth: 1.5,
  },
  innerVioletWash: {
    backgroundColor: "rgba(124,92,252,0.045)",
    position: "absolute",
  },
  scanLine: {
    backgroundColor: "rgba(137,221,255,0.72)",
    borderRadius: 999,
    height: 2,
    shadowColor: "#89DDFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    elevation: 8,
  },
  corner: {
    position: "absolute",
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  cornerBar: {
    position: "absolute",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  particle: {
    position: "absolute",
    backgroundColor: "rgba(168,130,255,0.8)",
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});
