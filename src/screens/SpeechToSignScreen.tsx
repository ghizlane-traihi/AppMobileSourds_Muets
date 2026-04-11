import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ActionFeedbackCard,
  type FeedbackTone,
} from "../components/ActionFeedbackCard";
import { AudioRecorder } from "../components/AudioRecorder";
import { AssistantHintsCard } from "../components/AssistantHintsCard";
import { ErrorMessage } from "../components/ErrorMessage";
import { LiveWaveform } from "../components/LiveWaveform";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { SignPlayer } from "../components/SignPlayer";
import { SignSequencePlayer } from "../components/SignSequencePlayer";
import { TranslatingOverlay } from "../components/TranslatingOverlay";
import { TranslationHistorySwipeItem } from "../components/TranslationHistorySwipeItem";
import {
  SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
  SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
} from "../constants/storage";
import { useApi } from "../hooks/useApi";
import { useLiveSpeechTranslation } from "../hooks/useLiveSpeechTranslation";
import { speechToText } from "../services/api";
import { saveResumeActivity } from "../services/resume";
import { useAppTheme } from "../theme";
import {
  AudioRecorderResult,
  RootStackParamList,
  SpeechToTextResponse,
} from "../types";

const MIN_AUDIO_DURATION_MS = 1500;
const MAX_HISTORY_ITEMS = 5;

type ProcessingState = "idle" | "ready" | "sending" | "success" | "error";
type TranslationMode = "standard" | "live";

type TranslationHistoryItem = {
  id: string;
  result: SpeechToTextResponse;
  audioDurationMs: number;
  text: string;
  signCount: number;
  createdAtLabel: string;
};

type TranslationFeedback = {
  confidencePercent: number;
  tips: string[];
  unclearWords: string[];
};

type Props = NativeStackScreenProps<RootStackParamList, "SpeechToSign">;

const formatDurationLabel = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const shortenFilename = (filename: string) => {
  if (filename.length <= 28) {
    return filename;
  }

  return `${filename.slice(0, 25)}...`;
};

const normalizeWordToken = (value: string) =>
  value.toLocaleLowerCase().replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, "");

