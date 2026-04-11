import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ScalePressable } from "./ScalePressable";
import { useAppTheme } from "../theme";

type LearningHubCardProps = {
  onPress: () => void;
};

const HUB_ITEMS = [
  { icon: "grid", label: "Alphabet", value: "26 letters" },
  { icon: "bookmark", label: "Saved", value: "Review queue" },
  { icon: "clock", label: "Recent", value: "Last opened" },
  { icon: "check-circle", label: "Learned", value: "Completed" },
] as const;

export const LearningHubCard = ({ onPress }: LearningHubCardProps) => {
  const { colors } = useAppTheme();

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
      <Text style={[styles.eyebrow, { color: colors.primary }]}>Learning hub</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        Keep every learning tool together in one place
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Browse all letters, return to saved signs, and use the recent and learned filters without leaving this screen.
      </Text>

      <View style={styles.grid}>
        {HUB_ITEMS.map((item) => (
          <View
            key={item.label}
            style={[
              styles.hubItem,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Feather color={colors.primary} name={item.icon} size={16} />
            <Text style={[styles.hubLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.hubValue, { color: colors.textSecondary }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <ScalePressable onPress={onPress} style={styles.buttonWrapper}>
        <View
          style={[
            styles.button,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Browse all lessons</Text>
          <Feather color={colors.text} name="arrow-right" size={16} />
        </View>
      </ScalePressable>
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
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  hubItem: {
    borderRadius: 18,
    borderWidth: 1,
    minWidth: "47%",
    padding: 14,
  },
  hubLabel: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
  hubValue: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  buttonWrapper: {
    alignSelf: "flex-start",
    borderRadius: 999,
    marginTop: 16,
  },
  button: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
