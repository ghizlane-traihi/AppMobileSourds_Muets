import React, { ReactNode } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type PremiumButtonSurfaceProps = {
  children: ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export const PREMIUM_BUTTON_COLORS = ["#7B61FF", "#5B3DF5", "#3F2BBF"] as const;

export const PremiumButtonSurface = ({
  children,
  radius = 18,
  style,
}: PremiumButtonSurfaceProps) => (
  <LinearGradient
    colors={PREMIUM_BUTTON_COLORS}
    end={{ x: 0.5, y: 1 }}
    start={{ x: 0.5, y: 0 }}
    style={[
      styles.surface,
      {
        borderRadius: radius,
      },
      style,
    ]}
  >
    <LinearGradient
      colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
      end={{ x: 0.5, y: 1 }}
      pointerEvents="none"
      start={{ x: 0.5, y: 0 }}
      style={styles.topHighlight}
    />
    <LinearGradient
      colors={["rgba(255,255,255,0)", "rgba(0,0,0,0.2)"]}
      end={{ x: 0.5, y: 1 }}
      pointerEvents="none"
      start={{ x: 0.5, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  surface: {
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    elevation: 7,
    overflow: "hidden",
    shadowColor: "#5B3DF5",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
  },
  topHighlight: {
    height: "30%",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
