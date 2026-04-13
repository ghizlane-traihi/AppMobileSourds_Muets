import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { ScalePressable } from "../components/ScalePressable";
import {
  ONBOARDING_STORAGE_KEY,
  USER_INFO_STORAGE_KEY,
} from "../constants/storage";
import { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "UserInfo">;

// ─── Floating particles ─────────────────────────────────────────────────────

type PercentStr = `${number}%`;

const PARTICLES: readonly { left: PercentStr; top: PercentStr; size: number; delay: number }[] = [
  { left: "8%", top: "6%", size: 2, delay: 0 },
  { left: "88%", top: "10%", size: 1.8, delay: 400 },
  { left: "24%", top: "22%", size: 1.5, delay: 800 },
  { left: "72%", top: "16%", size: 2.2, delay: 200 },
  { left: "92%", top: "38%", size: 1.6, delay: 600 },
  { left: "14%", top: "52%", size: 1.8, delay: 1000 },
  { left: "62%", top: "68%", size: 2, delay: 300 },
  { left: "82%", top: "74%", size: 1.4, delay: 700 },
  { left: "36%", top: "82%", size: 1.6, delay: 500 },
  { left: "56%", top: "90%", size: 2, delay: 900 },
];

const FloatingParticle = ({
  delay,
  left,
  size,
  top,
}: {
  delay: number;
  left: PercentStr;
  size: number;
  top: PercentStr;
}) => {
  const opacity = useRef(new Animated.Value(0.1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -8,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.1,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 2200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          height: size,
          left,
          opacity,
          top,
          transform: [{ translateY }],
          width: size,
        },
      ]}
    />
  );
};

// ─── Glowing brain icon ─────────────────────────────────────────────────────

const BrainBadge = () => {
  const glow = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.8,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.4,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  return (
    <View style={styles.brainBadge}>
      <Animated.View style={[styles.brainGlow, { opacity: glow }]} />
      <View style={styles.brainIconCircle}>
        <MaterialCommunityIcons
          color="rgba(200,180,255,0.9)"
          name="brain"
          size={22}
        />
      </View>
    </View>
  );
};

// ─── Corner sparkle ─────────────────────────────────────────────────────────

const CornerSparkle = ({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br" | "ml" | "mr";
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(Math.random() * 1200),
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 600,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 1000,
          easing: Easing.in(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const positionStyles: Record<string, object> = {
    tl: { top: -2, left: -2 },
    tr: { top: -2, right: -2 },
    bl: { bottom: -2, left: -2 },
    br: { bottom: -2, right: -2 },
    ml: { top: "48%", left: -3 },
    mr: { top: "48%", right: -3 },
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sparkle, positionStyles[position], { opacity }]}
    />
  );
};

// ─── Main screen ────────────────────────────────────────────────────────────

