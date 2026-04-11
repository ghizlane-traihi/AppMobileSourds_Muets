import { useEffect, useState } from "react";
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";

import { AudioRecorderResult, ApiErrorShape } from "../types";
import { buildUploadAsset } from "../services/api";
import {
  buildDefaultWaveformLevels,
  normalizeMetering,
  WAVEFORM_BAR_COUNT,
} from "../utils/audioVisualization";

const DEFAULT_RECORDING_MIME_TYPE = "audio/m4a";

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [meteringHistory, setMeteringHistory] = useState<number[]>(
    buildDefaultWaveformLevels,
  );
  const [recordingResult, setRecordingResult] =
    useState<AudioRecorderResult | null>(null);
  const [error, setError] = useState<ApiErrorShape | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => undefined);
      }

      if (sound) {
        void sound.unloadAsync().catch(() => undefined);
      }
    };
  }, [recording, sound]);

  const requestMicrophonePermission = async () => {
    const permission = await Audio.requestPermissionsAsync();

    if (!permission.granted) {
      const permissionError = {
        message:
          "Microphone permission is required to record speech for translation.",
      };

      setError(permissionError);

      return false;
    }

    return true;
  };

  const startRecording = async () => {
    setError(null);
    setRecordingResult(null);
    setDurationMs(0);
    setMeteringHistory(buildDefaultWaveformLevels());

    const hasPermission = await requestMicrophonePermission();

    if (!hasPermission) {
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      playThroughEarpieceAndroid: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
    });

    const nextRecording = new Audio.Recording();
    const highQualityRecordingOptions =
      Audio.RecordingOptionsPresets.HIGH_QUALITY!;

    nextRecording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording) {
        setDurationMs(status.durationMillis ?? 0);
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
          isMeteringEnabled: true,
          ios: highQualityRecordingOptions.ios!,
          web: highQualityRecordingOptions.web,
        },
      );
      await nextRecording.startAsync();
      setRecording(nextRecording);
      setIsRecording(true);
    } catch (caughtError) {
      setError({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to start recording.",
      });
      setMeteringHistory(buildDefaultWaveformLevels());
      setRecording(null);
      setIsRecording(false);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      return null;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      if (!uri) {
        throw new Error("The recording file could not be saved.");
      }

      const result: AudioRecorderResult = {
        ...buildUploadAsset(uri, DEFAULT_RECORDING_MIME_TYPE, "speech.m4a"),
        durationMs,
      };

      setRecordingResult(result);
      setRecording(null);
      setIsRecording(false);

      return result;
    } catch (caughtError) {
      setError({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to stop recording.",
      });
      setRecording(null);
      setIsRecording(false);
      return null;
    }
  };

  const playRecording = async () => {
    if (!recordingResult?.uri) {
      return;
    }

    setError(null);
    setIsPlaying(false);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: nextSound } = await Audio.Sound.createAsync(
        { uri: recordingResult.uri },
        { shouldPlay: true },
      );

      nextSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) {
          if ("error" in status && status.error) {
            setError({
              message: status.error,
            });
          }

          setIsPlaying(false);
          return;
        }

        if (status.didJustFinish) {
          setIsPlaying(false);
          void nextSound.unloadAsync().catch(() => undefined);
          setSound(null);
          return;
        }

        setIsPlaying(status.isPlaying);
      });

      setSound(nextSound);
      setIsPlaying(true);
    } catch (caughtError) {
      if (sound) {
        await sound.unloadAsync().catch(() => undefined);
        setSound(null);
      }

      setError({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to play the recording.",
      });
      setIsPlaying(false);
    }
  };

  const stopPlayback = async () => {
    if (!sound) {
      setIsPlaying(false);
      return;
    }

    try {
      const status = await sound.getStatusAsync();

      if (status.isLoaded) {
        await sound.stopAsync();
      }

      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    } catch (caughtError) {
      setError({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to stop playback.",
      });
    }
  };

  const resetRecording = () => {
    if (sound) {
      void sound.unloadAsync().catch(() => undefined);
      setSound(null);
    }

    setIsPlaying(false);
    setRecordingResult(null);
    setDurationMs(0);
    setMeteringHistory(buildDefaultWaveformLevels());
    setError(null);
  };

  return {
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    resetRecording,
    requestMicrophonePermission,
    isRecording,
    isPlaying,
    durationMs,
    meteringHistory,
    recordingResult,
    error,
  };
};
