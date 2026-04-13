/**
 * SignSequencePlayer
 *
 * A cinematic, story-style sign language player.
 * Displays one sign at a time, with:
 *   - Story-style progress bars (one per sign)
 *   - Smooth cross-fade between signs
 *   - Animated word label slide-up on each transition
 *   - Scrollable word chip row with active highlight
 *   - Pause / play / replay controls
 *   - Fallback card for signs with no media URI
 *   - "Finished" state with replay prompt
 */

import { Feather } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ScalePressable } from "./ScalePressable";
import { useAppTheme } from "../theme";
import { SignAsset } from "../types";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGN_DURATION_MS = 2800;
const TICK_INTERVAL_MS = 40;
const FADE_OUT_MS = 160;
const FADE_IN_MS = 220;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignSequencePlayerProps {
  /** Ordered array of signs returned from the backend */
  signs: SignAsset[];
  /** Full transcribed / gloss sentence label (optional, shown as kicker) */
  glossText?: string;
  /** Fired once when the last sign finishes playing */
  onFinished?: () => void;
}

// ─── Fallback card — shown when a sign has no valid media URI ─────────────────

interface FallbackCardProps {
  word: string;
  width: number;
  height: number;
}

const FallbackCard = ({ word, width, height }: FallbackCardProps) => {
  const { colors } = useAppTheme();
  const letter = word.trim().slice(0, 1).toUpperCase();

  return (
    <View
      style={[
        fallbackStyles.root,
        { width, height, backgroundColor: colors.surfaceAccent, borderColor: colors.primarySoft },
      ]}
    >
      <View
        style={[
          fallbackStyles.letterOrb,
          { backgroundColor: colors.primarySofter, borderColor: colors.primarySoft },
        ]}
      >
        <Text style={[fallbackStyles.letter, { color: colors.primary }]}>
          {letter}
        </Text>
      </View>
      <Text style={[fallbackStyles.word, { color: colors.text }]}>{word}</Text>
      <Text style={[fallbackStyles.hint, { color: colors.textMuted }]}>
        No animation available
      </Text>
    </View>
  );
};

const fallbackStyles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    gap: 10,
  },
  letterOrb: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  letter: {
    fontSize: 36,
    fontWeight: "800",
  },
  word: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
  },
  hint: {
    fontSize: 13,
    fontWeight: "600",
  },
});

// ─── Main component ───────────────────────────────────────────────────────────

