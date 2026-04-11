import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "../theme";

export const LockedStatsEmptyState = () => {
  const { colors, isDark } = useAppTheme();
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(isDark ? 0.2 : 0.3);
  const cardLift = useSharedValue(0);

  useEffect(() => {
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.08, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(isDark ? 0.34 : 0.42, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(isDark ? 0.2 : 0.3, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    cardLift.value = withRepeat(
      withSequence(
        withTiming(-4, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [cardLift, haloOpacity, haloScale, isDark]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  const illustrationStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardLift.value }],
  }));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.primarySoft,
        },
      ]}
    >
      <View style={styles.illustrationArea}>
        <Animated.View
          style={[
            styles.halo,
            haloStyle,
            {
              backgroundColor: isDark ? "rgba(96, 165, 250, 0.22)" : "rgba(27, 110, 243, 0.12)",
            },
          ]}
        />

        <Animated.View
          style={[
            styles.illustrationCard,
            illustrationStyle,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.mainBadge,
              {
                backgroundColor: colors.primarySofter,
                borderColor: colors.primarySoft,
              },
            ]}
          >
            <Feather color={colors.primary} name="bar-chart-2" size={20} />
          </View>

          <View
            style={[
              styles.cornerChip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primarySoft,
              },
            ]}
          >
            <Feather color={colors.primary} name="book-open" size={12} />
            <Text style={[styles.cornerChipText, { color: colors.primary }]}>A-Z</Text>
          </View>

          <View
            style={[
              styles.lockChip,
              {
                backgroundColor: colors.warningSoft,
                borderColor: colors.warningBorder,
              },
            ]}
          >
            <Feather color={colors.warning} name="lock" size={14} />
            <Text style={[styles.lockChipText, { color: colors.warning }]}>Locked</Text>
          </View>
        </Animated.View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        Start learning to unlock your stats
      </Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Your progress, streaks, and badges will appear here after you begin the alphabet lessons.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    overflow: "hidden",
    padding: 18,
  },
  illustrationArea: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  halo: {
    borderRadius: 999,
    height: 126,
    position: "absolute",
    width: 126,
  },
  illustrationCard: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    height: 114,
    justifyContent: "center",
    width: 168,
  },
  mainBadge: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  cornerChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 10,
    top: 10,
  },
  cornerChipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  lockChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: "absolute",
    bottom: 10,
    left: 10,
  },
  lockChipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
});
