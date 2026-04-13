import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../theme";

export type ReadinessState = "ready" | "attention" | "inactive";

type ReadinessItem = {
  detail: string;
  label: string;
  state: ReadinessState;
};

type CaptureReadinessCardProps = {
  items: ReadinessItem[];
  title: string;
};

const getItemConfig = (
  state: ReadinessState,
  colors: ReturnType<typeof useAppTheme>["colors"],
) => {
  switch (state) {
    case "ready":
      return {
        chipBackground: colors.successSoft,
        chipBorder: colors.successSoft,
        chipText: "Ready",
        iconColor: colors.success,
        iconName: "check" as const,
      };
    case "attention":
      return {
        chipBackground: colors.warningSoft,
        chipBorder: colors.warningBorder,
        chipText: "Check",
        iconColor: colors.warning,
        iconName: "alert-circle" as const,
      };
    default:
      return {
        chipBackground: colors.surface,
        chipBorder: colors.border,
        chipText: "Waiting",
        iconColor: colors.textMuted,
        iconName: "minus" as const,
      };
  }
};

export const CaptureReadinessCard = ({
  items,
  title,
}: CaptureReadinessCardProps) => {
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
      <Text style={[styles.eyebrow, { color: colors.success }]}>
        Capture checklist
      </Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      <View style={styles.list}>
        {items.map((item) => {
          const config = getItemConfig(item.state, colors);

          return (
            <View
              key={item.label}
              style={[
                styles.row,
                {
                  backgroundColor: isDark ? colors.surfaceMuted : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.rowMain}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: config.chipBackground,
                      borderColor: config.chipBorder,
                    },
                  ]}
                >
                  <Feather
                    color={config.iconColor}
                    name={config.iconName}
                    size={15}
                  />
                </View>

                <View style={styles.copy}>
                  <Text style={[styles.label, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.detail, { color: colors.textSecondary }]}>
                    {item.detail}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: config.chipBackground,
                    borderColor: config.chipBorder,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: config.iconColor }]}>
                  {config.chipText}
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
  list: {
    gap: 12,
    marginTop: 16,
  },
  row: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 14,
  },
  rowMain: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
