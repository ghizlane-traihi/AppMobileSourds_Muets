import AsyncStorage from "@react-native-async-storage/async-storage";

import { GAMIFICATION_STORAGE_KEY } from "../constants/storage";

export type BadgeId = "beginner" | "intermediate";

export type BadgeDefinition = {
  description: string;
  id: BadgeId;
  label: string;
  pointsRequired: number;
};

export type DailyChallenge = {
  completedAt: string | null;
  dateKey: string;
  progressCount: number;
  rewarded: boolean;
  rewardPoints: number;
  targetCount: number;
  taskLabel: string;
};

export type GamificationState = {
  badges: BadgeId[];
  dailyChallenge: DailyChallenge;
  lastActivityDate: string | null;
  longestStreak: number;
  points: number;
  rewardedLearnedSignIds: string[];
  streak: number;
};

export type GamificationReward = {
  learnedSignId?: string;
  points: number;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    description: "Unlocked after earning 100 points.",
    id: "beginner",
    label: "Beginner",
    pointsRequired: 100,
  },
  {
    description: "Unlocked after earning 250 points.",
    id: "intermediate",
    label: "Intermediate",
    pointsRequired: 250,
  },
];

const DAILY_CHALLENGE_TARGET = 3;
const DAILY_CHALLENGE_REWARD_POINTS = 30;

const buildDailyChallenge = (dateKey: string): DailyChallenge => ({
  completedAt: null,
  dateKey,
  progressCount: 0,
  rewarded: false,
  rewardPoints: DAILY_CHALLENGE_REWARD_POINTS,
  targetCount: DAILY_CHALLENGE_TARGET,
  taskLabel: `Learn ${DAILY_CHALLENGE_TARGET} letters`,
});

export const DEFAULT_GAMIFICATION_STATE: GamificationState = {
  badges: [],
  dailyChallenge: buildDailyChallenge("1970-01-01"),
  lastActivityDate: null,
  longestStreak: 0,
  points: 0,
  rewardedLearnedSignIds: [],
  streak: 0,
};

const normalizeBadgeIds = (points: number) =>
  BADGE_DEFINITIONS.filter((badge) => points >= badge.pointsRequired).map(
    (badge) => badge.id,
  );

