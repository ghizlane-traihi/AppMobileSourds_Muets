import { Feather } from "@expo/vector-icons";
import {
  BlurMask,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Skia,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ScalePressable } from "./ScalePressable";

const LOOP_PHASE = Math.PI * 2;
const BUTTON_VISUAL_SIZE = 330;
const BUTTON_CENTER = BUTTON_VISUAL_SIZE / 2;
const BUTTON_TOUCH_SIZE = 112;
const GLASS_RADIUS = 39;
const INNER_GLOW_RADIUS = 55;
const RING_RADII = [74, 102, 136] as const;

type WaveConfig = {
  amplitude: number;
  color: string;
  dash?: number[];
  nodeInterval: number;
  opacity: number;
  recordingAmplitude: number;
  recordingMultiplier: number;
  recordingOpacity: number;
  spatialOffset: number;
  speed: number;
  strokeWidth: number;
};

const WAVE_CONFIGS: [WaveConfig, WaveConfig, WaveConfig] = [
  {
    amplitude: 34,
    color: "#60A5FA",
    dash: [14, 18],
    nodeInterval: 112,
    opacity: 0.3,
    recordingAmplitude: 86,
    recordingMultiplier: 0.4,
    recordingOpacity: 0.5,
    spatialOffset: Math.PI / 1.5,
    speed: 1.3,
    strokeWidth: 1,
  },
  {
    amplitude: 50,
    color: "#A78BFA",
    nodeInterval: 150,
    opacity: 0.5,
    recordingAmplitude: 116,
    recordingMultiplier: 0.7,
    recordingOpacity: 0.7,
    spatialOffset: Math.PI / 3,
    speed: 0.7,
    strokeWidth: 1.5,
  },
  {
    amplitude: 44,
    color: "#7B8CFF",
    nodeInterval: 128,
    opacity: 0.8,
    recordingAmplitude: 132,
    recordingMultiplier: 1,
    recordingOpacity: 1,
    spatialOffset: 0,
    speed: 1,
    strokeWidth: 2,
  },
];

const createAnimatedWavePath = ({
  amplitude,
  audioJitter,
  audioLevel,
  canvasHeight,
  canvasWidth,
  nodeInterval,
  phase,
  recordingAmplitude,
  recordingMultiplier,
  recordingProgress,
  spatialOffset,
  speed,
}: {
  amplitude: number;
  audioJitter: number;
  audioLevel: number;
  canvasHeight: number;
  canvasWidth: number;
  nodeInterval: number;
  phase: number;
  recordingAmplitude: number;
  recordingMultiplier: number;
  recordingProgress: number;
  spatialOffset: number;
  speed: number;
}) => {
  "worklet";

  const path = Skia.Path.Make();
  const centerY = canvasHeight / 2;
  const step = 3;
  const frequency = Math.PI / nodeInterval;

  for (let x = 0; x <= canvasWidth + step; x += step) {
    const standingShape = Math.sin(x * frequency + spatialOffset);
    const temporalOscillation = Math.cos(phase * speed);
    const idleY = centerY + amplitude * standingShape * temporalOscillation;
    const reactiveLevel = Math.pow(audioLevel, 0.86 + recordingMultiplier * 0.5);
    const residualAmplitude = 2 + recordingMultiplier * 2.5;
    const dynamicAmplitude =
      residualAmplitude +
      reactiveLevel * recordingAmplitude * (0.65 + recordingMultiplier);
    const audioTemporal =
      0.18 + reactiveLevel * 0.82 + Math.cos(phase * speed) * 0.18;
    const harmonicOne =
      Math.sin(x * frequency * 1.4 + spatialOffset + audioJitter * 0.18) *
      audioTemporal;
    const harmonicTwo =
      Math.sin(
        x * frequency * 2.15 + spatialOffset + audioJitter * 0.31,
      ) *
      Math.cos(phase * speed * 1.3);
    const harmonicThree =
      Math.sin(
        x * frequency * 0.72 +
        spatialOffset -
        audioJitter * 0.12,
      ) *
      Math.cos(phase * speed * 0.7);
    const recordingY =
      centerY +
      dynamicAmplitude *
        (harmonicOne * 0.72 +
          harmonicTwo * reactiveLevel * 0.22 +
          harmonicThree * reactiveLevel * 0.16);
    const y = idleY * (1 - recordingProgress) + recordingY * recordingProgress;

    if (x === 0) {
      path.moveTo(x, y);
      continue;
    }

    path.lineTo(x, y);
  }

  return path;
};

