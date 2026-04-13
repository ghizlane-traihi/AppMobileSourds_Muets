import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingOverlay } from "../components/LoadingOverlay";
import { PremiumButtonSurface } from "../components/PremiumButtonSurface";
import { ResultCard } from "../components/ResultCard";
import { ScalePressable } from "../components/ScalePressable";
import { ScanFrame } from "../components/ScanFrame";
import { SignPlaybackStage } from "../components/SignPlaybackStage";
import {
  RootStackParamList,
  SignRecognitionResponse,
} from "../types";
import { resolveLocalSigns } from "../utils/resolveLocalSigns";
import {
  triggerImpactAsync,
  triggerNotificationAsync,
} from "../utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "SignToSpeech">;
type ScreenMode = "camera" | "translating" | "result" | "playing";
type PercentPosition = `${number}%`;

const CAMERA_HELPER_TEXT =
  "Make sure your hand is fully visible and centered in the frame.";
const DETECTED_TEXT_FALLBACK = "HELLO, HOW ARE YOU?";

const buildFallbackResult = (): SignRecognitionResponse => ({
  audio_url: "",
  text: DETECTED_TEXT_FALLBACK,
});

const PARTICLE_LAYOUT = [
  { delay: 0, left: "14%", top: "18%", size: 2 },
  { delay: 500, left: "82%", top: "21%", size: 3 },
  { delay: 900, left: "22%", top: "45%", size: 2 },
  { delay: 300, left: "74%", top: "48%", size: 2 },
  { delay: 1200, left: "18%", top: "76%", size: 3 },
  { delay: 700, left: "86%", top: "72%", size: 2 },
] as const;

const AmbientParticle = ({
  delay,
  left,
  size,
  top,
}: {
  delay: number;
  left: PercentPosition;
  size: number;
  top: PercentPosition;
}) => {
  const opacity = useRef(new Animated.Value(0.12)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.72,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -10,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.12,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ambientParticle,
        {
          height: size,
          left,
          opacity,
          top,
          transform: [{ translateY }],
          width: size,
        },
      ]}
    />
  );
};

const BottomResultActions = ({
  onCopy,
  onNewTranslation,
}: {
  onCopy: () => void;
  onNewTranslation: () => void;
}) => (
  <View style={styles.resultBottomActions}>
    <ScalePressable
      accessibilityLabel="Copy translation"
      onPress={onCopy}
      scaleTo={0.96}
      style={styles.resultActionWrap}
    >
      <View style={styles.copyButton}>
        <Feather color="#C8D6FF" name="copy" size={16} />
        <Text style={styles.copyButtonText}>Copy</Text>
      </View>
    </ScalePressable>

    <ScalePressable
      accessibilityLabel="Start a new translation"
      onPress={onNewTranslation}
      scaleTo={0.96}
      style={styles.resultActionWrap}
    >
      <PremiumButtonSurface radius={18} style={styles.newTranslationButton}>
        <Text style={styles.newTranslationText}>New translation</Text>
        <Feather color="#FFFFFF" name="chevron-right" size={16} />
      </PremiumButtonSurface>
    </ScalePressable>
  </View>
);

