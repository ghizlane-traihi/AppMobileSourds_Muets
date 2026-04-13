import axios, { AxiosError } from "axios";

import {
  ApiErrorShape,
  SignAsset,
  SignRecognitionResponse,
  SpeechToTextResponse,
  TextToSpeechResponse,
  UploadAsset,
} from "../types";

const API_TIMEOUT_MS = 30000;
const FALLBACK_API_URL = "http://localhost:8000";
const LOCALHOST_API_URL = "http://localhost:8000";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL?.trim() || FALLBACK_API_URL,
);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
  },
});

const createApiClient = (baseURL: string) =>
  axios.create({
    baseURL,
    timeout: API_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
    },
  });

const getFilenameFromUri = (uri: string, fallback: string) =>
  uri.split("/").pop()?.trim() || fallback;

const inferSignType = (uri: string): "image" | "video" => {
  if (/\.(mp4|mov|m4v|webm)$/i.test(uri)) {
    return "video";
  }

  return "image";
};

const toAbsoluteUrl = (uri: string) => {
  if (!uri) {
    return uri;
  }

  if (/^(https?:\/\/|file:\/\/)/i.test(uri)) {
    return uri;
  }

  return `${API_BASE_URL}${uri.startsWith("/") ? uri : `/${uri}`}`;
};

const normalizeSigns = (payload: unknown): SignAsset[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item, index) => {
      if (typeof item === "string") {
        const normalizedUri = toAbsoluteUrl(item);

        return {
          id: `sign-${index}`,
          label: `Sign ${index + 1}`,
          uri: normalizedUri,
          type: inferSignType(normalizedUri),
        };
      }

      if (typeof item === "object" && item !== null) {
        const candidate = item as Record<string, unknown>;
        const rawUri =
          typeof candidate.uri === "string"
            ? candidate.uri
            : typeof candidate.url === "string"
              ? candidate.url
              : typeof candidate.path === "string"
                ? candidate.path
                : "";

        if (!rawUri) {
          return null;
        }

        const normalizedUri = toAbsoluteUrl(rawUri);
        const typeCandidate =
          candidate.type === "video" || candidate.type === "image"
            ? candidate.type
            : inferSignType(normalizedUri);

        return {
          id:
            typeof candidate.id === "string"
              ? candidate.id
              : `sign-${index}-${normalizedUri}`,
          label:
            typeof candidate.label === "string"
              ? candidate.label
              : typeof candidate.name === "string"
                ? candidate.name
                : `Sign ${index + 1}`,
          uri: normalizedUri,
          type: typeCandidate,
          thumbnailUri:
            typeof candidate.thumbnailUri === "string"
              ? toAbsoluteUrl(candidate.thumbnailUri)
              : typeof candidate.thumbnail_url === "string"
                ? toAbsoluteUrl(candidate.thumbnail_url)
                : undefined,
        };
      }

      return null;
    })
    .filter((item): item is SignAsset => item !== null);
};

const normalizeConfidence = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  if (value > 1) {
    return Math.max(0, Math.min(1, value / 100));
  }

  return Math.max(0, Math.min(1, value));
};

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildMultipartPayload = (fieldName: string, file: UploadAsset) => {
  const formData = new FormData();

  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  return formData;
};

const shouldRetryWithLocalhost = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    !error.response &&
    (message.includes("timeout") ||
      message.includes("network error") ||
      message.includes("network request failed") ||
      error.code === "ECONNABORTED")
  );
};

const postWithFallback = async <TResponse>(
  path: string,
  payload: unknown,
): Promise<TResponse> => {
  try {
    const response = await apiClient.post<TResponse>(path, payload);
    return response.data;
  } catch (error) {
    if (
      API_BASE_URL !== LOCALHOST_API_URL &&
      shouldRetryWithLocalhost(error)
    ) {
      console.log(
        `Retrying ${path} with localhost fallback after network error`,
      );
      const localhostClient = createApiClient(LOCALHOST_API_URL);
      const response = await localhostClient.post<TResponse>(path, payload);
      return response.data;
    }

    throw error;
  }
};

export const normalizeApiError = (error: unknown): ApiErrorShape => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Record<string, unknown>>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    const detail =
      typeof responseData?.detail === "string"
        ? responseData.detail
        : typeof responseData?.message === "string"
          ? responseData.message
          : undefined;

    return {
      message:
        detail ||
        axiosError.message ||
        "The request failed. Please try again.",
      status,
      details: status ? `HTTP ${status}` : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "An unexpected error occurred.",
  };
};

export const speechToText = async (
  audioFile: UploadAsset,
): Promise<SpeechToTextResponse> => {
  const responseData = await postWithFallback<Record<string, unknown>>(
    "/speech/to-text",
    buildMultipartPayload("file", audioFile),
  );

  console.log("speechToText response", responseData);

  return {
    confidence: normalizeConfidence(
      responseData?.confidence ?? responseData?.confidence_score,
    ),
    feedbackTips: normalizeStringArray(
      responseData?.tips ?? responseData?.feedback_tips,
    ),
    text: typeof responseData?.text === "string" ? responseData.text : "",
    signs: normalizeSigns(responseData?.signs),
    unclearWords: normalizeStringArray(
      responseData?.unclear_words ?? responseData?.unclearWords,
    ),
  };
};

export const recognizeSign = async (
  videoFile: UploadAsset,
): Promise<SignRecognitionResponse> => {
  const responseData = await postWithFallback<Record<string, unknown>>(
    "/sign/recognize",
    buildMultipartPayload("file", videoFile),
  );

  console.log("recognizeSign response", responseData);

  return {
    text: typeof responseData?.text === "string" ? responseData.text : "",
    audio_url:
      typeof responseData?.audio_url === "string"
        ? toAbsoluteUrl(responseData.audio_url)
        : "",
    confidence:
      typeof responseData?.confidence === "number"
        ? responseData.confidence
        : undefined,
  };
};

export const textToSpeech = async (
  text: string,
): Promise<TextToSpeechResponse> => {
  const responseData = await postWithFallback<Record<string, unknown>>(
    "/tts/synthesize",
    {
      text,
    },
  );

  console.log("textToSpeech response", responseData);

  return {
    text: typeof responseData?.text === "string" ? responseData.text : text,
    audio_url:
      typeof responseData?.audio_url === "string"
        ? toAbsoluteUrl(responseData.audio_url)
        : "",
  };
};

export const getApiBaseUrl = () => API_BASE_URL;

export const buildUploadAsset = (
  uri: string,
  mimeType: string,
  fallbackName: string,
): UploadAsset => ({
  uri,
  type: mimeType,
  name: getFilenameFromUri(uri, fallbackName),
});
