import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppBackground } from "../components/AppBackground";
import { GlassCard } from "../components/LiquidGlass";
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { ScalePressable } from "../components/ScalePressable";
import { ScrollRevealView } from "../components/ScrollRevealView";
import { ALPHABET_LEARNED_STORAGE_KEY } from "../constants/storage";
import { useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Learning">;

type ModuleLevel = "Beginner" | "Intermediate";

type LearningModule = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  level: ModuleLevel;
  locked: boolean;
  ctaLabel: string;
  accent: string;
  accentAlpha: string;
};

const MODULES: LearningModule[] = [
  {
    id: "alphabet",
    title: "Alphabet A–Z",
    subtitle: "Learn basic letters in sign language",
    icon: "grid",
    level: "Beginner",
    locked: false,
    ctaLabel: "Start lesson",
    accent: "#7B61FF",
    accentAlpha: "rgba(123,97,255,0.15)",
  },
  {
    id: "basic-words",
    title: "Basic Words",
    subtitle: "Common daily words in sign language",
    icon: "message-circle",
    level: "Beginner",
    locked: true,
    ctaLabel: "Start lesson",
    accent: "#4FD1FF",
    accentAlpha: "rgba(79,209,255,0.15)",
  },
  {
    id: "sentences",
    title: "Simple Sentences",
    subtitle: "Build your first signed sentences",
    icon: "align-left",
    level: "Intermediate",
    locked: true,
    ctaLabel: "Start lesson",
    accent: "#C44DFF",
    accentAlpha: "rgba(196,77,255,0.15)",
  },
  {
    id: "practice",
    title: "Practice Mode",
    subtitle: "Test your knowledge with camera",
    icon: "camera",
    level: "Intermediate",
    locked: false,
    ctaLabel: "Start practice",
    accent: "#89DDFF",
    accentAlpha: "rgba(137,221,255,0.15)",
  },
];

const LEVEL_STYLE: Record<ModuleLevel, { bg: string; text: string; border: string }> = {
  Beginner: {
    bg: "rgba(74,222,128,0.12)",
    text: "#4ADE80",
    border: "rgba(74,222,128,0.24)",
  },
  Intermediate: {
    bg: "rgba(251,191,36,0.12)",
    text: "#FBBF24",
    border: "rgba(251,191,36,0.24)",
  },
};

// ─── LevelBadge ───────────────────────────────────────────────────────────────

const LevelBadge = ({ level }: { level: ModuleLevel }) => {
  const ls = LEVEL_STYLE[level];
  return (
    <View style={[styles.levelBadge, { backgroundColor: ls.bg, borderColor: ls.border }]}>
      <Text style={[styles.levelBadgeText, { color: ls.text }]}>{level}</Text>
    </View>
  );
};

// ─── ModuleCard ───────────────────────────────────────────────────────────────

const ModuleCard = ({
  module,
  onPress,
}: {
  module: LearningModule;
  onPress: () => void;
}) => {
  const { colors, isDark } = useAppTheme();

  return (
    <ScalePressable
      disabled={module.locked}
      onPress={onPress}
      pressGlowColor={module.accent}
      scaleTo={0.975}
    >
      <GlassCard contentStyle={styles.moduleCardContent} radius={24}>
        {/* Top row: icon + badges */}
        <View style={styles.moduleTopRow}>
          <View
            style={[
              styles.moduleIconRing,
              {
                backgroundColor: module.locked
                  ? isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)"
                  : module.accentAlpha,
                shadowColor: module.accent,
              },
            ]}
          >
            <Feather
              color={module.locked ? colors.textMuted : module.accent}
              name={module.icon}
              size={20}
            />
          </View>

          <View style={styles.moduleBadges}>
            <LevelBadge level={module.level} />
            {module.locked && (
              <View
                style={[
                  styles.lockChip,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather color={colors.textMuted} name="lock" size={11} />
              </View>
            )}
          </View>
        </View>

        {/* Text */}
        <Text
          style={[
            styles.moduleTitle,
            { color: module.locked ? colors.textMuted : colors.text },
          ]}
        >
          {module.title}
        </Text>
        <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
          {module.subtitle}
        </Text>

        {/* CTA or locked hint */}
        {module.locked ? (
          <View
            style={[
              styles.lockedHint,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                borderColor: colors.border,
              },
            ]}
          >
            <Feather color={colors.textMuted} name="lock" size={12} />
            <Text style={[styles.lockedHintText, { color: colors.textMuted }]}>
              Complete previous lesson to unlock
            </Text>
          </View>
        ) : (
          <ScalePressable onPress={onPress} style={styles.moduleCtaWrapper}>
            <PremiumButtonSurface radius={20} style={styles.moduleCtaBtn}>
              <Text style={styles.moduleCtaText}>{module.ctaLabel}</Text>
              <Feather color="#FFFFFF" name="arrow-right" size={14} />
            </PremiumButtonSurface>
          </ScalePressable>
        )}

        {/* Dim overlay for locked state */}
        {module.locked && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? "rgba(7,7,31,0.28)"
                  : "rgba(240,236,251,0.38)",
                borderRadius: 24,
              },
            ]}
          />
        )}
      </GlassCard>
    </ScalePressable>
  );
};

