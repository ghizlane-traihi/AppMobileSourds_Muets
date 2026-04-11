import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../theme";

type AssistantHintsCardProps = {
  hints: string[];
  message: string;
  title: string;
};

export const AssistantHintsCard = ({
  hints,
  message,
  title,
}: AssistantHintsCardProps) => {
  const { colors, isDark } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const primaryHint = useMemo(() => hints.find(Boolean) ?? "", [hints]);
  const secondaryHints = useMemo(
    () => hints.filter((hint) => hint && hint !== primaryHint).slice(0, 2),
    [hints, primaryHint],
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.surfaceMuted : "#F3F8FF",
          borderColor: colors.primarySoft,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primarySoft,
            },
          ]}
        >
          <Feather color={colors.primary} name="compass" size={18} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Assistant hint</Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
      </View>

      <View
        style={[
          styles.highlightBox,
          {
            backgroundColor: isDark ? colors.surface : colors.surface,
            borderColor: colors.primarySoft,
          },
        ]}
      >
        <View
          style={[
            styles.highlightIconWrap,
            {
              backgroundColor: colors.primarySofter,
              borderColor: colors.primarySoft,
            },
          ]}
        >
          <Feather color={colors.primary} name="zap" size={16} />
        </View>

        <View style={styles.highlightCopy}>
          <Text
            numberOfLines={isExpanded ? undefined : 2}
            style={[styles.message, { color: colors.textSecondary }]}
          >
            {message}
          </Text>
          {primaryHint ? (
            <Text
              numberOfLines={isExpanded ? undefined : 2}
              style={[styles.primaryHint, { color: colors.text }]}
            >
              {primaryHint}
            </Text>
          ) : null}
        </View>
      </View>

      {isExpanded && secondaryHints.length > 0 ? (
        <View style={styles.list}>
          {secondaryHints.map((hint) => (
            <View key={hint} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.hint, { color: colors.text }]}>{hint}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setIsExpanded((currentValue) => !currentValue)}
        style={({ pressed }) => [
          styles.toggleButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && styles.toggleButtonPressed,
        ]}
      >
        <Text style={[styles.toggleButtonText, { color: colors.primary }]}>
          {isExpanded ? "Collapse" : "Expand"}
        </Text>
        <Feather
          color={colors.primary}
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={16}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerCopy: {
    flex: 1,
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
    marginTop: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  highlightBox: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    padding: 14,
  },
  highlightIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  highlightCopy: {
    flex: 1,
    gap: 8,
  },
  primaryHint: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  list: {
    gap: 10,
    marginTop: 14,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  hint: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  toggleButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  toggleButtonPressed: {
    opacity: 0.88,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
