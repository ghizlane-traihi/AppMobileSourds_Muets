import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
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
  ALPHABET_RECENT_STORAGE_KEY,
  SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
  SIGN_TRANSLATION_HISTORY_STORAGE_KEY,
  SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
} from "../constants/storage";
import { ThemeMode, useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const STORAGE_KEYS = {
  speechHistory: SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
  speechFavorites: SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
  signHistory: SIGN_TRANSLATION_HISTORY_STORAGE_KEY,
  learningFavorites: ALPHABET_FAVORITES_STORAGE_KEY,
  learningLearned: ALPHABET_LEARNED_STORAGE_KEY,
  learningLessonProgress: ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
  learningMistakes: ALPHABET_MISTAKES_STORAGE_KEY,
  learningRecent: ALPHABET_RECENT_STORAGE_KEY,
};

const THEME_OPTIONS: { description: string; label: string; mode: ThemeMode }[] = [
  {
    description: "Follow this device",
    label: "System",
    mode: "system",
  },
  {
    description: "Soft bright glass",
    label: "Light",
    mode: "light",
  },
  {
    description: "Deep neon glass",
    label: "Dark",
    mode: "dark",
  },
];

const resetStorageGroup = async (keys: string[]) => {
  await AsyncStorage.multiRemove(keys);
};

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

export const SettingsScreen = ({ navigation }: Props) => {
  const { colors, isDark, setThemeMode, themeMode } = useAppTheme();
  const [speechHistoryCount, setSpeechHistoryCount] = useState(0);
  const [signHistoryCount, setSignHistoryCount] = useState(0);
  const [learnedLettersCount, setLearnedLettersCount] = useState(0);
  const [favoriteLettersCount, setFavoriteLettersCount] = useState(0);

  const loadStorageSummary = useCallback(async () => {
    try {
      const [
        rawSpeechHistory,
        rawSignHistory,
        rawLearnedLetters,
        rawFavoriteLetters,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.speechHistory),
        AsyncStorage.getItem(STORAGE_KEYS.signHistory),
        AsyncStorage.getItem(STORAGE_KEYS.learningLearned),
        AsyncStorage.getItem(STORAGE_KEYS.learningFavorites),
      ]);

      setSpeechHistoryCount(toStoredCount(rawSpeechHistory));
      setSignHistoryCount(toStoredCount(rawSignHistory));
      setLearnedLettersCount(toStoredCount(rawLearnedLetters));
      setFavoriteLettersCount(toStoredCount(rawFavoriteLetters));
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
    Alert.alert(
      "Clear translation history?",
      "This removes saved Speech to Sign and Sign to Speech results from this device.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Clear",
          onPress: () => {
            void resetStorageGroup([
              STORAGE_KEYS.speechHistory,
              STORAGE_KEYS.speechFavorites,
              STORAGE_KEYS.signHistory,
            ]).then(() => {
              Alert.alert("Done", "Translation history was cleared.");
            });
          },
        },
      ],
    );
  };

  const handleResetLearning = () => {
    Alert.alert(
      "Reset learning progress?",
      "This removes saved letters, learned progress, and recent learning activity.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Reset",
          onPress: () => {
            void resetStorageGroup([
              STORAGE_KEYS.learningFavorites,
              STORAGE_KEYS.learningLearned,
              STORAGE_KEYS.learningLessonProgress,
              STORAGE_KEYS.learningMistakes,
              STORAGE_KEYS.learningRecent,
            ]).then(() => {
              Alert.alert("Done", "Learning data was reset.");
            });
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Log out?",
      "This removes your local profile information from this device. Your learning progress and saved history stay saved.",
      [
        { style: "cancel", text: "Cancel" },
        {
          style: "destructive",
          text: "Log out",
          onPress: () => {
            void AsyncStorage.removeItem(USER_INFO_STORAGE_KEY).then(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: "UserInfo" }],
              });
            });
          },
        },
      ],
    );
  };

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
              Customize your app.
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
              Keep the app in sync with your phone or choose a fixed glass theme.
            </Text>
            <View style={styles.themeModeRow}>
              {THEME_OPTIONS.map((option) => {
                const isSelected = themeMode === option.mode;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={option.mode}
                    onPress={() => setThemeMode(option.mode)}
                    style={({ pressed }) => [
                      styles.themeChoiceWrap,
                      pressed && styles.actionPressed,
                    ]}
                  >
                    {isSelected ? (
                      <PremiumButtonSurface radius={18} style={styles.themeChoiceActive}>
                        <Text style={styles.themeChoiceActiveLabel}>{option.label}</Text>
                        <Text style={styles.themeChoiceActiveDescription}>
                          {option.description}
                        </Text>
                      </PremiumButtonSurface>
                    ) : (
                      <View
                        style={[
                          styles.themeChoice,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(255,255,255,0.66)",
                            borderColor: isDark
                              ? "rgba(255,255,255,0.1)"
                              : "rgba(123,97,255,0.16)",
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

            <Pressable
              accessibilityRole="button"
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutAction,
                {
                  backgroundColor: isDark
                    ? "rgba(248,113,113,0.1)"
                    : "rgba(255,242,239,0.78)",
                  borderColor: isDark
                    ? "rgba(248,113,113,0.25)"
                    : "rgba(180,35,24,0.18)",
                },
                pressed && styles.actionPressed,
              ]}
            >
              <Text style={[styles.logoutActionText, { color: colors.danger }]}>
                Log out
              </Text>
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
              {[
                ["Speech", speechHistoryCount],
                ["Signs", signHistoryCount],
                ["Learned", learnedLettersCount],
                ["Saved", favoriteLettersCount],
              ].map(([label, value]) => (
                <View
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
                    {value}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleResetTranslations}
                style={({ pressed }) => [
                  pressed && styles.actionPressed,
                ]}
              >
                <PremiumButtonSurface radius={18} style={styles.primaryAction}>
                  <Text style={styles.primaryActionText}>Clear translation history</Text>
                </PremiumButtonSurface>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={handleResetLearning}
                style={({ pressed }) => [
                  styles.dangerAction,
                  pressed && styles.actionPressed,
                ]}
              >
                <Text style={styles.dangerActionText}>
                  Reset learning progress
                </Text>
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
    padding: 18,
    paddingBottom: 28,
  },
  hero: {
    padding: 22,
  },
  eyebrow: {
    color: "rgba(137,221,255,0.78)",
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
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  badge: {
    backgroundColor: "rgba(124,92,252,0.15)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: "#B39DFC",
    fontSize: 12,
    fontWeight: "800",
  },
  list: {
    gap: 10,
    marginTop: 14,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 21,
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
    minWidth: "47%",
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  dangerAction: {
    alignItems: "center",
    backgroundColor: "rgba(248,113,113,0.1)",
    borderColor: "rgba(248,113,113,0.25)",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dangerActionText: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "800",
  },
  logoutAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
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
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 5,
  },
  themeChoiceActiveLabel: {
    color: "#FFFFFF",
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
    flex: 1,
    minWidth: 96,
  },
  themeModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
});