// ─── LearningScreen ───────────────────────────────────────────────────────────

export const LearningScreen = ({ navigation }: Props) => {
  const { colors, isDark } = useAppTheme();
  const scrollY = useSharedValue(0);
  const [alphabetLearned, setAlphabetLearned] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const progressAnim = useSharedValue(0);

  const progressPct = Math.min(100, Math.round((alphabetLearned / 26) * 100));
  const hasProgress = alphabetLearned > 0;

  useEffect(() => {
    void AsyncStorage.getItem(ALPHABET_LEARNED_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          setAlphabetLearned(Array.isArray(parsed) ? (parsed as unknown[]).length : 0);
        } catch {
          // ignore
        }
      }
    });
  }, []);

  useEffect(() => {
    if (trackWidth > 0) {
      progressAnim.value = withTiming(trackWidth * (progressPct / 100), {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [trackWidth, progressPct, progressAnim]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: progressAnim.value,
  }));

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const handleModulePress = (mod: LearningModule) => {
    if (mod.id === "alphabet") {
      navigation.navigate("DemoSigns");
    } else if (mod.id === "practice") {
      navigation.navigate("SignToSpeech");
    } else {
      navigation.navigate("LessonDetail", {
        moduleId: mod.id,
        lessonTitle: mod.title,
      });
    }
  };

  return (
    <AppBackground style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
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

          <View style={styles.headerCenter}>
            <View
              style={[
                styles.headerIconWrap,
                { backgroundColor: "rgba(123,97,255,0.16)" },
              ]}
            >
              <Feather color="#7B61FF" name="book-open" size={16} />
            </View>
            <Text style={[styles.headerTitleText, { color: colors.text }]}>Learning</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* ── Scrollable content ──────────────────────────────── */}
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Learn sign language step by step
          </Text>

          {/* ── Progress card ────────────────────────────── */}
          <ScrollRevealView scrollY={scrollY} style={styles.section}>
            <GlassCard contentStyle={styles.progressCardContent} featured radius={24}>
              {/* Header row */}
              <View style={styles.progressHeaderRow}>
                <View>
                  <Text style={[styles.progressEyebrow, { color: colors.kicker }]}>
                    OVERVIEW
                  </Text>
                  <Text style={[styles.progressCardTitle, { color: colors.text }]}>
                    Your progress
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressPctBadge,
                    {
                      backgroundColor: "rgba(123,97,255,0.15)",
                      borderColor: "rgba(123,97,255,0.3)",
                    },
                  ]}
                >
                  <Text style={styles.progressPctText}>{progressPct}%</Text>
                </View>
              </View>

              {/* Animated bar */}
              <View
                onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <Animated.View style={[styles.progressFill, progressBarStyle]}>
                  <LinearGradient
                    colors={["#7B61FF", "#5B3DF5", "#4FD1FF"]}
                    end={{ x: 1, y: 0 }}
                    start={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.progressFillSheen} />
                </Animated.View>
              </View>

              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {progressPct === 0
                  ? "Start a lesson to track your progress"
                  : `${progressPct}% completed · ${alphabetLearned}/26 letters`}
              </Text>

              {/* Stats row */}
              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                {[
                  { value: String(alphabetLearned), label: "Letters" },
                  { value: String(26 - alphabetLearned), label: "Remaining" },
                  { value: alphabetLearned >= 26 ? "1" : "0", label: "Modules done" },
                ].map((stat, i) => (
                  <React.Fragment key={stat.label}>
                    {i > 0 && (
                      <View
                        style={[styles.statDivider, { backgroundColor: colors.border }]}
                      />
                    )}
                    <View style={styles.statCell}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {stat.value}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                        {stat.label}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </GlassCard>
          </ScrollRevealView>

          {/* ── Continue learning card ───────────────────── */}
          {hasProgress && (
            <ScrollRevealView scrollY={scrollY} style={styles.section}>
              <GlassCard contentStyle={styles.continueCardContent} radius={24}>
                <View style={styles.continueInner}>
                  <View
                    style={[
                      styles.continueIconRing,
                      { backgroundColor: "rgba(123,97,255,0.15)" },
                    ]}
                  >
                    <Feather color="#7B61FF" name="play-circle" size={22} />
                  </View>

                  <View style={styles.continueMeta}>
                    <Text style={[styles.continueEyebrow, { color: colors.kicker }]}>
                      CONTINUE
                    </Text>
                    <Text style={[styles.continueTitle, { color: colors.text }]}>
                      Continue where you left off
                    </Text>
                    <Text style={[styles.continueProgress, { color: colors.textSecondary }]}>
                      Alphabet A–Z · {alphabetLearned}/26
                    </Text>
                  </View>

                  <ScalePressable
                    onPress={() => navigation.navigate("DemoSigns")}
                    pressGlowColor="#7B61FF"
                    style={styles.resumeWrapper}
                  >
                    <PremiumButtonSurface radius={20} style={styles.resumeBtn}>
                      <Text style={styles.resumeBtnText}>Resume</Text>
                      <Feather color="#FFFFFF" name="arrow-right" size={13} />
                    </PremiumButtonSurface>
                  </ScalePressable>
                </View>
              </GlassCard>
            </ScrollRevealView>
          )}

          {/* ── Section title ─────────────────────────────── */}
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Learning Modules
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.textMuted }]}>
              {MODULES.length} modules
            </Text>
          </View>

          {/* ── Module cards ──────────────────────────────── */}
          {MODULES.map((mod) => (
            <ScrollRevealView key={mod.id} scrollY={scrollY} style={styles.section}>
              <ModuleCard module={mod} onPress={() => handleModulePress(mod)} />
            </ScrollRevealView>
          ))}

          <View style={styles.bottomPad} />
        </Animated.ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  // ── Header
  header: {
    alignItems: "center",
    flexDirection: "row",
    paddingBottom: 8,
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
  headerCenter: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  headerIconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerSpacer: { width: 38 },

  // ── Scroll
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  section: { marginBottom: 14 },
  bottomPad: { height: 20 },

  // ── Progress card
  progressCardContent: { padding: 20 },
  progressHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  progressEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  progressCardTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  progressPctBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressPctText: {
    color: "#7B61FF",
    fontSize: 16,
    fontWeight: "800",
  },
  progressTrack: {
    borderRadius: 6,
    height: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 6,
    height: "100%",
    minWidth: 4,
    overflow: "hidden",
  },
  progressFillSheen: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    height: 2,
    left: 4,
    position: "absolute",
    right: 8,
    top: 1,
  },
  progressLabel: {
    fontSize: 12,
    marginBottom: 16,
  },
  statsRow: {
    borderTopWidth: 1,
    flexDirection: "row",
    paddingTop: 16,
  },
  statCell: { alignItems: "center", flex: 1 },
  statDivider: { alignSelf: "stretch", marginVertical: 4, width: 1 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },

  // ── Continue card
  continueCardContent: { padding: 16 },
  continueInner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  continueIconRing: {
    alignItems: "center",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  continueMeta: { flex: 1 },
  continueEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  continueTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  continueProgress: {
    fontSize: 12,
    marginTop: 2,
  },
  resumeWrapper: { borderRadius: 20 },
  resumeBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resumeBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  // ── Section header
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionMeta: { fontSize: 12 },

  // ── Module cards
  moduleCardContent: { padding: 18 },
  moduleTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  moduleIconRing: {
    alignItems: "center",
    borderRadius: 16,
    elevation: 4,
    height: 48,
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    width: 48,
  },
  moduleBadges: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  levelBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelBadgeText: { fontSize: 11, fontWeight: "700" },
  lockChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  moduleTitle: { fontSize: 18, fontWeight: "800" },
  moduleSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  lockedHint: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lockedHintText: { fontSize: 12 },
  moduleCtaWrapper: {
    alignSelf: "flex-start",
    borderRadius: 20,
    marginTop: 14,
  },
  moduleCtaBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  moduleCtaText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
