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

type LearningLessonVisualProps = {
  accent: string;
  background: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  label: string;
};

export const LearningLessonVisual = ({
  accent,
  background,
  iconName,
  label,
}: LearningLessonVisualProps) => {
  const { colors } = useAppTheme();
  const floatY = useSharedValue(0);
  const pulse = useSharedValue(0.28);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    pulse.value = withRepeat(
      withSequence(
        withTiming(0.44, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.28, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );
  }, [floatY, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 1 + pulse.value * 0.2 }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <View style={[styles.wrapper, { backgroundColor: background, borderColor: `${accent}30` }]}>
      <Animated.View style={[styles.glow, pulseStyle, { backgroundColor: accent }]} />
      <Animated.View
        style={[
          styles.innerCard,
          cardStyle,
          {
            backgroundColor: colors.surface,
            borderColor: `${accent}40`,
          },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: background }]}>
          <Feather color={accent} name={iconName} size={22} />
        </View>
        <Text style={[styles.label, { color: accent }]}>{label}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 154,
    overflow: "hidden",
  },
  glow: {
    borderRadius: 999,
    height: 108,
    position: "absolute",
    width: 108,
  },
  innerCard: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  label: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 12,
  },
});