const useAnimatedWavePath = ({
  audioJitter,
  audioLevel,
  config,
  height,
  phase,
  recordingProgress,
  width,
}: {
  audioJitter: SharedValue<number>;
  audioLevel: SharedValue<number>;
  config: WaveConfig;
  height: number;
  phase: SharedValue<number>;
  recordingProgress: SharedValue<number>;
  width: number;
}) => {
  const {
    amplitude,
    nodeInterval,
    recordingAmplitude,
    recordingMultiplier,
    spatialOffset,
    speed,
  } = config;

  return useDerivedValue(
    () =>
      createAnimatedWavePath({
        amplitude,
        audioJitter: audioJitter.value,
        audioLevel: audioLevel.value,
        canvasHeight: height,
        canvasWidth: width,
        nodeInterval,
        phase: phase.value,
        recordingAmplitude,
        recordingMultiplier,
        recordingProgress: recordingProgress.value,
        spatialOffset,
        speed,
      }),
    [
      amplitude,
      height,
      nodeInterval,
      recordingAmplitude,
      recordingMultiplier,
      spatialOffset,
      speed,
      width,
    ],
  );
};

const useWaveOpacity = ({
  config,
  recordingProgress,
}: {
  config: WaveConfig;
  recordingProgress: SharedValue<number>;
}) =>
  useDerivedValue(
    () =>
      config.opacity +
      (config.recordingOpacity - config.opacity) * recordingProgress.value,
    [config.opacity, config.recordingOpacity],
  );

type WaveformBackdropProps = {
  audioJitter?: SharedValue<number>;
  audioLevel?: SharedValue<number>;
  animated?: boolean;
  height: number;
  recordingActive?: boolean;
  width: number;
};