export const UserInfoScreen = ({ navigation }: Props) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const emailRef = useRef<TextInput>(null);

  // Entry animation
  const cardScale = useRef(new Animated.Value(0.92)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 16,
        stiffness: 140,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale, cardOpacity]);

  const canContinue = name.trim().length >= 2;

  const handleContinue = async () => {
    if (!canContinue || isSaving) return;
    setIsSaving(true);
    Keyboard.dismiss();

    let hasCompletedOnboarding = false;

    try {
      await AsyncStorage.setItem(
        USER_INFO_STORAGE_KEY,
        JSON.stringify({ name: name.trim(), email: email.trim() }),
      );
      hasCompletedOnboarding =
        (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === "true";
    } catch {
      // non-blocking — proceed anyway
    }

    setIsSaving(false);
    navigation.replace(hasCompletedOnboarding ? "Home" : "Onboarding");
  };

  const handleCancel = () => {
    navigation.replace("Onboarding");
  };

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#0C0424", "#1A0942", "#2A1065", "#160838", "#0A0320"]}
        locations={[0, 0.22, 0.48, 0.74, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Diagonal aurora streaks */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[
            "rgba(90,40,200,0)",
            "rgba(120,60,240,0.18)",
            "rgba(90,40,200,0)",
          ]}
          end={{ x: 0.85, y: 0.95 }}
          start={{ x: 0.1, y: 0.3 }}
          style={[styles.auroraStreak, styles.auroraOne]}
        />
        <LinearGradient
          colors={[
            "rgba(80,30,180,0)",
            "rgba(140,70,255,0.12)",
            "rgba(80,30,180,0)",
          ]}
          end={{ x: 0.9, y: 0.85 }}
          start={{ x: 0.05, y: 0.45 }}
          style={[styles.auroraStreak, styles.auroraTwo]}
        />
        <LinearGradient
          colors={[
            "rgba(100,50,220,0)",
            "rgba(160,90,255,0.1)",
            "rgba(100,50,220,0)",
          ]}
          end={{ x: 0.95, y: 0.75 }}
          start={{ x: 0.15, y: 0.55 }}
          style={[styles.auroraStreak, styles.auroraThree]}
        />
      </View>

      {/* Floating particles */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {PARTICLES.map((p, i) => (
          <FloatingParticle key={i} {...p} />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
              {/* Brain badge top-right */}
              <View style={styles.brainBadgePosition}>
                <BrainBadge />
              </View>

              {/* Glass card */}
              <Animated.View
                style={[
                  styles.cardOuter,
                  {
                    opacity: cardOpacity,
                    transform: [{ scale: cardScale }],
                  },
                ]}
              >
                {/* Outer neon border */}
                <View style={styles.cardNeonBorder}>
                  {/* Corner sparkles */}
                  <CornerSparkle position="tl" />
                  <CornerSparkle position="tr" />
                  <CornerSparkle position="bl" />
                  <CornerSparkle position="br" />
                  <CornerSparkle position="ml" />
                  <CornerSparkle position="mr" />

                  {/* Inner surface */}
                  <LinearGradient
                    colors={[
                      "rgba(60,30,140,0.55)",
                      "rgba(40,18,100,0.65)",
                      "rgba(22,10,60,0.8)",
                    ]}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={styles.cardSurface}
                  >
                    {/* Top glass reflection */}
                    <LinearGradient
                      colors={[
                        "rgba(255,255,255,0.08)",
                        "rgba(255,255,255,0.02)",
                        "rgba(255,255,255,0)",
                      ]}
                      pointerEvents="none"
                      style={styles.cardTopReflection}
                    />

                    {/* Title */}
                    <Text style={styles.title}>Fill in your information</Text>
                    <Text style={styles.subtitle}>
                      Enter your details to proceed with{"\n"}translating into
                      sign language.
                    </Text>

                    {/* Name field */}
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputGlassLayer}>
                        <LinearGradient
                          colors={[
                            "rgba(80,40,180,0.35)",
                            "rgba(50,25,120,0.45)",
                          ]}
                          end={{ x: 1, y: 1 }}
                          start={{ x: 0, y: 0 }}
                          style={styles.inputGradient}
                        >
                          <View style={styles.inputIconWrap}>
                            <Feather
                              color="rgba(200,180,255,0.75)"
                              name="user"
                              size={20}
                            />
                          </View>
                          <View style={styles.inputTextColumn}>
                            <Text style={styles.inputLabel}>Name</Text>
                            <TextInput
                              autoCapitalize="words"
                              autoComplete="name"
                              onChangeText={setName}
                              onSubmitEditing={() => emailRef.current?.focus()}
                              placeholder="Enter your name"
                              placeholderTextColor="rgba(180,170,210,0.5)"
                              returnKeyType="next"
                              style={styles.inputField}
                              value={name}
                            />
                          </View>
                        </LinearGradient>
                      </View>
                      {/* Sparkle accents on input */}
                      <CornerSparkle position="tr" />
                      <CornerSparkle position="bl" />
                    </View>

                    {/* Email field */}
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputGlassLayer}>
                        <LinearGradient
                          colors={[
                            "rgba(80,40,180,0.35)",
                            "rgba(50,25,120,0.45)",
                          ]}
                          end={{ x: 1, y: 1 }}
                          start={{ x: 0, y: 0 }}
                          style={styles.inputGradient}
                        >
                          <View style={styles.inputIconWrap}>
                            <Feather
                              color="rgba(200,180,255,0.75)"
                              name="mail"
                              size={18}
                            />
                          </View>
                          <View style={styles.inputTextColumn}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                              autoCapitalize="none"
                              autoComplete="email"
                              keyboardType="email-address"
                              onChangeText={setEmail}
                              onSubmitEditing={() => void handleContinue()}
                              placeholder="Enter your email address"
                              placeholderTextColor="rgba(180,170,210,0.5)"
                              ref={emailRef}
                              returnKeyType="done"
                              style={styles.inputField}
                              value={email}
                            />
                          </View>
                          <View style={styles.inputChevron}>
                            <Feather
                              color="rgba(200,180,255,0.45)"
                              name="chevron-right"
                              size={20}
                            />
                          </View>
                        </LinearGradient>
                      </View>
                      <CornerSparkle position="tr" />
                      <CornerSparkle position="mr" />
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>

              {/* Bottom buttons */}
              <Animated.View
                style={[
                  styles.bottomButtons,
                  { opacity: cardOpacity },
                ]}
              >
                {/* Cancel */}
                <ScalePressable
                  accessibilityLabel="Cancel"
                  onPress={handleCancel}
                  scaleTo={0.96}
                  style={styles.buttonFlex}
                >
                  <View style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </View>
                </ScalePressable>

                {/* Continue */}
                <ScalePressable
                  accessibilityLabel="Continue"
                  disabled={!canContinue || isSaving}
                  onPress={() => void handleContinue()}
                  scaleTo={0.96}
                  style={styles.buttonFlex}
                >
                  <PremiumButtonSurface
                    radius={28}
                    style={[
                      styles.continueButton,
                      (!canContinue || isSaving) && styles.continueButtonDisabled,
                    ]}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                    <Feather color="#FFFFFF" name="arrow-right" size={18} />
                  </PremiumButtonSurface>
                </ScalePressable>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#0A0320",
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // ── Background ──
  auroraStreak: {
    ...StyleSheet.absoluteFillObject,
  },
  auroraOne: {
    transform: [{ rotate: "-25deg" }, { scale: 1.4 }],
  },
  auroraTwo: {
    transform: [{ rotate: "-18deg" }, { scale: 1.6 }],
  },
  auroraThree: {
    transform: [{ rotate: "-30deg" }, { scale: 1.3 }],
  },
  particle: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    position: "absolute",
  },

  // ── Brain badge ──
  brainBadgePosition: {
    alignItems: "flex-end",
    marginBottom: -20,
    marginRight: 10,
    zIndex: 10,
  },
  brainBadge: {
    alignItems: "center",
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  brainGlow: {
    backgroundColor: "rgba(160,120,255,0.4)",
    borderRadius: 28,
    height: 56,
    position: "absolute",
    shadowColor: "#A078FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    width: 56,
  },
  brainIconCircle: {
    alignItems: "center",
    backgroundColor: "rgba(60,30,140,0.6)",
    borderColor: "rgba(200,180,255,0.25)",
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  // ── Glass card ──
  cardOuter: {
    zIndex: 5,
  },
  cardNeonBorder: {
    borderColor: "rgba(140,100,255,0.4)",
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#8C64FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 10,
  },
  cardSurface: {
    borderRadius: 26,
    padding: 28,
    paddingTop: 32,
  },
  cardTopReflection: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    height: 80,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },

  // ── Sparkles ──
  sparkle: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    height: 6,
    position: "absolute",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    width: 6,
    zIndex: 20,
  },

  // ── Text ──
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 10,
  },
  subtitle: {
    color: "rgba(200,190,230,0.7)",
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
    marginBottom: 28,
  },

  // ── Inputs ──
  inputWrapper: {
    marginBottom: 16,
    position: "relative",
  },
  inputGlassLayer: {
    borderColor: "rgba(140,100,255,0.3)",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  inputGradient: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  inputIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    marginRight: 14,
    width: 40,
  },
  inputTextColumn: {
    flex: 1,
  },
  inputLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  inputField: {
    color: "rgba(220,210,240,0.9)",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  inputChevron: {
    marginLeft: 8,
  },

  // ── Bottom buttons ──
  bottomButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    paddingHorizontal: 4,
  },
  buttonFlex: {
    flex: 1,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(140,100,255,0.25)",
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: "center",
    paddingVertical: 18,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cancelButtonText: {
    color: "rgba(200,190,230,0.8)",
    fontSize: 16,
    fontWeight: "700",
  },
  continueButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 18,
  },
  continueButtonDisabled: {
    opacity: 0.45,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
