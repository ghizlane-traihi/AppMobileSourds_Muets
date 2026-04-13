import { ResizeMode, Video } from "expo-av";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { SignAsset } from "../types";

type SignPlaybackStageProps = {
  frameHeight: number;
  frameWidth: number;
  signs: SignAsset[];
};

const SIGN_PLAY_MS = 1850;

const ProgressDots = ({
  activeIndex,
  count,
}: {
  activeIndex: number;
  count: number;
}) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: Math.max(count, 1) }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.dot,
          index === activeIndex ? styles.dotActive : styles.dotInactive,
        ]}
      />
    ))}
  </View>
);

const FallbackSign = ({ label }: { label: string }) => (
  <View style={styles.fallbackWrap}>
    <View style={styles.fallbackOrb}>
      <Text style={styles.fallbackLetter}>
        {label.trim().slice(0, 1).toUpperCase() || "?"}
      </Text>
    </View>
    <Text numberOfLines={1} style={styles.fallbackText}>
      {label}
    </Text>
  </View>
);

export const SignPlaybackStage = ({
  frameHeight,
  frameWidth,
  signs,
}: SignPlaybackStageProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mediaOpacity = useRef(new Animated.Value(1)).current;
  const mediaScale = useRef(new Animated.Value(1)).current;
  const labelOpacity = useRef(new Animated.Value(1)).current;
  const labelY = useRef(new Animated.Value(0)).current;

  const safeSigns = useMemo(
    () =>
      signs.length > 0
        ? signs
        : [
            {
              id: "fallback-hello",
              label: "HELLO",
              type: "image" as const,
              uri: "",
            },
          ],
    [signs],
  );

  const currentSign = safeSigns[currentIndex] ?? safeSigns[0];

  useEffect(() => {
    setCurrentIndex(0);
    mediaOpacity.setValue(1);
    mediaScale.setValue(1);
    labelOpacity.setValue(1);
    labelY.setValue(0);
  }, [labelOpacity, labelY, mediaOpacity, mediaScale, safeSigns]);

  useEffect(() => {
    if (safeSigns.length <= 1) {
      return;
    }

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(mediaOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(mediaScale, {
          toValue: 0.96,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex((index) => (index + 1) % safeSigns.length);
        mediaScale.setValue(1.03);
        labelY.setValue(10);

        Animated.parallel([
          Animated.timing(mediaOpacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(mediaScale, {
            toValue: 1,
            damping: 18,
            stiffness: 180,
            useNativeDriver: true,
          }),
          Animated.timing(labelOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(labelY, {
            toValue: 0,
            damping: 16,
            stiffness: 180,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, SIGN_PLAY_MS);

    return () => clearTimeout(timer);
  }, [
    currentIndex,
    labelOpacity,
    labelY,
    mediaOpacity,
    mediaScale,
    safeSigns.length,
  ]);

  return (
    <View style={[styles.stage, { width: frameWidth }]}>
      <ProgressDots activeIndex={currentIndex} count={safeSigns.length} />

      <View
        style={[
          styles.mediaCard,
          {
            height: frameHeight,
            width: frameWidth,
          },
        ]}
      >
        <View pointerEvents="none" style={styles.mediaHalo} />
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.1)",
            "rgba(124,92,252,0.065)",
            "rgba(7,7,31,0.42)",
          ]}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.mediaContent,
            {
              opacity: mediaOpacity,
              transform: [{ scale: mediaScale }],
            },
          ]}
        >
          {currentSign?.uri ? (
            currentSign.type === "video" ? (
              <Video
                key={currentSign.id}
                isLooping
                isMuted
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                source={{ uri: currentSign.uri }}
                style={styles.media}
              />
            ) : (
              <Image
                resizeMode="contain"
                source={{ uri: currentSign.uri }}
                style={styles.media}
              />
            )
          ) : (
            <FallbackSign label={currentSign?.label ?? "HELLO"} />
          )}
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.wordPill,
          {
            opacity: labelOpacity,
            transform: [{ translateY: labelY }],
          },
        ]}
      >
        <Text numberOfLines={1} style={styles.wordLabel}>
          {currentSign?.label ?? "HELLO"}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: "rgba(167,139,250,0.34)",
  },
  dotsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginBottom: 22,
  },
  fallbackLetter: {
    color: "#F8FAFC",
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: 0,
  },
  fallbackOrb: {
    alignItems: "center",
    backgroundColor: "rgba(124,92,252,0.24)",
    borderColor: "rgba(137,221,255,0.22)",
    borderRadius: 40,
    borderWidth: 1,
    height: 80,
    justifyContent: "center",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    width: 80,
  },
  fallbackText: {
    color: "rgba(214,226,255,0.72)",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    maxWidth: 160,
  },
  fallbackWrap: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  media: {
    height: "100%",
    width: "100%",
  },
  mediaCard: {
    backgroundColor: "rgba(12,10,42,0.72)",
    borderColor: "rgba(168,85,247,0.34)",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 26,
  },
  mediaContent: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaHalo: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "rgba(137,221,255,0.24)",
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: "#89DDFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 22,
  },
  stage: {
    alignItems: "center",
  },
  wordLabel: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  wordPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    maxWidth: "100%",
    minWidth: 132,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
  },
});
