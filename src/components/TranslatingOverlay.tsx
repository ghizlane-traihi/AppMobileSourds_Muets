/**
 * TranslatingOverlay
 *
 * A polished, animated loading card shown while audio is being sent to the
 * backend and the sign translation is being computed.
 *
 * Design:
 *   - Pulsing microphone orb
 *   - Animated ellipsis "Translating to sign language..."
 *   - Three animated processing step pills that sequence-fade in
 *   - Respect the existing theme (light + dark)
 */

import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "../theme";

// ─── Processing steps ─────────────────────────────────────────────────────────

const STEPS = [
  { icon: "upload-cloud" as const, label: "Sending audio to server" },
  { icon: "cpu" as const, label: "Analyzing speech patterns" },
  { icon: "layers" as const, label: "Mapping to ASL signs" },
];

const STEP_STAGGER_MS = 420;
const PULSE_DURATION_MS = 920;

// ─── Animated step pill ───────────────────────────────────────────────────────

interface StepPillProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  delay: number;
}

const StepPill = ({ icon, label, delay }: StepPillProps) => {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, opacity, translateX]);

  return (
    <Animated.View
      style={[
        styles.stepPill,
        {
          backgroundColor: colors.primarySofter,
          borderColor: colors.primarySoft,
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      <View
        style={[
          styles.stepIconWrap,
          { backgroundColor: colors.primarySoft },
        ]}
      >
        <Feather color={colors.primary} name={icon} size={13} />
      </View>
      <Text style={[styles.stepLabel, { color: colors.primary }]}>
        {label}
      </Text>

      {/* Animated dot at the end to signal activity */}
      <ActivityDot color={colors.primary} delay={delay + 200} />
    </Animated.View>
  );
};

// ─── Activity dot (looping pulse) ────────────────────────────────────────────

const ActivityDot = ({
  color,
  delay,
}: {
  color: string;
  delay: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, scale]);

  return (
    <Animated.View
      style={[
        styles.activityDot,
        { backgroundColor: color, transform: [{ scale }] },
      ]}
    />
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const TranslatingOverlay = () => {
  const { colors, isDark } = useAppTheme();

  // Orb pulse animation
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.18)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryY = useRef(new Animated.Value(16)).current;

  // Ellipsis animation (3 dots fading in/out in sequence)
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(entryY, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Orb pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1.08,
            duration: PULSE_DURATION_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.08,
            duration: PULSE_DURATION_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale, {
            toValue: 1,
            duration: PULSE_DURATION_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(orbOpacity, {
            toValue: 0.18,
            duration: PULSE_DURATION_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();

    // Ellipsis dot sequence
    const dotSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        ]),
        Animated.delay(100),
      ]),
    );
    dotSequence.start();

    return () => {
      dotSequence.stop();
    };
  }, [entryOpacity, entryY, orbScale, orbOpacity, dot1, dot2, dot3]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primarySoft,
          opacity: entryOpacity,
          transform: [{ translateY: entryY }],
          shadowColor: isDark ? "#000000" : colors.shadow,
          shadowOpacity: isDark ? 0.4 : 0.08,
        },
      ]}
    >
      {/* Orb */}
      <View style={styles.orbContainer}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbPulse,
            {
              backgroundColor: colors.primary,
              opacity: orbOpacity,
              transform: [{ scale: orbScale }],
            },
          ]}
        />
        <View
          style={[
            styles.orb,
            {
              backgroundColor: colors.primarySofter,
              borderColor: colors.primarySoft,
            },
          ]}
        >
          <Feather color={colors.primary} name="cpu" size={28} />
        </View>
      </View>

      {/* Headline with animated ellipsis */}
      <View style={styles.headlineRow}>
        <Text style={[styles.headline, { color: colors.text }]}>
          Translating to sign language
        </Text>
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: colors.primary, opacity: dot },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={[styles.subheadline, { color: colors.textSecondary }]}>
        Analyzing your speech and generating ASL signs.
      </Text>

      {/* Step pills */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <StepPill
            key={step.label}
            delay={300 + index * STEP_STAGGER_MS}
            icon={step.icon}
            label={step.label}
          />
        ))}
      </View>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 28,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
  },

  // Orb
  orbContainer: {
    alignItems: "center",
    height: 100,
    justifyContent: "center",
    width: 100,
  },
  orbPulse: {
    borderRadius: 999,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  orb: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 76,
    justifyContent: "center",
    width: 76,
  },

  // Headline
  headlineRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },
  headline: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  dotsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingBottom: 3,
  },
  dot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  subheadline: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  // Steps
  stepsContainer: {
    alignSelf: "stretch",
    gap: 10,
    marginTop: 4,
  },
  stepPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stepIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  stepLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  activityDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
});
