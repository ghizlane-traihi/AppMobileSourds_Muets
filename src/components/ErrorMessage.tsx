import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PremiumButtonSurface } from "./PremiumButtonSurface";
import { useAppTheme } from "../theme";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export const ErrorMessage = ({
  message,
  onRetry,
  actionLabel,
  onAction,
}: ErrorMessageProps) => {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: colors.dangerSoft,
          borderColor: colors.dangerBorder,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.danger }]}>Something went wrong</Text>
      <Text style={[styles.message, { color: colors.danger }]}>{message}</Text>

      <View style={styles.actions}>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              pressed && styles.retryButtonPressed,
            ]}
          >
            <PremiumButtonSurface radius={18} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </PremiumButtonSurface>
          </Pressable>
        ) : null}

        {onAction && actionLabel ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => [
              pressed && styles.retryButtonPressed,
            ]}
          >
            <PremiumButtonSurface radius={18} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {actionLabel}
              </Text>
            </PremiumButtonSurface>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF2EF",
    borderColor: "#F7C7BD",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  title: {
    color: "#9F2D22",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  message: {
    color: "#B54034",
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonPressed: {
    opacity: 0.82,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
