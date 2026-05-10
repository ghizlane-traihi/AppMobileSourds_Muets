import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackground } from "../components/AppBackground";
import { GlassCard } from "../components/LiquidGlass";
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import {
  ALPHABET_FAVORITES_STORAGE_KEY,
  ALPHABET_LEARNED_STORAGE_KEY,
  ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
  ALPHABET_MISTAKES_STORAGE_KEY,
  ALPHABET_QUIZ_SCORE_STORAGE_KEY,
  ALPHABET_RECENT_STORAGE_KEY,
  GAMIFICATION_STORAGE_KEY,
  SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
  SIGN_TRANSLATION_HISTORY_STORAGE_KEY,
  SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
  STRUCTURED_LEARNING_PROGRESS_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
} from "../constants/storage";
import { ThemeMode, useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;
type BusyAction = "translations" | "learning" | "logout" | null;

type UserInfo = {
  email?: string;
  name?: string;
};

type LessonProgressSnapshot = {
  completedLessonIds?: string[];
};

const STORAGE_KEYS = {
  speechHistory: SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
  speechFavorites: SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
  signHistory: SIGN_TRANSLATION_HISTORY_STORAGE_KEY,
  learningFavorites: ALPHABET_FAVORITES_STORAGE_KEY,
  learningLearned: ALPHABET_LEARNED_STORAGE_KEY,
  learningLessonProgress: ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
  learningMistakes: ALPHABET_MISTAKES_STORAGE_KEY,
  learningQuizScore: ALPHABET_QUIZ_SCORE_STORAGE_KEY,
  learningRecent: ALPHABET_RECENT_STORAGE_KEY,
  gamification: GAMIFICATION_STORAGE_KEY,
  structuredLearningProgress: STRUCTURED_LEARNING_PROGRESS_STORAGE_KEY,
  userInfo: USER_INFO_STORAGE_KEY,
};

const THEME_OPTIONS: { description: string; label: string; mode: ThemeMode }[] = [
  {
    description: "Follow this device",
    label: "System",
    mode: "system",
  },
  {
    description: "Bright interface",
    label: "Light",
    mode: "light",
  },
  {
    description: "Low-light interface",
    label: "Dark",
    mode: "dark",
  },
];

const countFormatter = new Intl.NumberFormat();

const resetStorageGroup = async (keys: string[]) => {
  await AsyncStorage.multiRemove(keys);
};

const formatCount = (value: number) => countFormatter.format(value);

const toStoredCount = (rawValue: string | null) => {
  if (!rawValue) {
    return 0;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    return Array.isArray(parsedValue) ? parsedValue.length : 0;
  } catch (storageError) {
    console.log("parse settings count error", storageError);
    return 0;
  }
};

const toLessonCompletedCount = (rawValue: string | null) => {
  if (!rawValue) {
    return 0;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as LessonProgressSnapshot;

    return Array.isArray(parsedValue.completedLessonIds)
      ? parsedValue.completedLessonIds.length
      : 0;
  } catch (storageError) {
    console.log("parse lesson progress count error", storageError);
    return 0;
  }
};

const parseUserInfo = (rawValue: string | null): UserInfo => {
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue) as UserInfo;

    return {
      email:
        typeof parsedValue.email === "string" ? parsedValue.email.trim() : "",
      name: typeof parsedValue.name === "string" ? parsedValue.name.trim() : "",
    };
  } catch (storageError) {
    console.log("parse user info error", storageError);
    return {};
  }
};

