import React, { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type HandPoint = {
  id: string;
  x: number;
  y: number;
};

type HandConnection = {
  from: string;
  to: string;
};

type HandDetectionOverlayProps = {
  guideColor: string;
  isDetected: boolean;
  isRecording: boolean;
  landmarkColor: string;
};

const HAND_POINTS: HandPoint[] = [
  { id: "wrist", x: 48, y: 84 },
  { id: "thumb1", x: 41, y: 72 },
  { id: "thumb2", x: 34, y: 60 },
  { id: "thumb3", x: 27, y: 50 },
  { id: "index1", x: 49, y: 64 },
  { id: "index2", x: 49, y: 47 },
  { id: "index3", x: 48, y: 28 },
  { id: "middle1", x: 58, y: 63 },
  { id: "middle2", x: 60, y: 45 },
  { id: "middle3", x: 62, y: 23 },
  { id: "ring1", x: 67, y: 66 },
  { id: "ring2", x: 72, y: 51 },
  { id: "ring3", x: 76, y: 34 },
  { id: "pinky1", x: 74, y: 72 },
  { id: "pinky2", x: 82, y: 61 },
  { id: "pinky3", x: 88, y: 51 },
];

const HAND_CONNECTIONS: HandConnection[] = [
  { from: "wrist", to: "thumb1" },
  { from: "thumb1", to: "thumb2" },
  { from: "thumb2", to: "thumb3" },
  { from: "wrist", to: "index1" },
  { from: "index1", to: "index2" },
  { from: "index2", to: "index3" },
  { from: "wrist", to: "middle1" },
  { from: "middle1", to: "middle2" },
  { from: "middle2", to: "middle3" },
  { from: "wrist", to: "ring1" },
  { from: "ring1", to: "ring2" },
  { from: "ring2", to: "ring3" },
  { from: "wrist", to: "pinky1" },
  { from: "pinky1", to: "pinky2" },
  { from: "pinky2", to: "pinky3" },
];

const POINT_SIZE = 10;

export const HandDetectionOverlay = ({
  guideColor,
  isDetected,
  isRecording,
  landmarkColor,
}: HandDetectionOverlayProps) => {
  const [frameSize, setFrameSize] = useState({ height: 240, width: 260 });
  const overlayScale = useSharedValue(1);
  const overlayOpacity = useSharedValue(isDetected ? 1 : 0.34);

  useEffect(() => {
    if (isDetected || isRecording) {
      overlayScale.value = withRepeat(
        withSequence(
          withTiming(1.03, {
            duration: 560,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1, {
            duration: 560,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );
      overlayOpacity.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 560,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0.72, {
            duration: 560,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );

      return;
    }

    overlayScale.value = withRepeat(
      withSequence(
        withTiming(1.01, {
          duration: 900,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(1, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
    overlayOpacity.value = withRepeat(
      withSequence(
        withTiming(0.46, {
          duration: 900,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0.24, {
          duration: 900,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [isDetected, isRecording, overlayOpacity, overlayScale]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setFrameSize({ height, width });
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }));

  const pointsById = useMemo(
    () => Object.fromEntries(HAND_POINTS.map((point) => [point.id, point])),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={[styles.scrim, styles.scrimTop]} />
      <View style={[styles.scrim, styles.scrimBottom]} />

      <View style={styles.frameCenter}>
        <View
          onLayout={handleLayout}
          style={[styles.frame, { borderColor: guideColor }]}
        >
          <View style={[styles.corner, styles.cornerTopLeft, { borderColor: guideColor }]} />
          <View
            style={[styles.corner, styles.cornerTopRight, { borderColor: guideColor }]}
          />
          <View
            style={[styles.corner, styles.cornerBottomLeft, { borderColor: guideColor }]}
          />
          <View
            style={[styles.corner, styles.cornerBottomRight, { borderColor: guideColor }]}
          />

          <Animated.View style={[styles.landmarksLayer, overlayStyle]}>
            {HAND_CONNECTIONS.map((connection) => {
              const from = pointsById[connection.from];
              const to = pointsById[connection.to];

              if (!from || !to) {
                return null;
              }

              const fromX = (from.x / 100) * frameSize.width;
              const fromY = (from.y / 100) * frameSize.height;
              const toX = (to.x / 100) * frameSize.width;
              const toY = (to.y / 100) * frameSize.height;
              const deltaX = toX - fromX;
              const deltaY = toY - fromY;

              return (
                <View
                  key={`${connection.from}-${connection.to}`}
                  style={[
                    styles.line,
                    {
                      backgroundColor: landmarkColor,
                      left: fromX,
                      opacity: isDetected || isRecording ? 0.92 : 0.34,
                      top: fromY,
                      transform: [
                        { rotateZ: `${Math.atan2(deltaY, deltaX)}rad` },
                      ],
                      width: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                    },
                  ]}
                />
              );
            })}

            {HAND_POINTS.map((point) => (
              <View
                key={point.id}
                style={[
                  styles.point,
                  {
                    backgroundColor: landmarkColor,
                    left: `${point.x}%`,
                    opacity: isDetected || isRecording ? 1 : 0.42,
                    top: `${point.y}%`,
                  },
                ]}
              />
            ))}
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scrim: {
    backgroundColor: "rgba(4, 14, 26, 0.18)",
    left: 0,
    position: "absolute",
    right: 0,
  },
  scrimTop: {
    height: "18%",
    top: 0,
  },
  scrimBottom: {
    bottom: 0,
    height: "18%",
  },
  frameCenter: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  frame: {
    borderRadius: 28,
    borderWidth: 1.5,
    height: 240,
    overflow: "hidden",
    width: "72%",
  },
  corner: {
    borderColor: "#FFFFFF",
    height: 34,
    position: "absolute",
    width: 34,
  },
  cornerTopLeft: {
    borderLeftWidth: 3,
    borderTopWidth: 3,
    left: 12,
    top: 12,
  },
  cornerTopRight: {
    borderRightWidth: 3,
    borderTopWidth: 3,
    right: 12,
    top: 12,
  },
  cornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 12,
    left: 12,
  },
  cornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 12,
    right: 12,
  },
  landmarksLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  line: {
    height: 2,
    position: "absolute",
    transformOrigin: "left center",
  },
  point: {
    borderRadius: 999,
    height: POINT_SIZE,
    marginLeft: -(POINT_SIZE / 2),
    marginTop: -(POINT_SIZE / 2),
    position: "absolute",
    width: POINT_SIZE,
  },
});
