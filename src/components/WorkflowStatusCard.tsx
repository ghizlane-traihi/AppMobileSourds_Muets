import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../theme";

export type WorkflowStepState = "complete" | "current" | "pending";

type WorkflowStep = {
  detail: string;
  label: string;
  state: WorkflowStepState;
};

type WorkflowStatusCardProps = {
  description: string;
  steps: WorkflowStep[];
  title: string;
};

const getStepConfig = (
  stepState: WorkflowStepState,
  colors: ReturnType<typeof useAppTheme>["colors"],
) => {
  switch (stepState) {
    case "complete":
      return {
        badgeBackground: colors.successSoft,
        badgeBorder: colors.successSoft,
        badgeText: "Done",
        iconColor: colors.success,
        iconName: "check-circle" as const,
        titleColor: colors.text,
      };
    case "current":
      return {
        badgeBackground: colors.primarySofter,
        badgeBorder: colors.primarySoft,
        badgeText: "Live",
        iconColor: colors.primary,
        iconName: "play-circle" as const,
        titleColor: colors.primary,
      };
    default:
      return {
        badgeBackground: colors.surface,
        badgeBorder: colors.border,
        badgeText: "Next",
        iconColor: colors.textMuted,
        iconName: "circle" as const,
        titleColor: colors.text,
      };
  }
};

export const WorkflowStatusCard = ({
  description,
  steps,
  title,
}: WorkflowStatusCardProps) => {
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surface : colors.surfaceElevated,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: colors.primary }]}>Workflow</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const config = getStepConfig(step.state, colors);
          const showConnector = index < steps.length - 1;

          return (
            <View key={`${step.label}-${index}`} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        step.state === "pending"
                          ? colors.surface
                          : config.badgeBackground,
                      borderColor: config.badgeBorder,
                    },
                  ]}
                >
                  <Feather
                    color={config.iconColor}
                    name={config.iconName}
                    size={16}
                  />
                </View>

                {showConnector ? (
                  <View
                    style={[
                      styles.connector,
                      {
                        backgroundColor:
                          step.state === "complete"
                            ? colors.success
                            : colors.border,
                      },
                    ]}
                  />
                ) : null}
              </View>

              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepLabel, { color: config.titleColor }]}>
                    {step.label}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: config.badgeBackground,
                        borderColor: config.badgeBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: config.iconColor }]}>
                      {config.badgeText}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>
                  {step.detail}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  steps: {
    gap: 14,
    marginTop: 16,
  },
  stepRow: {
    flexDirection: "row",
    gap: 12,
  },
  stepRail: {
    alignItems: "center",
    width: 24,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  connector: {
    borderRadius: 999,
    flex: 1,
    marginVertical: 6,
    width: 2,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 4,
  },
  stepHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  stepDetail: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
