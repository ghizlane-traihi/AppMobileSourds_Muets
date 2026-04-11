import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { ScalePressable } from "../components/ScalePressable";
import { ONBOARDING_STORAGE_KEY } from "../constants/storage";
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
    <View style={styles.root}>
      <LinearGradient
        colors={["#07071F", "#0A0A2E", "#111044"]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.brand}>SignLink</Text>
              <Text style={styles.brandSubtext}>
                Modern communication, practice, and learning.
              </Text>
            </View>

            <ScalePressable onPress={() => void completeOnboarding()}>
              <View style={styles.skipButton}>
                <Text style={styles.skipButtonText}>
                  Skip
                </Text>
              </View>
            </ScalePressable>
          </View>

          <View style={styles.progressHeader}>
            <Text style={[styles.stepLabel, { color: currentItem.accent }]}>
              {currentItem.stepLabel}
            </Text>
            <Text style={styles.progressCopy}>
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
                      backgroundColor: isActive ? currentItem.accent : "rgba(255,255,255,0.15)",
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
                  borderColor: "rgba(255,255,255,0.08)",
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
                  <Text style={styles.previewFloatingTitle}>
                    Live preview
                  </Text>
                </View>
                <Text style={styles.previewFloatingText}>
                  {currentItem.previewCaption}
                </Text>
              </View>
            </View>

            <View style={styles.copyBlock}>
              <Text style={styles.title}>
                {currentItem.title}
              </Text>
              <Text style={styles.description}>
                {currentItem.description}
              </Text>
            </View>

            <View style={styles.capabilityCard}>
              {[
                "Refined UI with responsive cards and clearer hierarchy",
                "Better motion, previews, and modern onboarding flow",
                "Local progress, streaks, and badges that carry across the app",
              ].map((item) => (
                <View key={item} style={styles.capabilityRow}>
                  <Feather color={currentItem.accent} name="check-circle" size={16} />
                  <Text style={styles.capabilityText}>
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
                  { opacity: activeIndex === 0 ? 0.45 : 1 },
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  Back
                </Text>
              </View>
            </ScalePressable>

            <ScalePressable onPress={handleNext} style={styles.footerButtonWrapper}>
              <View style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {isLastItem ? "Get started" : "Continue"}
                </Text>
              </View>
            </ScalePressable>
          </View>
        </View>
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
    flex: 1,
    padding: 20,
    paddingBottom: 28,
    paddingTop: 10,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  brandSubtext: {
    color: "rgba(226,232,255,0.55)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 200,
  },
  skipButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
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
    color: "rgba(200,214,255,0.5)",
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
    flex: 1,
    justifyContent: "space-between",
    marginTop: 20,
  },
  previewShell: {
    alignItems: "center",
    borderRadius: 34,
    borderWidth: 1,
    minHeight: 260,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 26,
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
    marginTop: 28,
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
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  previewFloatingText: {
    color: "rgba(226,232,255,0.62)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  copyBlock: {
    marginTop: 26,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  description: {
    color: "rgba(226,232,255,0.72)",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
  },
  capabilityCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 28,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  capabilityRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  capabilityText: {
    color: "rgba(226,232,255,0.62)",
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  footerButtonWrapper: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: "#C8D6FF",
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#7C5CFC",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#050510",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