export const CameraTranslateScreen = ({ navigation }: Props) => {
  const cameraRef = useRef<CameraView | null>(null);
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraEpoch, setCameraEpoch] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<ScreenMode>("camera");
  const [result, setResult] = useState<SignRecognitionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const stageScale = useRef(new Animated.Value(1)).current;

  const frameWidth = Math.min(width - 24, 380);
  const frameHeight = Math.round(frameWidth * 0.78);
  const shouldShowCamera = mode === "camera" || mode === "translating";
  const shouldMountCamera = Boolean(permission?.granted && shouldShowCamera);
  const canUseCamera = Boolean(permission?.granted && shouldShowCamera && isFocused);
  const detectedText = result?.text?.trim() || DETECTED_TEXT_FALLBACK;
  const localSigns = useMemo(
    () => resolveLocalSigns(detectedText),
    [detectedText],
  );

  useEffect(() => {
    if (permission === null) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    fadeAnim.setValue(0);
    stageScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(stageScale, {
        toValue: 1,
        damping: 18,
        stiffness: 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, mode, stageScale]);

  const handleStartRecording = useCallback(async () => {
    if (!permission?.granted) {
      return;
    }

    setErrorMessage(null);
    setResult(null);

    try {
      void triggerImpactAsync("medium").catch(() => undefined);
      setIsRecording(true);
      setMode("camera");
    } catch (err) {
      setIsRecording(false);
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to start recording.",
      );
    }
  }, [permission?.granted]);

  useEffect(() => {
    if (
      mode !== "camera" ||
      !canUseCamera ||
      isRecording
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void handleStartRecording();
    }, 260);

    return () => clearTimeout(timer);
  }, [canUseCamera, handleStartRecording, isRecording, mode]);

  const handleStopRecording = () => {
    void triggerNotificationAsync("success").catch(() => undefined);
    setErrorMessage(null);
    setResult(buildFallbackResult());
    setMode("result");
    setIsRecording(false);
  };

  const handleNewTranslation = () => {
    setCameraReady(false);
    setCameraEpoch((currentEpoch) => currentEpoch + 1);
    setIsRecording(false);
    setResult(null);
    setErrorMessage(null);
    setMode("camera");
  };

  const handleCopyText = () => {
    if (!result?.text) {
      return;
    }

    void (async () => {
      try {
        await Clipboard.setStringAsync(result.text);
        Alert.alert("Copied", "Text copied to clipboard.");
      } catch {
        Alert.alert("Error", "Unable to copy text.");
      }
    })();
  };

  const handleShareText = async () => {
    if (!result?.text) {
      return;
    }

    try {
      await Share.share({
        message: `SignLink detected: ${result.text}`,
      });
    } catch {
      // Sharing can be cancelled by the user.
    }
  };

  const handleStopOrReset = () => {
    if (mode === "translating") {
      handleNewTranslation();
      return;
    }

    void handleStopRecording();
  };

  const headerTitle =
    mode === "translating"
      ? "Translating..."
      : mode === "result" || mode === "playing"
        ? "Sign language detected"
        : "Use camera to translate";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#05051A", "#0A0A2E", "#171052"]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />

      {PARTICLE_LAYOUT.map((particle) => (
        <AmbientParticle key={`${particle.left}-${particle.top}`} {...particle} />
      ))}

      {shouldMountCamera && (
        <View pointerEvents="auto" style={styles.cameraLayer}>
          <CameraView
            facing="front"
            key={`camera-${cameraEpoch}`}
            mode="video"
            onCameraReady={() => setCameraReady(true)}
            onMountError={({ message }) => {
              setErrorMessage(message || "Unable to start the camera.");
            }}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={[
              "rgba(5,5,26,0.92)",
              "rgba(5,5,26,0.25)",
              "rgba(5,5,26,0.2)",
              "rgba(5,5,26,0.94)",
            ]}
            locations={[0, 0.25, 0.63, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View pointerEvents="none" style={styles.neonMist}>
            <LinearGradient
              colors={[
                "transparent",
                "rgba(124,92,252,0.2)",
                "rgba(137,221,255,0.08)",
                "transparent",
              ]}
              locations={[0, 0.42, 0.58, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {mode === "translating" && <LoadingOverlay />}
        </View>
      )}

      {shouldShowCamera && permission?.granted && (
        <View pointerEvents="none" style={styles.scanFrameWrap}>
          <ScanFrame
            height={frameHeight}
            isRecording={isRecording}
            loading={mode === "translating"}
            width={frameWidth}
          />
        </View>
      )}

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View style={styles.header}>
          <ScalePressable
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            scaleTo={0.94}
          >
            <View style={styles.headerButton}>
              <Feather color="#F8FAFC" name="arrow-left" size={22} />
            </View>
          </ScalePressable>

          <Text style={styles.headerTitle}>{headerTitle}</Text>

          <ScalePressable
            accessibilityLabel={
              mode === "result" || mode === "playing" ? "Share" : "Options"
            }
            onPress={
              mode === "result" || mode === "playing"
                ? handleShareText
                : undefined
            }
            scaleTo={0.94}
          >
            <View style={styles.headerButton}>
              <Feather
                color="#F8FAFC"
                name={
                  mode === "result" || mode === "playing"
                    ? "share-2"
                    : "more-horizontal"
                }
                size={20}
              />
            </View>
          </ScalePressable>
        </View>

        {!permission?.granted && (
          <View style={styles.permissionLayer}>
            <View style={styles.permissionCard}>
              <Feather color="rgba(137,221,255,0.86)" name="camera-off" size={42} />
              <Text style={styles.permissionTitle}>Camera access needed</Text>
              <Text style={styles.permissionSubtitle}>
                Grant camera access to translate sign language from your camera.
              </Text>
              <ScalePressable onPress={() => void Linking.openSettings()} scaleTo={0.96}>
                <PremiumButtonSurface radius={16} style={styles.permissionButton}>
                  <Text style={styles.permissionButtonText}>Open Settings</Text>
                </PremiumButtonSurface>
              </ScalePressable>
            </View>
          </View>
        )}

        {(mode === "camera" || mode === "translating") && permission?.granted && (
          <View pointerEvents="box-none" style={styles.cameraCopyLayer}>
            {mode === "camera" && (
              <Text style={styles.instructionText}>{CAMERA_HELPER_TEXT}</Text>
            )}

            {mode === "translating" && (
              <Text style={styles.translatingHelper}>
                Sign language is being translated into text, please wait...
              </Text>
            )}

            {errorMessage && (
              <View style={styles.errorCard}>
                <Feather color="#F87171" name="alert-circle" size={18} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.bottomControls}>
              <ScalePressable
                accessibilityLabel="Call"
                onPress={() => {}}
                scaleTo={0.94}
              >
                <View style={styles.secondaryButton}>
                  <Feather color="#C8D6FF" name="phone" size={21} />
                </View>
              </ScalePressable>

              <ScalePressable
                accessibilityLabel="Stop recording"
                onPress={handleStopOrReset}
                scaleTo={0.94}
              >
                <PremiumButtonSurface radius={24} style={styles.stopButton}>
                  <View style={styles.stopSquare} />
                  <Text style={styles.stopButtonText}>Stop</Text>
                </PremiumButtonSurface>
              </ScalePressable>

              <View style={styles.secondaryButtonGhost}>
                <Feather color="#C8D6FF" name="phone" size={21} />
              </View>
            </View>
          </View>
        )}

        {(mode === "result" || mode === "playing") && result && (
          <Animated.View
            style={[
              styles.detectionLayer,
              {
                opacity: fadeAnim,
                transform: [{ scale: stageScale }],
              },
            ]}
          >
            <View style={styles.detectionStage}>
              {mode === "result" ? (
                <ResultCard
                  onCopy={handleCopyText}
                  onNewTranslation={handleNewTranslation}
                  text={detectedText}
                />
              ) : (
                <SignPlaybackStage
                  frameHeight={frameHeight}
                  frameWidth={frameWidth}
                  signs={localSigns}
                />
              )}
            </View>

            {mode === "playing" && (
              <View style={styles.resultActionLayer}>
                <BottomResultActions
                  onCopy={handleCopyText}
                  onNewTranslation={handleNewTranslation}
                />
              </View>
            )}

            {errorMessage && (
              <View style={styles.resultActionLayer}>
                <View style={styles.errorCard}>
                  <Feather color="#F87171" name="alert-circle" size={18} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
};

export const SignToSpeechScreen = CameraTranslateScreen;

const styles = StyleSheet.create({
  ambientParticle: {
    backgroundColor: "rgba(168,130,255,0.86)",
    borderRadius: 99,
    position: "absolute",
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 7,
  },
  bottomControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
    paddingBottom: 22,
    paddingTop: 14,
  },
  cameraCopyLayer: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 22,
    position: "absolute",
    right: 0,
  },
  cameraLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  copyButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  copyButtonText: {
    color: "#D6E2FF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
  detectionLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  detectionStage: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 56,
    paddingHorizontal: 22,
  },
  disabledButton: {
    opacity: 0.56,
  },
  errorCard: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(248,113,113,0.1)",
    borderColor: "rgba(248,113,113,0.22)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginTop: 12,
    maxWidth: 360,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%",
  },
  errorText: {
    color: "rgba(248,113,113,0.92)",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 19,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    width: 46,
  },
  headerTitle: {
    color: "#F8FAFC",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  instructionText: {
    alignSelf: "center",
    color: "rgba(214,226,255,0.74)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 21,
    maxWidth: 320,
    textAlign: "center",
  },
  neonMist: {
    bottom: 42,
    height: 260,
    left: 0,
    position: "absolute",
    right: 0,
  },
  permissionButton: {
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
  },
  permissionCard: {
    alignItems: "center",
    backgroundColor: "rgba(12,10,42,0.72)",
    borderColor: "rgba(168,85,247,0.26)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 15,
    maxWidth: 360,
    padding: 28,
    shadowColor: "#7C5CFC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 24,
    width: "100%",
  },
  permissionLayer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  permissionSubtitle: {
    color: "rgba(214,226,255,0.68)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 21,
    textAlign: "center",
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
  },
  newTranslationButton: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 6,
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  newTranslationText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
  },
  resultActionLayer: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 22,
    position: "absolute",
    right: 0,
  },
  resultActionWrap: {
    flex: 1,
  },
  resultBottomActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    paddingBottom: 22,
    paddingTop: 14,
  },
  root: {
    backgroundColor: "#05051A",
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scanFrameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 56,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: "rgba(255,255,255,0.13)",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  secondaryButtonGhost: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    opacity: 0,
    width: 52,
  },
  stopButton: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    gap: 10,
    height: 48,
    justifyContent: "center",
    minWidth: 136,
    paddingHorizontal: 28,
  },
  stopButtonText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
  stopSquare: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 3,
    height: 12,
    width: 12,
  },
  translatingHelper: {
    alignSelf: "center",
    color: "rgba(214,226,255,0.76)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 21,
    maxWidth: 300,
    textAlign: "center",
  },
});
