import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ActionFeedbackCard,
  type FeedbackTone,
} from "../components/ActionFeedbackCard";
import { AssistantHintsCard } from "../components/AssistantHintsCard";
import { ErrorMessage } from "../components/ErrorMessage";
import { HandDetectionOverlay } from "../components/HandDetectionOverlay";
import { LiveWaveform } from "../components/LiveWaveform";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { ScalePressable } from "../components/ScalePressable";
import { useApi } from "../hooks/useApi";
import { awardGamification } from "../services/gamification";
import { saveResumeActivity } from "../services/resume";
import {
  buildUploadAsset,
  getApiBaseUrl,
  recognizeSign,
  textToSpeech,
} from "../services/api";
import { useAppTheme } from "../theme";
import {
  RootStackParamList,
  SignRecognitionResponse,
  UploadAsset,
} from "../types";
import {
  triggerImpactAsync,
  triggerNotificationAsync,
} from "../utils/haptics";

type RecordedVideo = {
  uri: string;
  codec?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, "SignToSpeech">;

type ProcessingState =
  | "idle"
  | "permission"
  | "ready"
  | "recording"
  | "analyzing"
  | "synthesizing"
  | "success"
  | "error";

type ScreenMode = "translate" | "practice";

type SignToSpeechHistoryItem = {
  id: string;
  result: SignRecognitionResponse;
  captureName: string;
  createdAtLabel: string;
  audioAvailable: boolean;
  confidenceLabel: string;
};

type PracticeChallenge = {
  id: string;
  prompt: string;
  acceptableAnswers: string[];
  hint: string;
  difficulty: "Easy" | "Medium" | "Challenge";
};

type PracticeAttempt = {
  challengeId: string;
  challengePrompt: string;
  feedback: string;
  isCorrect: boolean;
  recognizedText: string;
  score: number;
  title: string;
};

const MAX_CAPTURE_DURATION_SECONDS = 6;
const MAX_HISTORY_ITEMS = 5;
const HISTORY_STORAGE_KEY = "signlink:sign-to-speech:history";
const CAMERA_FALLBACK_TIMEOUT_MS = 3500;
const PRACTICE_MATCH_THRESHOLD = 75;
const PRACTICE_CHALLENGES: PracticeChallenge[] = [
  {
    id: "greeting",
    prompt: "Hello and welcome to SignLink",
    acceptableAnswers: ["hello and welcome to signlink", "hello", "welcome"],
    hint: "Start with a friendly greeting and keep your hands fully visible.",
    difficulty: "Easy",
  },
  {
    id: "check-in",
    prompt: "How are you today",
    acceptableAnswers: ["how are you today", "how are you"],
    hint: "Use a calm pace and pause briefly at the end of the phrase.",
    difficulty: "Easy",
  },
  {
    id: "learning",
    prompt: "I would like to learn sign language",
    acceptableAnswers: [
      "i would like to learn sign language",
      "learn sign language",
    ],
    hint: "Make the phrase in one clear sequence instead of rushing the middle.",
    difficulty: "Medium",
  },
  {
    id: "thanks",
    prompt: "Thank you for using the demo backend",
    acceptableAnswers: [
      "thank you for using the demo backend",
      "thank you",
    ],
    hint: "Emphasize the thank-you portion and keep your shoulders centered.",
    difficulty: "Medium",
  },
];

const shortenFilename = (filename: string) => {
  if (filename.length <= 28) {
    return filename;
  }

  return `${filename.slice(0, 25)}...`;
};

const formatConfidenceLabel = (confidence?: number) => {
  if (typeof confidence !== "number") {
    return "N/A";
  }

  if (confidence > 1) {
    return `${Math.round(confidence)}%`;
  }

  return `${Math.round(confidence * 100)}%`;
};

const normalizeComparisonText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const computeWordOverlap = (expected: string, actual: string) => {
  const expectedWords = normalizeComparisonText(expected)
    .split(" ")
    .filter(Boolean);
  const actualWords = normalizeComparisonText(actual).split(" ").filter(Boolean);

  if (expectedWords.length === 0 || actualWords.length === 0) {
    return 0;
  }

  const expectedSet = new Set(expectedWords);
  const actualSet = new Set(actualWords);
  const intersectionSize = Array.from(expectedSet).filter((word) =>
    actualSet.has(word),
  ).length;
  const unionSize = new Set([...expectedSet, ...actualSet]).size;

  return unionSize === 0 ? 0 : intersectionSize / unionSize;
};

const normalizeConfidence = (confidence?: number) => {
  if (typeof confidence !== "number") {
    return 0.55;
  }

  if (confidence > 1) {
    return Math.min(confidence / 100, 1);
  }

  return Math.min(Math.max(confidence, 0), 1);
};

const getNextPracticeChallenge = (previousChallengeId?: string | null) => {
  const candidates = PRACTICE_CHALLENGES.filter(
    (challenge) => challenge.id !== previousChallengeId,
  );

  const challengePool =
    candidates.length > 0 ? candidates : PRACTICE_CHALLENGES;
  const randomIndex = Math.floor(Math.random() * challengePool.length);

  return challengePool[randomIndex] ?? PRACTICE_CHALLENGES[0]!;
};

const evaluatePracticeAttempt = (
  challenge: PracticeChallenge,
  response: SignRecognitionResponse,
): PracticeAttempt => {
  const recognizedText = response.text.trim();
  const normalizedRecognized = normalizeComparisonText(recognizedText);
  const normalizedAnswers = challenge.acceptableAnswers.map(normalizeComparisonText);

  const bestAnswer = normalizedAnswers.reduce(
    (currentBest, candidate) => {
      const exactMatch = candidate === normalizedRecognized;
      const containsMatch =
        normalizedRecognized.length > 0 &&
        (candidate.includes(normalizedRecognized) ||
          normalizedRecognized.includes(candidate));
      const overlap = computeWordOverlap(candidate, normalizedRecognized);
      const similarity = exactMatch ? 1 : containsMatch ? 0.86 : overlap;

      return similarity > currentBest ? similarity : currentBest;
    },
    0,
  );

  const confidenceScore = normalizeConfidence(response.confidence);
  const score =
    normalizedRecognized.length === 0
      ? 0
      : Math.round(Math.min(100, bestAnswer * 78 + confidenceScore * 22));

  if (score >= 90) {
    return {
      challengeId: challenge.id,
      challengePrompt: challenge.prompt,
      feedback:
        "That matched the target very closely. Keep the same pacing and hand visibility.",
      isCorrect: true,
      recognizedText,
      score,
      title: "Excellent match",
    };
  }

  if (score >= PRACTICE_MATCH_THRESHOLD) {
    return {
      challengeId: challenge.id,
      challengePrompt: challenge.prompt,
      feedback:
        "Strong attempt. The recognition result is close enough to count as correct.",
      isCorrect: true,
      recognizedText,
      score,
      title: "Correct sign",
    };
  }

  if (score >= 50) {
    return {
      challengeId: challenge.id,
      challengePrompt: challenge.prompt,
      feedback:
        "Close, but not quite there yet. Slow down slightly and make the full phrase more distinct.",
      isCorrect: false,
      recognizedText,
      score,
      title: "Almost there",
    };
  }

  return {
    challengeId: challenge.id,
    challengePrompt: challenge.prompt,
    feedback:
      "The detected sign did not match the target well enough. Reframe the signer, then try the challenge again.",
    isCorrect: false,
    recognizedText,
    score,
    title: "Try again",
  };
};

const buildDemoRecognitionResult = (): SignRecognitionResponse => {
  const demoText = "How are you today";

  return {
    text: demoText,
    audio_url: `${getApiBaseUrl()}/media/audio/mock-tts.wav?text=${encodeURIComponent(
      demoText,
    )}`,
    confidence: 0.97,
  };
};

const CAPTURE_TIPS = [
  "Keep one signer centered inside the frame.",
  "Use a simple background and good lighting.",
  "Show the full hand shape before stopping the capture.",
];

const PRACTICE_TIPS = [
  "Read the coach prompt first so you know the exact target phrase.",
  "Make the sign sequence once at a steady pace instead of rushing.",
  "If the score is low, adjust framing and try the same challenge again.",
];

const normalizeDetectionConfidence = (confidence?: number) => {
  if (typeof confidence !== "number") {
    return 0;
  }

  if (confidence > 1) {
    return Math.max(0, Math.min(1, confidence / 100));
  }

  return Math.max(0, Math.min(1, confidence));
};

export const SignToSpeechScreen = ({ route }: Props) => {
  const { colors, isDark } = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cameraRef = useRef<CameraView | null>(null);
  const recordingPromiseRef = useRef<Promise<RecordedVideo | undefined> | null>(
    null,
  );
  const soundRef = useRef<Audio.Sound | null>(null);
  const isFocused = useIsFocused();

  const [screenMode, setScreenMode] = useState<ScreenMode>(
    route.params?.initialMode ?? "translate",
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<UploadAsset | null>(null);
  const [result, setResult] = useState<SignRecognitionResponse | null>(null);
  const [practiceChallenge, setPracticeChallenge] = useState<PracticeChallenge>(
    () => getNextPracticeChallenge(),
  );
  const [practiceAttempt, setPracticeAttempt] = useState<PracticeAttempt | null>(
    null,
  );
  const [practiceHistory, setPracticeHistory] = useState<PracticeAttempt[]>([]);
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [history, setHistory] = useState<SignToSpeechHistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showCameraFallback, setShowCameraFallback] = useState(false);
  const [showTips, setShowTips] = useState(screenMode === "practice");
  const [idleWaveformLevels, setIdleWaveformLevels] = useState<number[]>(
    Array.from({ length: 18 }, (_, index) => 0.14 + ((index % 4) * 0.04)),
  );
  const idlePulseScale = useSharedValue(1);
  const idlePulseOpacity = useSharedValue(0.18);

  const { execute, loading, error, reset } = useApi(recognizeSign);
  const {
    execute: executeSynthesis,
    loading: synthesizeLoading,
    error: synthesizeError,
    reset: resetSynthesis,
  } = useApi(textToSpeech);

  const isBusy = loading || synthesizeLoading;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const subtitle =
      screenMode === "practice"
        ? practiceChallenge
          ? `Practice challenge: ${practiceChallenge.prompt}`
          : "Return to camera practice mode."
        : "Return to camera sign translation.";

    void saveResumeActivity({
      params: { initialMode: screenMode },
      route: "SignToSpeech",
      subtitle,
      title: screenMode === "practice" ? "Sign practice" : "Sign capture",
    });
  }, [practiceChallenge, screenMode]);

  useEffect(() => {
    setShowTips(screenMode === "practice");
  }, [screenMode]);

  useEffect(() => {
    if (!isFocused && soundRef.current) {
      void soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
      setIsPlayingAudio(false);
    }
  }, [isFocused]);

  useEffect(() => {
    if (!permission?.granted || cameraReady || !isFocused) {
      setShowCameraFallback(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setShowCameraFallback(true);
    }, CAMERA_FALLBACK_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cameraReady, isFocused, permission?.granted]);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const rawHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);

        if (!rawHistory || !isMounted) {
          return;
        }

        const parsedHistory = JSON.parse(rawHistory) as SignToSpeechHistoryItem[];

        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory.slice(0, MAX_HISTORY_ITEMS));
        }
      } catch (storageError) {
        console.log("load sign-to-speech history error", storageError);
      } finally {
        if (isMounted) {
          setHistoryLoaded(true);
        }
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    const persistHistory = async () => {
      try {
        if (history.length === 0) {
          await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
          return;
        }

        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      } catch (storageError) {
        console.log("save sign-to-speech history error", storageError);
      }
    };

    void persistHistory();
  }, [history, historyLoaded]);

  useEffect(() => {
    if (isRecording || isBusy) {
      return;
    }

    let tick = 0;
    const intervalId = setInterval(() => {
      tick += 1;
      setIdleWaveformLevels((currentLevels) =>
        currentLevels.map((_, index) => {
          const base = 0.14 + ((index % 5) * 0.025);
          const wave = (Math.sin(tick * 0.42 + index * 0.58) + 1) / 2;
          return Math.min(0.48, base + wave * 0.14);
        }),
      );
    }, 240);

    return () => {
      clearInterval(intervalId);
    };
  }, [isBusy, isRecording]);

  useEffect(() => {
    const showIdlePulse =
      !isRecording &&
      !isBusy &&
      permission?.granted === true &&
      cameraReady &&
      isFocused;

    if (showIdlePulse) {
      idlePulseScale.value = 1;
      idlePulseOpacity.value = 0.18;
      idlePulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, {
            duration: 760,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(1, {
            duration: 760,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );
      idlePulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.08, {
            duration: 760,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0.18, {
            duration: 760,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
        false,
      );

      return;
    }

    cancelAnimation(idlePulseScale);
    cancelAnimation(idlePulseOpacity);
    idlePulseScale.value = withTiming(1, { duration: 180 });
    idlePulseOpacity.value = withTiming(0, { duration: 180 });
  }, [
    cameraReady,
    idlePulseOpacity,
    idlePulseScale,
    isBusy,
    isFocused,
    isRecording,
    permission?.granted,
  ]);

  const stopAudioPlayback = async () => {
    if (!soundRef.current) {
      setIsPlayingAudio(false);
      return;
    }

    try {
      const status = await soundRef.current.getStatusAsync();

      if (status.isLoaded) {
        await soundRef.current.stopAsync();
      }

      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlayingAudio(false);
    } catch (caughtError) {
      console.log("stop sign audio error", caughtError);
      setIsPlayingAudio(false);
    }
  };

  const resetCaptureFlow = async () => {
    await stopAudioPlayback();
    setCapturedVideo(null);
    setResult(null);
    setPracticeAttempt(null);
    setScreenError(null);
    setProcessingState(permission?.granted ? "ready" : "idle");
    reset();
    resetSynthesis();
  };

  const practiceAverageScore =
    practiceHistory.length > 0
      ? Math.round(
          practiceHistory.reduce((total, item) => total + item.score, 0) /
            practiceHistory.length,
        )
      : 0;
  const practiceBestScore = practiceHistory.reduce(
    (bestScore, item) => Math.max(bestScore, item.score),
    0,
  );
  const pushPracticeAttempt = (attempt: PracticeAttempt) => {
    setPracticeHistory((currentHistory) =>
      [attempt, ...currentHistory].slice(0, MAX_HISTORY_ITEMS),
    );
  };

  const handleScreenModeChange = (nextMode: ScreenMode) => {
    if (nextMode === screenMode) {
      return;
    }

    void resetCaptureFlow();
    setScreenMode(nextMode);
    setScreenError(null);

    if (nextMode === "practice") {
      setPracticeChallenge((currentChallenge) =>
        currentChallenge ?? getNextPracticeChallenge(),
      );
    }
  };

  const handleNextPracticeChallenge = () => {
    void resetCaptureFlow();
    setPracticeChallenge((currentChallenge) =>
      getNextPracticeChallenge(currentChallenge.id),
    );
  };

  const pushHistoryItem = (
    response: SignRecognitionResponse,
    captureAsset: UploadAsset | null,
  ) => {
    setHistory((currentHistory) => {
      const nextItem: SignToSpeechHistoryItem = {
        id: `${Date.now()}`,
        result: response,
        captureName: captureAsset?.name || "gesture.mp4",
        createdAtLabel: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        audioAvailable: Boolean(response.audio_url),
        confidenceLabel: formatConfidenceLabel(response.confidence),
      };

      return [nextItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const handleOpenSettings = async () => {
    await Linking.openSettings();
  };

  const handleRequestPermission = async () => {
    const response = await requestPermission();

    if (!response.granted) {
      setScreenError(
        "Camera access is required to capture sign language gestures.",
      );
      setProcessingState("permission");
      return false;
    }

    setScreenError(null);
    setProcessingState(cameraReady ? "ready" : "idle");
    return true;
  };

  const handleStartRecording = async () => {
    reset();
    resetSynthesis();
    setScreenError(null);
    setResult(null);
    setCapturedVideo(null);
    setPracticeAttempt(null);
    await stopAudioPlayback();

    if (!permission?.granted) {
      const granted = await handleRequestPermission();

      if (!granted) {
        return;
      }
    }

    if (!cameraRef.current || !cameraReady) {
      setProcessingState("idle");
      return;
    }

    try {
      void triggerImpactAsync("medium").catch(() => undefined);
      setIsRecording(true);
      setProcessingState("recording");
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: MAX_CAPTURE_DURATION_SECONDS,
      });
    } catch (caughtError) {
      setIsRecording(false);
      setProcessingState("error");
      setScreenError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start camera recording.",
      );
    }
  };

  const handleAnalyzeCapture = async (
    videoAsset: UploadAsset,
    options?: { rewardGamification?: boolean },
  ) => {
    setScreenError(null);
    setProcessingState("analyzing");
    const response = await execute(videoAsset);

    if (response) {
      setResult(response);
      if (screenMode === "practice") {
        const nextAttempt = evaluatePracticeAttempt(practiceChallenge, response);
        setPracticeAttempt(nextAttempt);
        pushPracticeAttempt(nextAttempt);

        if (options?.rewardGamification !== false) {
          const rewardPoints = nextAttempt.isCorrect ? 24 : 10;
          void awardGamification({ points: rewardPoints });
        }
      }
      setProcessingState("success");
      if (screenMode === "translate") {
        pushHistoryItem(response, videoAsset);
      }
      return response;
    }

    setProcessingState("error");
    return null;
  };

  const handleUseDemoRecognition = async () => {
    await stopAudioPlayback();
    reset();
    resetSynthesis();
    setCapturedVideo(null);
    setPracticeAttempt(null);
    setScreenError(null);
    const demoResult = buildDemoRecognitionResult();
    setResult(demoResult);
    if (screenMode === "practice") {
      const nextAttempt = evaluatePracticeAttempt(practiceChallenge, demoResult);
      setPracticeAttempt(nextAttempt);
      pushPracticeAttempt(nextAttempt);
    }
    setProcessingState("success");
    if (screenMode === "translate") {
      pushHistoryItem(demoResult, null);
    }
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !recordingPromiseRef.current) {
      return;
    }

    try {
      cameraRef.current.stopRecording();
      const recordingResult = await recordingPromiseRef.current;
      void triggerNotificationAsync("success").catch(() => undefined);

      setIsRecording(false);
      recordingPromiseRef.current = null;

      if (!recordingResult?.uri) {
        setScreenError("No video was captured. Please try again.");
        setProcessingState("error");
        return;
      }

      const uploadAsset = buildUploadAsset(
        recordingResult.uri,
        "video/mp4",
        "gesture.mp4",
      );

      setCapturedVideo(uploadAsset);
      await handleAnalyzeCapture(uploadAsset);
    } catch (caughtError) {
      void triggerNotificationAsync("error").catch(() => undefined);
      setIsRecording(false);
      recordingPromiseRef.current = null;
      setProcessingState("error");
      setScreenError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to finish the recording.",
      );
    }
  };

  const handleGenerateAudio = async () => {
    if (!result?.text) {
      setScreenError(
        "No recognized text is available yet to generate synthesized audio.",
      );
      setProcessingState("error");
      return null;
    }

    setScreenError(null);
    setProcessingState("synthesizing");
    const audioResponse = await executeSynthesis(result.text);

    if (audioResponse?.audio_url) {
      setResult((currentResult) =>
        currentResult
          ? {
              ...currentResult,
              audio_url: audioResponse.audio_url,
            }
          : currentResult,
      );
      setProcessingState("success");
      return audioResponse.audio_url;
    }

    setProcessingState("error");
    return null;
  };

  const handlePlayAudio = async () => {
    if (isPlayingAudio) {
      await stopAudioPlayback();
      return;
    }

    let audioUrl = result?.audio_url || "";

    if (!audioUrl) {
      const generatedAudioUrl = await handleGenerateAudio();

      if (!generatedAudioUrl) {
        return;
      }

      audioUrl = generatedAudioUrl;
    }

    try {
      setScreenError(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if ("error" in status && status.error) {
            setScreenError(status.error);
            setProcessingState("error");
          }

          setIsPlayingAudio(false);
          return;
        }

        if (status.didJustFinish) {
          void sound.unloadAsync().catch(() => undefined);
          soundRef.current = null;
          setIsPlayingAudio(false);
          return;
        }

        setIsPlayingAudio(status.isPlaying);
      });

      soundRef.current = sound;
      setIsPlayingAudio(true);
    } catch (caughtError) {
      setProcessingState("error");
      setScreenError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to play audio.",
      );
    }
  };

  const handleCopyText = () => {
    if (!result?.text) {
      return;
    }

    void (async () => {
      try {
        await Clipboard.setStringAsync(result.text);
        Alert.alert("Copied", "Recognized text copied to clipboard.");
      } catch (clipboardError) {
        console.log("copy sign-to-speech text error", clipboardError);
        Alert.alert("Copy failed", "Unable to copy the recognized text.");
      }
    })();
  };

  const handleShareText = async () => {
    if (!result?.text) {
      return;
    }

    try {
      await Share.share({
        message: `SignLink recognized sign text: ${result.text}`,
      });
    } catch (shareError) {
      console.log("share sign-to-speech text error", shareError);
    }
  };

  const handleRetry = () => {
    if (screenMode === "translate" && synthesizeError && result?.text) {
      void handleGenerateAudio();
      return;
    }

    if (capturedVideo) {
      void handleAnalyzeCapture(capturedVideo);
      return;
    }

    if (result?.audio_url || result?.text) {
      if (screenMode === "practice") {
        void resetCaptureFlow();
        return;
      }

      void handlePlayAudio();
      return;
    }

    void handleRequestPermission();
  };

  const handleRefresh = () => {
    if (!isBusy && capturedVideo) {
      void handleAnalyzeCapture(capturedVideo, {
        rewardGamification: screenMode === "translate",
      });
    }
  };

  const handleOpenHistoryItem = async (item: SignToSpeechHistoryItem) => {
    await stopAudioPlayback();
    setCapturedVideo(null);
    setResult(item.result);
    setScreenError(null);
    setProcessingState("success");
    reset();
    resetSynthesis();
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const showPermissionCta = permission?.granted === false;
  const canStartCapture =
    permission?.granted === true && cameraReady && isFocused && !isBusy;
  const showOpenSettingsAction =
    showPermissionCta ||
    (screenError?.toLowerCase().includes("permission") ?? false);
  const idlePulseStyle = useAnimatedStyle(() => ({
    opacity: idlePulseOpacity.value,
    transform: [{ scale: idlePulseScale.value }],
  }));
  const shouldShowIdleSignal =
    !isRecording &&
    !isBusy &&
    permission?.granted === true &&
    cameraReady &&
    isFocused &&
    !capturedVideo;

  const statusConfig =
    processingState === "permission"
      ? {
          title: "Allow camera access",
          description: "Turn on the camera to start.",
          accent: "#B45309",
          background: "#FEF3C7",
        }
      : processingState === "recording"
        ? {
            title: screenMode === "practice" ? "Recording attempt" : "Recording",
            description:
              screenMode === "practice"
                ? "Keep the sign inside the frame."
                : "Keep hands inside the frame.",
            accent: "#B91C1C",
            background: "#FEE2E2",
          }
        : processingState === "analyzing"
          ? {
              title: screenMode === "practice" ? "Scoring" : "Analyzing",
              description:
                screenMode === "practice"
                  ? "Checking the last attempt."
                  : "Checking the last capture.",
              accent: "#1B6EF3",
              background: "#DBEAFE",
            }
          : processingState === "synthesizing"
            ? {
                title: "Creating audio",
                description: "Preparing voice output.",
                accent: "#1B6EF3",
                background: "#DBEAFE",
              }
            : processingState === "success"
              ? {
                  title:
                    screenMode === "practice"
                      ? practiceAttempt?.isCorrect
                        ? "Score ready"
                        : "Feedback ready"
                      : "Result ready",
                  description:
                    screenMode === "practice"
                      ? "Review the score below."
                      : "Text and audio are ready.",
                  accent: "#18744E",
                  background: "#DCFCE7",
                }
              : processingState === "error"
                ? {
                    title: "Try again",
                    description: "Something went wrong.",
                    accent: "#B91C1C",
                    background: "#FEE2E2",
                  }
                : permission?.granted && cameraReady
                  ? {
                      title: screenMode === "practice" ? "Ready to practice" : "Ready to capture",
                      description:
                        screenMode === "practice"
                          ? "Tap start when you are ready."
                          : "Tap start to capture.",
                      accent: "#18744E",
                      background: "#DCFCE7",
                    }
                  : {
                      title: "Preparing camera",
                      description: "Please wait.",
                      accent: "#475569",
                      background: "#E2E8F0",
                    };

  const cameraStatusLabel = isRecording
    ? screenMode === "practice"
      ? "Recording practice attempt..."
      : "Recording gesture..."
    : loading
      ? screenMode === "practice"
        ? "Scoring attempt..."
        : "Analyzing capture..."
      : synthesizeLoading
        ? "Generating audio..."
        : !permission?.granted
          ? "Camera needed"
          : !isFocused
            ? "Camera paused"
            : cameraReady
              ? screenMode === "practice"
              ? "Ready to practice"
                : "Ready to capture"
              : "Preparing camera...";
  const handDetectionConfidence = normalizeDetectionConfidence(result?.confidence);
  const hasDetectedHand =
    isRecording ||
    (cameraReady &&
      Boolean(result) &&
      (Boolean(result?.text.trim()) || handDetectionConfidence >= 0.68));
  const handDetectionLabel =
    !permission?.granted || !isFocused || !cameraReady
      ? "No hand detected"
      : hasDetectedHand
        ? "Hand detected"
        : "No hand detected";
  const handDetectionHint =
    !permission?.granted || !isFocused || !cameraReady
      ? "Grant access and wait."
      : hasDetectedHand
        ? "Keep hands inside the frame."
        : "Move hands into the frame.";
  const previewBadgeLabel = isRecording ? "Recording" : "Live preview";
  const assistantHints =
    screenMode === "practice"
      ? {
          hints: [
            practiceChallenge.hint,
            "Keep shoulders centered.",
            "Retry once before changing the prompt.",
          ],
          message: practiceAttempt
            ? "Use the last score to improve the next try."
            : "The coach scores each attempt.",
          title: "Quick practice tips",
        }
      : {
          hints: [
            handDetectionHint,
            "Use a simple background.",
            "Check the result before the next try.",
          ],
          message: hasDetectedHand
            ? "The frame looks good for the next capture."
            : "Bring hands fully into view.",
          title: "Quick capture tips",
        };
  const hasRecognizedText = Boolean(result?.text.trim());
  const actionFeedbackSummary: {
    message: string;
    metricLabel: string;
    metricValue: string;
    title: string;
    tone: FeedbackTone;
  } | null =
    screenMode === "practice"
      ? practiceAttempt
        ? {
            message: practiceAttempt.feedback,
            metricLabel: "Coach score",
            metricValue: `${practiceAttempt.score}/100`,
            title: practiceAttempt.isCorrect ? "Strong sign match" : "Try that sign again",
            tone: practiceAttempt.isCorrect ? "success" : "warning",
          }
        : null
      : result
        ? {
            message: result.text
              ? `Detected text: ${result.text}`
              : "The capture completed, but the backend returned limited text. Try another clean recording.",
            metricLabel: "Detection",
            metricValue: formatConfidenceLabel(result.confidence),
            title:
              handDetectionConfidence >= 0.82
                ? "Recognition looks strong"
                : handDetectionConfidence >= 0.62
                  ? "Good capture"
                  : "Try another capture",
            tone:
              handDetectionConfidence >= 0.82
                ? "success"
                : handDetectionConfidence >= 0.62
                  ? "info"
                  : "warning",
          }
        : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            onRefresh={handleRefresh}
            refreshing={isBusy}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.hero }]}>
          <Text style={styles.title}>Sign to Speech</Text>
          <Text style={styles.subtitle}>
            Translate captured gestures or switch to practice mode for coach-led
            sign challenges with scoring.
          </Text>
          <Pressable
            accessibilityHint="Opens the sign language learning area"
            accessibilityRole="button"
            onPress={() => navigation.navigate("DemoSigns")}
            style={({ pressed }) => [
              styles.headerLinkButton,
              { backgroundColor: colors.surface },
              pressed && styles.inlineActionButtonPressed,
            ]}
          >
            <Text style={[styles.headerLinkButtonText, { color: colors.text }]}>
              Open learning hub
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.modeCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.modeTitle, { color: colors.text }]}>
            Camera mode
          </Text>
          <View style={styles.modeToggleRow}>
            {([
              {
                description: "Recognize signs",
                label: "Translate",
                value: "translate",
              },
              {
                description: "AI coach + score",
                label: "Practice",
                value: "practice",
              },
            ] as const).map((modeOption) => {
              const isSelected = screenMode === modeOption.value;

              return (
                <Pressable
                  key={modeOption.value}
                  accessibilityRole="button"
                  onPress={() => handleScreenModeChange(modeOption.value)}
                  style={({ pressed }) => [
                    styles.modeToggleButton,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySofter
                        : colors.surfaceMuted,
                      borderColor: isSelected ? colors.primarySoft : colors.border,
                    },
                    pressed && styles.inlineActionButtonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeToggleLabel,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                  >
                    {modeOption.label}
                  </Text>
                  <Text
                    style={[
                      styles.modeToggleDescription,
                      { color: colors.textMuted },
                    ]}
                  >
                    {modeOption.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {screenMode === "practice" ? (
          <>
            <View
              style={[
                styles.challengeCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.challengeHeader}>
                <View>
                  <Text style={[styles.challengeLabel, { color: colors.primary }]}>
                    AI coach challenge
                  </Text>
                  <Text
                    style={[styles.challengeDifficulty, { color: colors.textMuted }]}
                  >
                    {practiceChallenge.difficulty}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleNextPracticeChallenge}
                  style={({ pressed }) => [
                    styles.inlineActionButton,
                    {
                      backgroundColor: colors.primarySofter,
                      borderColor: colors.primarySoft,
                    },
                    pressed && styles.inlineActionButtonPressed,
                  ]}
                >
                  <Text
                    style={[styles.inlineActionButtonText, { color: colors.primary }]}
                  >
                    New challenge
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.challengePrompt, { color: colors.text }]}>
                {practiceChallenge.prompt}
              </Text>
              <Text style={[styles.challengeHint, { color: colors.textSecondary }]}>
                {practiceChallenge.hint}
              </Text>
            </View>
          </>
        ) : null}

        <View
          style={[
            styles.cameraCard,
            { backgroundColor: isDark ? "#102135" : "#132B47" },
          ]}
        >
          <View style={styles.cameraTopBar}>
            <Text style={styles.cameraTopTitle}>
              {screenMode === "practice" ? "Practice zone" : "Capture zone"}
            </Text>
            <View style={styles.cameraTopPills}>
              <View style={styles.cameraPreviewPill}>
                <View
                  style={[
                    styles.cameraPreviewPillDot,
                    isRecording ? styles.cameraStatusDotLive : styles.cameraStatusDotIdle,
                  ]}
                />
                <Text style={styles.cameraPreviewPillText}>{previewBadgeLabel}</Text>
              </View>
            </View>
          </View>

          {isFocused && permission?.granted ? (
            <View style={styles.cameraPreviewShell}>
              <CameraView
                facing="front"
                mode="video"
                onCameraReady={() => {
                  setCameraReady(true);
                  setShowCameraFallback(false);
                  if (!isRecording && processingState === "idle") {
                    setProcessingState("ready");
                  }
                }}
                ref={cameraRef}
                style={styles.camera}
              />
              <View pointerEvents="none" style={styles.cameraOverlayGuide}>
                <HandDetectionOverlay
                  guideColor={
                    hasDetectedHand
                      ? "rgba(56, 239, 125, 0.94)"
                      : "rgba(255,255,255,0.72)"
                  }
                  isDetected={hasDetectedHand}
                  isRecording={isRecording}
                  landmarkColor={hasDetectedHand ? "#38EF7D" : "#DCE7F3"}
                />
                <View style={styles.cameraPreviewHud}>
                  <View style={styles.cameraDetectionCard}>
                    <View style={styles.cameraDetectionHeader}>
                      <View
                        style={[
                          styles.cameraDetectionDot,
                          hasDetectedHand
                            ? styles.cameraDetectionDotDetected
                            : styles.cameraDetectionDotIdle,
                        ]}
                      />
                      <Text style={styles.cameraDetectionLabel}>
                        {handDetectionLabel}
                      </Text>
                    </View>
                    <Text style={styles.cameraDetectionHint}>
                      {handDetectionHint}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.cameraPlaceholderTitle}>
                Camera preview unavailable
              </Text>
              <Text style={styles.cameraPlaceholderText}>
                Grant access to start capturing a sign sequence.
              </Text>
            </View>
          )}

          <View style={styles.cameraFooter}>
            {shouldShowIdleSignal ? (
              <View
                style={[
                  styles.captureSignalCard,
                  {
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderColor: "rgba(255,255,255,0.12)",
                  },
                ]}
              >
                <View style={styles.captureSignalTopRow}>
                  <View style={styles.captureSignalIconWrap}>
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.captureSignalPulse,
                        { backgroundColor: colors.primary },
                        idlePulseStyle,
                      ]}
                    />
                    <View
                      style={[
                        styles.captureSignalIconCore,
                        {
                          backgroundColor: "rgba(255,255,255,0.92)",
                          borderColor: "rgba(255,255,255,0.92)",
                        },
                      ]}
                    >
                      <Feather color={colors.primary} name="mic" size={20} />
                    </View>
                  </View>

                  <View style={styles.captureSignalCopy}>
                    <Text style={styles.captureSignalTitle}>Tap start to capture</Text>
                    <Text style={styles.captureSignalText}>
                      Keep hands centered and fully visible.
                    </Text>
                  </View>
                </View>

                <LiveWaveform
                  barColor="#FFFFFF"
                  idleColor="rgba(255,255,255,0.32)"
                  isActive={false}
                  levels={idleWaveformLevels}
                />
              </View>
            ) : (
              <View style={styles.cameraStatus}>
                <View
                  style={[
                    styles.cameraStatusDot,
                    isRecording
                      ? styles.cameraStatusDotLive
                      : styles.cameraStatusDotIdle,
                  ]}
                />
                <Text style={styles.cameraStatusText}>{cameraStatusLabel}</Text>
              </View>
            )}

            <ScalePressable
              accessibilityLabel={
                isRecording
                  ? screenMode === "practice"
                    ? "Stop practice recording and score attempt"
                    : "Stop gesture capture and analyze"
                  : screenMode === "practice"
                    ? "Start practice capture"
                    : "Start gesture capture"
              }
              accessibilityRole="button"
              accessibilityState={{
                busy: isBusy,
                disabled: isRecording ? isBusy : !canStartCapture,
              }}
              disabled={isRecording ? isBusy : !canStartCapture}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              style={[
                styles.cameraButton,
                {
                  backgroundColor: isRecording ? colors.recording : colors.success,
                },
                ((isRecording ? isBusy : !canStartCapture) || isBusy) &&
                  styles.cameraButtonDisabled,
              ]}
            >
              <View style={styles.cameraButtonInner}>
                <View
                  style={[
                    styles.cameraButtonCore,
                    isRecording
                      ? styles.cameraButtonCoreRecording
                      : styles.cameraButtonCoreIdle,
                  ]}
                />
                <View style={styles.cameraButtonCopy}>
                  <Text style={styles.cameraButtonText}>
                    {isRecording
                      ? screenMode === "practice"
                        ? "Stop and score"
                        : "Stop recording"
                      : canStartCapture
                        ? screenMode === "practice"
                          ? "Start practice"
                          : "Start recording"
                        : !permission?.granted
                          ? "Allow camera"
                          : "Preparing camera"}
                  </Text>
                  <Text style={styles.cameraButtonHint}>
                    {isRecording
                      ? "Stop when the sign is complete."
                      : "One short capture works best."}
                  </Text>
                </View>
              </View>
            </ScalePressable>

          </View>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: isDark ? colors.surface : statusConfig.background,
              borderColor: isDark ? colors.border : statusConfig.background,
            },
          ]}
        >
          <Text style={[styles.statusTitle, { color: statusConfig.accent }]}>
            {statusConfig.title}
          </Text>
          <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
            {statusConfig.description}
          </Text>
        </View>

        {actionFeedbackSummary ? (
          <ActionFeedbackCard
            message={actionFeedbackSummary.message}
            metricLabel={actionFeedbackSummary.metricLabel}
            metricValue={actionFeedbackSummary.metricValue}
            title={actionFeedbackSummary.title}
            tone={actionFeedbackSummary.tone}
          />
        ) : null}

        {capturedVideo ? (
          <View
            style={[
              styles.captureSummaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.captureSummaryLabel}>
              {screenMode === "practice" ? "Latest attempt" : "Latest capture"}
            </Text>
            <Text numberOfLines={1} style={styles.captureSummaryName}>
              {shortenFilename(capturedVideo.name)}
            </Text>

            <View style={styles.inlineActionsRow}>
              <Pressable
                accessibilityLabel={
                  screenMode === "practice"
                    ? "Score latest recorded practice attempt again"
                    : "Analyze latest captured video again"
                }
                accessibilityRole="button"
                onPress={() =>
                  void handleAnalyzeCapture(capturedVideo, {
                    rewardGamification: screenMode === "translate",
                  })
                }
                style={({ pressed }) => [
                  styles.inlineActionButton,
                  {
                    backgroundColor: colors.primarySofter,
                    borderColor: colors.primarySoft,
                  },
                  pressed && styles.inlineActionButtonPressed,
                ]}
              >
                <Text style={[styles.inlineActionButtonText, { color: colors.primary }]}>
                  {screenMode === "practice" ? "Score again" : "Analyze again"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel={
                  screenMode === "practice"
                    ? "Discard latest practice attempt"
                    : "Discard latest captured video"
                }
                accessibilityRole="button"
                onPress={() => void resetCaptureFlow()}
                style={({ pressed }) => [
                  styles.inlineActionButton,
                  {
                    backgroundColor: colors.primarySofter,
                    borderColor: colors.primarySoft,
                  },
                  pressed && styles.inlineActionButtonPressed,
                ]}
              >
                <Text style={[styles.inlineActionButtonText, { color: colors.primary }]}>
                  {screenMode === "practice" ? "Retry attempt" : "New capture"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showCameraFallback ? (
          <View
            style={[
              styles.fallbackCard,
              {
                backgroundColor: colors.warningSoft,
                borderColor: colors.warningBorder,
              },
            ]}
          >
            <Text style={styles.fallbackTitle}>Simulator fallback</Text>
            <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
              If the iOS simulator camera stays stuck, use a demo result to test
              the {screenMode === "practice" ? "practice scoring" : "recognition"}{" "}
              flow.
            </Text>

            <Pressable
              accessibilityLabel="Use demo sign recognition result"
              accessibilityRole="button"
              onPress={() => void handleUseDemoRecognition()}
              style={({ pressed }) => [
                styles.fallbackButton,
                { backgroundColor: colors.hero },
                pressed && styles.inlineActionButtonPressed,
              ]}
            >
              <Text style={styles.fallbackButtonText}>Use demo result</Text>
            </Pressable>
          </View>
        ) : null}

        {showPermissionCta ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleRequestPermission}
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && styles.permissionButtonPressed,
            ]}
          >
            <Text style={styles.permissionButtonText}>Grant camera access</Text>
          </Pressable>
        ) : null}

        {isBusy ? (
          <LoadingIndicator
            label={
              loading
                ? screenMode === "practice"
                  ? "Scoring practice attempt..."
                  : "Recognizing gesture..."
                : "Generating audio..."
            }
          />
        ) : null}

        {error ? (
          <ErrorMessage message={error.message} onRetry={handleRetry} />
        ) : null}

        {synthesizeError ? (
          <ErrorMessage message={synthesizeError.message} onRetry={handleRetry} />
        ) : null}

        {screenError ? (
          <ErrorMessage
            actionLabel={showOpenSettingsAction ? "Open settings" : undefined}
            message={screenError}
            onAction={showOpenSettingsAction ? handleOpenSettings : undefined}
            onRetry={handleRetry}
          />
        ) : null}

        {screenMode === "translate" && result ? (
          <View style={styles.resultSection}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {result.text ? result.text.split(/\s+/).filter(Boolean).length : 0}
                </Text>
                <Text style={styles.summaryLabel}>Words detected</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {formatConfidenceLabel(result.confidence)}
                </Text>
                <Text style={styles.summaryLabel}>Confidence</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {result.audio_url ? "Ready" : "Missing"}
                </Text>
                <Text style={styles.summaryLabel}>Audio output</Text>
              </View>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Recognized text</Text>
              {result.text ? (
                <Text style={styles.resultText}>{result.text}</Text>
              ) : (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No text returned</Text>
                  <Text style={styles.emptyStateText}>
                    The backend did not return recognized text for this gesture
                    capture.
                  </Text>
                  <Text style={styles.emptyStateHint}>
                    Try recording again with clearer hand visibility and a
                    simpler background.
                  </Text>
                </View>
              )}

              {result.text ? (
                <View style={styles.inlineActionsRow}>
                  <Pressable
                    accessibilityLabel="Share recognized text"
                    accessibilityRole="button"
                    onPress={handleShareText}
                    style={({ pressed }) => [
                      styles.inlineActionButton,
                      pressed && styles.inlineActionButtonPressed,
                    ]}
                  >
                    <Text style={styles.inlineActionButtonText}>Share text</Text>
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Copy recognized text"
                    accessibilityRole="button"
                    onPress={handleCopyText}
                    style={({ pressed }) => [
                      styles.inlineActionButton,
                      pressed && styles.inlineActionButtonPressed,
                    ]}
                  >
                    <Text style={styles.inlineActionButtonText}>Copy text</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Audio response</Text>
              <Text style={styles.audioStatusText}>
                {result.audio_url
                  ? "A synthesized audio URL is ready for playback."
                  : "No audio URL is available yet. You can generate it from the recognized text."}
              </Text>

              <View style={styles.inlineActionsRow}>
                <Pressable
                  accessibilityLabel={
                    isPlayingAudio ? "Stop synthesized audio" : "Play synthesized audio"
                  }
                  accessibilityRole="button"
                  onPress={handlePlayAudio}
                  style={({ pressed }) => [
                    styles.audioButton,
                    pressed && styles.audioButtonPressed,
                  ]}
                >
                  <Text style={styles.audioButtonText}>
                    {isPlayingAudio ? "Stop audio" : "Play synthesized audio"}
                  </Text>
                </Pressable>

                {result.text ? (
                  <Pressable
                    accessibilityLabel="Generate audio from recognized text"
                    accessibilityRole="button"
                    onPress={() => void handleGenerateAudio()}
                    style={({ pressed }) => [
                      styles.inlineActionButton,
                      pressed && styles.inlineActionButtonPressed,
                    ]}
                  >
                    <Text style={styles.inlineActionButtonText}>
                      Generate audio again
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {screenMode === "practice" ? (
          <View style={styles.resultSection}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {practiceAttempt ? `${practiceAttempt.score}%` : "--"}
                </Text>
                <Text style={styles.summaryLabel}>Last score</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{practiceBestScore}%</Text>
                <Text style={styles.summaryLabel}>Best score</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{practiceAverageScore}%</Text>
                <Text style={styles.summaryLabel}>Average</Text>
              </View>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Coach feedback</Text>
              {practiceAttempt ? (
                <>
                  <Text
                    style={[
                      styles.practiceScoreTitle,
                      {
                        color: practiceAttempt.isCorrect
                          ? colors.success
                          : colors.danger,
                      },
                    ]}
                  >
                    {practiceAttempt.title}
                  </Text>
                  <Text style={styles.resultText}>{practiceAttempt.feedback}</Text>
                </>
              ) : (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No score yet</Text>
                  <Text style={styles.emptyStateText}>
                    Record the prompted sign to get correctness feedback and a score.
                  </Text>
                </View>
              )}

              <View style={styles.inlineActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void resetCaptureFlow()}
                  style={({ pressed }) => [
                    styles.inlineActionButton,
                    pressed && styles.inlineActionButtonPressed,
                  ]}
                >
                  <Text style={styles.inlineActionButtonText}>Try again</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleNextPracticeChallenge}
                  style={({ pressed }) => [
                    styles.inlineActionButton,
                    pressed && styles.inlineActionButtonPressed,
                  ]}
                >
                  <Text style={styles.inlineActionButtonText}>Next challenge</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Detected sign</Text>
              {result?.text ? (
                <Text style={styles.resultText}>{result.text}</Text>
              ) : (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>Waiting for analysis</Text>
                  <Text style={styles.emptyStateText}>
                    The recognized sign text will appear here after your next attempt.
                  </Text>
                </View>
              )}

              <Text style={styles.practiceTargetText}>
                Target: {practiceChallenge.prompt}
              </Text>
              <Text style={styles.practiceConfidenceText}>
                Confidence: {result ? formatConfidenceLabel(result.confidence) : "N/A"}
              </Text>
            </View>

            {practiceHistory.length > 0 ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Recent practice scores</Text>
                {practiceHistory.map((attempt, index) => (
                  <View
                    key={`${attempt.challengeId}-${attempt.score}-${index}`}
                    style={styles.historyRow}
                  >
                    <View style={styles.historyContent}>
                      <Text numberOfLines={1} style={styles.historyText}>
                        {attempt.challengePrompt}
                      </Text>
                      <Text numberOfLines={2} style={styles.historySubtext}>
                        {attempt.recognizedText || "No text returned"}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {attempt.score}% ·{" "}
                        {attempt.isCorrect ? "Correct" : "Needs another try"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {screenMode === "translate" && history.length > 0 ? (
          <View style={styles.resultCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.resultLabel}>Recent recognitions</Text>
              <Pressable
                accessibilityLabel="Clear recent recognitions"
                accessibilityRole="button"
                onPress={handleClearHistory}
                style={({ pressed }) => [
                  styles.historyClearButton,
                  pressed && styles.inlineActionButtonPressed,
                ]}
              >
                <Text style={styles.historyClearButtonText}>Clear</Text>
              </Pressable>
            </View>

            {history.map((item) => (
              <ScalePressable
                key={item.id}
                accessibilityLabel={`Open previous recognition ${item.captureName}`}
                accessibilityRole="button"
                onPress={() => void handleOpenHistoryItem(item)}
                style={[
                  styles.historyRow,
                ]}
              >
                <View style={styles.historyContent}>
                  <View style={styles.historyTitleRow}>
                    <Text numberOfLines={1} style={styles.historyText}>
                      {item.result.text || item.captureName}
                    </Text>
                    <View
                      style={[
                        styles.historyPreviewBadge,
                        item.audioAvailable
                          ? styles.historyPreviewBadgeReady
                          : styles.historyPreviewBadgeMuted,
                      ]}
                    >
                      <Text style={styles.historyPreviewBadgeText}>
                        {item.audioAvailable ? "Audio" : "Text"}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={styles.historySubtext}>
                    {item.captureName}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {item.confidenceLabel} · {item.createdAtLabel}
                  </Text>
                  <View style={styles.historyActionsInline}>
                    <Text style={styles.historyActionText}>Tap to reopen</Text>
                    {item.audioAvailable ? (
                      <Text style={styles.historyActionText}>Play from result</Text>
                    ) : null}
                  </View>
                </View>
              </ScalePressable>
            ))}
          </View>
        ) : null}

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowTips((currentValue) => !currentValue)}
            style={({ pressed }) => [
              styles.tipsToggle,
              pressed && styles.inlineActionButtonPressed,
            ]}
          >
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              {screenMode === "practice" ? "Practice tips" : "Capture tips"}
            </Text>
            <Feather
              color={colors.textMuted}
              name={showTips ? "chevron-up" : "chevron-down"}
              size={18}
            />
          </Pressable>

          {showTips ? (
            <View style={styles.infoList}>
              {(screenMode === "practice" ? PRACTICE_TIPS : CAPTURE_TIPS).map(
                (tip) => (
                  <View key={tip} style={styles.infoRow}>
                    <View
                      style={[styles.infoDot, { backgroundColor: colors.success }]}
                    />
                    <Text
                      style={[styles.infoText, { color: colors.textSecondary }]}
                    >
                      {tip}
                    </Text>
                  </View>
                ),
              )}
            </View>
          ) : null}
        </View>

        <AssistantHintsCard
          hints={assistantHints.hints}
          message={assistantHints.message}
          title={assistantHints.title}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F7F4EE",
    flex: 1,
  },
  contentContainer: {
    gap: 20,
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: "#0F2138",
    borderRadius: 30,
    padding: 22,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: "#D0DCE8",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  headerLinkButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerLinkButtonText: {
    color: "#10233B",
    fontSize: 13,
    fontWeight: "800",
  },
  modeCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  modeTitle: {
    color: "#10233B",
    fontSize: 16,
    fontWeight: "800",
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 14,
  },
  modeToggleButton: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 140,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  modeToggleLabel: {
    color: "#10233B",
    fontSize: 15,
    fontWeight: "800",
  },
  modeToggleDescription: {
    color: "#6D7D8C",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  infoTitle: {
    color: "#10233B",
    fontSize: 16,
    fontWeight: "800",
  },
  tipsToggle: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoList: {
    gap: 10,
    marginTop: 12,
  },
  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  infoDot: {
    backgroundColor: "#18A661",
    borderRadius: 999,
    height: 8,
    marginRight: 10,
    marginTop: 7,
    width: 8,
  },
  infoText: {
    color: "#5E6F80",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  statusDescription: {
    color: "#3F5367",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  challengeCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  challengeHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  challengeLabel: {
    color: "#1B6EF3",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  challengeDifficulty: {
    color: "#6C7C8C",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  challengePrompt: {
    color: "#10233B",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 14,
  },
  challengeHint: {
    color: "#4B5D70",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  cameraCard: {
    backgroundColor: "#132B47",
    borderRadius: 34,
    overflow: "hidden",
  },
  cameraTopBar: {
    alignItems: "center",
    backgroundColor: "#0F223A",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cameraTopPills: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  cameraTopTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cameraPreviewPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cameraPreviewPillDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  cameraPreviewPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cameraPreviewShell: {
    position: "relative",
  },
  camera: {
    height: 420,
    width: "100%",
  },
  cameraOverlayGuide: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  cameraPreviewHud: {
    left: 18,
    position: "absolute",
    right: 18,
    top: 18,
  },
  cameraDetectionCard: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(8, 18, 32, 0.76)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cameraDetectionHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  cameraDetectionDot: {
    borderRadius: 999,
    height: 10,
    marginRight: 10,
    width: 10,
  },
  cameraDetectionDotDetected: {
    backgroundColor: "#38EF7D",
  },
  cameraDetectionDotIdle: {
    backgroundColor: "#FDBA74",
  },
  cameraDetectionLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  cameraDetectionHint: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  cameraGuideFrame: {
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: 28,
    borderWidth: 2,
    height: 240,
    width: "72%",
  },
  cameraPlaceholder: {
    alignItems: "center",
    height: 420,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  cameraPlaceholderTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  cameraPlaceholderText: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  cameraFooter: {
    gap: 16,
    padding: 20,
  },
  captureSignalCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  captureSignalTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  captureSignalIconWrap: {
    alignItems: "center",
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  captureSignalPulse: {
    borderRadius: 999,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  captureSignalIconCore: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  captureSignalCopy: {
    flex: 1,
    gap: 4,
  },
  captureSignalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  captureSignalText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    lineHeight: 18,
  },
  cameraStatus: {
    alignItems: "center",
    flexDirection: "row",
  },
  cameraStatusDot: {
    borderRadius: 999,
    height: 12,
    marginRight: 10,
    width: 12,
  },
  cameraStatusDotIdle: {
    backgroundColor: "#22C55E",
  },
  cameraStatusDotLive: {
    backgroundColor: "#EF4444",
  },
  cameraStatusText: {
    color: "#E9F1F8",
    fontSize: 15,
    fontWeight: "700",
  },
  cameraButton: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cameraButtonInner: {
    alignItems: "center",
    flexDirection: "row",
  },
  cameraButtonCore: {
    borderRadius: 999,
    height: 18,
    marginRight: 14,
    width: 18,
  },
  cameraButtonCoreIdle: {
    backgroundColor: "#FFFFFF",
  },
  cameraButtonCoreRecording: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
  },
  cameraButtonCopy: {
    flex: 1,
  },
  startButton: {
    backgroundColor: "#18A661",
  },
  stopButton: {
    backgroundColor: "#E04A3A",
  },
  cameraButtonPressed: {
    opacity: 0.84,
  },
  cameraButtonDisabled: {
    opacity: 0.6,
  },
  cameraButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cameraButtonHint: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  captureSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  captureSummaryLabel: {
    color: "#1B6EF3",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  captureSummaryName: {
    color: "#10233B",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  fallbackCard: {
    backgroundColor: "#FFF9EF",
    borderColor: "#E6D8BC",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  fallbackTitle: {
    color: "#A76B11",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  fallbackText: {
    color: "#8A6A2D",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  fallbackButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#10233B",
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fallbackButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  permissionButton: {
    alignItems: "center",
    backgroundColor: "#1B6EF3",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  permissionButtonPressed: {
    opacity: 0.84,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  resultSection: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 20,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 96,
    padding: 14,
  },
  summaryValue: {
    color: "#10233B",
    fontSize: 20,
    fontWeight: "800",
  },
  summaryLabel: {
    color: "#6C7C8C",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 8,
    textTransform: "uppercase",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  resultLabel: {
    color: "#18744E",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  resultText: {
    color: "#10233B",
    fontSize: 17,
    lineHeight: 25,
  },
  practiceScoreTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
  },
  practiceTargetText: {
    color: "#4B5D70",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: 14,
  },
  practiceConfidenceText: {
    color: "#6C7C8C",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  inlineActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  inlineActionButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EEF5FF",
    borderColor: "#B8D4FF",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineActionButtonPressed: {
    opacity: 0.84,
  },
  inlineActionButtonText: {
    color: "#1B6EF3",
    fontSize: 14,
    fontWeight: "700",
  },
  audioButton: {
    alignItems: "center",
    backgroundColor: "#10233B",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  audioButtonPressed: {
    opacity: 0.84,
  },
  audioButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  audioStatusText: {
    color: "#4B5D70",
    fontSize: 15,
    lineHeight: 22,
  },
  emptyStateCard: {
    backgroundColor: "#FAF6EF",
    borderColor: "#E6DED1",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  emptyStateTitle: {
    color: "#10233B",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyStateText: {
    color: "#6C7C8C",
    fontSize: 15,
    lineHeight: 22,
  },
  emptyStateHint: {
    color: "#58697A",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  historyHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyClearButton: {
    backgroundColor: "#EEF5FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  historyClearButtonText: {
    color: "#1B6EF3",
    fontSize: 13,
    fontWeight: "700",
  },
  historyRow: {
    borderTopColor: "#EEE7DB",
    borderTopWidth: 1,
    paddingVertical: 14,
  },
  historyContent: {
    gap: 6,
  },
  historyTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  historyText: {
    color: "#10233B",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  historySubtext: {
    color: "#4B5D70",
    fontSize: 14,
    lineHeight: 20,
  },
  historyMeta: {
    color: "#6C7C8C",
    fontSize: 13,
    fontWeight: "500",
  },
  historyPreviewBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyPreviewBadgeReady: {
    backgroundColor: "#DCFCE7",
  },
  historyPreviewBadgeMuted: {
    backgroundColor: "#EEF5FF",
  },
  historyPreviewBadgeText: {
    color: "#10233B",
    fontSize: 11,
    fontWeight: "800",
  },
  historyActionsInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  historyActionText: {
    color: "#1B6EF3",
    fontSize: 12,
    fontWeight: "700",
  },
});
