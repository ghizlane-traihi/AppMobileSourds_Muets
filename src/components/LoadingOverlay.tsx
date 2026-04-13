import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type LoadingOverlayProps = {
  title?: string;
};

type PercentPosition = `${number}%`;

const PARTICLES = [
  { delay: 0, left: "22%", top: "36%", size: 4 },
  { delay: 180, left: "72%", top: "32%", size: 3 },
  { delay: 360, left: "18%", top: "58%", size: 3 },
  { delay: 520, left: "80%", top: "55%", size: 5 },
  { delay: 760, left: "50%", top: "28%", size: 3 },
  { delay: 940, left: "42%", top: "66%", size: 4 },
] as const;

const LoadingParticle = ({
  delay,
  left,
  size,
  top,
}: {
  delay: number;
  left: PercentPosition;
  size: number;
  top: PercentPosition;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.85,
            duration: 620,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.35,
            duration: 620,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -12,
            duration: 620,
            easing: Easing.out(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 760,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.7,
            duration: 760,
            easing: Easing.in(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -28,
            duration: 760,
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
  }, [delay, opacity, scale, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          height: size,
          left,
          opacity,
          top,
          transform: [{ translateY }, { scale }],
          width: size,
        },
      ]}
    />
  );
};

export const LoadingOverlay = ({
  title = "Translating...",
}: LoadingOverlayProps) => {
  const shimmerX = useRef(new Animated.Value(-1)).current;
  const titleOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    const titleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 820,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 0.55,
          duration: 820,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    shimmerLoop.start();
    titleLoop.start();

    return () => {
      shimmerLoop.stop();
      titleLoop.stop();
    };
  }, [shimmerX, titleOpacity]);

  const shimmerTranslate = shimmerX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-220, 220],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[
          "rgba(7,7,31,0.86)",
          "rgba(20,14,64,0.38)",
          "rgba(7,7,31,0.82)",
        ]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />

      {PARTICLES.map((particle) => (
        <LoadingParticle key={`${particle.left}-${particle.top}`} {...particle} />
      ))}

      <View style={styles.centerCopy}>
        <Animated.View style={[styles.shimmerBand, { transform: [{ translateX: shimmerTranslate }] }]} />
        <View style={styles.loaderDots}>
          <View style={[styles.loaderDot, styles.loaderDotDim]} />
          <View style={styles.loaderDot} />
          <View style={[styles.loaderDot, styles.loaderDotDim]} />
        </View>
        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>
          {title}
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerCopy: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(11,9,38,0.58)",
    borderColor: "rgba(168,85,247,0.34)",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 190,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 15,
    position: "absolute",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    top: "47%",
  },
  loaderDot: {
    backgroundColor: "#A855F7",
    borderRadius: 4,
    height: 7,
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 7,
  },
  loaderDotDim: {
    backgroundColor: "rgba(137,221,255,0.52)",
  },
  loaderDots: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 10,
  },
  particle: {
    backgroundColor: "rgba(137,221,255,0.88)",
    borderRadius: 99,
    position: "absolute",
    shadowColor: "#89DDFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  shimmerBand: {
    backgroundColor: "rgba(137,221,255,0.18)",
    bottom: -20,
    position: "absolute",
    top: -20,
    width: 54,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
});
