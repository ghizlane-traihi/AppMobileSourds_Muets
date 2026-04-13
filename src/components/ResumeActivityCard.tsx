import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "./LiquidGlass";
import { ScalePressable } from "./ScalePressable";
import { useAppTheme } from "../theme";

type ResumeActivityCardProps = {
  iconName: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  subtitle: string;
  title: string;
};

export const ResumeActivityCard = ({
  iconName,
  onPress,
  subtitle,
  title,
}: ResumeActivityCardProps) => {
  const { colors } = useAppTheme();

  return (
    <ScalePressable
      accessibilityHint="Reopens the last lesson or activity you were using"
      onPress={onPress}
      pressGlowColor="#7B61FF"
      style={styles.wrapper}
    >
      <GlassCard contentStyle={styles.cardContent} radius={28}>
        <View
          style={[
            styles.icon,
            { backgroundColor: "rgba(123,97,255,0.15)" },
          ]}
        >
          <Feather color="#7B61FF" name={iconName} size={20} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.eyebrow, { color: colors.kicker }]}>
            Continue where you left off
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <View style={styles.action}>
          <Feather color={colors.textSecondary} name="arrow-right" size={18} />
        </View>
      </GlassCard>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  wrapper: { borderRadius: 28 },
  cardContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  content: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  action: {
    alignItems: "center",
    justifyContent: "center",
  },
});
