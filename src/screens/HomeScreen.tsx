import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

import { AppBackground } from "../components/AppBackground";
import { GlassButton, GlassCard } from "../components/LiquidGlass";
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { ScalePressable } from "../components/ScalePressable";
import { ScrollRevealView } from "../components/ScrollRevealView";
import {
  ALPHABET_LEARNED_STORAGE_KEY,
  ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
  ALPHABET_MISTAKES_STORAGE_KEY,
  SIGN_TRANSLATION_HISTORY_STORAGE_KEY,
  SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
} from "../constants/storage";
import { useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type LessonProgressSnapshot = {
  completedLessonIds?: string[];
};

type MistakeSnapshot = Record<
  string,
  {
    needsReview?: boolean;
  }
>;

type PendingAction = "speech" | "camera" | "learning" | null;

type PrimaryActionCardProps = {
  ctaLabel: string;
  iconColor: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  isLoading: boolean;
  onPress: () => void;
  title: string;
};

const toStoredCount = (rawValue: string | null) => {
  if (!rawValue) {
    return 0;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsedValue) ? parsedValue.length : 0;
  } catch (storageError) {
    console.log("parse home count error", storageError);
    return 0;
  }
};

const PrimaryActionCard = ({
  ctaLabel,
  iconColor,
  iconName,
  isLoading,
  onPress,
  title,
}: PrimaryActionCardProps) => {
  const { colors, isDark } = useAppTheme();

  return (
    <ScalePressable
      onPress={onPress}
      pressGlowColor="#5B3DF5"
      scaleTo={0.97}
      style={styles.primaryCardWrapper}
    >
      <GlassCard contentStyle={styles.primaryCard} featured radius={28}>
        <LinearGradient
          colors={
            isDark
              ? (["rgba(137,221,255,0.16)", "rgba(123,97,255,0.14)"] as const)
              : (["rgba(255,255,255,0.9)", "rgba(237,232,255,0.9)"] as const)
          }
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[
            styles.primaryIcon,
            {
              borderColor: isDark
                ? "rgba(137,221,255,0.2)"
                : "rgba(123,97,255,0.2)",
            },
          ]}
        >
          <Feather color={iconColor} name={iconName} size={24} />
        </LinearGradient>

        <Text style={[styles.primaryTitle, { color: colors.text }]}>{title}</Text>

        <View style={styles.primaryButtonShell}>
          <PremiumButtonSurface radius={24} style={styles.primaryButton}>
            {isLoading ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.primaryButtonText}>Opening...</Text>
              </>
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
                <Feather color="#FFFFFF" name="arrow-right" size={16} />
              </>
            )}
          </PremiumButtonSurface>
        </View>
      </GlassCard>
    </ScalePressable>
  );
};

