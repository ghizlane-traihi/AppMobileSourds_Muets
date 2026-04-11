import { Feather } from "@expo/vector-icons";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  Easing,
  type SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ScalePressable } from "../components/ScalePressable";
import {
  HeroRecorderButton,
  WaveformBackdrop,
} from "../components/VoiceRecorderStage";

type RecordingScreenProps = {
  onDelete: () => void;
};

const formatTimer = (elapsedSeconds: number) => {
  const minutes = Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const normalizeRecordingMetering = (metering: number) => {
  const clampedMetering = Math.max(-60, Math.min(0, metering));

  return (clampedMetering + 60) / 60;
};

type RecordingMeteringValues = {
  audioJitter: SharedValue<number>;
  audioLevel: SharedValue<number>;
};

const settleMeteringValues = ({
  audioJitter,
  audioLevel,
}: RecordingMeteringValues) => {
  audioLevel.value = withTiming(0, {
    duration: 220,
    easing: Easing.out(Easing.quad),
  });
  audioJitter.value = withTiming(0, {
    duration: 220,
    easing: Easing.out(Easing.quad),
  });
};

const useRecordingSession = (meteringValues: RecordingMeteringValues) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const recordingRef = React.useRef<Audio.Recording | null>(null);
  const isMountedRef = React.useRef(true);

  const stopCurrentRecording = async () => {
    const currentRecording = recordingRef.current;
    recordingRef.current = null;
    settleMeteringValues(meteringValues);

    if (currentRecording) {
      try {
        currentRecording.setOnRecordingStatusUpdate(null);
        await currentRecording.stopAndUnloadAsync();
      } catch {
        // The recorder may already be unloaded when the native session ends.
      }
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    }).catch(() => undefined);
  };

  const beginRecording = async () => {
    setErrorMessage(null);
    setIsPreparing(true);
    setIsPaused(false);
    setIsSessionActive(false);
    setElapsedSeconds(0);
    settleMeteringValues(meteringValues);

    await stopCurrentRecording();

    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        if (isMountedRef.current) {
          setErrorMessage("Microphone permission is needed to start recording.");
          setIsPaused(true);
          setIsPreparing(false);
        }
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playThroughEarpieceAndroid: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      const nextRecording = new Audio.Recording();
      const recordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY!;

      nextRecording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) {
          settleMeteringValues(meteringValues);
          return;
        }

        const metering = status.metering;

        if (typeof metering === "number") {
          const normalizedLevel = normalizeRecordingMetering(metering);

          meteringValues.audioLevel.value = withTiming(normalizedLevel, {
            duration: 80,
            easing: Easing.out(Easing.quad),
          });
          meteringValues.audioJitter.value = withTiming(
            Math.random() * Math.PI * 2,
            {
              duration: 100,
              easing: Easing.out(Easing.quad),
            },
          );
        }
      });
      nextRecording.setProgressUpdateInterval(80);

      await nextRecording.prepareToRecordAsync({
        android: recordingOptions.android!,
        isMeteringEnabled: true,
        ios: recordingOptions.ios!,
        web: recordingOptions.web,
      });
      await nextRecording.startAsync();

      if (!isMountedRef.current) {
        await nextRecording.stopAndUnloadAsync().catch(() => undefined);
        return;
      }

      recordingRef.current = nextRecording;
      setIsSessionActive(true);
      setIsPreparing(false);
    } catch (error) {
      await stopCurrentRecording();

      if (isMountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to start recording.",
        );
        setIsPaused(true);
        setIsPreparing(false);
        setIsSessionActive(false);
      }
    }
  };

  useEffect(() => {
    void beginRecording();

    return () => {
      isMountedRef.current = false;
      void stopCurrentRecording();
    };
  }, []);

  useEffect(() => {
    if (!isSessionActive || isPaused) {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPaused, isSessionActive]);

  const timerLabel = useMemo(
    () => formatTimer(elapsedSeconds),
    [elapsedSeconds],
  );

  const reset = () => {
    void beginRecording();
  };

  const togglePause = async () => {
    if (!recordingRef.current || isPreparing || errorMessage) {
      return;
    }

    try {
      if (isPaused) {
        await recordingRef.current.startAsync();
        setIsPaused(false);
        return;
      }

      await recordingRef.current.pauseAsync();
      setIsPaused(true);
      settleMeteringValues(meteringValues);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the recording.",
      );
    }
  };

  const deleteRecording = async () => {
    setIsSessionActive(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    settleMeteringValues(meteringValues);
    await stopCurrentRecording();
  };

  return {
    deleteRecording,
    errorMessage,
    isPaused,
    isPreparing,
    isSessionActive,
    reset,
    timerLabel,
    togglePause,
  };
};