export const SignSequencePlayer = ({
  signs,
  glossText,
  onFinished,
}: SignSequencePlayerProps) => {
  const { colors, isDark } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

  // ── Layout ──────────────────────────────────────────────────────────────────
  const mediaWidth = Math.min(screenWidth - 48, 420);
  const mediaHeight = Math.round(mediaWidth * 0.72);

  // ── Playback state ──────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [signProgresses, setSignProgresses] = useState<number[]>(
    () => Array(signs.length).fill(0),
  );

  // ── Refs (avoid stale-closure issues in setInterval) ────────────────────────
  const isMountedRef = useRef(true);
  const currentIndexRef = useRef(0);
  const isPausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const chipsScrollRef = useRef<ScrollView>(null);

  // ── Animated values ─────────────────────────────────────────────────────────
  const mediaOpacity = useRef(new Animated.Value(1)).current;
  const wordLabelY = useRef(new Animated.Value(0)).current;
  const wordLabelOpacity = useRef(new Animated.Value(1)).current;

  // Keep refs in sync
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Cross-fade + word-label animation on sign advance ────────────────────────
  const doTransition = useCallback(
    (nextIndex: number) => {
      if (isTransitioningRef.current) {
        return;
      }
      isTransitioningRef.current = true;

      Animated.parallel([
        Animated.timing(mediaOpacity, {
          toValue: 0,
          duration: FADE_OUT_MS,
          useNativeDriver: true,
        }),
        Animated.timing(wordLabelOpacity, {
          toValue: 0,
          duration: FADE_OUT_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isMountedRef.current) {
          return;
        }

        elapsedRef.current = 0;
        lastTickRef.current = null;

        setCurrentIndex(nextIndex);

        // Prepare slide-up for new word
        wordLabelY.setValue(14);

        Animated.parallel([
          Animated.timing(mediaOpacity, {
            toValue: 1,
            duration: FADE_IN_MS,
            useNativeDriver: true,
          }),
          Animated.timing(wordLabelOpacity, {
            toValue: 1,
            duration: FADE_IN_MS,
            useNativeDriver: true,
          }),
          Animated.spring(wordLabelY, {
            toValue: 0,
            damping: 16,
            stiffness: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          isTransitioningRef.current = false;
        });

        // Auto-scroll chip row to keep active chip visible
        setTimeout(() => {
          chipsScrollRef.current?.scrollTo({
            x: Math.max(0, nextIndex * 72 - 36),
            animated: true,
          });
        }, 80);
      });
    },
    [mediaOpacity, wordLabelOpacity, wordLabelY],
  );

  // ── Core tick loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (signs.length === 0 || hasFinished) {
      return;
    }

    const tickId = setInterval(() => {
      if (isPausedRef.current || isTransitioningRef.current) {
        lastTickRef.current = null;
        return;
      }

      const now = Date.now();

      if (lastTickRef.current === null) {
        lastTickRef.current = now;
        return;
      }

      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      const progress = Math.min(1, elapsedRef.current / SIGN_DURATION_MS);
      const idx = currentIndexRef.current;

      if (isMountedRef.current) {
        setSignProgresses((prev) => {
          const next = [...prev];
          next[idx] = progress;
          return next;
        });
      }

      if (progress >= 1 && !isTransitioningRef.current) {
        const nextIndex = idx + 1;

        if (nextIndex >= signs.length) {
          clearInterval(tickId);
          if (isMountedRef.current) {
            setSignProgresses((prev) => {
              const next = [...prev];
              next[idx] = 1;
              return next;
            });
            setHasFinished(true);
          }
          onFinished?.();
        } else {
          doTransition(nextIndex);
        }
      }
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(tickId);
    };
  }, [signs.length, hasFinished, doTransition, onFinished]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  const handleReplay = useCallback(() => {
    isTransitioningRef.current = false;
    elapsedRef.current = 0;
    lastTickRef.current = null;

    setSignProgresses(Array(signs.length).fill(0));
    setCurrentIndex(0);
    setHasFinished(false);
    setIsPaused(false);

    mediaOpacity.setValue(0);
    wordLabelOpacity.setValue(0);
    wordLabelY.setValue(14);

    Animated.parallel([
      Animated.timing(mediaOpacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.timing(wordLabelOpacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.spring(wordLabelY, {
        toValue: 0,
        damping: 16,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    chipsScrollRef.current?.scrollTo({ x: 0, animated: true });
  }, [signs.length, mediaOpacity, wordLabelOpacity, wordLabelY]);

  const handleTogglePause = useCallback(() => {
    if (hasFinished) {
      handleReplay();
      return;
    }
    setIsPaused((prev) => !prev);
  }, [hasFinished, handleReplay]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const currentSign = useMemo(
    () => signs[currentIndex] ?? null,
    [signs, currentIndex],
  );

  const hasValidMedia = Boolean(currentSign?.uri);

  const playIconName = hasFinished
    ? "rotate-ccw"
    : isPaused
      ? "play"
      : "pause";

  if (signs.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ── Gloss kicker ── */}
      {glossText ? (
        <View style={styles.glossRow}>
          <Text
            numberOfLines={2}
            style={[styles.glossText, { color: colors.textMuted }]}
          >
            {glossText}
          </Text>
        </View>
      ) : null}

      {/* ── Story progress bars ── */}
      <View style={styles.progressRow}>
        {signs.map((_, index) => {
          const rawProgress =
            index < currentIndex
              ? 1
              : index === currentIndex
                ? signProgresses[index] ?? 0
                : 0;

          return (
            <View
              key={index}
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? "rgba(255,255,255,0.12)" : colors.primarySoft },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${rawProgress * 100}%`,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      {/* ── Media frame ── */}
      <View
        style={[
          styles.mediaCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            height: mediaHeight,
            shadowColor: isDark ? "#000000" : colors.shadow,
            shadowOpacity: isDark ? 0.5 : 0.1,
          },
        ]}
      >
        <Animated.View style={[styles.mediaContent, { opacity: mediaOpacity }]}>
          {hasValidMedia ? (
            currentSign!.type === "video" ? (
              <Video
                key={currentSign!.id}
                isLooping
                isMuted
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={!isPaused && !hasFinished}
                source={{ uri: currentSign!.uri }}
                style={{ width: mediaWidth, height: mediaHeight }}
              />
            ) : (
              <Image
                resizeMode="contain"
                source={{
                  uri: currentSign!.thumbnailUri ?? currentSign!.uri,
                }}
                style={{ width: mediaWidth, height: mediaHeight }}
              />
            )
          ) : (
            <FallbackCard
              word={currentSign?.label ?? "?"}
              width={mediaWidth}
              height={mediaHeight}
            />
          )}
        </Animated.View>

        {/* Paused overlay */}
        {isPaused && !hasFinished ? (
          <View style={styles.pausedOverlay}>
            <View
              style={[
                styles.pausedBadge,
                { backgroundColor: "rgba(0,0,0,0.62)" },
              ]}
            >
              <Feather color="#FFFFFF" name="pause" size={18} />
              <Text style={styles.pausedLabel}>Paused</Text>
            </View>
          </View>
        ) : null}

        {/* Finished overlay */}
        {hasFinished ? (
          <View style={styles.pausedOverlay}>
            <ScalePressable onPress={handleReplay} scaleTo={0.94}>
              <View
                style={[
                  styles.finishedBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Feather color="#FFFFFF" name="rotate-ccw" size={18} />
                <Text style={styles.finishedLabel}>Replay</Text>
              </View>
            </ScalePressable>
          </View>
        ) : null}
      </View>

      {/* ── Word label ── */}
      <Animated.View
        style={[
          styles.wordLabelRow,
          {
            opacity: wordLabelOpacity,
            transform: [{ translateY: wordLabelY }],
          },
        ]}
      >
        <Text
          style={[styles.wordLabel, { color: colors.text }]}
          numberOfLines={1}
        >
          {currentSign?.label ?? ""}
        </Text>
        <Text style={[styles.wordCounter, { color: colors.textMuted }]}>
          {currentIndex + 1} / {signs.length}
        </Text>
      </Animated.View>

      {/* ── Word chip strip ── */}
      {signs.length > 1 ? (
        <ScrollView
          ref={chipsScrollRef}
          contentContainerStyle={styles.chipsContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
        >
          {signs.map((sign, index) => {
            const isActive = index === currentIndex;
            const isDone = index < currentIndex || (hasFinished && index === currentIndex);

            return (
              <View
                key={sign.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : isDone
                        ? colors.primarySofter
                        : colors.surfaceMuted,
                    borderColor: isActive
                      ? colors.primary
                      : isDone
                        ? colors.primarySoft
                        : colors.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.chipText,
                    {
                      color: isActive
                        ? colors.primaryText
                        : isDone
                          ? colors.primary
                          : colors.textMuted,
                    },
                  ]}
                >
                  {sign.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {/* ── Controls ── */}
      <View style={styles.controlsRow}>
        {/* Replay */}
        <ScalePressable
          accessibilityLabel="Replay from start"
          onPress={handleReplay}
          scaleTo={0.92}
          style={styles.controlButtonWrapper}
        >
          <View
            style={[
              styles.controlButton,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather color={colors.textMuted} name="rotate-ccw" size={19} />
          </View>
        </ScalePressable>

        {/* Play / Pause (hero) */}
        <ScalePressable
          accessibilityLabel={
            hasFinished
              ? "Replay sequence"
              : isPaused
                ? "Resume playback"
                : "Pause playback"
          }
          onPress={handleTogglePause}
          scaleTo={0.94}
          style={styles.heroButtonWrapper}
        >
          <View
            style={[
              styles.heroButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Feather color={colors.primaryText} name={playIconName} size={24} />
          </View>
        </ScalePressable>

        {/* Spacer — mirrors the replay button for symmetric layout */}
        <View style={styles.controlButtonWrapper}>
          <View style={styles.controlButtonPlaceholder} />
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },

  // Gloss kicker
  glossRow: {
    alignItems: "center",
    paddingHorizontal: 4,
  },
  glossText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.0,
    textAlign: "center",
    textTransform: "uppercase",
  },

  // Story progress bars
  progressRow: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 2,
  },
  progressTrack: {
    borderRadius: 999,
    flex: 1,
    height: 4,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 999,
    height: "100%",
  },

  // Media frame
  mediaCard: {
    alignSelf: "center",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    width: "100%",
  },
  mediaContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },

  // Paused / finished overlay
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pausedBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  pausedLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  finishedBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  finishedLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  // Word label
  wordLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  wordLabel: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0,
  },
  wordCounter: {
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },

  // Chip strip
  chipsScroll: {
    marginHorizontal: -4,
  },
  chipsContent: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  // Controls
  controlsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingTop: 4,
  },
  controlButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
  },
  controlButton: {
    alignItems: "center",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  controlButtonPlaceholder: {
    height: 52,
    width: 52,
  },
  heroButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroButton: {
    alignItems: "center",
    borderRadius: 36,
    height: 68,
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    width: 68,
  },
});
