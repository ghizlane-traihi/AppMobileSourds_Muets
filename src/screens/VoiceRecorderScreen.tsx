import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScalePressable } from "../components/ScalePressable";
import {
  HeroRecorderButton,
  WaveformBackdrop,
} from "../components/VoiceRecorderStage";
import { RootStackParamList } from "../types";

import { RecordingScreen } from "./RecordingScreen";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceRecorder">;

type RecorderPhase = "idle" | "recording";

export const VoiceRecorderScreen = ({ navigation }: Props) => {
  const { height, width } = useWindowDimensions();
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const screenProgress = useRef(new Animated.Value(1)).current;
  const stageWidth = width;
  const stageHeight = height < 720 ? 220 : 248;

  useEffect(() => {
    screenProgress.setValue(0);
    Animated.timing(screenProgress, {
      duration: 260,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [phase, screenProgress]);

  const animatedScreenStyle = {
    opacity: screenProgress,
    transform: [
      {
        scale: screenProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.965, 1],
        }),
      },
    ],
  };

  const returnToIdle = () => {
    setPhase("idle");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#07071F", "#0A0A2E", "#111044"]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScalePressable
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            scaleTo={0.94}
          >
            <View style={styles.headerButton}>
              <Feather color="#F8FAFC" name="chevron-left" size={24} />
            </View>
          </ScalePressable>

          <Text style={styles.headerTitle}>
            {phase === "idle" ? "Voice Recorder" : "Speak and translate"}
          </Text>

          <ScalePressable
            accessibilityLabel="Close recorder"
            onPress={() => navigation.goBack()}
            scaleTo={0.94}
          >
            <View style={styles.headerButton}>
              <Feather color="#F8FAFC" name="x" size={22} />
            </View>
          </ScalePressable>
        </View>

        <Animated.View
          style={[
            styles.screen,
            animatedScreenStyle,
            height < 720 && styles.compactScreen,
          ]}
        >
          {phase === "idle" ? (
            <IdleRecorderScreen
              onDelete={returnToIdle}
              onRetry={returnToIdle}
              onStart={() => setPhase("recording")}
              stageHeight={stageHeight}
              stageWidth={stageWidth}
            />
          ) : (
            <RecordingScreen onDelete={returnToIdle} />
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

type IdleRecorderScreenProps = {
  onDelete: () => void;
  onRetry: () => void;
  onStart: () => void;
  stageHeight: number;
  stageWidth: number;
};

const IdleRecorderScreen = ({
  onDelete,
  onRetry,
  onStart,
  stageHeight,
  stageWidth,
}: IdleRecorderScreenProps) => (
  <View style={styles.idleContent}>
    <View style={styles.copyBlock}>
      <Text style={styles.title}>Voice Recorder</Text>
      <Text style={styles.subtitle}>Record your thoughts in one tap</Text>
    </View>

    <View style={styles.visualCenter}>
      <View
        style={[
          styles.audioStage,
          {
            height: stageHeight,
            width: stageWidth,
          },
        ]}
      >
        <WaveformBackdrop
          animated
          height={stageHeight}
          width={stageWidth}
        />

        <View style={styles.actionsRow}>
          <RoundControl
            accessibilityLabel="Retry recording"
            iconName="repeat"
            onPress={onRetry}
            variant="secondary"
          />
          <HeroRecorderButton
            accessibilityLabel="Start recording"
            iconName="mic"
            onPress={onStart}
          />
          <RoundControl
            accessibilityLabel="Delete recording"
            iconName="trash-2"
            onPress={onDelete}
            variant="secondary"
          />
        </View>
      </View>
    </View>

    <Text style={styles.hint}>Tap the mic when you are ready.</Text>
  </View>
);

type RoundControlProps = {
  accessibilityLabel: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  size?: "regular" | "large";
  variant: "primary" | "secondary";
};

const RoundControl = ({
  accessibilityLabel,
  iconName,
  onPress,
  size = "regular",
  variant,
}: RoundControlProps) => {
  const isLarge = size === "large";

  return (
    <ScalePressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      scaleTo={0.94}
      style={isLarge ? styles.controlWrapperLarge : styles.controlWrapper}
    >
      <View
        style={[
          styles.roundButton,
          isLarge && styles.roundButtonLarge,
          variant === "primary" ? styles.primaryButton : styles.secondaryButton,
          variant === "secondary" && styles.buttonDepth,
        ]}
      >
        <Feather
          color={variant === "primary" ? "#FFFFFF" : "#C8D6FF"}
          name={iconName}
          size={isLarge ? 28 : 22}
        />
      </View>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 6,
    position: "absolute",
    right: 0,
    top: 0,
  },
  audioStage: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  buttonDepth: {
    elevation: 5,
    shadowColor: "#050510",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  compactScreen: {
    paddingTop: 0,
  },
  controlWrapper: {
    height: 52,
    width: 52,
  },
  controlWrapperLarge: {
    height: 72,
    width: 72,
  },
  copyBlock: {
    alignItems: "center",
    maxWidth: 330,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    shadowColor: "#03030A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    width: 52,
  },
  headerTitle: {
    color: "#F8FAFC",
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  hint: {
    color: "rgba(226,232,255,0.72)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center",
  },
  idleContent: {
    alignItems: "center",
    flex: 1,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 38,
  },
  primaryButton: {
    backgroundColor: "#7C5CFC",
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  root: {
    backgroundColor: "#07071F",
    flex: 1,
  },
  roundButton: {
    alignItems: "center",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  roundButtonLarge: {
    borderRadius: 36,
    height: 72,
    width: 72,
  },
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingTop: 12,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
  },
  subtitle: {
    color: "rgba(214,226,255,0.76)",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0,
    marginTop: 8,
    textAlign: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  visualCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
});