export const HomeScreen = ({ navigation }: Props) => {
  const { colors, isDark, setThemeMode } = useAppTheme();
  const [learnedCount, setLearnedCount] = useState(0);
  const [lessonCompletedCount, setLessonCompletedCount] = useState(0);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const scrollY = useSharedValue(0);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    let isMounted = true;

    const loadProgress = async () => {
      try {
        const [
          rawLearnedValue,
          rawLessonProgress,
          rawMistakes,
          rawSignHistory,
          rawSpeechHistory,
        ] = await Promise.all([
          AsyncStorage.getItem(ALPHABET_LEARNED_STORAGE_KEY),
          AsyncStorage.getItem(ALPHABET_LESSON_PROGRESS_STORAGE_KEY),
          AsyncStorage.getItem(ALPHABET_MISTAKES_STORAGE_KEY),
          AsyncStorage.getItem(SIGN_TRANSLATION_HISTORY_STORAGE_KEY),
          AsyncStorage.getItem(SPEECH_TRANSLATION_HISTORY_STORAGE_KEY),
        ]);

        if (!isMounted) {
          return;
        }

        if (rawLearnedValue) {
          const parsedValue = JSON.parse(rawLearnedValue) as string[];
          setLearnedCount(Array.isArray(parsedValue) ? parsedValue.length : 0);
        } else {
          setLearnedCount(0);
        }

        const parsedLessonProgress = rawLessonProgress
          ? (JSON.parse(rawLessonProgress) as LessonProgressSnapshot)
          : null;
        setLessonCompletedCount(parsedLessonProgress?.completedLessonIds?.length ?? 0);

        const parsedMistakes = rawMistakes ? (JSON.parse(rawMistakes) as MistakeSnapshot) : {};
        setNeedsReviewCount(
          Object.values(parsedMistakes).filter((record) => record.needsReview).length,
        );
        toStoredCount(rawSignHistory);
        toStoredCount(rawSpeechHistory);
      } catch (storageError) {
        console.log("load home progress error", storageError);
      }
    };

    const unsubscribe = navigation.addListener("focus", () => {
      void loadProgress();
    });

    void loadProgress();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation, scrollY]);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const queueNavigation = (action: PendingAction, callback: () => void) => {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);

    navigationTimeoutRef.current = setTimeout(() => {
      setPendingAction(null);
      callback();
    }, 160);
  };

  const toggleThemeMode = () => {
    setThemeMode(isDark ? "light" : "dark");
  };

  const learningButtonLabel =
    learnedCount > 0 || lessonCompletedCount > 0 ? "Continue learning" : "Start learning";
  const learningTitle =
    learnedCount > 0 || lessonCompletedCount > 0
      ? "Continue learning A to Z"
      : "Start learning A to Z";
  const learningMeta =
    learnedCount > 0
      ? `${learnedCount} letters learned`
      : needsReviewCount > 0
        ? `${needsReviewCount} letters to review`
        : "Alphabet lessons";

  return (
    <AppBackground style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          contentContainerStyle={styles.container}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <ScrollRevealView scrollY={scrollY}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={[styles.eyebrow, { color: colors.kicker }]}>SignLink</Text>
                <Text style={[styles.title, { color: colors.text }]}>
                  Translate faster. Learn smarter.
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Choose speech or camera.
                </Text>
              </View>

              <View style={styles.headerActions}>
                <ScalePressable
                  accessibilityHint="Switches between light and dark mode"
                  accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  onPress={toggleThemeMode}
                  style={styles.headerActionWrapper}
                >
                  <View
                    style={[
                      styles.headerActionButton,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.72)",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.14)"
                          : "rgba(123,97,255,0.18)",
                      },
                    ]}
                  >
                    <Feather
                      color={colors.textSecondary}
                      name={isDark ? "sun" : "moon"}
                      size={16}
                    />
                  </View>
                </ScalePressable>

                <ScalePressable
                  accessibilityHint="Opens application settings"
                  onPress={() => navigation.navigate("Settings")}
                  style={styles.headerActionWrapper}
                >
                  <View
                    style={[
                      styles.headerActionButton,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255,255,255,0.72)",
                        borderColor: isDark
                          ? "rgba(255,255,255,0.14)"
                          : "rgba(123,97,255,0.18)",
                      },
                    ]}
                  >
                    <Feather color={colors.textSecondary} name="settings" size={16} />
                  </View>
                </ScalePressable>
              </View>
            </View>
          </ScrollRevealView>

          <ScrollRevealView scrollY={scrollY}>
            <View style={styles.primaryActionsStack}>
              <PrimaryActionCard
                ctaLabel="Start speaking"
                iconColor={isDark ? "#89DDFF" : "#5B3DF5"}
                iconName="mic"
                isLoading={pendingAction === "speech"}
                onPress={() =>
                  queueNavigation("speech", () =>
                    navigation.navigate("VoiceRecorder"),
                  )
                }
                title="Speak and translate"
              />

              <PrimaryActionCard
                ctaLabel="Start camera"
                iconColor={isDark ? "#B39DFC" : "#3F2BBF"}
                iconName="camera"
                isLoading={pendingAction === "camera"}
                onPress={() =>
                  queueNavigation("camera", () =>
                    navigation.navigate("SignToSpeech", { initialMode: "translate" }),
                  )
                }
                title="Use camera to translate"
              />
            </View>
          </ScrollRevealView>

          <ScrollRevealView scrollY={scrollY}>
            <ScalePressable
              onPress={() => queueNavigation("learning", () => navigation.navigate("Learning"))}
              style={styles.learningCardWrapper}
            >
              <GlassCard contentStyle={styles.learningCard} radius={24}>
                <LinearGradient
                  colors={
                    isDark
                      ? (["rgba(137,221,255,0.13)", "rgba(123,97,255,0.14)"] as const)
                      : (["rgba(255,255,255,0.9)", "rgba(237,232,255,0.9)"] as const)
                  }
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={[
                    styles.learningIcon,
                    {
                      borderColor: isDark
                        ? "rgba(137,221,255,0.18)"
                        : "rgba(123,97,255,0.2)",
                    },
                  ]}
                >
                  <Feather color={isDark ? "#FBBF24" : "#5B3DF5"} name="book-open" size={18} />
                </LinearGradient>

                <View style={styles.learningContent}>
                  <Text style={[styles.learningTitle, { color: colors.text }]}>{learningTitle}</Text>
                  <Text style={[styles.learningMeta, { color: colors.textSecondary }]}>
                    {learningMeta}
                  </Text>
                </View>

                <View style={styles.learningButtonShell}>
                  <PremiumButtonSurface radius={20} style={styles.learningButton}>
                    {pendingAction === "learning" ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={styles.learningButtonText}>
                          {learningButtonLabel}
                        </Text>
                        <Feather color="#FFFFFF" name="arrow-right" size={15} />
                      </>
                    )}
                  </PremiumButtonSurface>
                </View>
              </GlassCard>
            </ScalePressable>
          </ScrollRevealView>
        </Animated.ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    gap: 16,
    padding: 18,
    paddingBottom: 30,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: "rgba(137,221,255,0.78)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 12,
    maxWidth: "90%",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  headerActionWrapper: {
    borderRadius: 999,
  },
  headerActionButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    shadowColor: "#050510",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    width: 42,
  },
  primaryActionsStack: {
    gap: 12,
  },
  primaryCardWrapper: {
    borderRadius: 26,
  },
  primaryCard: {
    minHeight: 152,
    padding: 18,
  },
  primaryIcon: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  primaryTitle: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: 18,
    maxWidth: "92%",
  },
  primaryButtonShell: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(91,61,245,0.12)",
    borderRadius: 24,
    marginTop: 18,
    shadowColor: "#5B3DF5",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  primaryButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  learningCardWrapper: {
    borderRadius: 24,
  },
  learningCard: {
    alignItems: "flex-start",
    gap: 14,
    minHeight: 172,
    padding: 18,
  },
  learningIcon: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  learningContent: {
    width: "100%",
  },
  learningTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    maxWidth: "92%",
  },
  learningMeta: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 6,
  },
  learningButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  learningButtonShell: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(91,61,245,0.12)",
    borderRadius: 20,
    marginTop: 2,
    shadowColor: "#5B3DF5",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
  },
  learningButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
