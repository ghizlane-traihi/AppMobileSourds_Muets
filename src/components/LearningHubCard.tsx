import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "./LiquidGlass";
import { PremiumButtonSurface } from "./PremiumButtonSurface";
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
    <GlassCard contentStyle={styles.cardContent} radius={24}>
      <Text style={[styles.eyebrow, { color: colors.kicker }]}>Learning hub</Text>
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
                backgroundColor: "rgba(123,97,255,0.08)",
                borderColor: "rgba(123,97,255,0.18)",
              },
            ]}
          >
            <Feather color="#7B61FF" name={item.icon} size={16} />
            <Text style={[styles.hubLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.hubValue, { color: colors.textSecondary }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <ScalePressable onPress={onPress} style={styles.buttonWrapper}>
        <PremiumButtonSurface radius={24} style={styles.button}>
          <Text style={styles.buttonText}>Browse all lessons</Text>
          <Feather color="#FFFFFF" name="arrow-right" size={16} />
        </PremiumButtonSurface>
      </ScalePressable>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  cardContent: { padding: 18 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
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
    borderRadius: 24,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
