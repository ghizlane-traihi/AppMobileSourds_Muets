import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
  const { colors, isDark } = useAppTheme();

  return (
    <ScalePressable
      accessibilityHint="Reopens the last lesson or activity you were using"
      onPress={onPress}
      style={styles.wrapper}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.surfaceMuted : "#FFF6E8",
            borderColor: isDark ? colors.border : "#E8D8B7",
          },
        ]}
      >
        <View
          style={[
            styles.icon,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather color={colors.warning} name={iconName} size={20} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.eyebrow, { color: colors.warning }]}>
            Continue where you left off
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <View style={styles.action}>
          <Feather color={colors.text} name="arrow-right" size={18} />
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
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  icon: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  content: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  action: {
    alignItems: "center",
    justifyContent: "center",
  },
});
