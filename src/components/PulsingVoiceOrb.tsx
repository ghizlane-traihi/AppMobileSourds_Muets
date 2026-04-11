import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  Shadow,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export interface PulsingVoiceOrbProps {
  isRecording: boolean;
  onPress: () => void;
  timerText?: string;
  size?: number;
  color?: string;
}

const BASE_COLOR = "#7C5CFC";
const DEFAULT_SIZE = 480;
const BASE_RADII = [120, 90, 65, 45] as const;
const STAGGER_MS = 200;
const BLOOM_RADIUS = 25;

const hexToRgb = (hexColor: string) => {
  const normalizedColor = hexColor.replace("#", "");
  const expandedColor =
    normalizedColor.length === 3
      ? normalizedColor
          .split("")
          .map((character) => character + character)
          .join("")
      : normalizedColor;
  const parsedColor = Number.parseInt(expandedColor, 16);

  if (Number.isNaN(parsedColor)) {
    return { b: 252, g: 92, r: 124 };
  }

  return {
    b: parsedColor & 255,
    g: (parsedColor >> 8) & 255,
    r: (parsedColor >> 16) & 255,
  };
};

const withAlpha = (hexColor: string, alpha: number) => {
  const { b, g, r } = hexToRgb(hexColor);

  return `rgba(${r},${g},${b},${alpha})`;
};

const createFilledWavePath = ({
  amplitude,
  centerX,
  centerY,
  phase,
  thickness,
  width,
}: {
  amplitude: number;
  centerX: number;
  centerY: number;
  phase: number;
  thickness: number;
  width: number;
}) => {
  const path = Skia.Path.Make();
  const segmentCount = 42;
  const left = centerX - width / 2;
  const frequency = Math.PI * 4;
  const topPoints = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const progress = index / segmentCount;
    const x = left + progress * width;
    const y = centerY + Math.sin(progress * frequency + phase) * amplitude;

    return { x, y };
  });

  topPoints.forEach((point, index) => {
    if (index === 0) {
      path.moveTo(point.x, point.y);
      return;
    }

    path.lineTo(point.x, point.y);
  });

  [...topPoints].reverse().forEach((point) => {
    const progress = (point.x - left) / width;
    const y =
      centerY +
      Math.sin(progress * frequency + phase + 0.24) * amplitude +
      thickness;

    path.lineTo(point.x, y);
  });

  path.close();

  return path;
};

