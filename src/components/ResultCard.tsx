import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { PremiumButtonSurface } from "./PremiumButtonSurface";
import { ScalePressable } from "./ScalePressable";

type ResultCardProps = {
  text: string;
  onCopy: () => void;
  onNewTranslation: () => void;
};

const ProgressDots = () => (
  <View style={styles.dotsRow}>
    {Array.from({ length: 5 }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.dot,
          index === 2 ? styles.dotActive : styles.dotInactive,
        ]}
      />
    ))}
  </View>
);

export const ResultCard = ({
  onCopy,
  onNewTranslation,
  text,
}: ResultCardProps) => {
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryY = useRef(new Animated.Value(18)).current;
  const glowOpacity = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(entryY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.58,
          duration: 1450,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.28,
          duration: 1450,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    glowLoop.start();

    return () => glowLoop.stop();
  }, [entryOpacity, entryY, glowOpacity]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: entryOpacity,
          transform: [{ translateY: entryY }],
        },
      ]}
    >
      <ProgressDots />

      <View pointerEvents="none" style={styles.outerGlow} />

      <View style={styles.card}>
        <Animated.View
          pointerEvents="none"
          style={[styles.cardAura, { opacity: glowOpacity }]}
        />
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.11)",
            "rgba(124,92,252,0.08)",
            "rgba(8,8,34,0.44)",
          ]}
          locations={[0, 0.44, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Text style={styles.title}>Sign language detected</Text>

        <View style={styles.textPanel}>
          <View pointerEvents="none" style={styles.textPanelGlow} />
          <Text adjustsFontSizeToFit numberOfLines={3} style={styles.mainText}>
            {text.trim().length > 0
              ? text.toUpperCase()
              : "HELLO, HOW ARE YOU?"}
          </Text>
        </View>

        <View style={styles.actions}>
          <ScalePressable
            accessibilityLabel="Copy translation"
            onPress={onCopy}
            scaleTo={0.96}
            style={styles.actionWrap}
          >
            <View style={styles.copyButton}>
              <Feather color="#C8D6FF" name="copy" size={15} />
              <Text style={styles.copyText}>Copy</Text>
            </View>
          </ScalePressable>

          <ScalePressable
            accessibilityLabel="Start a new translation"
            onPress={onNewTranslation}
            scaleTo={0.96}
            style={styles.actionWrap}
          >
            <PremiumButtonSurface radius={16} style={styles.newButton}>
              <Text style={styles.newText}>New translation</Text>
              <Feather color="#FFFFFF" name="chevron-right" size={15} />
            </PremiumButtonSurface>
          </ScalePressable>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  actionWrap: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  card: {
    alignItems: "center",
    backgroundColor: "rgba(12,10,42,0.72)",
    borderColor: "rgba(168,85,247,0.34)",
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 360,
    overflow: "hidden",
    padding: 20,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 26,
    width: "100%",
  },
  cardAura: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(137,221,255,0.26)",
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#89DDFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.54,
    shadowRadius: 24,
  },
  dot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  dotActive: {
    backgroundColor: "#A855F7",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  dotInactive: {
    backgroundColor: "rgba(167,139,250,0.36)",
  },
  copyButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    height: 44,
    justifyContent: "center",
  },
  copyText: {
    color: "#D6E2FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
  },
  dotsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginBottom: 24,
  },
  mainText: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 31,
    textAlign: "center",
  },
  newButton: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 10,
  },
  newText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
  textPanel: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    marginBottom: 16,
    minHeight: 102,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 18,
    width: "100%",
  },
  outerGlow: {
    backgroundColor: "rgba(124,92,252,0.12)",
    borderRadius: 30,
    bottom: -12,
    left: 10,
    position: "absolute",
    right: 10,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 34,
    top: 45,
  },
  textPanelGlow: {
    backgroundColor: "rgba(137,221,255,0.06)",
    bottom: -28,
    height: 70,
    left: 24,
    position: "absolute",
    right: 24,
    shadowColor: "#89DDFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  title: {
    color: "#9FCBFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 16,
    textAlign: "center",
  },
  wrap: {
    alignItems: "center",
    maxWidth: 390,
    width: "100%",
  },
});
