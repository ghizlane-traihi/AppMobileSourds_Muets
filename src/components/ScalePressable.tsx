import React, { ReactNode } from "react";
import {
  AccessibilityRole,
  AccessibilityState,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { triggerImpactAsync } from "../utils/haptics";

type ScalePressableProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  children: ReactNode;
  disabled?: boolean;
  enableHaptics?: boolean;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_PRESS_SCALE = 0.975;
export const ScalePressable = ({
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityState,
  children,
  disabled = false,
  enableHaptics = true,
  onPress,
  scaleTo = DEFAULT_PRESS_SCALE,
  style,
}: ScalePressableProps) => {
  const scale = useSharedValue(1);

  const animateTo = (value: number) => {
    if (value === 1) {
      scale.value = withSpring(1, {
        damping: 18,
        mass: 0.7,
        stiffness: 280,
      });

      return;
    }

    scale.value = withTiming(value, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        disabled={disabled}
        onPress={onPress ?? undefined}
        onPressIn={() => {
          animateTo(scaleTo);

          if (enableHaptics && !disabled) {
            void triggerImpactAsync("light").catch(() => undefined);
          }
        }}
        onPressOut={() => {
          animateTo(1);
        }}
        style={({ pressed }) => ({
          opacity: pressed || disabled ? 0.94 : 1,
        })}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
