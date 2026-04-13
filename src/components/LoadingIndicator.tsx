import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme";

interface LoadingIndicatorProps {
  label?: string;
}

export const LoadingIndicator = ({
  label = "Loading...",
}: LoadingIndicatorProps) => {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.warningSoft,
          borderColor: colors.warningBorder,
        },
      ]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#FFF9EF",
    borderColor: "#E6D8BC",
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  label: {
    color: "#5D6C7A",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 12,
  },
});
