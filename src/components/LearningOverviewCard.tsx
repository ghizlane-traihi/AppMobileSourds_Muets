import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedProgressBar } from "./AnimatedProgressBar";
import { LockedStatsEmptyState } from "./LockedStatsEmptyState";
import { useAppTheme } from "../theme";

type LearningOverviewCardProps = {
  badgeLabel: string;
  learnedCount: number;
  lessonCompletedCount: number;
  points: number;
  streak: number;
  totalCount: number;
};

type MetricTileProps = {
  label: string;
  value: string;
};

const MetricTile = ({ label, value }: MetricTileProps) => {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.metricTile,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

export const LearningOverviewCard = ({
  badgeLabel,
  learnedCount,
  lessonCompletedCount,
  points,
  streak,
  totalCount,
}: LearningOverviewCardProps) => {
  const { colors } = useAppTheme();
  const progressPercent = Math.round((learnedCount / totalCount) * 100);
  const isLocked =
    learnedCount === 0 && lessonCompletedCount === 0 && points === 0 && streak === 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Overview</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Track your alphabet progress, streak, and rewards in one calm summary.
          </Text>
        </View>
        <Text style={[styles.value, { color: colors.primary }]}>
          {isLocked ? "Locked" : `${progressPercent}%`}
        </Text>
      </View>

      {isLocked ? (
        <LockedStatsEmptyState />
      ) : (
        <>
          <View style={styles.metricGrid}>
            <MetricTile label="Points" value={`${points}`} />
            <MetricTile label="Day streak" value={`${streak}`} />
            <MetricTile label="Alphabet progress" value={`${progressPercent}%`} />
            <MetricTile label="Current badge" value={badgeLabel} />
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text }]}>Lesson progress</Text>
              <Text style={[styles.progressValue, { color: colors.primary }]}>
                {lessonCompletedCount}/{totalCount}
              </Text>
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Keep moving one letter at a time. Your review, quiz wins, and learned letters all build up here.
            </Text>
            <AnimatedProgressBar
              fillColor={colors.primary}
              progress={progressPercent / 100}
              trackColor={colors.primarySoft}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },
  metricTile: {
    borderRadius: 20,
    borderWidth: 1,
    minWidth: "47%",
    padding: 14,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
    textTransform: "uppercase",
  },
  progressBlock: {
    marginTop: 18,
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  progressValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  progressText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    marginTop: 6,
  },
});
