import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedProgressBar } from "./AnimatedProgressBar";
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
  const { colors, isDark } = useAppTheme();

  return (
    <ScalePressable
      accessibilityHint="Opens today's challenge inside the learning flow"
      onPress={onPress}
      style={styles.wrapper}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surfaceAccent : "#EAF4FF",
            borderColor: colors.primarySoft,
          },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>Daily challenge</Text>
            <Text style={[styles.title, { color: colors.text }]}>{taskLabel}</Text>
          </View>
          <View
            style={[
              styles.status,
              {
                backgroundColor: isCompleted ? colors.successSoft : colors.surface,
                borderColor: isCompleted ? colors.success : colors.primarySoft,
              },
            ]}
          >
            <Feather
              color={isCompleted ? colors.success : colors.primary}
              name={isCompleted ? "check-circle" : "sun"}
              size={14}
            />
            <Text
              style={[
                styles.statusText,
                { color: isCompleted ? colors.success : colors.primary },
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
          <Text style={[styles.progressValue, { color: colors.primary }]}>
            {Math.min(progressCount, targetCount)}/{targetCount}
          </Text>
        </View>

        <AnimatedProgressBar
          fillColor={isCompleted ? colors.success : colors.primary}
          progress={Math.min(progressCount / targetCount, 1)}
          trackColor={isCompleted ? colors.successSoft : colors.primarySoft}
        />

        <View style={styles.footer}>
          <View
            style={[
              styles.rewardChip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primarySoft,
              },
            ]}
          >
            <Feather color={colors.primary} name="award" size={14} />
            <Text style={[styles.rewardText, { color: colors.text }]}>+{rewardPoints} points</Text>
          </View>

          <View style={styles.action}>
            <Text style={[styles.actionText, { color: colors.text }]}>
              {isCompleted ? "Resets tomorrow" : "Open challenge"}
            </Text>
            <Feather color={colors.text} name="arrow-right" size={16} />
          </View>
        </View>
      </View>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 28,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
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
    letterSpacing: -0.4,
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