export const SettingsScreen = ({ navigation }: Props) => {
  const { colors, isDark, setThemeMode, themeMode } = useAppTheme();
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [favoriteLettersCount, setFavoriteLettersCount] = useState(0);
  const [learnedLettersCount, setLearnedLettersCount] = useState(0);
  const [lessonCompletedCount, setLessonCompletedCount] = useState(0);
  const [speechHistoryCount, setSpeechHistoryCount] = useState(0);
  const [signHistoryCount, setSignHistoryCount] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const loadStorageSummary = useCallback(async () => {
    try {
      const [
        rawSpeechHistory,
        rawSignHistory,
        rawLearnedLetters,
        rawFavoriteLetters,
        rawLessonProgress,
        rawUserInfo,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.speechHistory),
        AsyncStorage.getItem(STORAGE_KEYS.signHistory),
        AsyncStorage.getItem(STORAGE_KEYS.learningLearned),
        AsyncStorage.getItem(STORAGE_KEYS.learningFavorites),
        AsyncStorage.getItem(STORAGE_KEYS.learningLessonProgress),
        AsyncStorage.getItem(STORAGE_KEYS.userInfo),
      ]);
      const nextUserInfo = parseUserInfo(rawUserInfo);

      setSpeechHistoryCount(toStoredCount(rawSpeechHistory));
      setSignHistoryCount(toStoredCount(rawSignHistory));
      setLearnedLettersCount(toStoredCount(rawLearnedLetters));
      setFavoriteLettersCount(toStoredCount(rawFavoriteLetters));
      setLessonCompletedCount(toLessonCompletedCount(rawLessonProgress));
      setUserEmail(nextUserInfo.email ?? "");
      setUserName(nextUserInfo.name ?? "");
    } catch (storageError) {
      console.log("load settings summary error", storageError);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStorageSummary();
    }, [loadStorageSummary]),
  );

  const handleResetTranslations = () => {
    if (busyAction) {
      return;
    }

    Alert.alert(
      "Clear translation history?",
      "This removes saved Speech to Sign and Sign to Speech results from this device.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Clear",
          onPress: async () => {
            setBusyAction("translations");

            try {
              await resetStorageGroup([
                STORAGE_KEYS.speechHistory,
                STORAGE_KEYS.speechFavorites,
                STORAGE_KEYS.signHistory,
              ]);
              await loadStorageSummary();
              Alert.alert("Done", "Translation history was cleared.");
            } catch (storageError) {
              console.log("reset translations error", storageError);
              Alert.alert("Could not clear data", "Please try again.");
            } finally {
              setBusyAction(null);
            }
          },
        },
      ],
    );
  };

  const handleResetLearning = () => {
    if (busyAction) {
      return;
    }

    Alert.alert(
      "Reset learning progress?",
      "This removes saved letters, learned progress, and recent learning activity.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Reset",
          onPress: async () => {
            setBusyAction("learning");

            try {
              await resetStorageGroup([
                STORAGE_KEYS.learningFavorites,
                STORAGE_KEYS.learningLearned,
                STORAGE_KEYS.learningLessonProgress,
                STORAGE_KEYS.learningMistakes,
                STORAGE_KEYS.learningQuizScore,
                STORAGE_KEYS.learningRecent,
                STORAGE_KEYS.gamification,
                STORAGE_KEYS.structuredLearningProgress,
              ]);
              await loadStorageSummary();
              Alert.alert("Done", "Learning data was reset.");
            } catch (storageError) {
              console.log("reset learning error", storageError);
              Alert.alert("Could not reset learning", "Please try again.");
            } finally {
              setBusyAction(null);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    if (busyAction) {
      return;
    }

    Alert.alert(
      "Log out?",
      "This removes your local profile information from this device. Your learning progress and saved history stay saved.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Log out",
          onPress: async () => {
            setBusyAction("logout");

            try {
              await AsyncStorage.removeItem(USER_INFO_STORAGE_KEY);
              navigation.reset({
                index: 0,
                routes: [{ name: "UserInfo" }],
              });
            } catch (storageError) {
              console.log("logout error", storageError);
              Alert.alert("Could not log out", "Please try again.");
              setBusyAction(null);
            }
          },
        },
      ],
    );
  };

  const profileInitial = (userName || "S").charAt(0).toUpperCase();
  const savedDataSummary = [
    { label: "Speech", value: speechHistoryCount },
    { label: "Signs", value: signHistoryCount },
    { label: "Learned", value: learnedLettersCount },
    { label: "Saved", value: favoriteLettersCount },
    { label: "Lessons", value: lessonCompletedCount },
  ];

  return (
    <AppBackground style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={[styles.eyebrow, { color: colors.kicker }]}>Settings</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Your settings
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Theme, account, and saved data.
            </Text>
          </View>

          <GlassCard contentStyle={styles.card} radius={24}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Appearance
            </Text>
            <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
              Keep the app in sync with your phone or choose a fixed theme.
            </Text>
            <View style={styles.themeModeRow}>
              {THEME_OPTIONS.map((option) => {
                const isSelected = themeMode === option.mode;

                return (
                  <Pressable
                    accessibilityHint={
                      isSelected
                        ? "This theme preference is selected"
                        : `Sets the app theme to ${option.label.toLowerCase()}`
                    }
                    accessibilityLabel={`${option.label} theme`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={option.mode}
                    onPress={() => setThemeMode(option.mode)}
                    style={({ pressed }) => [
                      styles.themeChoiceWrap,
                      pressed && styles.actionPressed,
                    ]}
                  >
                    {isSelected ? (
                      <PremiumButtonSurface radius={18} style={styles.themeChoiceActive}>
                        <Text
                          style={[
                            styles.themeChoiceActiveLabel,
                            { color: colors.primaryText },
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.themeChoiceActiveDescription,
                            { color: colors.primaryTextMuted },
                          ]}
                        >
                          {option.description}
                        </Text>
                      </PremiumButtonSurface>
                    ) : (
                      <View
                        style={[
                          styles.themeChoice,
                          {
                            backgroundColor: colors.glassBg,
                            borderColor: colors.glassBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.themeChoiceLabel, { color: colors.text }]}>
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.themeChoiceDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {option.description}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard contentStyle={styles.card} radius={24}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Account
            </Text>
            <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
              Sign out from this device and return to the profile screen.
            </Text>

            <View
              style={[
                styles.profileRow,
                {
                  backgroundColor: colors.glassBg,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.profileAvatar,
                  {
                    backgroundColor: isDark
                      ? colors.kickerGlow
                      : colors.primarySoft,
                    borderColor: colors.glassBorder,
                  },
                ]}
              >
                <Text style={[styles.profileInitial, { color: colors.kicker }]}>
                  {profileInitial}
                </Text>
              </View>
              <View style={styles.profileCopy}>
                <Text
                  numberOfLines={1}
                  style={[styles.profileName, { color: colors.text }]}
                >
                  {userName || "SignLink profile"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.profileEmail, { color: colors.textMuted }]}
                >
                  {userEmail || "Stored on this device"}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityHint="Returns to the profile screen after removing local profile information"
              accessibilityLabel={busyAction === "logout" ? "Logging out" : "Log out"}
              accessibilityRole="button"
              accessibilityState={{
                busy: busyAction === "logout",
                disabled: busyAction !== null,
              }}
              disabled={busyAction !== null}
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutAction,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: colors.dangerBorder,
                },
                pressed && styles.actionPressed,
                busyAction !== null && styles.actionDisabled,
              ]}
            >
              {busyAction === "logout" ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <Text style={[styles.logoutActionText, { color: colors.danger }]}>
                  Log out
                </Text>
              )}
            </Pressable>
          </GlassCard>

          <GlassCard contentStyle={styles.card} radius={24}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Saved data
                </Text>
                <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
                  Local progress on this device.
                </Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              {savedDataSummary.map(({ label, value }) => (
                <View
                  accessibilityLabel={`${label}: ${formatCount(value)}`}
                  accessibilityRole="text"
                  accessible
                  key={label}
                  style={[
                    styles.summaryTile,
                    {
                      backgroundColor: colors.glassBg,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatCount(value)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityHint="Removes saved Speech to Sign and Sign to Speech results from this device"
                accessibilityLabel={
                  busyAction === "translations"
                    ? "Clearing translation history"
                    : "Clear translation history"
                }
                accessibilityRole="button"
                accessibilityState={{
                  busy: busyAction === "translations",
                  disabled: busyAction !== null,
                }}
                disabled={busyAction !== null}
                onPress={handleResetTranslations}
                style={({ pressed }) => [
                  pressed && styles.actionPressed,
                  busyAction !== null && styles.actionDisabled,
                ]}
              >
                <PremiumButtonSurface radius={18} style={styles.primaryAction}>
                  {busyAction === "translations" ? (
                    <ActivityIndicator color={colors.primaryText} size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.primaryActionText,
                        { color: colors.primaryText },
                      ]}
                    >
                      Clear translation history
                    </Text>
                  )}
                </PremiumButtonSurface>
              </Pressable>

              <Pressable
                accessibilityHint="Removes saved letters, lesson progress, quiz scores, and recent learning activity from this device"
                accessibilityLabel={
                  busyAction === "learning"
                    ? "Resetting learning progress"
                    : "Reset learning progress"
                }
                accessibilityRole="button"
                accessibilityState={{
                  busy: busyAction === "learning",
                  disabled: busyAction !== null,
                }}
                disabled={busyAction !== null}
                onPress={handleResetLearning}
                style={({ pressed }) => [
                  styles.dangerAction,
                  {
                    backgroundColor: colors.dangerSoft,
                    borderColor: colors.dangerBorder,
                  },
                  pressed && styles.actionPressed,
                  busyAction !== null && styles.actionDisabled,
                ]}
              >
                {busyAction === "learning" ? (
                  <ActivityIndicator color={colors.danger} size="small" />
                ) : (
                  <Text style={[styles.dangerActionText, { color: colors.danger }]}>
                    Reset learning progress
                  </Text>
                )}
              </Pressable>
            </View>
          </GlassCard>
        </ScrollView>
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
  contentContainer: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28,
  },
  hero: {
    padding: 22,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  card: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  cardSubtext: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  summaryTile: {
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: 128,
    flexGrow: 1,
    minWidth: 0,
    padding: 14,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
    textTransform: "uppercase",
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 18,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  dangerAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dangerActionText: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  logoutAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutActionText: {
    fontSize: 15,
    fontWeight: "800",
  },
  actionPressed: {
    opacity: 0.84,
  },
  actionDisabled: {
    opacity: 0.48,
  },
  profileAvatar: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileEmail: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: "900",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  profileRow: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    padding: 12,
  },
  themeChoice: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  themeChoiceActive: {
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  themeChoiceActiveDescription: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 5,
  },
  themeChoiceActiveLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  themeChoiceDescription: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 5,
  },
  themeChoiceLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  themeChoiceWrap: {
    flexBasis: 108,
    flex: 1,
    minWidth: 0,
  },
  themeModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
});
