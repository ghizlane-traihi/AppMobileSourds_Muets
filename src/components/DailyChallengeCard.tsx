import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedProgressBar } from "./AnimatedProgressBar";
import { GlassCard } from "./LiquidGlass";
import { ScalePressable } from "./ScalePressable";
import { useAppTheme } from "../theme";

type DailyChallengeCardProps = {
  isCompleted: boolean;
  onPress: () => void;
  progressCount: number;
  rewardPoints: number;
  targetCount: number;
  taskLabel: string;
};

export const DailyChallengeCard = ({
  isCompleted,
  onPress,
  progressCount,
  rewardPoints,
  targetCount,
  taskLabel,
}: DailyChallengeCardProps) => {
  const { colors } = useAppTheme();

  return (
    <ScalePressable
      accessibilityHint="Opens today's challenge inside the learning flow"
      onPress={onPress}
      pressGlowColor="#7B61FF"
      style={styles.wrapper}
    >
      <GlassCard contentStyle={styles.cardContent} featured={isCompleted} radius={28}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.kicker }]}>Daily challenge</Text>
            <Text style={[styles.title, { color: colors.text }]}>{taskLabel}</Text>
          </View>
          <View
            style={[
              styles.status,
              {
                backgroundColor: isCompleted
                  ? "rgba(74,222,128,0.14)"
                  : "rgba(123,97,255,0.14)",
                borderColor: isCompleted
                  ? "rgba(74,222,128,0.3)"
                  : "rgba(123,97,255,0.3)",
              },
            ]}
          >
            <Feather
              color={isCompleted ? colors.success : "#7B61FF"}
              name={isCompleted ? "check-circle" : "sun"}
              size={14}
            />
            <Text
              style={[
                styles.statusText,
                { color: isCompleted ? colors.success : "#7B61FF" },
              ]}
            >
              {isCompleted ? "Completed" : "Today"}
            </Text>
          </View>
        </View>

        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {isCompleted
            ? `Challenge complete. ${rewardPoints} bonus points have been added to your total.`
            : `Learn ${targetCount} new letters today to earn ${rewardPoints} bonus points.`}
        </Text>

        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>Progress</Text>
          <Text style={[styles.progressValue, { color: "#7B61FF" }]}>
            {Math.min(progressCount, targetCount)}/{targetCount}
          </Text>
        </View>

        <AnimatedProgressBar
          fillColor={isCompleted ? colors.success : "#7B61FF"}
          progress={Math.min(progressCount / targetCount, 1)}
          trackColor={isCompleted ? "rgba(74,222,128,0.15)" : "rgba(123,97,255,0.15)"}
        />

        <View style={styles.footer}>
          <View
            style={[
              styles.rewardChip,
              {
                backgroundColor: "rgba(123,97,255,0.12)",
                borderColor: "rgba(123,97,255,0.26)",
              },
            ]}
          >
            <Feather color="#7B61FF" name="award" size={14} />
            <Text style={[styles.rewardText, { color: colors.text }]}>
              +{rewardPoints} points
            </Text>
          </View>

          <View style={styles.action}>
            <Text style={[styles.actionText, { color: colors.text }]}>
              {isCompleted ? "Resets tomorrow" : "Open challenge"}
            </Text>
            <Feather color={colors.text} name="arrow-right" size={16} />
          </View>
        </View>
      </GlassCard>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  wrapper: { borderRadius: 28 },
  cardContent: { padding: 18 },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 8,
  },
  status: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 16,
  },
  rewardChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: "800",
  },
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
