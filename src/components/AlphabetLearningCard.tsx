import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
  const { colors, isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surfaceAccent : colors.primarySofter,
          borderColor: colors.primarySoft,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>Alphabet lessons</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.surface, borderColor: colors.primarySoft },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.primary }]}>{badge}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>

      <SignLearningVisual />

      <ScalePressable onPress={onPress} style={styles.buttonWrapper}>
        <View style={[styles.button, { backgroundColor: colors.hero }]}>
          <Feather color="#FFFFFF" name="book-open" size={17} />
          <Text style={styles.buttonText}>Open alphabet lessons</Text>
          <Feather color="#FFFFFF" name="arrow-right" size={16} />
        </View>
      </ScalePressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
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
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
