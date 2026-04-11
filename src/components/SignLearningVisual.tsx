import { MaterialCommunityIcons } from "@expo/vector-icons";
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

export const SignLearningVisual = () => {
  const { colors, isDark } = useAppTheme();
  const handColor = isDark ? "#F4C978" : "#F0BD6D";
  const handOutlineColor = isDark ? "#D79E3B" : "#D5932F";
  const previewShift = useSharedValue(0);
  const pulseOpacity = useSharedValue(isDark ? 0.24 : 0.34);
  const dotScale = useSharedValue(1);

  useEffect(() => {
    previewShift.value = withRepeat(
      withSequence(
        withTiming(-10, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(10, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(isDark ? 0.38 : 0.5, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(isDark ? 0.24 : 0.34, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.18, {
          duration: 700,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: 700,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [dotScale, isDark, previewShift, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: dotScale.value }],
  }));

  const previewStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: previewShift.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.illustrationCard,
          {
            backgroundColor: isDark ? "rgba(14, 26, 41, 0.55)" : "rgba(255, 255, 255, 0.72)",
            borderColor: colors.primarySoft,
          },
        ]}
      >
        <View
          style={[
            styles.illustrationGlow,
            {
              backgroundColor: isDark ? "rgba(112, 174, 255, 0.18)" : "rgba(80, 145, 255, 0.12)",
            },
          ]}
        />

        <View style={[styles.letterBadge, { backgroundColor: colors.surface }]}>
          <Text style={[styles.letterBadgeText, { color: colors.primary }]}>A</Text>
        </View>

        <View style={styles.handArtboard}>
          <View
            style={[
              styles.palm,
              {
                backgroundColor: handColor,
                borderColor: handOutlineColor,
              },
            ]}
          />
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: handColor,
                borderColor: handOutlineColor,
              },
            ]}
          />

          {[styles.fingerOne, styles.fingerTwo, styles.fingerThree, styles.fingerFour].map(
            (fingerStyle, index) => (
              <View
                key={index}
                style={[
                  styles.finger,
                  fingerStyle,
                  {
                    backgroundColor: handColor,
                    borderColor: handOutlineColor,
                  },
                ]}
              />
            ),
          )}
        </View>

        <View
          style={[
            styles.hintChip,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primarySoft,
            },
          ]}
        >
          <MaterialCommunityIcons color={colors.primary} name="hand-wave-outline" size={14} />
          <Text style={[styles.hintChipText, { color: colors.text }]}>Hand shape</Text>
        </View>
      </View>

      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primarySoft,
          },
        ]}
      >
        <View style={styles.previewHeader}>
          <Text style={[styles.previewEyebrow, { color: colors.primary }]}>Gesture preview</Text>
          <Animated.View
            style={[
              styles.previewPulse,
              pulseStyle,
              {
                backgroundColor: colors.hero,
              },
            ]}
          />
        </View>

        <View style={styles.previewStage}>
          <Animated.View style={[styles.previewTrack, previewStyle]}>
            <View style={[styles.previewHand, styles.previewHandOne, { borderColor: colors.primary }]}>
              <View style={[styles.previewFinger, { backgroundColor: colors.primary }]} />
              <View style={[styles.previewFinger, { backgroundColor: colors.primary, opacity: 0.86 }]} />
              <View style={[styles.previewFinger, { backgroundColor: colors.primary, opacity: 0.72 }]} />
            </View>
            <View
              style={[
                styles.previewConnector,
                { backgroundColor: isDark ? colors.primarySoft : colors.primarySofter },
              ]}
            />
            <View style={[styles.previewHand, styles.previewHandTwo, { borderColor: colors.primary }]}>
              <View style={[styles.previewPalm, { backgroundColor: colors.primary }]} />
              <View style={[styles.previewThumb, { backgroundColor: colors.primary }]} />
            </View>
          </Animated.View>
        </View>

        <Text style={[styles.previewText, { color: colors.textSecondary }]}>
          A gentle motion preview shows how hand positions can shift before you open the lesson.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  illustrationCard: {
    borderRadius: 22,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 172,
    minWidth: 142,
    overflow: "hidden",
    padding: 14,
  },
  illustrationGlow: {
    borderRadius: 999,
    height: 118,
    position: "absolute",
    right: -24,
    top: -8,
    width: 118,
  },
  letterBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    minWidth: 32,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  letterBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  handArtboard: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 94,
  },
  palm: {
    borderRadius: 24,
    borderWidth: 2,
    height: 64,
    left: 12,
    position: "absolute",
    top: 28,
    width: 56,
  },
  thumb: {
    borderRadius: 14,
    borderWidth: 2,
    height: 22,
    left: -2,
    position: "absolute",
    top: 66,
    transform: [{ rotate: "-28deg" }],
    width: 32,
  },
  finger: {
    borderRadius: 999,
    borderWidth: 2,
    position: "absolute",
    top: 0,
    width: 12,
  },
  fingerOne: {
    height: 42,
    left: 6,
  },
  fingerTwo: {
    height: 46,
    left: 24,
  },
  fingerThree: {
    height: 46,
    left: 42,
  },
  fingerFour: {
    height: 40,
    left: 60,
  },
  hintChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  hintChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  previewCard: {
    borderRadius: 22,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 170,
    padding: 14,
  },
  previewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  previewEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  previewPulse: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  previewStage: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 108,
    overflow: "hidden",
    paddingVertical: 10,
  },
  previewTrack: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  previewHand: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.5,
    height: 74,
    justifyContent: "center",
    paddingHorizontal: 12,
    width: 68,
  },
  previewHandOne: {
    backgroundColor: "rgba(27, 110, 243, 0.07)",
  },
  previewHandTwo: {
    backgroundColor: "rgba(16, 35, 59, 0.05)",
  },
  previewFinger: {
    borderRadius: 999,
    height: 26,
    marginVertical: 2,
    width: 8,
  },
  previewConnector: {
    borderRadius: 999,
    height: 4,
    width: 30,
  },
  previewPalm: {
    borderRadius: 14,
    height: 28,
    width: 26,
  },
  previewThumb: {
    borderRadius: 10,
    height: 12,
    marginTop: 6,
    transform: [{ rotate: "-25deg" }],
    width: 20,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
});
