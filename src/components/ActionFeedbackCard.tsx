import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../theme";

export type FeedbackTone = "success" | "warning" | "danger" | "info";

type ActionFeedbackCardProps = {
  message: string;
  metricLabel?: string;
  metricValue?: string;
  title: string;
  tone: FeedbackTone;
};

const toneConfig = (
  tone: FeedbackTone,
  colors: ReturnType<typeof useAppTheme>["colors"],
) => {
  switch (tone) {
    case "success":
      return {
        backgroundColor: colors.successSoft,
        borderColor: colors.successSoft,
        iconName: "check-circle" as const,
        iconColor: colors.success,
        textColor: colors.success,
      };
    case "warning":
      return {
        backgroundColor: colors.warningSoft,
        borderColor: colors.warningBorder,
        iconName: "refresh-cw" as const,
        iconColor: colors.warning,
        textColor: colors.warning,
      };
    case "danger":
      return {
        backgroundColor: colors.dangerSoft,
        borderColor: colors.dangerBorder,
        iconName: "alert-circle" as const,
        iconColor: colors.danger,
        textColor: colors.danger,
      };
    default:
      return {
        backgroundColor: colors.primarySofter,
        borderColor: colors.primarySoft,
        iconName: "info" as const,
        iconColor: colors.primary,
        textColor: colors.primary,
      };
  }
};

export const ActionFeedbackCard = ({
  message,
  metricLabel,
  metricValue,
  title,
  tone,
}: ActionFeedbackCardProps) => {
  const { colors } = useAppTheme();
  const config = toneConfig(tone, colors);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather color={config.iconColor} name={config.iconName} size={18} />
          <Text style={[styles.title, { color: config.textColor }]}>{title}</Text>
        </View>

        {metricLabel && metricValue ? (
          <View style={[styles.metricChip, { backgroundColor: colors.surface }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{metricLabel}</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{metricValue}</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  metricChip: {
    alignItems: "flex-end",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
