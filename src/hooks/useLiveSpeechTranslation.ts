import { useEffect, useRef, useState } from "react";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";

import {
  buildUploadAsset,
  normalizeApiError,
  speechToText,
} from "../services/api";
import { ApiErrorShape, SignAsset } from "../types";
import {
  buildDefaultWaveformLevels,
  normalizeMetering,
  WAVEFORM_BAR_COUNT,
} from "../utils/audioVisualization";

const LIVE_SEGMENT_DURATION_MS = 2800;
const MIN_SEGMENT_DURATION_MS = 900;
const MAX_RECENT_CHUNKS = 6;
const MAX_LIVE_SIGNS = 12;
const DEFAULT_RECORDING_MIME_TYPE = "audio/m4a";

const mergeTranscript = (currentText: string, nextText: string) => {
  const normalizedNextText = nextText.trim();

  if (!normalizedNextText) {
    return currentText;
  }

  if (!currentText) {
    return normalizedNextText;
  }

  if (
    currentText.toLocaleLowerCase().endsWith(normalizedNextText.toLocaleLowerCase())
  ) {
    return currentText;
  }

  return `${currentText} ${normalizedNextText}`.trim();
};

const mergeSigns = (currentSigns: SignAsset[], nextSigns: SignAsset[]) => {
  const uniqueSigns = new Map<string, SignAsset>();

  [...currentSigns, ...nextSigns].forEach((sign) => {
    const signKey = `${sign.label.toLocaleLowerCase()}::${sign.uri}`;

    if (!uniqueSigns.has(signKey)) {
      uniqueSigns.set(signKey, sign);
    }
  });

  return Array.from(uniqueSigns.values()).slice(-MAX_LIVE_SIGNS);
};

export type LiveTranscriptChunk = {
  id: string;
  text: string;
  durationMs: number;
  signCount: number;
  createdAtLabel: string;
};

