import React, { ReactNode } from "react";
import {
  AccessibilityRole,
  AccessibilityState,
  ColorValue,
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
  pressGlowColor?: ColorValue;
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
  pressGlowColor,
  scaleTo = DEFAULT_PRESS_SCALE,
  style,
}: ScalePressableProps) => {
  const scale = useSharedValue(1);
  const pressGlow = useSharedValue(0);

  const animateTo = (value: number) => {
    if (value === 1) {
      scale.value = withSpring(1, {
        damping: 18,
        mass: 0.7,
        stiffness: 280,
      });
      pressGlow.value = withTiming(0, {
        duration: 180,
        easing: Easing.out(Easing.quad),
      });

      return;
    }

    scale.value = withTiming(value, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
    pressGlow.value = withTiming(1, {
      duration: 120,
      easing: Easing.out(Easing.quad),
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: pressGlowColor ? 0.2 + pressGlow.value * 0.28 : 0,
    shadowRadius: pressGlowColor ? 10 + pressGlow.value * 22 : 0,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        pressGlowColor
          ? {
              elevation: 4,
              shadowColor: pressGlowColor,
              shadowOffset: { width: 0, height: 0 },
            }
          : null,
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
