import React, { ReactNode, useEffect } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

type RevealViewProps = {
  children: ReactNode;
  delayMs?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
};

export const RevealView = ({
  children,
  delayMs = 0,
  distance = 18,
  style,
}: RevealViewProps) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    opacity.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      }),
    );
    translateY.value = withDelay(
      delayMs,
      withTiming(0, {
        duration: 460,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delayMs, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};
