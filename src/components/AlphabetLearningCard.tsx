import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "./LiquidGlass";
import { PremiumButtonSurface } from "./PremiumButtonSurface";
import { ScalePressable } from "./ScalePressable";
import { SignLearningVisual } from "./SignLearningVisual";
import { useAppTheme } from "../theme";

type AlphabetLearningCardProps = {
  badge: string;
  description: string;
  onPress: () => void;
  title: string;
};

export const AlphabetLearningCard = ({
  badge,
  description,
  onPress,
  title,
}: AlphabetLearningCardProps) => {
  const { colors } = useAppTheme();

  return (
    <ScalePressable onPress={onPress} pressGlowColor="#7B61FF" scaleTo={0.975} style={styles.wrapper}>
      <GlassCard contentStyle={styles.cardContent} radius={24}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.kicker }]}>Alphabet lessons</Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: "rgba(123,97,255,0.14)",
                borderColor: "rgba(123,97,255,0.3)",
              },
            ]}
          >
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

        <SignLearningVisual />

        <View style={styles.buttonWrapper}>
          <PremiumButtonSurface radius={24} style={styles.button}>
            <Feather color="#FFFFFF" name="book-open" size={17} />
            <Text style={styles.buttonText}>Open alphabet lessons</Text>
            <Feather color="#FFFFFF" name="arrow-right" size={16} />
          </PremiumButtonSurface>
        </View>
      </GlassCard>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  wrapper: { borderRadius: 24 },
  cardContent: { padding: 16 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: "#7B61FF",
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 25,
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
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
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