export const WaveformBackdrop = ({
  audioJitter,
  audioLevel,
  animated = false,
  height,
  recordingActive = false,
  width,
}: WaveformBackdropProps) => {
  const center = useMemo(() => vec(width / 2, height / 2), [height, width]);
  const phase = useSharedValue(0);
  const fallbackAudioLevel = useSharedValue(0);
  const fallbackAudioJitter = useSharedValue(0);
  const recordingProgress = useSharedValue(0);
  const liveAudioLevel = audioLevel ?? fallbackAudioLevel;
  const liveAudioJitter = audioJitter ?? fallbackAudioJitter;
  const backPath = useAnimatedWavePath({
    audioJitter: liveAudioJitter,
    audioLevel: liveAudioLevel,
    config: WAVE_CONFIGS[0],
    height,
    phase,
    recordingProgress,
    width,
  });
  const midPath = useAnimatedWavePath({
    audioJitter: liveAudioJitter,
    audioLevel: liveAudioLevel,
    config: WAVE_CONFIGS[1],
    height,
    phase,
    recordingProgress,
    width,
  });
  const frontPath = useAnimatedWavePath({
    audioJitter: liveAudioJitter,
    audioLevel: liveAudioLevel,
    config: WAVE_CONFIGS[2],
    height,
    phase,
    recordingProgress,
    width,
  });
  const backOpacity = useWaveOpacity({
    config: WAVE_CONFIGS[0],
    recordingProgress,
  });
  const midOpacity = useWaveOpacity({
    config: WAVE_CONFIGS[1],
    recordingProgress,
  });
  const frontOpacity = useWaveOpacity({
    config: WAVE_CONFIGS[2],
    recordingProgress,
  });
  const glowOpacity = useDerivedValue(
    () => recordingProgress.value * 0.2,
    [recordingProgress],
  );
  const waves = [
    { config: WAVE_CONFIGS[0], opacity: backOpacity, path: backPath },
    { config: WAVE_CONFIGS[1], opacity: midOpacity, path: midPath },
    { config: WAVE_CONFIGS[2], opacity: frontOpacity, path: frontPath },
  ];

  useEffect(() => {
    cancelAnimation(phase);
    phase.value = 0;

    if (animated) {
      phase.value = withRepeat(
        withTiming(LOOP_PHASE, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        true,
      );
    }

    return () => {
      cancelAnimation(phase);
    };
  }, [animated, phase]);

  useEffect(() => {
    recordingProgress.value = withTiming(recordingActive ? 1 : 0, {
      duration: recordingActive ? 400 : 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [recordingActive, recordingProgress]);

  return (
    <Canvas style={styles.waveCanvas}>
      <Circle c={center} color="rgba(124,92,252,0.16)" r={74}>
        <BlurMask blur={28} style="solid" />
      </Circle>
      <Path
        color="#9B7BFF"
        opacity={glowOpacity}
        path={frontPath}
        strokeCap="round"
        strokeWidth={8}
        style="stroke"
      >
        <BlurMask blur={8} style="solid" />
      </Path>
      {waves.map(({ config, opacity, path }) => (
        <Path
          color={config.color}
          key={`${config.color}-${config.nodeInterval}`}
          opacity={opacity}
          path={path}
          strokeCap="round"
          strokeWidth={config.strokeWidth}
          style="stroke"
        >
          {config.dash ? (
            <DashPathEffect intervals={config.dash} phase={0} />
          ) : null}
        </Path>
      ))}
    </Canvas>
  );
};

type HeroRecorderButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  iconName: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  recordingActive?: boolean;
};

export const HeroRecorderButton = ({
  accessibilityLabel,
  disabled = false,
  iconName,
  onPress,
  recordingActive = false,
}: HeroRecorderButtonProps) => {
  const center = useMemo(() => vec(BUTTON_CENTER, BUTTON_CENTER), []);
  const glassStart = useMemo(
    () => vec(BUTTON_CENTER - 28, BUTTON_CENTER - 34),
    [],
  );
  const glassEnd = useMemo(
    () => vec(BUTTON_CENTER + 34, BUTTON_CENTER + 38),
    [],
  );
  const breathe = useSharedValue(0);
  const recordingGlow = useSharedValue(0);

  const ringOneRadius = useDerivedValue(
    () => RING_RADII[0] * (0.95 + breathe.value * 0.1),
    [breathe],
  );
  const ringTwoRadius = useDerivedValue(
    () =>
      RING_RADII[1] *
      (0.95 + ((breathe.value + 0.34) % 1) * 0.1),
    [breathe],
  );
  const ringThreeRadius = useDerivedValue(
    () =>
      RING_RADII[2] *
      (0.95 + ((breathe.value + 0.68) % 1) * 0.1),
    [breathe],
  );
  const ringOneOpacity = useDerivedValue(
    () => 0.28 + breathe.value * 0.12 + recordingGlow.value * 0.14,
    [breathe, recordingGlow],
  );
  const ringTwoOpacity = useDerivedValue(
    () =>
      0.16 +
      ((breathe.value + 0.34) % 1) * 0.1 +
      recordingGlow.value * 0.12,
    [breathe, recordingGlow],
  );
  const ringThreeOpacity = useDerivedValue(
    () =>
      0.1 +
      ((breathe.value + 0.68) % 1) * 0.07 +
      recordingGlow.value * 0.1,
    [breathe, recordingGlow],
  );
  const innerGlowOpacity = useDerivedValue(
    () => 0.72 + recordingGlow.value * 0.28,
    [recordingGlow],
  );
  const glassOverlayOpacity = useDerivedValue(
    () => 0.82 + recordingGlow.value * 0.18,
    [recordingGlow],
  );

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, {
        duration: 3000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(breathe);
    };
  }, [breathe]);

  useEffect(() => {
    recordingGlow.value = withTiming(recordingActive ? 1 : 0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [recordingActive, recordingGlow]);

  return (
    <ScalePressable
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.94}
      style={styles.heroMicTouchTarget}
    >
      <View style={styles.heroMicPressContent}>
        <View
          pointerEvents="none"
          style={[styles.heroMicVisualLayer, disabled && styles.disabledHero]}
        >
          <Canvas style={StyleSheet.absoluteFill}>
            <Circle c={center} opacity={0.9} r={160}>
              <RadialGradient
                c={center}
                colors={[
                  "rgba(91,61,245,0.18)",
                  "rgba(63,43,191,0.12)",
                  "rgba(63,43,191,0)",
                ]}
                positions={[0, 0.48, 1]}
                r={160}
              />
            </Circle>

            <Group style="stroke">
              <Circle
                c={center}
                opacity={ringThreeOpacity}
                r={ringThreeRadius}
                strokeWidth={0.8}
              >
                <SweepGradient
                  c={center}
                  colors={[
                    "rgba(255,255,255,0.18)",
                    "rgba(123,97,255,0.42)",
                    "rgba(91,61,245,0.3)",
                    "rgba(63,43,191,0.18)",
                    "rgba(255,255,255,0.18)",
                  ]}
                  positions={[0, 0.22, 0.55, 0.82, 1]}
                />
                <BlurMask blur={4} style="solid" />
              </Circle>
              <Circle
                c={center}
                opacity={ringTwoOpacity}
                r={ringTwoRadius}
                strokeWidth={1}
              >
                <SweepGradient
                  c={center}
                  colors={[
                    "rgba(255,255,255,0.2)",
                    "rgba(123,97,255,0.52)",
                    "rgba(91,61,245,0.34)",
                    "rgba(63,43,191,0.22)",
                    "rgba(255,255,255,0.2)",
                  ]}
                  positions={[0, 0.24, 0.58, 0.84, 1]}
                />
                <BlurMask blur={3} style="solid" />
              </Circle>
              <Circle
                c={center}
                opacity={ringOneOpacity}
                r={ringOneRadius}
                strokeWidth={1.5}
              >
                <SweepGradient
                  c={center}
                  colors={[
                    "rgba(255,255,255,0.24)",
                    "rgba(123,97,255,0.62)",
                    "rgba(91,61,245,0.46)",
                    "rgba(63,43,191,0.28)",
                    "rgba(255,255,255,0.24)",
                  ]}
                  positions={[0, 0.23, 0.58, 0.84, 1]}
                />
                <BlurMask blur={2} style="solid" />
              </Circle>
            </Group>

            <Circle c={center} opacity={innerGlowOpacity} r={INNER_GLOW_RADIUS}>
              <RadialGradient
                c={center}
                colors={[
                  "rgba(123,97,255,0.42)",
                  "rgba(91,61,245,0.22)",
                  "rgba(63,43,191,0)",
                ]}
                positions={[0, 0.42, 1]}
                r={INNER_GLOW_RADIUS}
              />
            </Circle>

            <Circle c={center} color="rgba(91,61,245,0.34)" r={GLASS_RADIUS + 10}>
              <BlurMask blur={28} style="solid" />
            </Circle>
            <Circle c={center} color="rgba(63,43,191,0.34)" r={GLASS_RADIUS + 4}>
              <BlurMask blur={24} style="solid" />
            </Circle>
            <Circle c={center} opacity={glassOverlayOpacity} r={GLASS_RADIUS}>
              <LinearGradient
                colors={[
                  "#7B61FF",
                  "#5B3DF5",
                  "#3F2BBF",
                ]}
                end={glassEnd}
                positions={[0, 0.5, 1]}
                start={glassStart}
              />
            </Circle>
            <Circle
              c={center}
              r={GLASS_RADIUS - 0.75}
              strokeWidth={1.5}
              style="stroke"
            >
              <SweepGradient
                c={center}
                colors={[
                  "rgba(255,255,255,0.22)",
                  "rgba(255,255,255,0.14)",
                  "rgba(123,97,255,0.22)",
                  "rgba(63,43,191,0.18)",
                  "rgba(255,255,255,0.22)",
                ]}
                positions={[0, 0.28, 0.56, 0.82, 1]}
              />
            </Circle>
            <Circle
              cx={BUTTON_CENTER - 12}
              cy={BUTTON_CENTER - 16}
              color="rgba(255,255,255,0.12)"
              r={20}
            >
              <BlurMask blur={14} style="solid" />
            </Circle>
          </Canvas>
        </View>

        <View pointerEvents="none" style={styles.heroMicIcon}>
          <Feather color="#FFFFFF" name={iconName} size={28} />
        </View>
      </View>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  disabledHero: {
    opacity: 0.52,
  },
  heroMicIcon: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  heroMicPressContent: {
    alignItems: "center",
    height: BUTTON_TOUCH_SIZE,
    justifyContent: "center",
    overflow: "visible",
    width: BUTTON_TOUCH_SIZE,
  },
  heroMicVisualLayer: {
    height: BUTTON_VISUAL_SIZE,
    left: -(BUTTON_VISUAL_SIZE - BUTTON_TOUCH_SIZE) / 2,
    position: "absolute",
    top: -(BUTTON_VISUAL_SIZE - BUTTON_TOUCH_SIZE) / 2,
    width: BUTTON_VISUAL_SIZE,
  },
  heroMicTouchTarget: {
    alignItems: "center",
    height: BUTTON_TOUCH_SIZE,
    justifyContent: "center",
    overflow: "visible",
    width: BUTTON_TOUCH_SIZE,
  },
  waveCanvas: {
    ...StyleSheet.absoluteFillObject,
    position: "absolute",
  },
});