export const useLiveSpeechTranslation = () => {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [currentSegmentDurationMs, setCurrentSegmentDurationMs] = useState(0);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [signs, setSigns] = useState<SignAsset[]>([]);
  const [meteringHistory, setMeteringHistory] = useState<number[]>(
    buildDefaultWaveformLevels,
  );
  const [recentChunks, setRecentChunks] = useState<LiveTranscriptChunk[]>([]);
  const [segmentsProcessed, setSegmentsProcessed] = useState(0);
  const [lastChunkDurationMs, setLastChunkDurationMs] = useState<number | null>(
    null,
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<ApiErrorShape | null>(null);

  const mountedRef = useRef(true);
  const sessionTokenRef = useRef(0);
  const isLiveActiveRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const rolloverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFinalizingSegmentRef = useRef(false);
  const currentSegmentDurationMsRef = useRef(0);

  const clearRolloverTimeout = () => {
    if (rolloverTimeoutRef.current) {
      clearTimeout(rolloverTimeoutRef.current);
      rolloverTimeoutRef.current = null;
    }
  };

  const releaseAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (caughtError) {
      console.log("release live audio mode error", caughtError);
    }
  };

  const updateSegmentDuration = (durationMs: number) => {
    currentSegmentDurationMsRef.current = durationMs;
    setCurrentSegmentDurationMs(durationMs);
  };

  const uploadSegment = async (uri: string, durationMs: number, token: number) => {
    if (durationMs < MIN_SEGMENT_DURATION_MS) {
      return;
    }

    setPendingUploads((currentCount) => currentCount + 1);

    try {
      const response = await speechToText(
        buildUploadAsset(
          uri,
          DEFAULT_RECORDING_MIME_TYPE,
          `live-segment-${Date.now()}.m4a`,
        ),
      );

      if (!mountedRef.current || token !== sessionTokenRef.current) {
        return;
      }

      setTranscript((currentTranscript) =>
        mergeTranscript(currentTranscript, response.text),
      );
      setSigns((currentSigns) => mergeSigns(currentSigns, response.signs));
      setLastChunkDurationMs(durationMs);
      setLastUpdatedAt(Date.now());
      setSegmentsProcessed((currentValue) => currentValue + 1);
      setRecentChunks((currentChunks) => {
        const nextText = response.text.trim() || "Speech detected";

        return [
          {
            id: `${Date.now()}-${currentChunks.length}`,
            text: nextText,
            durationMs,
            signCount: response.signs.length,
            createdAtLabel: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          ...currentChunks,
        ].slice(0, MAX_RECENT_CHUNKS);
      });
      setError(null);
    } catch (caughtError) {
      if (!mountedRef.current || token !== sessionTokenRef.current) {
        return;
      }

      setError(normalizeApiError(caughtError));
    } finally {
      if (!mountedRef.current || token !== sessionTokenRef.current) {
        return;
      }

      setPendingUploads((currentCount) => Math.max(0, currentCount - 1));
    }
  };

  const beginSegment = async (token: number) => {
    if (
      !mountedRef.current ||
      token !== sessionTokenRef.current ||
      !isLiveActiveRef.current ||
      recordingRef.current ||
      isFinalizingSegmentRef.current
    ) {
      return;
    }

    const nextRecording = new Audio.Recording();
    const highQualityRecordingOptions =
      Audio.RecordingOptionsPresets.HIGH_QUALITY!;

    nextRecording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording) {
        updateSegmentDuration(status.durationMillis ?? 0);
        const metering = status.metering;

        if (typeof metering === "number") {
          setMeteringHistory((currentHistory) => [
            ...currentHistory.slice(-(WAVEFORM_BAR_COUNT - 1)),
            normalizeMetering(metering),
          ]);
        }
      }
    });
    nextRecording.setProgressUpdateInterval(80);

    try {
      await nextRecording.prepareToRecordAsync(
        {
          android: highQualityRecordingOptions.android!,
          ios: highQualityRecordingOptions.ios!,
          web: highQualityRecordingOptions.web,
          isMeteringEnabled: true,
        },
      );
      await nextRecording.startAsync();

      if (
        !mountedRef.current ||
        token !== sessionTokenRef.current ||
        !isLiveActiveRef.current
      ) {
        await nextRecording.stopAndUnloadAsync().catch(() => undefined);
        return;
      }

      recordingRef.current = nextRecording;
      updateSegmentDuration(0);
      clearRolloverTimeout();
      rolloverTimeoutRef.current = setTimeout(() => {
        void finalizeSegment(true, token);
      }, LIVE_SEGMENT_DURATION_MS);
    } catch (caughtError) {
      if (!mountedRef.current || token !== sessionTokenRef.current) {
        return;
      }

      setError(normalizeApiError(caughtError));
      setIsLiveActive(false);
      isLiveActiveRef.current = false;
      setMeteringHistory(buildDefaultWaveformLevels());
      await releaseAudioMode();
    } finally {
      if (mountedRef.current && token === sessionTokenRef.current) {
        setIsPreparing(false);
      }
    }
  };

  const finalizeSegment = async (continueSession: boolean, token: number) => {
    if (isFinalizingSegmentRef.current) {
      return;
    }

    const activeRecording = recordingRef.current;

    if (!activeRecording) {
      if (continueSession && mountedRef.current && token === sessionTokenRef.current) {
        await beginSegment(token);
      }

      return;
    }

    isFinalizingSegmentRef.current = true;
    recordingRef.current = null;
    clearRolloverTimeout();

    const durationMs = currentSegmentDurationMsRef.current;
    let recordingUri: string | null = null;

    try {
      await activeRecording.stopAndUnloadAsync();
      recordingUri = activeRecording.getURI();
    } catch (caughtError) {
      if (mountedRef.current && token === sessionTokenRef.current) {
        setError(normalizeApiError(caughtError));
      }
    } finally {
      updateSegmentDuration(0);
      isFinalizingSegmentRef.current = false;
    }

    if (
      continueSession &&
      mountedRef.current &&
      token === sessionTokenRef.current &&
      isLiveActiveRef.current
    ) {
      void beginSegment(token);
    }

    if (recordingUri) {
      void uploadSegment(recordingUri, durationMs, token);
    }
  };

  const startLiveTranslation = async () => {
    if (isLiveActiveRef.current || isPreparing) {
      return;
    }

    sessionTokenRef.current += 1;
    const token = sessionTokenRef.current;

    setError(null);
    setTranscript("");
    setSigns([]);
    setRecentChunks([]);
    setSegmentsProcessed(0);
    setLastChunkDurationMs(null);
    setLastUpdatedAt(null);
    setPendingUploads(0);
    setMeteringHistory(buildDefaultWaveformLevels());
    updateSegmentDuration(0);
    setIsPreparing(true);
    setIsLiveActive(true);
    isLiveActiveRef.current = true;

    const permission = await Audio.requestPermissionsAsync();

    if (!permission.granted) {
      if (mountedRef.current && token === sessionTokenRef.current) {
        setError({
          message:
            "Microphone permission is required to start live speech translation.",
        });
        setIsPreparing(false);
        setIsLiveActive(false);
        isLiveActiveRef.current = false;
      }

      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playThroughEarpieceAndroid: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });
    } catch (caughtError) {
      if (mountedRef.current && token === sessionTokenRef.current) {
        setError(normalizeApiError(caughtError));
        setIsPreparing(false);
        setIsLiveActive(false);
        isLiveActiveRef.current = false;
      }

      return;
    }

    await beginSegment(token);
  };

  const stopLiveTranslation = async () => {
    const token = sessionTokenRef.current;

    setIsLiveActive(false);
    isLiveActiveRef.current = false;
    clearRolloverTimeout();
    await finalizeSegment(false, token);
    setMeteringHistory(buildDefaultWaveformLevels());
    await releaseAudioMode();
  };

  const resetLiveTranslation = async () => {
    sessionTokenRef.current += 1;
    setIsLiveActive(false);
    isLiveActiveRef.current = false;
    clearRolloverTimeout();

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (caughtError) {
        console.log("reset live recording error", caughtError);
      }

      recordingRef.current = null;
    }

    await releaseAudioMode();
    updateSegmentDuration(0);
    setPendingUploads(0);
    setTranscript("");
    setSigns([]);
    setRecentChunks([]);
    setSegmentsProcessed(0);
    setLastChunkDurationMs(null);
    setLastUpdatedAt(null);
    setMeteringHistory(buildDefaultWaveformLevels());
    setError(null);
    setIsPreparing(false);
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearRolloverTimeout();
      isLiveActiveRef.current = false;

      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        recordingRef.current = null;
      }

      void releaseAudioMode();
    };
  }, []);

  return {
    currentSegmentDurationMs,
    error,
    isLiveActive,
    isPreparing,
    isTranslating: pendingUploads > 0,
    lastChunkDurationMs,
    lastUpdatedAt,
    meteringHistory,
    pendingUploads,
    recentChunks,
    resetLiveTranslation,
    segmentsProcessed,
    signs,
    startLiveTranslation,
    stopLiveTranslation,
    transcript,
  };
};
