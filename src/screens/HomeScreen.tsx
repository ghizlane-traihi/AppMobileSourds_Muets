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

import { ScalePressable } from "../components/ScalePressable";
import { ScrollRevealView } from "../components/ScrollRevealView";
import {
  ALPHABET_LEARNED_STORAGE_KEY,
  ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
  ALPHABET_MISTAKES_STORAGE_KEY,
  SIGN_TRANSLATION_HISTORY_STORAGE_KEY,
  SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
} from "../constants/storage";
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
  accentColor: string;
  borderColor: string;
  ctaLabel: string;
  iconBackgroundColor: string;
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
  accentColor,
  borderColor,
  ctaLabel,
  iconBackgroundColor,
  iconColor,
  iconName,
  isLoading,
  onPress,
  title,
}: PrimaryActionCardProps) => {
  return (
    <ScalePressable onPress={onPress} scaleTo={0.97} style={styles.primaryCardWrapper}>
      <View
        style={[
          styles.primaryCard,
          {
            borderColor,
          },
        ]}
      >
        <View
          style={[
            styles.primaryIcon,
            {
              backgroundColor: iconBackgroundColor,
            },
          ]}
        >
          <Feather color={iconColor} name={iconName} size={24} />
        </View>

        <Text style={styles.primaryTitle}>{title}</Text>

        <View
          style={[
            styles.primaryButton,
            {
              backgroundColor: accentColor,
            },
          ]}
        >
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
        </View>
      </View>
    </ScalePressable>
  );
};

export const HomeScreen = ({ navigation }: Props) => {
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
    <View style={styles.root}>
      <LinearGradient
        colors={["#07071F", "#0A0A2E", "#111044"]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          contentContainerStyle={styles.container}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <ScrollRevealView scrollY={scrollY}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.eyebrow}>SignLink</Text>
                <Text style={styles.title}>
                  Translate faster. Learn smarter.
                </Text>
                <Text style={styles.subtitle}>
                  Choose speech or camera.
                </Text>
              </View>

              <ScalePressable
                accessibilityHint="Opens application settings"
                onPress={() => navigation.navigate("Settings")}
                style={styles.settingsWrapper}
              >
                <View style={styles.settingsButton}>
                  <Feather color="#C8D6FF" name="settings" size={16} />
                </View>
              </ScalePressable>
            </View>
          </ScrollRevealView>

          <ScrollRevealView scrollY={scrollY}>
            <View style={styles.primaryActionsStack}>
              <PrimaryActionCard
                accentColor="#7C5CFC"
                borderColor="rgba(124,92,252,0.3)"
                ctaLabel="Start speaking"
                iconBackgroundColor="rgba(137,221,255,0.1)"
                iconColor="#89DDFF"
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
                accentColor="#7C5CFC"
                borderColor="rgba(255,255,255,0.1)"
                ctaLabel="Start camera"
                iconBackgroundColor="rgba(124,92,252,0.15)"
                iconColor="#B39DFC"
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
              onPress={() => queueNavigation("learning", () => navigation.navigate("DemoSigns"))}
              style={styles.learningCardWrapper}
            >
              <View style={styles.learningCard}>
                <View style={styles.learningIcon}>
                  <Feather color="#FBBF24" name="book-open" size={18} />
                </View>

                <View style={styles.learningContent}>
                  <Text style={styles.learningTitle}>{learningTitle}</Text>
                  <Text style={styles.learningMeta}>
                    {learningMeta}
                  </Text>
                </View>

                <View style={styles.learningButton}>
                  {pendingAction === "learning" ? (
                    <ActivityIndicator color="#C8D6FF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.learningButtonText}>
                        {learningButtonLabel}
                      </Text>
                      <Feather color="#C8D6FF" name="arrow-right" size={15} />
                    </>
                  )}
                </View>
              </View>
            </ScalePressable>
          </ScrollRevealView>
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#07071F",
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
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "rgba(137,221,255,0.78)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 36,
    marginTop: 12,
    maxWidth: "90%",
  },
  subtitle: {
    color: "rgba(226,232,255,0.62)",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 8,
  },
  settingsWrapper: {
    borderRadius: 999,
    marginLeft: 12,
    marginTop: 2,
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    shadowColor: "#050510",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    width: 44,
  },
  primaryActionsStack: {
    gap: 12,
  },
  primaryCardWrapper: {
    borderRadius: 26,
  },
  primaryCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 152,
    padding: 18,
  },
  primaryIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  primaryTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30,
    marginTop: 18,
    maxWidth: "92%",
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  learningCardWrapper: {
    borderRadius: 22,
  },
  learningCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  learningIcon: {
    alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.12)",
    borderColor: "rgba(251,191,36,0.25)",
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  learningContent: {
    flex: 1,
  },
  learningTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  learningMeta: {
    color: "rgba(226,232,255,0.55)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  learningButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  learningButtonText: {
    color: "#C8D6FF",
    fontSize: 12,
    fontWeight: "800",
  },
});
