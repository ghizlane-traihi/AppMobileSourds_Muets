import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type LiveWaveformProps = {
  barColor: string;
  idleColor: string;
  isActive: boolean;
  levels: number[];
};

type WaveBarProps = {
  color: string;
  isActive: boolean;
  level: number;
};

const WaveBar = ({ color, isActive, level }: WaveBarProps) => {
  const animatedLevel = useSharedValue(level);

  useEffect(() => {
    animatedLevel.value = withTiming(level, {
      duration: isActive ? 120 : 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedLevel, isActive, level]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: 10 + animatedLevel.value * 34,
    opacity: isActive ? 0.92 : 0.58,
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
};

export const LiveWaveform = ({
  barColor,
  idleColor,
  isActive,
  levels,
}: LiveWaveformProps) => {
  const normalizedLevels =
    levels.length > 0 ? levels : Array.from({ length: 18 }, () => 0.08);

  return (
    <View style={styles.container}>
      {normalizedLevels.map((level, index) => (
        <WaveBar
          key={`waveform-${index}`}
          color={isActive ? barColor : idleColor}
          isActive={isActive}
          level={level}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
    height: 48,
    justifyContent: "space-between",
    width: "100%",
  },
  bar: {
    borderRadius: 999,
    flex: 1,
    minHeight: 10,
  },
});
