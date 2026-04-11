import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { getApiBaseUrl } from "../services/api";
import {
  ALPHABET_FAVORITES_STORAGE_KEY,
  ALPHABET_LEARNED_STORAGE_KEY,
  ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
  ALPHABET_MISTAKES_STORAGE_KEY,
  ALPHABET_RECENT_STORAGE_KEY,
  SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
  SIGN_TRANSLATION_HISTORY_STORAGE_KEY,
  SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
} from "../constants/storage";

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

export const SettingsScreen = () => {
  const apiBaseUrl = getApiBaseUrl();
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

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#07071F", "#0A0A2E", "#111044"]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>App settings</Text>
            <Text style={styles.title}>Manage local app data and preferences.</Text>
            <Text style={styles.subtitle}>
              Use this screen to review the current API endpoint and clear local
              app data when you want a fresh start.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Current API endpoint
            </Text>
            <Text style={styles.cardText}>
              {apiBaseUrl}
            </Text>
            <Text style={styles.cardSubtext}>
              If this value is `localhost`, the backend must be running on this same computer for the app to work correctly.
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  API connected
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Local data
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Important to know
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>
                • `Speech to Sign` needs microphone access and a reachable backend.
              </Text>
              <Text style={styles.listItem}>
                • `Sign to Speech` needs camera permission and backend recognition.
              </Text>
              <Text style={styles.listItem}>
                • Your saved history on this screen is local to this device only.
              </Text>
              <Text style={styles.listItem}>
                • Reset actions do not delete your code or backend files, only app data saved locally.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Local storage summary
            </Text>
            <Text style={styles.cardSubtext}>
              A quick snapshot of what is currently saved on this device.
            </Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>
                  {speechHistoryCount}
                </Text>
                <Text style={styles.summaryLabel}>
                  Speech history
                </Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>
                  {signHistoryCount}
                </Text>
                <Text style={styles.summaryLabel}>
                  Sign history
                </Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>
                  {learnedLettersCount}
                </Text>
                <Text style={styles.summaryLabel}>
                  Letters learned
                </Text>
              </View>
              <View style={styles.summaryTile}>
                <Text style={styles.summaryValue}>
                  {favoriteLettersCount}
                </Text>
                <Text style={styles.summaryLabel}>
                  Saved favorites
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              What is saved on this device
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>
                • `Speech to Sign` saves recent translations locally.
              </Text>
              <Text style={styles.listItem}>
                • `Sign to Speech` saves recent recognitions locally.
              </Text>
              <Text style={styles.listItem}>
                • `Sign Language Learning` stores saved letters, learned progress, and recent practice locally.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Reset local data
            </Text>
            <Text style={styles.cardSubtext}>
              These actions only affect saved frontend data on this device.
            </Text>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleResetTranslations}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && styles.actionPressed,
                ]}
              >
                <Text style={styles.primaryActionText}>Clear translation history</Text>
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
          </View>
        </ScrollView>
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
  contentContainer: {
    gap: 16,
    padding: 18,
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: "rgba(124,92,252,0.15)",
    borderColor: "rgba(124,92,252,0.3)",
    borderRadius: 30,
    borderWidth: 1,
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
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 10,
  },
  subtitle: {
    color: "rgba(226,232,255,0.62)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  cardText: {
    color: "rgba(226,232,255,0.72)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  cardSubtext: {
    color: "rgba(200,214,255,0.5)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  badge: {
    backgroundColor: "rgba(124,92,252,0.15)",
    borderColor: "rgba(124,92,252,0.3)",
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
    color: "rgba(226,232,255,0.62)",
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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    minWidth: "47%",
    padding: 14,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  summaryLabel: {
    color: "rgba(200,214,255,0.5)",
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
    backgroundColor: "#7C5CFC",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#050510",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
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
  actionPressed: {
    opacity: 0.84,
  },
});
