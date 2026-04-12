import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScalePressable } from "../components/ScalePressable";
import { SignSequencePlayer } from "../components/SignSequencePlayer";
import { TranslatingOverlay } from "../components/TranslatingOverlay";
import {
  HeroRecorderButton,
  WaveformBackdrop,
} from "../components/VoiceRecorderStage";
import { buildUploadAsset, normalizeApiError, speechToText } from "../services/api";
import { RootStackParamList, SpeechToTextResponse } from "../types";
import { RecordingScreen } from "./RecordingScreen";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceRecorder">;

/** The four phases of the voice recorder flow */
type RecorderPhase = "idle" | "recording" | "translating" | "player";

// ─── VoiceRecorderScreen ──────────────────────────────────────────────────────

export const VoiceRecorderScreen = ({ navigation }: Props) => {
  const { height, width } = useWindowDimensions();
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [translationResult, setTranslationResult] =
    useState<SpeechToTextResponse | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const screenProgress = useRef(new Animated.Value(1)).current;
  const stageWidth = width;
  const stageHeight = height < 720 ? 220 : 248;

  // Fade-in animation on every phase change
  useEffect(() => {
    screenProgress.setValue(0);
    Animated.timing(screenProgress, {
      duration: 280,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [phase, screenProgress]);

  const animatedScreenStyle = {
    opacity: screenProgress,
    transform: [
      {
        scale: screenProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const returnToIdle = () => {
    setTranslationResult(null);
    setTranslationError(null);
    setPhase("idle");
  };

  // ── Translate handler (called from RecordingScreen) ─────────────────────────
  const handleTranslate = async (uri: string, durationMs: number) => {
    setTranslationError(null);
    setTranslationResult(null);
    setPhase("translating");

    try {
      const file = buildUploadAsset(
        uri,
        "audio/m4a",
        `voice_${Date.now()}.m4a`,
      );
      const response = await speechToText(file);
      setTranslationResult(response);
      setPhase("player");
    } catch (err) {
      const normalized = normalizeApiError(err);
      setTranslationError(normalized.message);
      setPhase("player"); // show player phase with error state
    }
  };

  // ── Shared dark header ──────────────────────────────────────────────────────
  const renderHeader = (title: string, onBack?: () => void) => (
    <View style={styles.header}>
      <ScalePressable
        accessibilityLabel="Go back"
        onPress={onBack ?? (() => navigation.goBack())}
        scaleTo={0.94}
      >
        <View style={styles.headerButton}>
          <Feather color="#F8FAFC" name="chevron-left" size={24} />
        </View>
      </ScalePressable>

      <Text style={styles.headerTitle}>{title}</Text>

      <ScalePressable
        accessibilityLabel="Close"
        onPress={() => navigation.goBack()}
        scaleTo={0.94}
      >
        <View style={styles.headerButton}>
          <Feather color="#F8FAFC" name="x" size={22} />
        </View>
      </ScalePressable>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#07071F", "#0A0A2E", "#111044"]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* ── IDLE PHASE ── */}
        {phase === "idle" ? (
          <>
            {renderHeader("Voice Recorder")}
            <Animated.View
              style={[
                styles.screen,
                animatedScreenStyle,
                height < 720 && styles.compactScreen,
              ]}
            >
              <IdleRecorderScreen
                onDelete={returnToIdle}
                onRetry={returnToIdle}
                onStart={() => setPhase("recording")}
                stageHeight={stageHeight}
                stageWidth={stageWidth}
              />
            </Animated.View>
          </>
        ) : null}

        {/* ── RECORDING PHASE ── */}
        {phase === "recording" ? (
          <>
            {renderHeader("Speak and translate")}
            <Animated.View
              style={[
                styles.screen,
                animatedScreenStyle,
                height < 720 && styles.compactScreen,
              ]}
            >
              <RecordingScreen
                onDelete={returnToIdle}
                onTranslate={(uri, durationMs) => {
                  void handleTranslate(uri, durationMs);
                }}
              />
            </Animated.View>
          </>
        ) : null}

        {/* ── TRANSLATING PHASE ── */}
        {phase === "translating" ? (
          <>
            {renderHeader("Translating...", returnToIdle)}
            <Animated.View
              style={[styles.screen, styles.translatingScreen, animatedScreenStyle]}
            >
              <TranslatingOverlay />
            </Animated.View>
          </>
        ) : null}

        {/* ── PLAYER PHASE ── */}
        {phase === "player" ? (
          <>
            {renderHeader("Sign translation", returnToIdle)}
            <Animated.View style={[styles.screen, animatedScreenStyle]}>
              <PlayerPhase
                error={translationError}
                onRecordAgain={returnToIdle}
                result={translationResult}
              />
            </Animated.View>
          </>
        ) : null}
      </SafeAreaView>
    </View>
  );
};

// ─── PlayerPhase ──────────────────────────────────────────────────────────────

interface PlayerPhaseProps {
  error: string | null;
  onRecordAgain: () => void;
  result: SpeechToTextResponse | null;
}

const PlayerPhase = ({ error, onRecordAgain, result }: PlayerPhaseProps) => {
  const hasSigns = (result?.signs.length ?? 0) > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.playerContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Error state ── */}
      {error ? (
        <View style={styles.errorCard}>
          <View style={styles.errorIconWrap}>
            <Feather color="#F87171" name="alert-circle" size={26} />
          </View>
          <Text style={styles.errorTitle}>Translation failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <ScalePressable onPress={onRecordAgain} scaleTo={0.96} style={styles.retryButtonWrapper}>
            <View style={styles.retryButton}>
              <Feather color="#FFFFFF" name="mic" size={16} />
              <Text style={styles.retryButtonText}>Try again</Text>
            </View>
          </ScalePressable>
        </View>
      ) : null}

      {/* ── Sign player ── */}
      {!error && hasSigns ? (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{result!.signs.length}</Text>
              <Text style={styles.statLabel}>Signs</Text>
            </View>
            {result?.text ? (
              <View style={[styles.statPill, styles.statPillWide]}>
                <Text style={styles.statValue}>
                  {result.text.split(/\s+/).filter(Boolean).length}
                </Text>
                <Text style={styles.statLabel}>Words detected</Text>
              </View>
            ) : null}
          </View>

          {/* Cinematic sign player */}
          <SignSequencePlayer
            glossText={result?.text}
            signs={result!.signs}
          />

          {/* Transcript card */}
          {result?.text ? (
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptLabel}>Detected speech</Text>
              <Text style={styles.transcriptText}>"{result.text}"</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {/* ── No signs returned ── */}
      {!error && !hasSigns && result ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Feather color="rgba(137,221,255,0.78)" name="layers" size={28} />
          </View>
          <Text style={styles.emptyTitle}>No sign visuals returned</Text>
          <Text style={styles.emptyMessage}>
            {result.text
              ? `Detected: "${result.text}" — but the backend returned no sign animations for this sentence.`
              : "The backend did not return any signs for this recording. Try a shorter, clearer sentence."}
          </Text>
        </View>
      ) : null}

      {/* ── Record again CTA ── */}
      {!error ? (
        <ScalePressable
          accessibilityLabel="Record a new sentence"
          onPress={onRecordAgain}
          scaleTo={0.96}
          style={styles.recordAgainWrapper}
        >
          <View style={styles.recordAgainButton}>
            <Feather color="#C8D6FF" name="mic" size={18} />
            <Text style={styles.recordAgainText}>Record another sentence</Text>
          </View>
        </ScalePressable>
      ) : null}
    </ScrollView>
  );
};

// ─── IdleRecorderScreen ───────────────────────────────────────────────────────

type IdleRecorderScreenProps = {
  onDelete: () => void;
  onRetry: () => void;
  onStart: () => void;
  stageHeight: number;
  stageWidth: number;
};

const IdleRecorderScreen = ({
  onDelete,
  onRetry,
  onStart,
  stageHeight,
  stageWidth,
}: IdleRecorderScreenProps) => (
  <View style={styles.idleContent}>
    <View style={styles.copyBlock}>
      <Text style={styles.kicker}>Ready</Text>
      <Text style={styles.title}>Voice Recorder</Text>
      <Text style={styles.subtitle}>Record your thoughts in one tap</Text>
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
        <WaveformBackdrop animated height={stageHeight} width={stageWidth} />

        <View style={styles.actionsRow}>
          <RoundControl
            accessibilityLabel="Retry recording"
            iconName="repeat"
            onPress={onRetry}
            variant="secondary"
          />
          <HeroRecorderButton
            accessibilityLabel="Start recording"
            iconName="mic"
            onPress={onStart}
          />
          <RoundControl
            accessibilityLabel="Delete recording"
            iconName="trash-2"
            onPress={onDelete}
            variant="secondary"
          />
        </View>
      </View>
    </View>

    <Text style={styles.hint}>Tap the mic when you are ready.</Text>
  </View>
);

// ─── RoundControl ─────────────────────────────────────────────────────────────

type RoundControlProps = {
  accessibilityLabel: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  size?: "regular" | "large";
  variant: "primary" | "secondary";
};

const RoundControl = ({
  accessibilityLabel,
  iconName,
  onPress,
  size = "regular",
  variant,
}: RoundControlProps) => {
  const isLarge = size === "large";

  return (
    <ScalePressable
      accessibilityLabel={accessibilityLabel}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#07071F",
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingTop: 12,
  },
  compactScreen: {
    paddingTop: 0,
  },
  translatingScreen: {
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  // ── Header ──
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    shadowColor: "#03030A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    width: 52,
  },
  headerTitle: {
    color: "#F8FAFC",
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },

  // ── Idle phase ──
  idleContent: {
    alignItems: "center",
    flex: 1,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 38,
  },
  copyBlock: {
    alignItems: "center",
    maxWidth: 330,
  },
  kicker: {
    color: "rgba(137,221,255,0.78)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(214,226,255,0.76)",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0,
    marginTop: 8,
    textAlign: "center",
  },
  visualCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  audioStage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
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
  hint: {
    color: "rgba(226,232,255,0.72)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center",
  },
  controlWrapper: {
    height: 52,
    width: 52,
  },
  controlWrapperLarge: {
    height: 72,
    width: 72,
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
  primaryButton: {
    backgroundColor: "#7C5CFC",
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
  },
  buttonDepth: {
    elevation: 5,
    shadowColor: "#050510",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },

  // ── Player phase ──
  playerContent: {
    gap: 20,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statPillWide: {
    flex: 1,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    color: "rgba(200,214,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: "uppercase",
  },
  transcriptCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  transcriptLabel: {
    color: "rgba(137,221,255,0.78)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  transcriptText: {
    color: "rgba(226,232,255,0.82)",
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "600",
    lineHeight: 24,
  },
  recordAgainWrapper: {
    marginTop: 4,
    width: "100%",
  },
  recordAgainButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  recordAgainText: {
    color: "#C8D6FF",
    fontSize: 15,
    fontWeight: "800",
  },

  // ── Error state ──
  errorCard: {
    alignItems: "center",
    backgroundColor: "rgba(248,113,113,0.08)",
    borderColor: "rgba(248,113,113,0.2)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 28,
  },
  errorIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(248,113,113,0.12)",
    borderRadius: 999,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  errorTitle: {
    color: "#F87171",
    fontSize: 18,
    fontWeight: "800",
  },
  errorMessage: {
    color: "rgba(226,232,255,0.62)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  retryButtonWrapper: {
    marginTop: 6,
    width: "100%",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#7C5CFC",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // ── Empty state ──
  emptyCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 28,
  },
  emptyIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(137,221,255,0.08)",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyMessage: {
    color: "rgba(226,232,255,0.62)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
