import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackground } from "../components/AppBackground";
import { GlassCard } from "../components/LiquidGlass";
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { ScalePressable } from "../components/ScalePressable";
import { useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "LessonDetail">;

type ModulePreview = {
  icon: React.ComponentProps<typeof Feather>["name"];
  description: string;
  examples: string[];
  accentColor: string;
};

const MODULE_PREVIEWS: Record<string, ModulePreview> = {
  "basic-words": {
    icon: "message-circle",
    description:
      "Learn the most common everyday words in sign language — greetings, feelings, and everyday expressions.",
    examples: ["Hello", "Thank you", "Please", "Sorry", "Yes / No", "Good morning"],
    accentColor: "#4FD1FF",
  },
  sentences: {
    icon: "align-left",
    description:
      "Combine individual signs into full sentences. Learn to express yourself clearly and naturally.",
    examples: [
      "My name is…",
      "How are you?",
      "Nice to meet you",
      "I need help",
      "Where is…?",
    ],
    accentColor: "#C44DFF",
  },
};

const FALLBACK_PREVIEW: ModulePreview = {
  icon: "book",
  description: "This lesson is coming soon. Keep practising the alphabet while you wait!",
  examples: [],
  accentColor: "#7B61FF",
};

export const LessonDetailScreen = ({ navigation, route }: Props) => {
  const { colors, isDark } = useAppTheme();
  const { moduleId, lessonTitle } = route.params;

  const preview = MODULE_PREVIEWS[moduleId] ?? FALLBACK_PREVIEW;
  const accentAlpha = `${preview.accentColor}26`; // ~15 % opacity hex

  return (
    <AppBackground style={styles.root}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <ScalePressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <View
              style={[
                styles.backBtnInner,
                {
                  backgroundColor: colors.glassBg,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <Feather color={colors.text} name="arrow-left" size={18} />
            </View>
          </ScalePressable>

          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: colors.text }]}
          >
            {lessonTitle}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* ── Content ─────────────────────────────────────────── */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero visual card */}
          <GlassCard contentStyle={styles.heroCardContent} featured radius={32}>
            {/* Icon glow orb */}
            <View
              style={[
                styles.heroIconOrb,
                {
                  backgroundColor: isDark
                    ? `rgba(${hexToRgb(preview.accentColor)},0.18)`
                    : `rgba(${hexToRgb(preview.accentColor)},0.10)`,
                  shadowColor: preview.accentColor,
                },
              ]}
            >
              <Feather color={preview.accentColor} name={preview.icon} size={52} />
            </View>

            {/* Coming-soon badge */}
            <View
              style={[
                styles.comingSoonBadge,
                {
                  backgroundColor: isDark
                    ? "rgba(251,191,36,0.12)"
                    : "rgba(251,191,36,0.1)",
                  borderColor: "rgba(251,191,36,0.28)",
                },
              ]}
            >
              <Feather color="#FBBF24" name="clock" size={11} />
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>{lessonTitle}</Text>
            <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
              {preview.description}
            </Text>
          </GlassCard>

          {/* Examples preview */}
          {preview.examples.length > 0 && (
            <GlassCard contentStyle={styles.previewCardContent} radius={24}>
              <Text style={[styles.previewEyebrow, { color: colors.kicker }]}>
                SNEAK PEEK
              </Text>
              <Text style={[styles.previewTitle, { color: colors.text }]}>
                You&apos;ll learn to sign
              </Text>
              <View style={styles.chipList}>
                {preview.examples.map((ex) => (
                  <View
                    key={ex}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isDark
                          ? `rgba(${hexToRgb(preview.accentColor)},0.10)`
                          : `rgba(${hexToRgb(preview.accentColor)},0.07)`,
                        borderColor: `rgba(${hexToRgb(preview.accentColor)},0.22)`,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>{ex}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          {/* Suggestion card */}
          <GlassCard contentStyle={styles.suggestionCardContent} radius={24}>
            <View style={styles.suggestionRow}>
              <View
                style={[
                  styles.suggestionIconWrap,
                  { backgroundColor: "rgba(123,97,255,0.15)" },
                ]}
              >
                <Feather color="#7B61FF" name="star" size={18} />
              </View>
              <View style={styles.suggestionText}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                  Master the alphabet first
                </Text>
                <Text style={[styles.suggestionDesc, { color: colors.textSecondary }]}>
                  A strong alphabet foundation makes every other lesson easier.
                </Text>
              </View>
            </View>
          </GlassCard>

          {/* CTA */}
          <ScalePressable
            onPress={() => navigation.navigate("DemoSigns")}
            pressGlowColor="#7B61FF"
            style={styles.ctaWrapper}
          >
            <PremiumButtonSurface radius={24} style={styles.ctaBtn}>
              <Feather color="#FFFFFF" name="grid" size={16} />
              <Text style={styles.ctaBtnText}>Practice Alphabet</Text>
            </PremiumButtonSurface>
          </ScalePressable>

          <View style={styles.bottomPad} />
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
};

// Minimal hex → "r,g,b" converter for the 3 colours used above
function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  // ── Header
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: { borderRadius: 999 },
  backBtnInner: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: { width: 38 },

  // ── Scroll
  scrollContent: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  bottomPad: { height: 8 },

  // ── Hero card
  heroCardContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  heroIconOrb: {
    alignItems: "center",
    borderRadius: 36,
    elevation: 10,
    height: 104,
    justifyContent: "center",
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    width: 104,
  },
  comingSoonBadge: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comingSoonText: {
    color: "#FBBF24",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  // ── Examples card
  previewCardContent: { padding: 18 },
  previewEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 13, fontWeight: "600" },

  // ── Suggestion card
  suggestionCardContent: { padding: 16 },
  suggestionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  suggestionIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  suggestionText: { flex: 1 },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  suggestionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },

  // ── CTA
  ctaWrapper: { borderRadius: 24 },
  ctaBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  ctaBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
