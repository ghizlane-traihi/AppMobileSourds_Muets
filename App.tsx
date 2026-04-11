import "react-native-gesture-handler";

import React from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { useAppTheme } from "./src/theme";

export default function App() {
  const { colors, isDark } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        backgroundColor={colors.navigationBackground}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
