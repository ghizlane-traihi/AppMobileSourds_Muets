import React, { ReactNode, useState } from "react";
import { Dimensions, LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

type ScrollRevealViewProps = {
  children: ReactNode;
  scrollY: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

export const ScrollRevealView = ({
  children,
  scrollY,
  style,
}: ScrollRevealViewProps) => {
  const [layoutY, setLayoutY] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayoutY(event.nativeEvent.layout.y);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const relativeY = layoutY - scrollY.value;
    const opacity = interpolate(
      relativeY,
      [SCREEN_HEIGHT * 0.98, SCREEN_HEIGHT * 0.42],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      relativeY,
      [SCREEN_HEIGHT * 0.98, SCREEN_HEIGHT * 0.42],
      [24, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View onLayout={handleLayout} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};
