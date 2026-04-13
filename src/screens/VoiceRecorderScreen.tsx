import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackground } from "../components/AppBackground";
import { ScalePressable } from "../components/ScalePressable";
import { SignSequencePlayer } from "../components/SignSequencePlayer";
import { TranslatingOverlay } from "../components/TranslatingOverlay";
import {
  HeroRecorderButton,
} from "../components/VoiceRecorderStage";
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { buildUploadAsset, normalizeApiError, speechToText } from "../services/api";
import { useAppTheme } from "../theme";
import { RootStackParamList, SignAsset, SpeechToTextResponse } from "../types";
import { resolveLocalSigns } from "../utils/resolveLocalSigns";
import { RecordingScreen } from "./RecordingScreen";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceRecorder">;

/** The four phases of the voice recorder flow */
type RecorderPhase = "idle" | "recording" | "translating" | "player";

// ─── VoiceRecorderScreen ──────────────────────────────────────────────────────

export const VoiceRecorderScreen = ({ navigation }: Props) => {
  const { colors, isDark } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [translationResult, setTranslationResult] =
    useState<SpeechToTextResponse | null>(null);
  const [localSigns, setLocalSigns] = useState<SignAsset[]>([]);
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
    setLocalSigns([]);
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
      // Resolve signs from local data/downloaded/ files instead of backend URLs
      const resolved = resolveLocalSigns(response.text ?? "");
      setLocalSigns(resolved);
      setTranslationResult(response);
      setPhase("player");
    } catch (err) {
      const normalized = normalizeApiError(err);
      setTranslationError(normalized.message);
      setPhase("player"); // show player phase with error state
    }
  };

  // ── Shared header ───────────────────────────────────────────────────────────
  const renderHeader = (title: string, onBack?: () => void) => (
    <View style={styles.header}>
      <ScalePressable
        accessibilityLabel="Go back"
        onPress={onBack ?? (() => navigation.goBack())}
        scaleTo={0.94}
      >
        <View
          style={[
            styles.headerButton,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.72)",
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(123,97,255,0.18)",
            },
          ]}
        >
          <Feather color={colors.text} name="chevron-left" size={24} />
        </View>
      </ScalePressable>

      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>

      <ScalePressable
        accessibilityLabel="Close"
        onPress={() => navigation.goBack()}
        scaleTo={0.94}
      >
        <View
          style={[
            styles.headerButton,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.72)",
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(123,97,255,0.18)",
            },
          ]}
        >
          <Feather color={colors.text} name="x" size={22} />
        </View>
      </ScalePressable>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppBackground style={styles.root}>
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
                localSigns={localSigns}
                onRecordAgain={returnToIdle}
                result={translationResult}
              />
            </Animated.View>
          </>
        ) : null}
      </SafeAreaView>
    </AppBackground>
  );
};

// ─── PlayerPhase ──────────────────────────────────────────────────────────────

interface PlayerPhaseProps {
  error: string | null;
  localSigns: SignAsset[];
  onRecordAgain: () => void;
  result: SpeechToTextResponse | null;
}

const PlayerPhase = ({ error, localSigns, onRecordAgain, result }: PlayerPhaseProps) => {
  const hasSigns = localSigns.length > 0;

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
            <PremiumButtonSurface radius={16} style={styles.retryButton}>
              <Feather color="#FFFFFF" name="mic" size={16} />
              <Text style={styles.retryButtonText}>Try again</Text>
            </PremiumButtonSurface>
          </ScalePressable>
        </View>
      ) : null}

      {/* ── Sign player ── */}
      {!error && hasSigns ? (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statValue}>{localSigns.length}</Text>
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

          {/* Cinematic sign player with local animations */}
          <SignSequencePlayer
            glossText={result?.text}
            signs={localSigns}
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
              ? `Detected: "${result.text}" — but no local sign animations were found for this sentence.`
              : "No signs were found for this recording. Try a shorter, clearer sentence."}
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
          <PremiumButtonSurface radius={18} style={styles.recordAgainButton}>
            <Feather color="#FFFFFF" name="mic" size={18} />
            <Text style={styles.recordAgainText}>Record another sentence</Text>
          </PremiumButtonSurface>
        </ScalePressable>
      ) : null}
    </ScrollView>
  );
};

// ─── PulseRing ────────────────────────────────────────────────────────────────

const PulseRing = ({ delay, size }: { delay: number; size: number }) => {
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.08,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.82,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.55,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <LinearGradient
        colors={[
          "rgba(123,97,255,0.44)",
          "rgba(91,61,245,0.5)",
          "rgba(63,43,191,0.3)",
          "rgba(123,97,255,0.44)",
        ]}
        locations={[0, 0.4, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.pulseRingCutout,
          {
            borderRadius: (size - 3) / 2,
          },
        ]}
      />
    </Animated.View>
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
  onStart,
}: IdleRecorderScreenProps) => {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={styles.idleContent}>
      {/* Copy */}
      <View style={styles.copyBlock}>
        <Text style={[styles.kicker, { color: colors.kicker }]}>Ready</Text>
        <Text style={[styles.title, { color: colors.text }]}>Voice Recorder</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Speak — we'll translate to sign language
        </Text>
      </View>

      {/* Mic orb with pulsing rings */}
      <View style={styles.idleOrbWrap}>
        {/* Background glow */}
        <View style={styles.idleGlow} />

        {/* Pulsing concentric rings */}
        <PulseRing delay={0} size={280} />
        <PulseRing delay={500} size={210} />
        <PulseRing delay={1000} size={150} />

        {/* Mic button */}
        <View style={styles.idleMicCenter}>
          <HeroRecorderButton
            accessibilityLabel="Start recording"
            iconName="mic"
            onPress={onStart}
          />
        </View>
      </View>

      {/* Secondary actions */}
      <View style={styles.idleActions}>
        <Text
          style={[
            styles.hint,
            {
              color: isDark ? colors.textMuted : "#5E5480",
            },
          ]}
        >
          Tap to start
        </Text>
      </View>
    </View>
  );
};

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
  const { isDark } = useAppTheme();
  const isLarge = size === "large";
  const isPrimary = variant === "primary";

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
          isPrimary
            ? styles.primaryButton
            : [
                styles.secondaryButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.82)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(91,61,245,0.22)",
                  shadowColor: isDark ? "#050510" : "#7B61FF",
                  shadowOpacity: isDark ? 0.32 : 0.18,
                  shadowRadius: isDark ? 14 : 12,
                },
              ],
          !isPrimary && styles.buttonDepth,
        ]}
      >
        <Feather
          color={isPrimary ? "#FFFFFF" : isDark ? "#C8D6FF" : "#5B3DF5"}
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
    backgroundColor: "#050816",
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
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 28,
    justifyContent: "space-between",
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
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(214,226,255,0.7)",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  // Orb + rings
  idleOrbWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 300,
    width: 300,
  },
  idleGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(140,54,255,0.24)",
    shadowColor: "#9B4DFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 58,
  },
  pulseRing: {
    backgroundColor: "transparent",
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#5B3DF5",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
  },
  pulseRingCutout: {
    backgroundColor: "rgba(7,5,27,0.5)",
    bottom: 1.5,
    left: 1.5,
    position: "absolute",
    right: 1.5,
    top: 1.5,
  },
  idleMicCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  // Secondary actions row
  idleActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
  },
  hint: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
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
    backgroundColor: "#5B3DF5",
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonDepth: {
    elevation: 5,
    shadowOffset: { width: 0, height: 6 },
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
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  recordAgainText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
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
    fontWeight: "700",
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
