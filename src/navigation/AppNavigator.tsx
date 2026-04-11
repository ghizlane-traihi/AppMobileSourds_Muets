import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ONBOARDING_STORAGE_KEY } from "../constants/storage";
import { DemoSignsScreen } from "../screens/DemoSignsScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SignToSpeechScreen } from "../screens/SignToSpeechScreen";
import { SpeechToSignScreen } from "../screens/SpeechToSignScreen";
import { VoiceRecorderScreen } from "../screens/VoiceRecorderScreen";
import { useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { colors, isDark } = useAppTheme();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    const loadOnboardingState = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);

        if (!isMounted) {
          return;
        }

        setHasCompletedOnboarding(savedValue === "true");
      } catch (storageError) {
        console.log("load onboarding state error", storageError);
        if (isMounted) {
          setHasCompletedOnboarding(false);
        }
      }
    };

    void loadOnboardingState();

    return () => {
      isMounted = false;
    };
  }, []);

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.navigationBackground,
      card: colors.navigationBackground,
      primary: colors.primary,
      text: colors.text,
      border: colors.border,
    },
  };

  if (hasCompletedOnboarding === null) {
    return null;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={hasCompletedOnboarding ? "Home" : "Onboarding"}
        screenOptions={{
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: colors.navigationBackground,
          },
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: colors.navigationBackground,
          },
          headerTitleStyle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: "800",
          },
        }}
      >
        <Stack.Screen
          component={OnboardingScreen}
          name="Onboarding"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          component={HomeScreen}
          name="Home"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          component={SpeechToSignScreen}
          name="SpeechToSign"
          options={{ title: "Speech to Sign" }}
        />
        <Stack.Screen
          component={VoiceRecorderScreen}
          name="VoiceRecorder"
          options={{
            animation: "fade_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen
          component={DemoSignsScreen}
          name="DemoSigns"
          options={{ title: "Sign Language Learning" }}
        />
        <Stack.Screen
          component={SettingsScreen}
          name="Settings"
          options={{ title: "Settings" }}
        />
        <Stack.Screen
          component={SignToSpeechScreen}
          name="SignToSpeech"
          options={{ title: "Sign to Speech" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
