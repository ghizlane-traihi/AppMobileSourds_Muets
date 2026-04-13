import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type WaveAnimationMode = "idle" | "recording";

type WaveAnimationProps = {
  mode: WaveAnimationMode;
  paused?: boolean;
  size?: number;
  timerLabel?: string;
};

const idleBars = [22, 36, 52, 32, 44, 62, 38, 28, 48, 58, 34, 46, 26, 40];

export const WaveAnimation = ({
  mode,
  paused = false,
  size = 210,
  timerLabel = "00:00",
}: WaveAnimationProps) => {
  const waveProgress = useRef(new Animated.Value(0)).current;
  const pulseValues = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0)),
  ).current;

  const circleStyle = useMemo(
    () => ({
      borderRadius: size / 2,
      height: size,
      width: size,
    }),
    [size],
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(waveProgress, {
        duration: mode === "recording" && paused ? 2200 : 1300,
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    waveProgress.setValue(0);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [mode, paused, waveProgress]);

  useEffect(() => {
    if (mode !== "recording") {
      pulseValues.forEach((pulseValue) => {
        pulseValue.stopAnimation();
        pulseValue.setValue(0);
      });
      return;
    }

    const animations = pulseValues.map((pulseValue, index) => {
      pulseValue.setValue(0);

      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * (paused ? 520 : 280)),
          Animated.timing(pulseValue, {
            duration: paused ? 2600 : 1500,
            toValue: 1,
            useNativeDriver: true,
          }),
        ]),
      );
    });

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [mode, paused, pulseValues]);

  const coreScale = waveProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: paused ? [1, 1.018, 1] : [1, 1.055, 1],
  });

  const glowOpacity = waveProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: paused ? [0.18, 0.28, 0.18] : [0.22, 0.42, 0.22],
  });

  return (
    <View style={[styles.wrap, { height: size + 74, width: size + 74 }]}>
      {mode === "recording"
        ? pulseValues.map((pulseValue, index) => {
            const pulseScale = pulseValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0.88 + index * 0.05, 1.34 + index * 0.12],
            });
            const pulseOpacity = pulseValue.interpolate({
              inputRange: [0, 0.72, 1],
              outputRange: [0.26, 0.08, 0],
            });

            return (
              <Animated.View
                key={`pulse-${index}`}
                pointerEvents="none"
                style={[
                  styles.recordingPulse,
                  circleStyle,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              />
            );
          })
        : null}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.outerGlow,
          circleStyle,
          {
            opacity: glowOpacity,
            transform: [{ scale: coreScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.circle,
          circleStyle,
          {
            transform: [{ scale: coreScale }],
          },
        ]}
      >
        {mode === "idle" ? (
          <View style={styles.waveRow}>
            {idleBars.map((height, index) => {
              const inputMiddle = (index + 1) / (idleBars.length + 1);
              const inputStart = Math.max(0, inputMiddle - 0.18);
              const inputEnd = Math.min(1, inputMiddle + 0.18);
              const scaleY = waveProgress.interpolate({
                inputRange: [inputStart, inputMiddle, inputEnd],
                outputRange: [0.68, 1.2, 0.74],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={`wave-${height}-${index}`}
                  style={[
                    styles.waveBar,
                    {
                      height,
                      transform: [{ scaleY }],
                    },
                  ]}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.timerBlock}>
            <Text style={styles.timerText}>{timerLabel}</Text>
            <Feather
              color={paused ? "rgba(255,255,255,0.72)" : "#FFFFFF"}
              name={paused ? "play" : "mic"}
              size={22}
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    backgroundColor: "#7258E8",
    justifyContent: "center",
    shadowColor: "#5B45E8",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.34,
    shadowRadius: 32,
  },
  outerGlow: {
    backgroundColor: "#A795FF",
    position: "absolute",
  },
  recordingPulse: {
    backgroundColor: "#9B8BFF",
    position: "absolute",
  },
  timerBlock: {
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0,
  },
  waveBar: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 3,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 6,
  },
  waveRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
