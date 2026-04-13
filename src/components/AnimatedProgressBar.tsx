import React, { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type AnimatedProgressBarProps = {
  fillColor: string;
  progress: number;
  style?: StyleProp<ViewStyle>;
  trackColor: string;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const AnimatedProgressBar = ({
  fillColor,
  progress,
  style,
  trackColor,
}: AnimatedProgressBarProps) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const progressValue = useSharedValue(clamp(progress));

  useEffect(() => {
    progressValue.value = withTiming(clamp(progress), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, progressValue]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const fillStyle = useAnimatedStyle(() => {
    const nextWidth = trackWidth * progressValue.value;
    const minVisibleWidth =
      progressValue.value > 0 ? Math.min(trackWidth, Math.max(8, nextWidth)) : 0;

    return {
      width: minVisibleWidth,
    };
  });

  return (
    <View
      accessibilityRole="progressbar"
      onLayout={handleLayout}
      style={[styles.track, { backgroundColor: trackColor }, style]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 999,
    height: "100%",
  },
});