const inferConfidence = ({
  audioDurationMs,
  signsCount,
  text,
  unclearWords,
}: {
  audioDurationMs: number | null;
  signsCount: number;
  text: string;
  unclearWords: string[];
}) => {
  const tokens = text.match(/[A-Za-z0-9']+/g) ?? [];

  if (tokens.length === 0) {
    return 38;
  }

  let score = 74;

  if (audioDurationMs !== null) {
    score += Math.min(12, Math.round(audioDurationMs / 450));
  }

  if (tokens.length >= 4) {
    score += 4;
  }

  if (signsCount > 0) {
    score += Math.min(8, signsCount * 2);
  }

  score -= unclearWords.length * 8;

  return Math.max(46, Math.min(98, score));
};

const buildFallbackTips = ({
  audioDurationMs,
  hasUnclearWords,
  hasSigns,
  text,
}: {
  audioDurationMs: number | null;
  hasSigns: boolean;
  hasUnclearWords: boolean;
  text: string;
}) => {
  if (!text.trim()) {
    return [
      "Speak one short sentence in a quieter place.",
      "Keep the phone closer to your mouth for a stronger signal.",
      "Try again with a slightly longer recording.",
    ];
  }

  const tips = [
    hasUnclearWords
      ? "Repeat the highlighted words a little more slowly."
      : "Your pronunciation was mostly clear. Keep the same pace.",
    audioDurationMs !== null && audioDurationMs < 2500
      ? "Record a slightly longer phrase for more stable recognition."
      : "Pause briefly between ideas so the transcript stays clean.",
    hasSigns
      ? "Use shorter, more direct phrases to get more consistent sign results."
      : "Try a simpler sentence if you want richer sign suggestions.",
  ];

  return tips.slice(0, 3);
};

const buildTranslationFeedback = ({
  audioDurationMs,
  result,
}: {
  audioDurationMs: number | null;
  result: SpeechToTextResponse;
}): TranslationFeedback => {
  const unclearWords = Array.from(
    new Set((result.unclearWords ?? []).map(normalizeWordToken).filter(Boolean)),
  );
  const confidencePercent =
    typeof result.confidence === "number"
      ? Math.round(result.confidence * 100)
      : inferConfidence({
          audioDurationMs,
          signsCount: result.signs.length,
          text: result.text,
          unclearWords,
        });

  return {
    confidencePercent,
    tips:
      result.feedbackTips && result.feedbackTips.length > 0
        ? result.feedbackTips.slice(0, 3)
        : buildFallbackTips({
            audioDurationMs,
            hasSigns: result.signs.length > 0,
            hasUnclearWords: unclearWords.length > 0,
            text: result.text,
          }),
    unclearWords,
  };
};

const SPEECH_TIPS = [
  "Speak one short sentence at a normal pace.",
  "Record in a quiet place for clearer transcription.",
  "Keep recordings above 2 seconds for better results.",
];

const LIVE_SPEECH_TIPS = [
  "Live mode records short microphone chunks automatically.",
  "Signs refresh after each captured chunk reaches the backend.",
  "Pause briefly between ideas for clearer instant updates.",
];

export const SpeechToSignScreen = ({ route }: Props) => {
  const { colors, isDark } = useAppTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [translationMode, setTranslationMode] =
    useState<TranslationMode>(route.params?.initialMode ?? "standard");
  const [audioFile, setAudioFile] = useState<AudioRecorderResult | null>(null);
  const [result, setResult] = useState<SpeechToTextResponse | null>(null);
  const [resultAudioDurationMs, setResultAudioDurationMs] = useState<number | null>(
    null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [favoriteHistoryIds, setFavoriteHistoryIds] = useState<string[]>([]);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");

  const { execute, loading, error, reset } = useApi(speechToText);
  const {
    currentSegmentDurationMs,
    error: liveError,
    isLiveActive,
    isPreparing,
    isTranslating,
    lastChunkDurationMs,
    lastUpdatedAt,
    meteringHistory,
    pendingUploads,
    recentChunks,
    resetLiveTranslation,
    segmentsProcessed,
    signs: liveSigns,
    startLiveTranslation,
    stopLiveTranslation,
    transcript,
  } = useLiveSpeechTranslation();

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const [rawHistory, rawFavorites] = await Promise.all([
          AsyncStorage.getItem(SPEECH_TRANSLATION_HISTORY_STORAGE_KEY),
          AsyncStorage.getItem(SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY),
        ]);

        if (!isMounted) {
          return;
        }

        if (rawHistory) {
          const parsedHistory = JSON.parse(rawHistory) as TranslationHistoryItem[];

          if (Array.isArray(parsedHistory)) {
            const nextHistory = parsedHistory.slice(0, MAX_HISTORY_ITEMS);
            setHistory(nextHistory);

            if (rawFavorites) {
              const parsedFavorites = JSON.parse(rawFavorites) as string[];

              if (Array.isArray(parsedFavorites)) {
                setFavoriteHistoryIds(
                  parsedFavorites.filter((id) =>
                    nextHistory.some((item) => item.id === id),
                  ),
                );
              }
            }
          }
        }
      } catch (storageError) {
        console.log("load speech history error", storageError);
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
          await AsyncStorage.multiRemove([
            SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
            SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
          ]);
          return;
        }

        await AsyncStorage.multiSet([
          [
            SPEECH_TRANSLATION_HISTORY_STORAGE_KEY,
            JSON.stringify(history),
          ],
          [
            SPEECH_TRANSLATION_FAVORITES_STORAGE_KEY,
            JSON.stringify(
              favoriteHistoryIds.filter((id) =>
                history.some((item) => item.id === id),
              ),
            ),
          ],
        ]);
      } catch (storageError) {
        console.log("save speech history error", storageError);
      }
    };

    void persistHistory();
  }, [favoriteHistoryIds, history, historyLoaded]);

  useEffect(() => {
    if (!result) {
      return;
    }

    result.signs
      .filter((sign) => sign.type === "image")
      .flatMap((sign) => [sign.thumbnailUri, sign.uri].filter(Boolean))
      .forEach((uri) => {
        void Image.prefetch(uri as string).catch(() => false);
      });
  }, [result]);

  useEffect(() => {
    if (liveSigns.length === 0) {
      return;
    }

    liveSigns
      .filter((sign) => sign.type === "image")
      .flatMap((sign) => [sign.thumbnailUri, sign.uri].filter(Boolean))
      .forEach((uri) => {
        void Image.prefetch(uri as string).catch(() => false);
      });
  }, [liveSigns]);

  useEffect(() => {
    void saveResumeActivity({
      params: { initialMode: translationMode },
      route: "SpeechToSign",
      subtitle:
        translationMode === "live"
          ? "Return to live speech translation."
          : "Return to recorded speech translation.",
      title: translationMode === "live" ? "Live translation" : "Speech translation",
    });
  }, [translationMode]);

  const handleAudioRecorded = (recording: AudioRecorderResult) => {
    setAudioFile(recording);
    setResult(null);
    setResultAudioDurationMs(null);
    setValidationError(null);
    setProcessingState("ready");
    reset();
  };

  const handleModeChange = (nextMode: TranslationMode) => {
    if (nextMode === translationMode) {
      return;
    }

    if (nextMode === "live") {
      setAudioFile(null);
      setResult(null);
      setResultAudioDurationMs(null);
      setValidationError(null);
      setProcessingState("idle");
      reset();
    } else {
      void stopLiveTranslation();
    }

    setTranslationMode(nextMode);
  };

  const handleTranslate = async () => {
    if (!audioFile) {
      return;
    }

    if (audioFile.durationMs < MIN_AUDIO_DURATION_MS) {
      setValidationError(
        "Please record at least 2 seconds of audio before translating.",
      );
      setResult(null);
      setProcessingState("error");
      return;
    }

    setValidationError(null);
    setResult(null);
    setProcessingState("sending");
    const response = await execute(audioFile);

    if (response) {
      setResult(response);
      setResultAudioDurationMs(audioFile.durationMs);
      setProcessingState("success");
      setHistory((currentHistory) => {
        const nextItem: TranslationHistoryItem = {
          id: `${Date.now()}`,
          result: response,
          audioDurationMs: audioFile.durationMs,
          text: response.text || "No text returned",
          signCount: response.signs.length,
          createdAtLabel: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        return [nextItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
      });
      return;
    }

    setProcessingState("error");
  };

  const handleRetry = () => {
    void handleTranslate();
  };

  const handleRefresh = () => {
    if (translationMode === "standard" && !loading && audioFile) {
      void handleTranslate();
    }
  };

  const handleLivePrimaryAction = () => {
    if (isLiveActive || isPreparing) {
      void stopLiveTranslation();
      return;
    }

    void startLiveTranslation();
  };

  const handleShareResult = async () => {
    if (!result?.text) {
      return;
    }

    try {
      await Share.share({
        message: `SignLink recognized text: ${result.text}`,
      });
    } catch (shareError) {
      console.log("shareResult error", shareError);
    }
  };

  const handleCopyResult = () => {
    if (!result?.text) {
      return;
    }

    void (async () => {
      try {
        await Clipboard.setStringAsync(result.text);
        Alert.alert("Copied", "Recognized text copied to clipboard.");
      } catch (clipboardError) {
        console.log("copyResult error", clipboardError);
        Alert.alert("Copy failed", "Unable to copy the recognized text.");
      }
    })();
  };

  const handleOpenHistoryItem = (item: TranslationHistoryItem) => {
    setAudioFile(null);
    setResult(item.result);
    setResultAudioDurationMs(item.audioDurationMs);
    setValidationError(null);
    setProcessingState("success");
  };

  const handleClearHistory = () => {
    setHistory([]);
    setFavoriteHistoryIds([]);
  };

  const handleToggleHistoryFavorite = (itemId: string) => {
    setFavoriteHistoryIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((id) => id !== itemId)
        : [itemId, ...currentIds],
    );
  };

  const handleDeleteHistoryItem = (itemId: string) => {
    setHistory((currentHistory) =>
      currentHistory.filter((item) => item.id !== itemId),
    );
    setFavoriteHistoryIds((currentIds) =>
      currentIds.filter((id) => id !== itemId),
    );
  };

  const isAudioTooShort =
    audioFile !== null && audioFile.durationMs < MIN_AUDIO_DURATION_MS;

  const statusConfig =
    processingState === "ready"
      ? {
          title: "Audio ready",
          description:
            "The recording is ready to be previewed or sent for translation.",
          accent: "#1D4ED8",
          background: "#DBEAFE",
        }
      : processingState === "sending"
        ? {
            title: "Sending audio",
            description:
              "The recording is being sent to the backend for transcription.",
            accent: "#B45309",
            background: "#FEF3C7",
          }
        : processingState === "success"
          ? {
              title: "Translation complete",
              description: "The recognized text and sign results are ready.",
              accent: "#166534",
              background: "#DCFCE7",
            }
          : processingState === "error"
            ? {
                title: "Action needed",
                description:
                  "Check the message below, adjust the recording if needed, then try again.",
                accent: "#B91C1C",
                background: "#FEE2E2",
              }
            : {
                title: "Tap to start speaking",
                description:
                  "Use the main recording card below to capture one short sentence and begin the translation flow.",
                accent: "#475569",
                background: "#E2E8F0",
              };

  const liveStatusConfig =
    isPreparing
      ? {
          title: "Preparing microphone",
          description: "Requesting access and opening the live translation session.",
          accent: "#B45309",
          background: "#FEF3C7",
        }
      : isLiveActive
        ? {
            title: "Listening live",
            description:
              "The microphone is capturing short chunks and refreshing signs as soon as each chunk returns.",
            accent: "#166534",
            background: "#DCFCE7",
          }
        : transcript
          ? {
              title: "Live session paused",
              description:
                "Your latest live transcript and signs stay on screen until you start another session or clear them.",
              accent: "#1D4ED8",
              background: "#DBEAFE",
            }
          : liveError
            ? {
                title: "Live translation blocked",
                description:
                  "Fix the issue below, then start a new live translation session.",
                accent: "#B91C1C",
                background: "#FEE2E2",
              }
            : {
                title: "Ready for live input",
                description:
                  "Start live mode to capture microphone input continuously and show signs after each short chunk.",
                accent: "#475569",
                background: "#E2E8F0",
              };

  const activeTips = translationMode === "live" ? LIVE_SPEECH_TIPS : SPEECH_TIPS;
  const activeStatusConfig =
    translationMode === "live" ? liveStatusConfig : statusConfig;
  const translationFeedback =
    result && translationMode === "standard"
      ? buildTranslationFeedback({
          audioDurationMs: resultAudioDurationMs,
          result,
        })
      : null;
  const liveLastUpdatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const assistantHints =
    translationMode === "live"
      ? {
          hints: [
            "Speak in short phrases and pause briefly between ideas so the next chunk stays clean.",
            "Watch the live update label to confirm the backend is refreshing signs regularly.",
            "Clear live results between topics when you want a cleaner transcript.",
          ],
          message: isLiveActive
            ? "Live mode is active, so steady pacing will improve the next chunk more than speaking faster."
            : "Live mode works best when you are ready to speak in short, separated thoughts.",
          title: "Live translation works best with steady pacing",
        }
      : {
          hints: [
            "Record at least two seconds so the backend has enough speech to analyze.",
            "Use a quieter space and a short sentence if you want a cleaner sign result.",
            "After each translation, review unclear words before recording again.",
          ],
          message: audioFile
            ? "Your recording is ready. A calm, clearly spoken sentence usually produces the strongest sign output."
            : "The next translation will be easier to judge if you start with one short, natural sentence.",
          title: "A simple sentence will give the clearest result",
        };
  const actionFeedbackSummary: {
    message: string;
    metricLabel: string;
    metricValue: string;
    title: string;
    tone: FeedbackTone;
  } | null =
    translationMode === "standard" && translationFeedback
      ? {
          message:
            (translationFeedback.unclearWords.length ?? 0) > 0
              ? `Review these words before the next try: ${translationFeedback.unclearWords.join(", ")}.`
              : "Your speech came through clearly enough to support a clean text and sign result.",
          metricLabel: "Speech score",
          metricValue: `${translationFeedback.confidencePercent}/100`,
          title:
            translationFeedback.confidencePercent >= 88
              ? "Good pronunciation"
              : translationFeedback.confidencePercent >= 72
                ? "Clear translation"
                : "Try again",
          tone:
            translationFeedback.confidencePercent >= 88
              ? "success"
              : translationFeedback.confidencePercent >= 72
                ? "info"
                : "warning",
        }
      : translationMode === "live" && transcript
        ? {
            message:
              liveSigns.length > 0
                ? "Live chunks are producing sign output. Keep the same speaking rhythm."
                : "Live transcript is updating, but a shorter phrase may produce richer sign output.",
            metricLabel: "Live chunks",
            metricValue: `${segmentsProcessed}`,
            title: liveSigns.length > 0 ? "Live translation is working" : "Keep refining live input",
            tone: liveSigns.length > 0 ? "success" : "info",
          }
        : null;
  const mainActionTitle =
    translationMode === "live" ? "Main action: live session" : "Main action: recording";
  const mainActionDescription =
    translationMode === "live"
      ? "Start one live microphone session, then watch chunks, transcript updates, and signs refresh in place."
      : "Record one clear sentence, review the file summary, then send it for translation when you are ready.";
  const feedbackSectionTitle =
    translationMode === "live" ? "Live feedback" : "Live feedback";
  const feedbackSectionDescription =
    translationMode === "live"
      ? "This area updates with transcript and sign output while the live session is running."
      : "This area shows the speech result, detected words, and generated signs after each translation.";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            onRefresh={handleRefresh}
            refreshing={translationMode === "standard" ? loading : false}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.hero }]}>
          <Text style={styles.title}>Speech to Sign</Text>
          <Text style={styles.subtitle}>
            Choose between one-shot recording and a real-time mode that keeps
            listening and refreshing signs as you speak.
          </Text>
          <Pressable
            accessibilityHint="Opens the built-in sign language learning area"
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
            Translation mode
          </Text>
          <View style={styles.modeToggleRow}>
            {([
              {
                description: "Record once",
                label: "Standard",
                value: "standard",
              },
              {
                description: "Microphone live input",
                label: "Live",
                value: "live",
              },
            ] as const).map((modeOption) => {
              const isSelected = translationMode === modeOption.value;

              return (
                <Pressable
                  key={modeOption.value}
                  accessibilityRole="button"
                  onPress={() => handleModeChange(modeOption.value)}
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

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
            3. Main action
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {mainActionTitle}
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            {mainActionDescription}
          </Text>

          {translationMode === "standard" ? (
            <>
              <AudioRecorder
                disabled={loading}
                isProcessing={loading}
                onRecorded={handleAudioRecorded}
                onReset={() => {
                  setAudioFile(null);
                  setResult(null);
                  setResultAudioDurationMs(null);
                  setValidationError(null);
                  setProcessingState("idle");
                  reset();
                }}
              />

              <View style={styles.actionContainer}>
                {audioFile ? (
                  <View
                    style={[
                      styles.audioSummaryBanner,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.audioSummaryText, { color: colors.text }]}
                    >
                      {shortenFilename(audioFile.name)}
                    </Text>
                    <Text style={[styles.audioSummaryMeta, { color: colors.textMuted }]}>
                      Duration: {formatDurationLabel(audioFile.durationMs)}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  accessibilityHint="Sends the selected audio to the backend for transcription"
                  accessibilityLabel="Translate recorded speech"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: !audioFile || loading || isAudioTooShort,
                  }}
                  disabled={!audioFile || loading || isAudioTooShort}
                  onPress={handleTranslate}
                  style={({ pressed }) => [
                    styles.translateButton,
                    {
                      backgroundColor:
                        !audioFile || loading || isAudioTooShort
                          ? isDark
                            ? "#355E91"
                            : "#98C2FB"
                          : colors.primary,
                    },
                    pressed && audioFile && !loading && styles.translateButtonPressed,
                  ]}
                >
                  <Text style={styles.translateButtonText}>Translate speech</Text>
                </Pressable>

                {audioFile ? (
                  <Text style={styles.translateHelperText}>
                    {isAudioTooShort
                      ? "Record at least 2 seconds before translating."
                      : "Recording looks ready for translation."}
                  </Text>
                ) : null}
              </View>
            </>
          ) : (
            <View
              style={[
                styles.liveControlsCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.liveControlsHeader}>
                <View>
                  <Text style={[styles.liveControlsTitle, { color: colors.text }]}>
                    Real-time translation
                  </Text>
                  <Text
                    style={[
                      styles.liveControlsSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    The app captures short audio chunks and updates signs as soon as
                    each chunk is processed.
                  </Text>
                </View>
                <View
                  style={[
                    styles.liveIndicatorBadge,
                    {
                      backgroundColor: isLiveActive
                        ? colors.successSoft
                        : colors.surfaceMuted,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.liveIndicatorDot,
                      {
                        backgroundColor: isLiveActive
                          ? colors.success
                          : colors.textMuted,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.liveIndicatorText,
                      { color: isLiveActive ? colors.success : colors.textMuted },
                    ]}
                  >
                    {isLiveActive ? "Live" : "Idle"}
                  </Text>
                </View>
              </View>

              <View style={styles.liveStatsRow}>
                <View
                  style={[
                    styles.liveStatCard,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.liveStatValue, { color: colors.text }]}>
                    {segmentsProcessed}
                  </Text>
                  <Text style={[styles.liveStatLabel, { color: colors.textMuted }]}>
                    Chunks done
                  </Text>
                </View>

                <View
                  style={[
                    styles.liveStatCard,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.liveStatValue, { color: colors.text }]}>
                    {formatDurationLabel(
                      isLiveActive ? currentSegmentDurationMs : lastChunkDurationMs ?? 0,
                    )}
                  </Text>
                  <Text style={[styles.liveStatLabel, { color: colors.textMuted }]}>
                    {isLiveActive ? "Current chunk" : "Last chunk"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.liveStatCard,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.liveStatValue, { color: colors.text }]}>
                    {pendingUploads}
                  </Text>
                  <Text style={[styles.liveStatLabel, { color: colors.textMuted }]}>
                    Uploading
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.liveWaveformCard,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                ]}
              >
                <View style={styles.liveWaveformHeader}>
                  <Text style={[styles.liveWaveformTitle, { color: colors.text }]}>
                    Microphone input
                  </Text>
                  <Text
                    style={[styles.liveWaveformLabel, { color: colors.textSecondary }]}
                  >
                    {isLiveActive ? "Real-time amplitude" : "Ready for next session"}
                  </Text>
                </View>

                <LiveWaveform
                  barColor={isLiveActive ? colors.recording : colors.primary}
                  idleColor={colors.primarySoft}
                  isActive={isLiveActive}
                  levels={meteringHistory}
                />
              </View>

              <View style={styles.inlineActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLivePrimaryAction}
                  style={({ pressed }) => [
                    styles.translateButton,
                    styles.livePrimaryButton,
                    {
                      backgroundColor: isLiveActive ? colors.recording : colors.primary,
                    },
                    pressed && styles.translateButtonPressed,
                  ]}
                >
                  <Text style={styles.translateButtonText}>
                    {isLiveActive || isPreparing
                      ? "Stop live translation"
                      : "Start live translation"}
                  </Text>
                </Pressable>

                {(transcript || recentChunks.length > 0) && !isLiveActive ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void resetLiveTranslation();
                    }}
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
                      Clear live results
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={[styles.translateHelperText, styles.liveHelperText]}>
                Keep speaking naturally. Signs appear after each short capture cycle.
              </Text>

              {liveLastUpdatedLabel ? (
                <Text style={[styles.liveUpdateLabel, { color: colors.textMuted }]}>
                  Last update at {liveLastUpdatedLabel}
                </Text>
              ) : null}
            </View>
          )}

          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: isDark ? colors.surface : activeStatusConfig.background,
                borderColor: isDark ? colors.border : activeStatusConfig.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusTitle,
                {
                  color: activeStatusConfig.accent,
                },
              ]}
            >
              {activeStatusConfig.title}
            </Text>
            <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
              {activeStatusConfig.description}
            </Text>
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
            4. Live feedback
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {feedbackSectionTitle}
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            {feedbackSectionDescription}
          </Text>

          {actionFeedbackSummary ? (
            <ActionFeedbackCard
              message={actionFeedbackSummary.message}
              metricLabel={actionFeedbackSummary.metricLabel}
              metricValue={actionFeedbackSummary.metricValue}
              title={actionFeedbackSummary.title}
              tone={actionFeedbackSummary.tone}
            />
          ) : null}

          {translationMode === "standard" && loading ? (
            <TranslatingOverlay />
          ) : null}
          {translationMode === "standard" && validationError ? (
            <ErrorMessage message={validationError} />
          ) : null}
          {translationMode === "standard" && error ? (
            <ErrorMessage message={error.message} onRetry={handleRetry} />
          ) : null}
          {translationMode === "live" && (isPreparing || isTranslating) ? (
            <LoadingIndicator
              label={
                isPreparing
                  ? "Preparing live microphone..."
                  : "Refreshing live signs..."
              }
            />
          ) : null}
          {translationMode === "live" && liveError ? (
            <ErrorMessage message={liveError.message} />
          ) : null}

          {translationMode === "standard" && result ? (
          <View style={styles.resultSection}>
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {resultAudioDurationMs !== null
                    ? formatDurationLabel(resultAudioDurationMs)
                    : "--:--"}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Audio length
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {result.signs.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Signs returned
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {result.text ? result.text.split(/\s+/).filter(Boolean).length : 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Words detected
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.resultLabel, { color: colors.primary }]}>
                AI feedback
              </Text>
              {result.text ? (
                <>
                  <View style={styles.feedbackTopRow}>
                    <View
                      style={[
                        styles.feedbackBadge,
                        {
                          backgroundColor: colors.primarySofter,
                          borderColor: colors.primarySoft,
                        },
                      ]}
                    >
                      <Text style={[styles.feedbackBadgeLabel, { color: colors.textMuted }]}>
                        Confidence
                      </Text>
                      <Text style={[styles.feedbackBadgeValue, { color: colors.primary }]}>
                        {translationFeedback?.confidencePercent ?? 0}%
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.feedbackBadge,
                        {
                          backgroundColor:
                            (translationFeedback?.unclearWords.length ?? 0) > 0
                              ? colors.warningSoft
                              : colors.successSoft,
                          borderColor:
                            (translationFeedback?.unclearWords.length ?? 0) > 0
                              ? colors.warningBorder
                              : colors.successSoft,
                        },
                      ]}
                    >
                      <Text style={[styles.feedbackBadgeLabel, { color: colors.textMuted }]}>
                        Review words
                      </Text>
                      <Text
                        style={[
                          styles.feedbackBadgeValue,
                          {
                            color:
                              (translationFeedback?.unclearWords.length ?? 0) > 0
                                ? colors.warning
                                : colors.success,
                          },
                        ]}
                      >
                        {translationFeedback?.unclearWords.length ?? 0}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.feedbackSectionTitle, { color: colors.text }]}>
                    Detected text
                  </Text>
                  <Text style={[styles.resultText, { color: colors.text }]}>
                    {result.text.split(/(\s+)/).map((part, index) => {
                      const normalizedPart = normalizeWordToken(part);
                      const isUnclear =
                        normalizedPart.length > 0 &&
                        (translationFeedback?.unclearWords ?? []).includes(
                          normalizedPart,
                        );

                      return (
                        <Text
                          key={`${part}-${index}`}
                          style={
                            isUnclear
                              ? [
                                  styles.unclearWordText,
                                  {
                                    backgroundColor: colors.warningSoft,
                                    color: colors.warning,
                                  },
                                ]
                              : undefined
                          }
                        >
                          {part}
                        </Text>
                      );
                    })}
                  </Text>

                  <Text style={[styles.feedbackSectionTitle, { color: colors.text }]}>
                    Unclear words
                  </Text>
                  {(translationFeedback?.unclearWords.length ?? 0) > 0 ? (
                    <View style={styles.feedbackChipRow}>
                      {(translationFeedback?.unclearWords ?? []).map((word) => (
                        <View
                          key={word}
                          style={[
                            styles.feedbackChip,
                            {
                              backgroundColor: colors.warningSoft,
                              borderColor: colors.warningBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.feedbackChipText, { color: colors.warning }]}>
                            {word}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.feedbackPositiveState,
                        {
                          backgroundColor: colors.successSoft,
                          borderColor: colors.successSoft,
                        },
                      ]}
                    >
                      <Text style={[styles.feedbackPositiveText, { color: colors.success }]}>
                        No unclear words were flagged in this translation.
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.feedbackSectionTitle, { color: colors.text }]}>
                    Improvement tips
                  </Text>
                  <View style={styles.feedbackTipsList}>
                    {(translationFeedback?.tips ?? []).map((tip) => (
                      <View key={tip} style={styles.feedbackTipRow}>
                        <View
                          style={[
                            styles.feedbackTipDot,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                        <Text
                          style={[
                            styles.feedbackTipText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {tip}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View
                  style={[
                    styles.emptySignsCard,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.emptySignsTitle, { color: colors.text }]}>
                    No text returned
                  </Text>
                  <Text style={[styles.emptyState, { color: colors.textSecondary }]}>
                    The backend did not return recognized text for this audio.
                  </Text>
                  <Text style={[styles.emptySignsHint, { color: colors.textMuted }]}>
                    Try a clearer sentence, a quieter environment, or a slightly
                    longer recording.
                  </Text>
                </View>
              )}

              {result.text ? (
                <View style={styles.inlineActionsRow}>
                  <Pressable
                    accessibilityHint="Opens the native share sheet with the recognized text"
                    accessibilityLabel="Share recognized text"
                    accessibilityRole="button"
                  onPress={handleShareResult}
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
                    Share text
                  </Text>
                </Pressable>

                  <Pressable
                    accessibilityHint="Copies the recognized text to the device clipboard"
                    accessibilityLabel="Copy recognized text"
                    accessibilityRole="button"
                  onPress={handleCopyResult}
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
                    Copy text
                  </Text>
                </Pressable>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.resultLabel, { color: colors.primary }]}>
                Generated signs
              </Text>
              {result.signs.length > 0 ? (
                <SignSequencePlayer
                  glossText={result.text}
                  signs={result.signs}
                />
              ) : (
                <View
                  style={[
                    styles.emptySignsCard,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.emptySignsTitle, { color: colors.text }]}>
                    No sign visuals returned
                  </Text>
                  <Text style={[styles.emptyState, { color: colors.textSecondary }]}>
                    The backend returned text, but no sign images or videos for
                    this sentence.
                  </Text>
                  <Text style={[styles.emptySignsHint, { color: colors.textMuted }]}>
                    You can still use the recognized text above, or try another
                    sentence to get a richer sign result.
                  </Text>
                  <Pressable
                    accessibilityHint="Opens the built-in A to Z sign guide when the backend has no visuals"
                    accessibilityLabel="Open A to Z guide"
                    accessibilityRole="button"
                    onPress={() => navigation.navigate("DemoSigns")}
                    style={({ pressed }) => [
                      styles.inlineActionButton,
                      styles.emptySignsButton,
                      {
                        backgroundColor: colors.primarySofter,
                        borderColor: colors.primarySoft,
                      },
                      pressed && styles.inlineActionButtonPressed,
                    ]}
                  >
                    <Text style={[styles.inlineActionButtonText, { color: colors.primary }]}>
                      Open A-Z guide
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ) : null}

          {translationMode === "live" ? (
          <View style={styles.resultSection}>
            <View style={styles.summaryRow}>
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {segmentsProcessed}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Chunks processed
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {liveSigns.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Signs on screen
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.summaryValue, { color: colors.text }]}>
                  {transcript ? transcript.split(/\s+/).filter(Boolean).length : 0}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                  Live words
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.resultLabel, { color: colors.primary }]}>
                Live transcript
              </Text>
              {transcript ? (
                <Text style={[styles.resultText, { color: colors.text }]}>
                  {transcript}
                </Text>
              ) : (
                <View
                  style={[
                    styles.emptySignsCard,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.emptySignsTitle, { color: colors.text }]}>
                    Waiting for the first live chunk
                  </Text>
                  <Text style={[styles.emptyState, { color: colors.textSecondary }]}>
                    Start live translation and speak a short phrase. The transcript
                    will grow as each chunk is processed.
                  </Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.resultLabel, { color: colors.primary }]}>
                Live signs
              </Text>
              {liveSigns.length > 0 ? (
                <SignSequencePlayer signs={liveSigns} />
              ) : (
                <View
                  style={[
                    styles.emptySignsCard,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.emptySignsTitle, { color: colors.text }]}>
                    Signs will appear here instantly
                  </Text>
                  <Text style={[styles.emptyState, { color: colors.textSecondary }]}>
                    Once the first live audio chunk is translated, the returned
                    sign visuals will be added to this strip automatically.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
            5. Secondary info
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Tips and history
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Supporting guidance, saved sessions, and learning shortcuts stay below the main action and feedback areas.
          </Text>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              {translationMode === "live"
                ? "Before you go live"
                : "Before you translate"}
            </Text>
            <View style={styles.infoList}>
              {activeTips.map((tip) => (
                <View key={tip} style={styles.infoRow}>
                  <View style={[styles.infoDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <AssistantHintsCard
            hints={assistantHints.hints}
            message={assistantHints.message}
            title={assistantHints.title}
          />

          {translationMode === "standard" && history.length > 0 ? (
            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.historyHeader}>
                <Text style={[styles.resultLabel, { color: colors.primary }]}>
                  Recent translations
                </Text>
                <Pressable
                  accessibilityHint="Clears the saved list of recent translations"
                  accessibilityLabel="Clear recent translations"
                  accessibilityRole="button"
                  onPress={handleClearHistory}
                  style={({ pressed }) => [
                    styles.historyClearButton,
                    { backgroundColor: colors.primarySofter },
                    pressed && styles.inlineActionButtonPressed,
                  ]}
                >
                  <Text style={[styles.historyClearButtonText, { color: colors.primary }]}>
                    Clear
                  </Text>
                </Pressable>
              </View>

              {history.map((item) => (
                <TranslationHistorySwipeItem
                  confidencePercent={
                    buildTranslationFeedback({
                      audioDurationMs: item.audioDurationMs,
                      result: item.result,
                    }).confidencePercent
                  }
                  createdAtLabel={item.createdAtLabel}
                  durationLabel={formatDurationLabel(item.audioDurationMs)}
                  isFavorite={favoriteHistoryIds.includes(item.id)}
                  key={item.id}
                  onDelete={() => handleDeleteHistoryItem(item.id)}
                  onOpen={() => handleOpenHistoryItem(item)}
                  onToggleFavorite={() => handleToggleHistoryFavorite(item.id)}
                  signCount={item.signCount}
                  text={item.text}
                />
              ))}
            </View>
          ) : null}

          {translationMode === "live" && recentChunks.length > 0 ? (
            <View
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.resultLabel, { color: colors.primary }]}>
                Recent live chunks
              </Text>
              {recentChunks.map((chunk) => (
                <View
                  key={chunk.id}
                  style={[
                    styles.liveChunkRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.historyContent}>
                    <Text
                      numberOfLines={2}
                      style={[styles.historyText, { color: colors.text }]}
                    >
                      {chunk.text}
                    </Text>
                    <Text style={[styles.historyMeta, { color: colors.textMuted }]}>
                      {chunk.signCount} sign{chunk.signCount > 1 ? "s" : ""} ·{" "}
                      {formatDurationLabel(chunk.durationMs)} · {chunk.createdAtLabel}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={[styles.learningCard, { backgroundColor: colors.hero }]}>
            <Text style={styles.learningCardTitle}>Need help understanding signs?</Text>
            <Text style={styles.learningCardText}>
              Open the learning hub to study the alphabet, save letters, and mark
              what you already know.
            </Text>
            <Pressable
              accessibilityHint="Opens the sign language learning screen"
              accessibilityRole="button"
              onPress={() => navigation.navigate("DemoSigns")}
              style={({ pressed }) => [
                styles.learningCardButton,
                { backgroundColor: colors.surface },
                pressed && styles.inlineActionButtonPressed,
              ]}
            >
              <Text style={[styles.learningCardButtonText, { color: colors.text }]}>
                Go to learning hub
              </Text>
            </Pressable>
          </View>
        </View>
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
    gap: 16,
    padding: 18,
    paddingBottom: 28,
  },
  sectionBlock: {
    gap: 14,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#10233B",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  sectionDescription: {
    color: "#5E6F80",
    fontSize: 14,
    lineHeight: 20,
  },
  header: {
    backgroundColor: "#0F2138",
    borderRadius: 32,
    padding: 22,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: "#D0DCE8",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: "84%",
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
    marginTop: 14,
  },
  modeToggleButton: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
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
  infoList: {
    gap: 10,
    marginTop: 12,
  },
  infoRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  infoDot: {
    backgroundColor: "#1B6EF3",
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
  actionContainer: {
    alignItems: "center",
  },
  liveControlsCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  liveControlsHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  liveControlsTitle: {
    color: "#10233B",
    fontSize: 18,
    fontWeight: "800",
  },
  liveControlsSubtitle: {
    color: "#5E6F80",
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  liveIndicatorBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    height: 34,
    paddingHorizontal: 12,
  },
  liveIndicatorDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  liveIndicatorText: {
    color: "#18744E",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  liveStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  liveWaveformCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  liveWaveformHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  liveWaveformTitle: {
    color: "#10233B",
    fontSize: 14,
    fontWeight: "700",
  },
  liveWaveformLabel: {
    color: "#6C7C8C",
    fontSize: 12,
    fontWeight: "600",
  },
  liveStatCard: {
    backgroundColor: "#FAF6EF",
    borderColor: "#E6DED1",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  liveStatValue: {
    color: "#10233B",
    fontSize: 17,
    fontWeight: "800",
  },
  liveStatLabel: {
    color: "#6C7C8C",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    textTransform: "uppercase",
  },
  audioSummaryBanner: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    padding: 13,
    width: "100%",
  },
  audioSummaryText: {
    color: "#10233B",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  audioSummaryMeta: {
    color: "#6B7B8B",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 6,
  },
  translateHelperText: {
    color: "#6B7B8B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    minHeight: 18,
    textAlign: "center",
  },
  translateButton: {
    alignItems: "center",
    backgroundColor: "#1B6EF3",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    width: "100%",
  },
  livePrimaryButton: {
    flexGrow: 1,
    width: "auto",
  },
  translateButtonDisabled: {
    backgroundColor: "#98C2FB",
  },
  translateButtonPressed: {
    opacity: 0.84,
  },
  translateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  liveHelperText: {
    minHeight: 0,
    textAlign: "left",
  },
  liveUpdateLabel: {
    color: "#6C7C8C",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
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
  resultSection: {
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  summaryValue: {
    color: "#10233B",
    fontSize: 18,
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
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  resultLabel: {
    color: "#1B6EF3",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  resultText: {
    color: "#10233B",
    fontSize: 16,
    lineHeight: 24,
  },
  feedbackTopRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  feedbackBadge: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  feedbackBadgeLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  feedbackBadgeValue: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  feedbackSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 18,
  },
  unclearWordText: {
    borderRadius: 6,
    fontWeight: "700",
  },
  feedbackChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feedbackChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  feedbackChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  feedbackPositiveState: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  feedbackPositiveText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  feedbackTipsList: {
    gap: 10,
  },
  feedbackTipRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  feedbackTipDot: {
    borderRadius: 999,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  feedbackTipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  inlineActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
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
  emptyState: {
    color: "#6C7C8C",
    fontSize: 15,
    lineHeight: 22,
  },
  emptySignsCard: {
    backgroundColor: "#FAF6EF",
    borderColor: "#E6DED1",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  emptySignsTitle: {
    color: "#10233B",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySignsHint: {
    color: "#58697A",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  emptySignsButton: {
    marginTop: 14,
  },
  historyHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyClearButton: {
    backgroundColor: "#EEF5FF",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  historyClearButtonText: {
    color: "#1B6EF3",
    fontSize: 13,
    fontWeight: "700",
  },
  historyRow: {
    borderTopColor: "#EEE7DB",
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  historyRowPressed: {
    opacity: 0.82,
  },
  historyContent: {
    gap: 6,
  },
  historyTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  historyText: {
    color: "#10233B",
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  historyMeta: {
    color: "#6C7C8C",
    fontSize: 13,
    fontWeight: "500",
  },
  historyFavoriteBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyFavoriteBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  historyActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  historyActionButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  historyActionButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  liveChunkRow: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  learningCard: {
    backgroundColor: "#10233B",
    borderRadius: 28,
    padding: 20,
  },
  learningCardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  learningCardText: {
    color: "#D2DCE7",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  learningCardButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  learningCardButtonText: {
    color: "#10233B",
    fontSize: 13,
    fontWeight: "800",
  },
});
