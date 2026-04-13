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
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { useAppTheme } from "../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordingScreenProps = {
  onDelete: () => void;
  /** Called when the user confirms the recording and wants it translated */
  onTranslate?: (uri: string, durationMs: number) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── useRecordingSession hook ─────────────────────────────────────────────────

const useRecordingSession = (meteringValues: RecordingMeteringValues) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const recordingRef = React.useRef<Audio.Recording | null>(null);
  const isMountedRef = React.useRef(true);
  const elapsedSecondsRef = React.useRef(0);

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
    elapsedSecondsRef.current = 0;
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
      setElapsedSeconds((currentSeconds) => {
        const next = currentSeconds + 1;
        elapsedSecondsRef.current = next;
        return next;
      });
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
    elapsedSecondsRef.current = 0;
    settleMeteringValues(meteringValues);
    await stopCurrentRecording();
  };

  /**
   * Stops the recording, retrieves the file URI + duration, and returns both.
   * Call this when the user confirms they want to translate.
   */
  const completeRecording = async (): Promise<{
    uri: string;
    durationMs: number;
  } | null> => {
    const currentRecording = recordingRef.current;

    if (!currentRecording) {
      return null;
    }

    // Capture URI before unloading (file persists on disk after unload)
    const uri = currentRecording.getURI();
    const durationMs = elapsedSecondsRef.current * 1000;

    setIsSessionActive(false);
    setIsPaused(false);
    settleMeteringValues(meteringValues);
    await stopCurrentRecording();

    if (!uri) {
      return null;
    }

    return { uri, durationMs };
  };

  return {
    completeRecording,
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

// ─── RecordingScreen ──────────────────────────────────────────────────────────

export const RecordingScreen = ({ onDelete, onTranslate }: RecordingScreenProps) => {
  const { height, width } = useWindowDimensions();
  const audioLevel = useSharedValue(0);
  const audioJitter = useSharedValue(0);
  const {
    completeRecording,
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

  const handleTranslate = async () => {
    const result = await completeRecording();

    if (result && onTranslate) {
      onTranslate(result.uri, result.durationMs);
    }
  };

  const stageWidth = Math.min(width - 32, 430);
  const stageHeight = height < 720 ? 260 : 292;
  const isWaveRecordingActive =
    isSessionActive && !isPaused && !isPreparing && !errorMessage;

  // "Translate" CTA is available once the user has paused a non-empty recording
  const canTranslate =
    isPaused && !isPreparing && !errorMessage && isSessionActive && onTranslate;

  const statusHint =
    errorMessage ??
    (isPreparing
      ? "Getting your microphone ready."
      : isPaused
        ? "Paused — tap Translate to see signs, or play to keep recording."
        : "Listening now. Keep it natural.");

  return (
    <View style={styles.content}>
      {/* Copy block */}
      <View style={styles.copyBlock}>
        <Text style={styles.kicker}>
          {isPreparing ? "Preparing" : isPaused ? "Paused" : "Recording"}
        </Text>
        <Text style={styles.title}>Today, I want to tell...</Text>
        <Text style={styles.timer}>{timerLabel}</Text>
      </View>

      {/* Waveform + controls */}
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

      {/* Hint text */}
      <Text style={styles.hint}>{statusHint}</Text>

      {/* ── Translate CTA — appears when paused ── */}
      {canTranslate ? (
        <View style={styles.translateBlock}>
          <ScalePressable
            accessibilityLabel="Translate recording to sign language"
            onPress={() => void handleTranslate()}
            scaleTo={0.96}
            style={styles.translateButtonWrapper}
          >
            <PremiumButtonSurface radius={22} style={styles.translateButton}>
              <Feather color="#FFFFFF" name="zap" size={18} />
              <Text style={styles.translateButtonText}>Translate to signs</Text>
              <Feather color="rgba(255,255,255,0.6)" name="arrow-right" size={16} />
            </PremiumButtonSurface>
          </ScalePressable>

          <ScalePressable
            accessibilityLabel="Discard and go back"
            onPress={handleDelete}
            scaleTo={0.96}
          >
            <Text style={styles.discardText}>Discard recording</Text>
          </ScalePressable>
        </View>
      ) : null}
    </View>
  );
};

// ─── RoundControl ─────────────────────────────────────────────────────────────

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
  const { isDark } = useAppTheme();
  const isLarge = size === "large";
  const isPrimary = variant === "primary";

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
          isPrimary
            ? styles.primaryButton
            : [
                styles.secondaryButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.16)"
                    : "rgba(255,255,255,0.9)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.28)"
                    : "rgba(91,61,245,0.28)",
                  shadowColor: isDark ? "#050510" : "#7B61FF",
                  shadowOpacity: isDark ? 0.36 : 0.18,
                  shadowRadius: isDark ? 14 : 12,
                },
              ],
          !isPrimary && styles.buttonDepth,
          disabled && styles.disabledButton,
        ]}
      >
        <Feather
          color={isPrimary ? "#FFFFFF" : isDark ? "#FFFFFF" : "#5B3DF5"}
          name={iconName}
          size={isLarge ? 28 : 24}
        />
      </View>
    </ScalePressable>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    shadowOffset: { width: 0, height: 6 },
  },
  content: {
    alignItems: "center",
    flex: 1,
    paddingBottom: 32,
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
    color: "rgba(226,232,255,0.62)",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0,
    marginTop: 8,
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
    backgroundColor: "#5B3DF5",
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

  // ── Translate CTA ──
  translateBlock: {
    alignItems: "center",
    gap: 14,
    marginTop: 20,
    width: "100%",
  },
  translateButtonWrapper: {
    width: "100%",
  },
  translateButton: {
    alignItems: "center",
    borderRadius: 22,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  translateButtonText: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  discardText: {
    color: "rgba(226,232,255,0.45)",
    fontSize: 14,
    fontWeight: "700",
  },
});
