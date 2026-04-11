import AsyncStorage from "@react-native-async-storage/async-storage";

import { LAST_ACTIVITY_STORAGE_KEY } from "../constants/storage";
import { RootStackParamList } from "../types";

export type ResumeActivityRoute = "DemoSigns" | "SignToSpeech" | "SpeechToSign";

export type ResumeActivity = {
  params?: RootStackParamList[ResumeActivityRoute];
  route: ResumeActivityRoute;
  subtitle: string;
  title: string;
  updatedAt: number;
};

const isResumeRoute = (value: unknown): value is ResumeActivityRoute =>
  value === "DemoSigns" || value === "SignToSpeech" || value === "SpeechToSign";

const normalizeResumeActivity = (value: unknown): ResumeActivity | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ResumeActivity>;

  if (!isResumeRoute(candidate.route)) {
    return null;
  }

  if (
    typeof candidate.title !== "string" ||
    candidate.title.trim().length === 0 ||
    typeof candidate.subtitle !== "string" ||
    candidate.subtitle.trim().length === 0
  ) {
    return null;
  }

  return {
    params:
      candidate.params && typeof candidate.params === "object"
        ? candidate.params
        : undefined,
    route: candidate.route,
    subtitle: candidate.subtitle.trim(),
    title: candidate.title.trim(),
    updatedAt:
      typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt)
        ? candidate.updatedAt
        : Date.now(),
  };
};

export const loadResumeActivity = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(LAST_ACTIVITY_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return normalizeResumeActivity(JSON.parse(rawValue));
  } catch (storageError) {
    console.log("load resume activity error", storageError);
    return null;
  }
};

export const saveResumeActivity = async (
  activity: Omit<ResumeActivity, "updatedAt"> & { updatedAt?: number },
) => {
  const nextActivity: ResumeActivity = {
    ...activity,
    updatedAt: activity.updatedAt ?? Date.now(),
  };

  try {
    await AsyncStorage.setItem(
      LAST_ACTIVITY_STORAGE_KEY,
      JSON.stringify(nextActivity),
    );
  } catch (storageError) {
    console.log("save resume activity error", storageError);
  }
};
