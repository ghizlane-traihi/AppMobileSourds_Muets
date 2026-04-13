import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AnimatedProgressBar } from "./AnimatedProgressBar";
import { LiveWaveform } from "./LiveWaveform";
import { PremiumButtonSurface } from "./PremiumButtonSurface";
import { useAppTheme } from "../theme";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { AudioRecorderResult } from "../types";
import { ErrorMessage } from "./ErrorMessage";
import { ScalePressable } from "./ScalePressable";

interface AudioRecorderProps {
  disabled?: boolean;
  isProcessing?: boolean;
  onRecorded: (result: AudioRecorderResult) => void;
  onReset?: () => void;
}

const MAX_RECORDING_DURATION_MS = 45000;

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const formatDurationFraction = (durationMs: number) =>
  Math.floor((durationMs % 1000) / 10)
    .toString()
    .padStart(2, "0");

export const AudioRecorder = ({
  disabled = false,
  isProcessing = false,
  onRecorded,
  onReset,
}: AudioRecorderProps) => {
  const { colors, isDark } = useAppTheme();
  const autoStopTriggeredRef = useRef(false);
  const timerAnchorDurationRef = useRef(0);
  const timerAnchorTimestampRef = useRef(Date.now());
  const timerAnimationFrameRef = useRef<number | null>(null);
  const [autoStopNotice, setAutoStopNotice] = useState<string | null>(null);
  const [displayDurationMs, setDisplayDurationMs] = useState(0);
  const [idleWaveformLevels, setIdleWaveformLevels] = useState<number[]>(
    Array.from({ length: 18 }, (_, index) => 0.12 + ((index % 4) * 0.03)),
  );
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.22);
  const {
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    resetRecording,
    isRecording,
    isPlaying,
    durationMs,
    meteringHistory,
    recordingResult,
    error,
  } = useAudioRecorder();

  useEffect(() => {
    if (!isRecording && !disabled && !isProcessing) {
      pulseScale.value = 1;
      pulseOpacity.value = 0.22;
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, {
            duration: 760,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1, {
            duration: 760,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.08, {
            duration: 760,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0.22, {
            duration: 760,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );

      return;
    }

    cancelAnimation(pulseScale);
    cancelAnimation(pulseOpacity);
    pulseScale.value = withTiming(1, { duration: 180 });
    pulseOpacity.value = withTiming(0, { duration: 180 });
  }, [disabled, isProcessing, isRecording, pulseOpacity, pulseScale]);

  useEffect(() => {
    timerAnchorDurationRef.current = durationMs;
    timerAnchorTimestampRef.current = Date.now();

    if (!isRecording) {
      setDisplayDurationMs(durationMs);
      if (timerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(timerAnimationFrameRef.current);
        timerAnimationFrameRef.current = null;
      }
      return;
    }

    const updateDisplayDuration = () => {
      const nextDuration =
        timerAnchorDurationRef.current +
        (Date.now() - timerAnchorTimestampRef.current);
      setDisplayDurationMs(nextDuration);
      timerAnimationFrameRef.current = requestAnimationFrame(updateDisplayDuration);
    };

    timerAnimationFrameRef.current = requestAnimationFrame(updateDisplayDuration);

    return () => {
      if (timerAnimationFrameRef.current !== null) {
        cancelAnimationFrame(timerAnimationFrameRef.current);
        timerAnimationFrameRef.current = null;
      }
    };
  }, [durationMs, isRecording]);

  useEffect(() => {
    if (isRecording || isProcessing) {
      return;
    }

    let tick = 0;
    const intervalId = setInterval(() => {
      tick += 1;
      setIdleWaveformLevels((currentLevels) =>
        currentLevels.map((_, index) => {
          const base = 0.12 + ((index % 5) * 0.025);
          const wave = (Math.sin(tick * 0.5 + index * 0.65) + 1) / 2;
          return Math.min(0.46, base + wave * 0.14);
        }),
      );
    }, 240);

    return () => {
      clearInterval(intervalId);
    };
  }, [isProcessing, isRecording]);

  useEffect(() => {
    if (!isRecording) {
      autoStopTriggeredRef.current = false;
      return;
    }

    if (
      durationMs < MAX_RECORDING_DURATION_MS ||
      autoStopTriggeredRef.current
    ) {
      return;
    }

    autoStopTriggeredRef.current = true;
    setAutoStopNotice("Recording stopped automatically after 45 seconds.");

    void (async () => {
      const result = await stopRecording();

      if (result) {
        onRecorded(result);
      }
    })();
  }, [durationMs, isRecording, onRecorded, stopRecording]);

  const handlePrimaryAction = async () => {
    if (disabled) {
      return;
    }

    if (isRecording) {
      setAutoStopNotice(null);
      const result = await stopRecording();

      if (result) {
        onRecorded(result);
      }

      return;
    }

    setAutoStopNotice(null);
    onReset?.();
    await startRecording();
  };

  const handleReset = () => {
    setAutoStopNotice(null);
    resetRecording();
    onReset?.();
  };

  const handlePlaybackAction = async () => {
    if (isPlaying) {
      await stopPlayback();
      return;
    }

    await playRecording();
  };

  const handleOpenSettings = async () => {
    await Linking.openSettings();
  };

  const showsPermissionAction =
    error?.message.toLowerCase().includes("permission") ?? false;

  const displayedProgress = displayDurationMs / MAX_RECORDING_DURATION_MS;
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));
  const statusLabel = isProcessing
    ? "Processing audio"
    : isRecording
      ? "Recording in progress"
      : "Ready to record";
  const statusHint = isProcessing
    ? "Please wait while the latest recording is being translated."
    : isRecording
      ? "Speak naturally and stop when the sentence is complete."
      : "Tap to start speaking";
  const timerValue = Math.min(displayDurationMs, MAX_RECORDING_DURATION_MS);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primarySoft,
            shadowOpacity: isDark ? 0 : 0.06,
          },
        ]}
      >
        <View style={styles.heroBlock}>
          <View style={styles.microphoneWrap}>
            {!isRecording && !isProcessing ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.microphonePulse,
                  { backgroundColor: colors.primary },
                  pulseStyle,
                ]}
              />
            ) : null}

            <View
              style={[
                styles.microphoneOrb,
                {
                  backgroundColor: isRecording
                    ? colors.dangerSoft
                    : isProcessing
                      ? colors.primarySoft
                      : colors.primarySofter,
                  borderColor: isRecording
                    ? colors.dangerBorder
                    : isProcessing
                      ? colors.primarySoft
                      : colors.primarySoft,
                },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Feather
                  color={isRecording ? colors.recording : colors.primary}
                  name="mic"
                  size={34}
                />
              )}
            </View>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isProcessing
                    ? colors.primary
                    : isRecording
                      ? colors.recording
                      : colors.idle,
                },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {statusLabel}
            </Text>
          </View>

          <Text style={[styles.statusCaption, { color: colors.textSecondary }]}>
            {statusHint}
          </Text>
        </View>

        <View style={styles.timerBlock}>
          <Text style={[styles.timer, { color: colors.text }]}>
            {formatDuration(timerValue)}
            <Text style={[styles.timerFraction, { color: colors.textMuted }]}>
              .{formatDurationFraction(timerValue)}
            </Text>
          </Text>
        </View>

        <View
          style={[
            styles.waveformCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.waveformHeader}>
            <Text style={[styles.waveformTitle, { color: colors.text }]}>
              Live microphone activity
            </Text>
            <Text style={[styles.waveformStatus, { color: colors.textSecondary }]}>
              {isProcessing
                ? "Processing latest audio"
                : isRecording
                  ? "Listening now"
                  : "Tap to start speaking"}
            </Text>
          </View>

          <LiveWaveform
            barColor={isRecording ? colors.recording : colors.primary}
            idleColor={colors.primarySoft}
            isActive={isRecording}
            levels={isRecording ? meteringHistory : idleWaveformLevels}
          />

          {!isRecording && !isProcessing ? (
            <View
              style={[
                styles.waitingPromptCard,
                {
                  backgroundColor: colors.primarySofter,
                  borderColor: colors.primarySoft,
                },
              ]}
            >
              <Text style={[styles.waitingPromptText, { color: colors.primary }]}>
                Tap to start speaking
              </Text>
            </View>
          ) : null}
        </View>

        <View
          accessibilityLabel={`Recording progress ${Math.min(
            100,
            Math.round(displayedProgress * 100),
          )} percent`}
          style={styles.progressWrapper}
        >
          <AnimatedProgressBar
            fillColor={isRecording ? colors.recording : colors.primary}
            progress={Math.min(1, displayedProgress)}
            trackColor={colors.primarySoft}
            style={styles.progressTrack}
          />
        </View>

        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Maximum recording length: {formatDuration(MAX_RECORDING_DURATION_MS)}
        </Text>

        <ScalePressable
          accessibilityLabel={
            isProcessing
              ? "Processing recorded audio"
              : isRecording
                ? "Stop microphone recording"
                : "Start microphone recording"
          }
          accessibilityHint="Starts or stops the microphone recording"
          accessibilityRole="button"
          disabled={disabled || isProcessing}
          onPress={handlePrimaryAction}
          style={styles.primaryButtonWrapper}
        >
          <View style={styles.primaryButtonFrame}>
            {!isRecording && !isProcessing ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.primaryButtonPulse,
                  { backgroundColor: "#5B3DF5" },
                  pulseStyle,
                ]}
              />
            ) : null}

            <PremiumButtonSurface radius={22} style={styles.primaryButton}>
              {isProcessing ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.primaryButtonText}>Processing audio...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isRecording ? "Stop recording" : "Start recording"}
                </Text>
              )}
            </PremiumButtonSurface>
          </View>
        </ScalePressable>

        {recordingResult ? (
          <View
            style={[
              styles.resultContainer,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <Text style={[styles.resultTitle, { color: colors.primary }]}>
              Audio ready
            </Text>
            <Text style={[styles.resultText, { color: colors.primary }]}>
              {recordingResult.name}
            </Text>
            <Text style={[styles.resultText, { color: colors.primary }]}>
              Duration: {formatDuration(recordingResult.durationMs)}
            </Text>

            <View style={styles.resultActions}>
              <ScalePressable
                accessibilityLabel={
                  isPlaying ? "Stop recorded audio playback" : "Play recorded audio"
                }
                accessibilityRole="button"
                onPress={handlePlaybackAction}
                style={[
                  styles.secondaryButton,
                  styles.playButton,
                  {
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.primarySoft,
                  },
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {isPlaying ? "Stop playback" : "Play recording"}
                </Text>
              </ScalePressable>

              <ScalePressable
                accessibilityLabel="Discard current recording"
                accessibilityRole="button"
                onPress={handleReset}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.primarySoft,
                  },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Discard recording
                </Text>
              </ScalePressable>
            </View>
          </View>
        ) : null}
      </View>

      {error ? (
        <ErrorMessage
          actionLabel={showsPermissionAction ? "Open settings" : undefined}
          message={error.message}
          onAction={showsPermissionAction ? handleOpenSettings : undefined}
        />
      ) : null}

      {autoStopNotice ? (
        <View
          style={[
            styles.noticeCard,
            {
              backgroundColor: colors.warningSoft,
              borderColor: colors.warningBorder,
            },
          ]}
        >
          <Text style={[styles.noticeText, { color: colors.warning }]}>
            {autoStopNotice}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DBEAFE",
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 26,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  heroBlock: {
    alignItems: "center",
  },
  microphoneWrap: {
    alignItems: "center",
    height: 132,
    justifyContent: "center",
    width: 132,
  },
  microphonePulse: {
    borderRadius: 999,
    bottom: 0,
    left: 0,
    opacity: 0.16,
    position: "absolute",
    right: 0,
    top: 0,
  },
  microphoneOrb: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  statusDot: {
    borderRadius: 999,
    height: 12,
    marginRight: 10,
    width: 12,
  },
  statusDotActive: {
    backgroundColor: "#DC2626",
  },
  statusDotIdle: {
    backgroundColor: "#10B981",
  },
  statusText: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "700",
  },
  statusCaption: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  timerBlock: {
    alignItems: "center",
    marginTop: 14,
  },
  timer: {
    color: "#0F172A",
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: 0,
  },
  timerFraction: {
    fontSize: 22,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  progressWrapper: {
    marginTop: 18,
  },
  progressFill: {
    backgroundColor: "#1D4ED8",
    borderRadius: 999,
    height: "100%",
  },
  waveformCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  waveformHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  waveformTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  waveformStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  waitingPromptCard: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  waitingPromptText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  helperText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  primaryButtonWrapper: {
    alignSelf: "center",
    marginTop: 22,
    width: "100%",
  },
  primaryButtonFrame: {
    position: "relative",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 22,
    minHeight: 62,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  primaryButtonPulse: {
    borderRadius: 22,
    bottom: -1,
    left: -1,
    position: "absolute",
    right: -1,
    top: -1,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  startButton: {
    backgroundColor: "#5B3DF5",
  },
  stopButton: {
    backgroundColor: "#5B3DF5",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  processingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  resultContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    marginTop: 18,
    padding: 16,
  },
  resultActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  resultTitle: {
    color: "#1E3A8A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  resultText: {
    color: "#1E40AF",
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#BFDBFE",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  playButton: {
    backgroundColor: "#DBEAFE",
  },
  secondaryButtonText: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "700",
  },
  noticeCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  noticeText: {
    color: "#92400E",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
});
