import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackground } from "../components/AppBackground";
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { ScalePressable } from "../components/ScalePressable";
import { ONBOARDING_STORAGE_KEY } from "../constants/storage";
import { useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

type OnboardingItem = {
  accent: string;
  iconBackground: string;
  description: string;
  id: string;
  previewCaption: string;
  previewIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  stepLabel: string;
  title: string;
};

const ITEMS: OnboardingItem[] = [
  {
    accent: "#89DDFF",
    iconBackground: "rgba(137,221,255,0.1)",
    description:
      "Translate speech, recognize signs, and build learning habits in one guided mobile workflow.",
    id: "welcome",
    previewCaption: "An accessibility-first communication hub",
    previewIcon: "account-group-outline",
    stepLabel: "Step 1",
    title: "Welcome to a more modern SignLink",
  },
  {
    accent: "#7C5CFC",
    iconBackground: "rgba(124,92,252,0.15)",
    description:
      "Use live microphone input for speech-to-sign translation with cleaner, faster visual feedback.",
    id: "speech",
    previewCaption: "Waveform and real-time sign flow",
    previewIcon: "microphone-outline",
    stepLabel: "Step 2",
    title: "Speak naturally and see signs faster",
  },
  {
    accent: "#4ADE80",
    iconBackground: "rgba(74,222,128,0.1)",
    description:
      "Capture sign attempts with the camera, get feedback, and practice with a more production-ready flow.",
    id: "practice",
    previewCaption: "Camera preview with guided practice",
    previewIcon: "camera-outline",
    stepLabel: "Step 3",
    title: "Practice signs with instant coaching",
  },
  {
    accent: "#FBBF24",
    iconBackground: "rgba(251,191,36,0.1)",
    description:
      "Earn points, keep a streak alive, and unlock badges as you build confidence over time.",
    id: "progress",
    previewCaption: "Progress, streaks, and badge milestones",
    previewIcon: "trophy-outline",
    stepLabel: "Step 4",
    title: "Track progress like a real product",
  },
];

export const OnboardingScreen = ({ navigation }: Props) => {
  const { colors, isDark } = useAppTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const currentItem = useMemo(() => ITEMS[activeIndex] ?? ITEMS[0]!, [activeIndex]);
  const isLastItem = activeIndex === ITEMS.length - 1;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(18);

    Animated.parallel([
      Animated.timing(opacity, {
        duration: 340,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeIndex, opacity, translateY]);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch (storageError) {
      console.log("save onboarding state error", storageError);
    }

    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  const handleNext = () => {
    if (isLastItem) {
      void completeOnboarding();
      return;
    }

    setActiveIndex((currentIndex) => currentIndex + 1);
  };

  const handleBack = () => {
    if (activeIndex === 0) {
      return;
    }

    setActiveIndex((currentIndex) => currentIndex - 1);
  };

  return (
    <AppBackground style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.brand, { color: colors.text }]}>SignLink</Text>
              <Text style={[styles.brandSubtext, { color: colors.textSecondary }]}>
                Modern communication, practice, and learning.
              </Text>
            </View>

            <ScalePressable onPress={() => void completeOnboarding()}>
              <View
                style={[
                  styles.skipButton,
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
                <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                  Skip
                </Text>
              </View>
            </ScalePressable>
          </View>

          <View style={styles.progressHeader}>
            <Text style={[styles.stepLabel, { color: currentItem.accent }]}>
              {currentItem.stepLabel}
            </Text>
            <Text style={[styles.progressCopy, { color: colors.textMuted }]}>
              {activeIndex + 1} / {ITEMS.length}
            </Text>
          </View>

          <View style={styles.stepsRow}>
            {ITEMS.map((item, index) => {
              const isActive = index === activeIndex;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.stepRail,
                    {
                      backgroundColor: isActive
                        ? currentItem.accent
                        : isDark
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(123,97,255,0.18)",
                      width: isActive ? 40 : 12,
                    },
                  ]}
                />
              );
            })}
          </View>

          <Animated.View
            style={[
              styles.contentArea,
              {
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <View
              style={[
                styles.previewShell,
                {
                  backgroundColor: currentItem.iconBackground,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(123,97,255,0.16)",
                },
              ]}
            >
              <View style={styles.previewOrb}>
                <MaterialCommunityIcons
                  color={currentItem.accent}
                  name={currentItem.previewIcon}
                  size={42}
                />
              </View>

              <View style={styles.previewFloatingCard}>
                <View style={styles.previewFloatingHeader}>
                  <View
                    style={[
                      styles.previewFloatingDot,
                      { backgroundColor: currentItem.accent },
                    ]}
                  />
                  <Text style={[styles.previewFloatingTitle, { color: colors.text }]}>
                    Live preview
                  </Text>
                </View>
                <Text style={[styles.previewFloatingText, { color: colors.textSecondary }]}>
                  {currentItem.previewCaption}
                </Text>
              </View>
            </View>

            <View style={styles.copyBlock}>
              <Text style={[styles.title, { color: colors.text }]}>
                {currentItem.title}
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {currentItem.description}
              </Text>
            </View>

            <View
              style={[
                styles.capabilityCard,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.72)",
                  borderColor: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(123,97,255,0.16)",
                },
              ]}
            >
              {[
                "Refined UI with responsive cards and clearer hierarchy",
                "Better motion, previews, and modern onboarding flow",
                "Local progress, streaks, and badges that carry across the app",
              ].map((item) => (
                <View key={item} style={styles.capabilityRow}>
                  <Feather color={currentItem.accent} name="check-circle" size={16} />
                  <Text style={[styles.capabilityText, { color: colors.textSecondary }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <ScalePressable
              disabled={activeIndex === 0}
              onPress={handleBack}
              style={styles.footerButtonWrapper}
            >
              <View
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.72)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(123,97,255,0.18)",
                    opacity: activeIndex === 0 ? 0.45 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                  Back
                </Text>
              </View>
            </ScalePressable>

            <ScalePressable onPress={handleNext} style={styles.footerButtonWrapper}>
              <PremiumButtonSurface radius={20} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {isLastItem ? "Get started" : "Continue"}
                </Text>
              </PremiumButtonSurface>
            </ScalePressable>
          </View>
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
  container: {
    padding: 20,
    paddingBottom: 34,
    paddingTop: 10,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
  },
  brandSubtext: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 200,
  },
  skipButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: "#C8D6FF",
    fontSize: 14,
    fontWeight: "800",
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  progressCopy: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepsRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  stepRail: {
    borderRadius: 999,
    height: 10,
    marginRight: 8,
  },
  contentArea: {
    marginTop: 20,
  },
  previewShell: {
    alignItems: "center",
    borderRadius: 34,
    borderWidth: 1,
    minHeight: 230,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 24,
  },
  previewOrb: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  previewFloatingCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
    width: "100%",
  },
  previewFloatingHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  previewFloatingDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  previewFloatingTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  previewFloatingText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  copyBlock: {
    marginTop: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  capabilityCard: {
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 22,
    padding: 18,
  },
  capabilityRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  capabilityText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  footerButtonWrapper: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