export const PulsingVoiceOrb = ({
  color = BASE_COLOR,
  isRecording,
  onPress,
  size = DEFAULT_SIZE,
  timerText = "00:00",
}: PulsingVoiceOrbProps) => {
  const center = size / 2;
  const radiusScale = Math.min(1, size / DEFAULT_SIZE);
  const outerRadius = BASE_RADII[0] * radiusScale;
  const secondRadius = BASE_RADII[1] * radiusScale;
  const thirdRadius = BASE_RADII[2] * radiusScale;
  const innerRadius = BASE_RADII[3] * radiusScale;
  const bloomRadius = BLOOM_RADIUS * radiusScale;
  const centerPoint = useMemo(() => vec(center, center), [center]);
  const clipPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(center, center, outerRadius);
    return path;
  }, [center, outerRadius]);
  const wavePaths = useMemo(
    () => ({
      back: createFilledWavePath({
        amplitude: 22 * radiusScale,
        centerX: center,
        centerY: center - 3 * radiusScale,
        phase: 0.15,
        thickness: 10 * radiusScale,
        width: innerRadius * 3.4,
      }),
      mid: createFilledWavePath({
        amplitude: 16 * radiusScale,
        centerX: center,
        centerY: center + 1 * radiusScale,
        phase: 1.15,
        thickness: 8 * radiusScale,
        width: innerRadius * 3.15,
      }),
      front: createFilledWavePath({
        amplitude: 12 * radiusScale,
        centerX: center,
        centerY: center + 4 * radiusScale,
        phase: 2.05,
        thickness: 6 * radiusScale,
        width: innerRadius * 2.9,
      }),
    }),
    [center, innerRadius, radiusScale],
  );

  const outerScale = useSharedValue<number>(1);
  const secondScale = useSharedValue<number>(1);
  const thirdScale = useSharedValue<number>(1);
  const outerOpacity = useSharedValue<number>(0.85);
  const secondOpacity = useSharedValue<number>(0.85);
  const thirdOpacity = useSharedValue<number>(0.85);
  const waveVisibility = useSharedValue<number>(isRecording ? 0 : 1);

  useEffect(() => {
    const scaleTarget = isRecording ? 1.15 : 1.08;
    const cycleDuration = isRecording ? 1000 : 1500;
    const scaleValues = [outerScale, secondScale, thirdScale];
    const opacityValues = [outerOpacity, secondOpacity, thirdOpacity];

    scaleValues.forEach((scaleValue, index) => {
      scaleValue.value = 1;
      scaleValue.value = withDelay(
        index * STAGGER_MS,
        withRepeat(
          withSequence(
            withTiming(scaleTarget, {
              duration: cycleDuration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
              duration: cycleDuration,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          -1,
          false,
        ),
      );
    });

    opacityValues.forEach((opacityValue, index) => {
      opacityValue.value = 0.85;
      opacityValue.value = withDelay(
        index * STAGGER_MS,
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: cycleDuration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0.85, {
              duration: cycleDuration,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          -1,
          false,
        ),
      );
    });

    return () => {
      scaleValues.forEach((scaleValue) => cancelAnimation(scaleValue));
      opacityValues.forEach((opacityValue) => cancelAnimation(opacityValue));
    };
  }, [
    isRecording,
    outerOpacity,
    outerScale,
    secondOpacity,
    secondScale,
    thirdOpacity,
    thirdScale,
  ]);

  useEffect(() => {
    waveVisibility.value = withTiming(isRecording ? 0 : 1, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isRecording, waveVisibility]);

  const outerMatrix = useDerivedValue(() => {
    const scale = outerScale.value;
    const translate = center - scale * center;

    return [scale, 0, translate, 0, scale, translate, 0, 0, 1];
  });
  const secondMatrix = useDerivedValue(() => {
    const scale = secondScale.value;
    const translate = center - scale * center;

    return [scale, 0, translate, 0, scale, translate, 0, 0, 1];
  });
  const thirdMatrix = useDerivedValue(() => {
    const scale = thirdScale.value;
    const translate = center - scale * center;

    return [scale, 0, translate, 0, scale, translate, 0, 0, 1];
  });
  const waveMatrix = useDerivedValue(() => {
    const scale = 0.8 + waveVisibility.value * 0.2;
    const translate = center - scale * center;

    return [scale, 0, translate, 0, scale, translate, 0, 0, 1];
  });
  const outerAnimatedOpacity = useDerivedValue(() => outerOpacity.value);
  const secondAnimatedOpacity = useDerivedValue(() => secondOpacity.value);
  const thirdAnimatedOpacity = useDerivedValue(() => thirdOpacity.value);

  return (
    <Pressable
      accessibilityLabel={isRecording ? "Recording timer" : "Start recording"}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.pressable, { height: size, width: size }]}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Group clip={clipPath}>
          <Group matrix={outerMatrix} opacity={outerAnimatedOpacity}>
            <Circle c={centerPoint} color={withAlpha(color, 0.06)} r={outerRadius} />
          </Group>

          <Group matrix={secondMatrix} opacity={secondAnimatedOpacity}>
            <Circle c={centerPoint} color={withAlpha(color, 0.12)} r={secondRadius}>
              <BlurMask blur={8 * radiusScale} style="solid" />
            </Circle>
          </Group>

          <Group matrix={thirdMatrix} opacity={thirdAnimatedOpacity}>
            <Circle c={centerPoint} color={withAlpha(color, 0.25)} r={thirdRadius}>
              <BlurMask blur={4 * radiusScale} style="solid" />
            </Circle>
          </Group>

          <Circle c={centerPoint} color={withAlpha(color, 0.5)} r={innerRadius}>
            <BlurMask blur={2 * radiusScale} style="solid" />
            <Shadow
              blur={40 * radiusScale}
              color={withAlpha(color, 0.5)}
              dx={0}
              dy={0}
            />
          </Circle>

          <Group matrix={waveMatrix} opacity={waveVisibility}>
            <Path color="rgba(255,255,255,0.15)" path={wavePaths.back}>
              <BlurMask blur={12 * radiusScale} style="solid" />
            </Path>
            <Path color="rgba(255,255,255,0.35)" path={wavePaths.mid}>
              <BlurMask blur={6 * radiusScale} style="solid" />
            </Path>
            <Path color="rgba(255,255,255,0.7)" path={wavePaths.front}>
              <BlurMask blur={3 * radiusScale} style="solid" />
            </Path>
            <Circle
              c={centerPoint}
              color="rgba(255,255,255,0.7)"
              r={bloomRadius}
            >
              <BlurMask blur={25 * radiusScale} style="solid" />
            </Circle>
          </Group>
        </Group>
      </Canvas>

      <View pointerEvents="none" style={styles.centerContent}>
        {isRecording ? <Text style={styles.timerText}>{timerText}</Text> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  pressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0,
  },
});