export const RecordingScreen = ({ onDelete }: RecordingScreenProps) => {
  const { height, width } = useWindowDimensions();
  const audioLevel = useSharedValue(0);
  const audioJitter = useSharedValue(0);
  const {
    deleteRecording,
    errorMessage,
    isPaused,
    isPreparing,
    reset,
    timerLabel,
    togglePause,
    isSessionActive,
  } = useRecordingSession({ audioJitter, audioLevel });

  const handleDelete = () => {
    void deleteRecording().finally(onDelete);
  };
  const stageWidth = Math.min(width - 32, 430);
  const stageHeight = height < 720 ? 260 : 292;
  const isWaveRecordingActive =
    isSessionActive && !isPaused && !isPreparing && !errorMessage;
  const statusHint =
    errorMessage ??
    (isPreparing
      ? "Getting your microphone ready."
      : isPaused
        ? "Paused. Tap play to continue."
        : "Listening now. Keep it natural.");

  return (
    <View style={styles.content}>
      <View style={styles.copyBlock}>
        <Text style={styles.kicker}>
          {isPreparing ? "Preparing" : isPaused ? "Paused" : "Recording"}
        </Text>
        <Text style={styles.title}>Today, I want to tell...</Text>
        <Text style={styles.timer}>{timerLabel}</Text>
      </View>

      <View style={styles.visualCenter}>
        <View
          style={[
            styles.audioStage,
            {
              height: stageHeight,
              width: stageWidth,
            },
          ]}
        >
          <WaveformBackdrop
            animated
            audioJitter={audioJitter}
            audioLevel={audioLevel}
            height={stageHeight}
            recordingActive={isWaveRecordingActive}
            width={stageWidth}
          />

          <View style={styles.actionsRow}>
            <RoundControl
              accessibilityLabel="Reset recording"
              iconName="rotate-ccw"
              onPress={reset}
              variant="secondary"
            />
            <HeroRecorderButton
              accessibilityLabel={
                isPaused ? "Resume recording" : "Pause recording"
              }
              disabled={isPreparing || Boolean(errorMessage)}
              iconName={isPaused ? "play" : "pause"}
              onPress={() => {
                void togglePause();
              }}
              recordingActive={isWaveRecordingActive}
            />
            <RoundControl
              accessibilityLabel="Delete recording"
              iconName="trash-2"
              onPress={handleDelete}
              variant="secondary"
            />
          </View>
        </View>
      </View>

      <Text style={styles.hint}>{statusHint}</Text>
    </View>
  );
};

type RoundControlProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  iconName: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  size?: "regular" | "large";
  variant: "primary" | "secondary";
};

const RoundControl = ({
  accessibilityLabel,
  disabled = false,
  iconName,
  onPress,
  size = "regular",
  variant,
}: RoundControlProps) => {
  const isLarge = size === "large";

  return (
    <ScalePressable
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.94}
      style={isLarge ? styles.controlWrapperLarge : styles.controlWrapper}
    >
      <View
        style={[
          styles.roundButton,
          isLarge && styles.roundButtonLarge,
          variant === "primary" ? styles.primaryButton : styles.secondaryButton,
          variant === "secondary" && styles.buttonDepth,
          disabled && styles.disabledButton,
        ]}
      >
        <Feather
          color={variant === "primary" ? "#FFFFFF" : "#C8D6FF"}
          name={iconName}
          size={isLarge ? 28 : 22}
        />
      </View>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 6,
    position: "absolute",
    right: 0,
    top: 0,
  },
  audioStage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  buttonDepth: {
    elevation: 5,
    shadowColor: "#050510",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  content: {
    alignItems: "center",
    flex: 1,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 34,
  },
  controlWrapper: {
    height: 52,
    width: 52,
  },
  controlWrapperLarge: {
    height: 72,
    width: 72,
  },
  disabledButton: {
    opacity: 0.5,
  },
  copyBlock: {
    alignItems: "center",
    maxWidth: 340,
  },
  hint: {
    color: "rgba(226,232,255,0.72)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center",
  },
  kicker: {
    color: "rgba(137,221,255,0.78)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  primaryButton: {
    backgroundColor: "#7C5CFC",
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  roundButton: {
    alignItems: "center",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  roundButtonLarge: {
    borderRadius: 36,
    height: 72,
    width: 72,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
  },
  timer: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  visualCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
});