const getTodayKey = () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = `${currentDate.getMonth() + 1}`.padStart(2, "0");
  const day = `${currentDate.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getPreviousDayKey = (dateKey: string) => {
  const [rawYear, rawMonth, rawDay] = dateKey.split("-");
  const yearValue = Number(rawYear ?? "1970");
  const monthValue = Number(rawMonth ?? "1");
  const dayValue = Number(rawDay ?? "1");
  const year: number = Number.isFinite(yearValue) ? yearValue : 1970;
  const month: number = Number.isFinite(monthValue) ? monthValue : 1;
  const day: number = Number.isFinite(dayValue) ? dayValue : 1;
  const previousDate = new Date(year, month - 1, day);
  previousDate.setDate(previousDate.getDate() - 1);

  const previousYear = previousDate.getFullYear();
  const previousMonth = `${previousDate.getMonth() + 1}`.padStart(2, "0");
  const previousDay = `${previousDate.getDate()}`.padStart(2, "0");

  return `${previousYear}-${previousMonth}-${previousDay}`;
};

const normalizeDailyChallenge = (value: unknown, todayKey: string) => {
  const baseChallenge = buildDailyChallenge(todayKey);

  if (!value || typeof value !== "object") {
    return baseChallenge;
  }

  const candidate = value as Partial<DailyChallenge>;

  if (candidate.dateKey !== todayKey) {
    return baseChallenge;
  }

  const targetCount =
    typeof candidate.targetCount === "number" && Number.isFinite(candidate.targetCount)
      ? Math.max(1, Math.round(candidate.targetCount))
      : baseChallenge.targetCount;
  const rewardPoints =
    typeof candidate.rewardPoints === "number" && Number.isFinite(candidate.rewardPoints)
      ? Math.max(0, Math.round(candidate.rewardPoints))
      : baseChallenge.rewardPoints;
  const progressCount =
    typeof candidate.progressCount === "number" && Number.isFinite(candidate.progressCount)
      ? Math.max(0, Math.round(candidate.progressCount))
      : 0;
  const isCompleted = progressCount >= targetCount;

  return {
    completedAt:
      isCompleted && typeof candidate.completedAt === "string"
        ? candidate.completedAt
        : isCompleted
          ? todayKey
          : null,
    dateKey: todayKey,
    progressCount: Math.min(progressCount, targetCount),
    rewarded: isCompleted ? Boolean(candidate.rewarded) : false,
    rewardPoints,
    targetCount,
    taskLabel:
      typeof candidate.taskLabel === "string" && candidate.taskLabel.trim().length > 0
        ? candidate.taskLabel
        : `Learn ${targetCount} letters`,
  };
};

const normalizeState = (value: unknown): GamificationState => {
  const todayKey = getTodayKey();

  if (!value || typeof value !== "object") {
    return {
      ...DEFAULT_GAMIFICATION_STATE,
      dailyChallenge: buildDailyChallenge(todayKey),
    };
  }

  const candidate = value as Partial<GamificationState>;
  const points =
    typeof candidate.points === "number" && Number.isFinite(candidate.points)
      ? candidate.points
      : 0;
  const streak =
    typeof candidate.streak === "number" && Number.isFinite(candidate.streak)
      ? candidate.streak
      : 0;
  const longestStreak =
    typeof candidate.longestStreak === "number" &&
    Number.isFinite(candidate.longestStreak)
      ? candidate.longestStreak
      : streak;
  const rewardedLearnedSignIds = Array.isArray(candidate.rewardedLearnedSignIds)
    ? candidate.rewardedLearnedSignIds.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  return {
    badges: normalizeBadgeIds(points),
    dailyChallenge: normalizeDailyChallenge(candidate.dailyChallenge, todayKey),
    lastActivityDate:
      typeof candidate.lastActivityDate === "string"
        ? candidate.lastActivityDate
        : null,
    longestStreak: Math.max(streak, longestStreak, 0),
    points,
    rewardedLearnedSignIds,
    streak,
  };
};

export const loadGamificationState = async () => {
  try {
    const rawValue = await AsyncStorage.getItem(GAMIFICATION_STORAGE_KEY);

    if (!rawValue) {
      const nextState = {
        ...DEFAULT_GAMIFICATION_STATE,
        dailyChallenge: buildDailyChallenge(getTodayKey()),
      };
      await persistGamificationState(nextState);
      return nextState;
    }

    const nextState = normalizeState(JSON.parse(rawValue));
    await persistGamificationState(nextState);
    return nextState;
  } catch (storageError) {
    console.log("load gamification state error", storageError);
    return {
      ...DEFAULT_GAMIFICATION_STATE,
      dailyChallenge: buildDailyChallenge(getTodayKey()),
    };
  }
};

const persistGamificationState = async (state: GamificationState) => {
  await AsyncStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(state));
};

export const awardGamification = async (reward: GamificationReward) => {
  const currentState = await loadGamificationState();

  if (
    reward.learnedSignId &&
    currentState.rewardedLearnedSignIds.includes(reward.learnedSignId)
  ) {
    return currentState;
  }

  const todayKey = getTodayKey();
  const previousDayKey = getPreviousDayKey(todayKey);
  const nextStreak =
    currentState.lastActivityDate === todayKey
      ? currentState.streak
      : currentState.lastActivityDate === previousDayKey
        ? currentState.streak + 1
        : 1;
  const nextDailyChallenge = { ...currentState.dailyChallenge };

  if (reward.learnedSignId) {
    nextDailyChallenge.progressCount = Math.min(
      nextDailyChallenge.targetCount,
      nextDailyChallenge.progressCount + 1,
    );
  }

  const challengeCompleted =
    nextDailyChallenge.progressCount >= nextDailyChallenge.targetCount;
  const challengeRewardPoints =
    challengeCompleted && !nextDailyChallenge.rewarded
      ? nextDailyChallenge.rewardPoints
      : 0;

  nextDailyChallenge.completedAt = challengeCompleted ? todayKey : null;
  nextDailyChallenge.rewarded = challengeCompleted
    ? true
    : nextDailyChallenge.rewarded;

  const nextPoints =
    currentState.points +
    Math.max(0, reward.points) +
    Math.max(0, challengeRewardPoints);
  const nextState: GamificationState = {
    badges: normalizeBadgeIds(nextPoints),
    dailyChallenge: nextDailyChallenge,
    lastActivityDate: todayKey,
    longestStreak: Math.max(currentState.longestStreak, nextStreak),
    points: nextPoints,
    rewardedLearnedSignIds: reward.learnedSignId
      ? [...currentState.rewardedLearnedSignIds, reward.learnedSignId]
      : currentState.rewardedLearnedSignIds,
    streak: nextStreak,
  };

  try {
    await persistGamificationState(nextState);
  } catch (storageError) {
    console.log("save gamification state error", storageError);
  }

  return nextState;
};
