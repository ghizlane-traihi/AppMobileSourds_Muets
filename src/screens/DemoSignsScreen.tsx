import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ActionFeedbackCard } from "../components/ActionFeedbackCard";
import { AnimatedProgressBar } from "../components/AnimatedProgressBar";
import { AlphabetLearningCard } from "../components/AlphabetLearningCard";
import { AssistantHintsCard } from "../components/AssistantHintsCard";
import { DailyChallengeCard } from "../components/DailyChallengeCard";
import { LearningHubCard } from "../components/LearningHubCard";
import { LearningLessonVisual } from "../components/LearningLessonVisual";
import { ResumeActivityCard } from "../components/ResumeActivityCard";
import {
  BADGE_DEFINITIONS,
  DEFAULT_GAMIFICATION_STATE,
  awardGamification,
  loadGamificationState,
} from "../services/gamification";
import { saveResumeActivity } from "../services/resume";
import {
  ALPHABET_FAVORITES_STORAGE_KEY,
  ALPHABET_LEARNED_STORAGE_KEY,
  ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
  ALPHABET_MISTAKES_STORAGE_KEY,
  ALPHABET_QUIZ_SCORE_STORAGE_KEY,
  ALPHABET_RECENT_STORAGE_KEY,
  STRUCTURED_LEARNING_PROGRESS_STORAGE_KEY,
} from "../constants/storage";
import {
  LEARNING_CATALOG,
  LEARNING_SECTION_META,
  LearningLesson,
  LearningLessonCategory,
} from "../data/learningCatalog";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme";
import { RootStackParamList } from "../types";

type CategoryFilter = "all" | "favorites" | "recent" | "learned";

type AlphabetSign = {
  id: string;
  letter: string;
  title: string;
  subtitle: string;
  sourceUrl: string;
  imageUrl: string;
  accent: string;
  background: string;
};

type SignSection = {
  id: string;
  title: string;
  letters: AlphabetSign[];
};

const RECENT_LIMIT = 8;

type LessonProgress = {
  completedLessonIds: string[];
  currentIndex: number;
  correctQuizIds: string[];
};

type MistakeRecord = {
  count: number;
  lastIncorrectAt: number;
  needsReview: boolean;
};

type MistakeMap = Record<string, MistakeRecord>;

type LessonQuizFeedback = {
  isCorrect: boolean;
  message: string;
} | null;

type ActionFeedbackState = {
  message: string;
  metricLabel?: string;
  metricValue?: string;
  title: string;
  tone: "success" | "warning" | "info";
} | null;

type StructuredLessonRecord = {
  completed: boolean;
  lastPracticedAt: number;
  mistakeCount: number;
  practiceCount: number;
};

type StructuredLessonProgressMap = Record<string, StructuredLessonRecord>;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PALETTE = [
  { accent: "#1D4ED8", background: "#DBEAFE" },
  { accent: "#0F766E", background: "#CCFBF1" },
  { accent: "#7C3AED", background: "#EDE9FE" },
  { accent: "#B45309", background: "#FEF3C7" },
  { accent: "#BE123C", background: "#FFE4E6" },
  { accent: "#0369A1", background: "#E0F2FE" },
  { accent: "#166534", background: "#DCFCE7" },
  { accent: "#334155", background: "#E2E8F0" },
];

const CATEGORY_OPTIONS: Array<{ label: string; value: CategoryFilter }> = [
  { label: "All", value: "all" },
  { label: "Saved", value: "favorites" },
  { label: "Recent", value: "recent" },
  { label: "Learned", value: "learned" },
];

const buildAlphabetSigns = (): AlphabetSign[] =>
  ALPHABET.map((letter, index) => {
    const palette = PALETTE[index % PALETTE.length] ?? PALETTE[0]!;

    return {
      id: `asl-${letter.toLowerCase()}`,
      letter,
      title: `Letter ${letter}`,
      subtitle: "ASL hand alphabet",
      sourceUrl: `https://commons.wikimedia.org/wiki/File:Sign_language_${letter}.svg`,
      imageUrl: `https://commons.wikimedia.org/wiki/Special:FilePath/Sign_language_${letter}.svg?width=720`,
      accent: palette.accent,
      background: palette.background,
    };
  });

const ALL_SIGNS = buildAlphabetSigns();
const STUDY_STEPS = [
  "Open one letter and observe the hand shape carefully.",
  "Save difficult letters so you can review them later.",
  "Mark each letter as learned when you can recognize it quickly.",
];

const DEFAULT_LESSON_PROGRESS: LessonProgress = {
  completedLessonIds: [],
  correctQuizIds: [],
  currentIndex: 0,
};

const DEFAULT_STRUCTURED_LEARNING_PROGRESS: StructuredLessonProgressMap = {};

const SECTIONS: SignSection[] = [
  {
    id: "a-f",
    title: "A - F",
    letters: ALL_SIGNS.slice(0, 6),
  },
  {
    id: "g-l",
    title: "G - L",
    letters: ALL_SIGNS.slice(6, 12),
  },
  {
    id: "m-r",
    title: "M - R",
    letters: ALL_SIGNS.slice(12, 18),
  },
  {
    id: "s-z",
    title: "S - Z",
    letters: ALL_SIGNS.slice(18),
  },
];

const normalizeText = (value: string) => value.trim().toLowerCase();

const loadStoredIds = async (storageKey: string) => {
  try {
    const rawValue = await AsyncStorage.getItem(storageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as string[];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (storageError) {
    console.log("load alphabet storage error", storageError);
    return [];
  }
};

const loadStoredObject = async <T,>(storageKey: string, fallbackValue: T) => {
  try {
    const rawValue = await AsyncStorage.getItem(storageKey);

    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue) as T;
  } catch (storageError) {
    console.log("load alphabet object storage error", storageError);
    return fallbackValue;
  }
};

const normalizeLetterGuess = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z]/g, "");

export const DemoSignsScreen = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedSign, setSelectedSign] = useState<AlphabetSign | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress>(
    DEFAULT_LESSON_PROGRESS,
  );
  const [lessonQuizAnswer, setLessonQuizAnswer] = useState("");
  const [lessonQuizFeedback, setLessonQuizFeedback] =
    useState<LessonQuizFeedback>(null);
  const [mistakesById, setMistakesById] = useState<MistakeMap>({});
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [quizCompletedCount, setQuizCompletedCount] = useState(0);
  const [gamification, setGamification] = useState(DEFAULT_GAMIFICATION_STATE);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackState>(null);
  const [structuredProgress, setStructuredProgress] = useState<StructuredLessonProgressMap>(
    DEFAULT_STRUCTURED_LEARNING_PROGRESS,
  );
  const [activeStructuredLessonId, setActiveStructuredLessonId] = useState<string>(
    LEARNING_CATALOG[0]?.id ?? "alphabet-foundations",
  );
  const [structuredPracticeFeedback, setStructuredPracticeFeedback] = useState<{
    isCorrect: boolean;
    message: string;
  } | null>(null);

  const signById = useMemo(
    () =>
      ALL_SIGNS.reduce<Record<string, AlphabetSign>>((lookup, sign) => {
        lookup[sign.id] = sign;
        return lookup;
      }, {}),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [
        storedFavorites,
        storedLearned,
        storedLessonProgress,
        storedMistakes,
        storedRecents,
        storedQuizCount,
        gamificationState,
        storedStructuredProgress,
      ] = await Promise.all([
        loadStoredIds(ALPHABET_FAVORITES_STORAGE_KEY),
        loadStoredIds(ALPHABET_LEARNED_STORAGE_KEY),
        loadStoredObject<LessonProgress>(
          ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
          DEFAULT_LESSON_PROGRESS,
        ),
        loadStoredObject<MistakeMap>(ALPHABET_MISTAKES_STORAGE_KEY, {}),
        loadStoredIds(ALPHABET_RECENT_STORAGE_KEY),
        AsyncStorage.getItem(ALPHABET_QUIZ_SCORE_STORAGE_KEY),
        loadGamificationState(),
        loadStoredObject<StructuredLessonProgressMap>(
          STRUCTURED_LEARNING_PROGRESS_STORAGE_KEY,
          DEFAULT_STRUCTURED_LEARNING_PROGRESS,
        ),
      ]);

      if (!isMounted) {
        return;
      }

      setFavoriteIds(storedFavorites.filter((id) => signById[id]));
      setLearnedIds(storedLearned.filter((id) => signById[id]));
      setLessonProgress({
        completedLessonIds: (storedLessonProgress.completedLessonIds ?? []).filter(
          (id) => signById[id],
        ),
        correctQuizIds: (storedLessonProgress.correctQuizIds ?? []).filter(
          (id) => signById[id],
        ),
        currentIndex: Math.min(
          ALL_SIGNS.length - 1,
          Math.max(0, storedLessonProgress.currentIndex ?? 0),
        ),
      });
      setMistakesById(
        Object.entries(storedMistakes).reduce<MistakeMap>((nextMap, [id, record]) => {
          if (signById[id]) {
            nextMap[id] = {
              count: Math.max(0, record.count ?? 0),
              lastIncorrectAt: record.lastIncorrectAt ?? 0,
              needsReview: Boolean(record.needsReview),
            };
          }

          return nextMap;
        }, {}),
      );
      setRecentIds(
        storedRecents.filter((id) => signById[id]).slice(0, RECENT_LIMIT),
      );
      setQuizCompletedCount(Number.parseInt(storedQuizCount ?? "0", 10) || 0);
      setGamification(gamificationState);
      setStructuredProgress(storedStructuredProgress);
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [signById]);

  useEffect(() => {
    void AsyncStorage.setItem(
      ALPHABET_FAVORITES_STORAGE_KEY,
      JSON.stringify(favoriteIds),
    ).catch((storageError) => {
      console.log("save alphabet favorites error", storageError);
    });
  }, [favoriteIds]);

  useEffect(() => {
    void AsyncStorage.setItem(
      ALPHABET_LEARNED_STORAGE_KEY,
      JSON.stringify(learnedIds),
    ).catch((storageError) => {
      console.log("save alphabet learned error", storageError);
    });
  }, [learnedIds]);

  useEffect(() => {
    void AsyncStorage.setItem(
      ALPHABET_LESSON_PROGRESS_STORAGE_KEY,
      JSON.stringify(lessonProgress),
    ).catch((storageError) => {
      console.log("save alphabet lesson progress error", storageError);
    });
  }, [lessonProgress]);

  useEffect(() => {
    void AsyncStorage.setItem(
      ALPHABET_MISTAKES_STORAGE_KEY,
      JSON.stringify(mistakesById),
    ).catch((storageError) => {
      console.log("save alphabet mistakes error", storageError);
    });
  }, [mistakesById]);

  useEffect(() => {
    void AsyncStorage.setItem(
      ALPHABET_RECENT_STORAGE_KEY,
      JSON.stringify(recentIds),
    ).catch((storageError) => {
      console.log("save alphabet recents error", storageError);
    });
  }, [recentIds]);

  useEffect(() => {
    void AsyncStorage.setItem(
      ALPHABET_QUIZ_SCORE_STORAGE_KEY,
      quizCompletedCount.toString(),
    ).catch((storageError) => {
      console.log("save alphabet quiz score error", storageError);
    });
  }, [quizCompletedCount]);

  useEffect(() => {
    void AsyncStorage.setItem(
      STRUCTURED_LEARNING_PROGRESS_STORAGE_KEY,
      JSON.stringify(structuredProgress),
    ).catch((storageError) => {
      console.log("save structured learning progress error", storageError);
    });
  }, [structuredProgress]);

  const recentSigns = useMemo(
    () =>
      recentIds.reduce<AlphabetSign[]>((items, id) => {
        const sign = signById[id];

        if (sign) {
          items.push(sign);
        }

        return items;
      }, []),
    [recentIds, signById],
  );

  const completedLessonProgress = Math.round(
    (lessonProgress.completedLessonIds.length / ALL_SIGNS.length) * 100,
  );
  const nextSignToLearn =
    ALL_SIGNS.find((sign) => !learnedIds.includes(sign.id)) ?? null;
  const currentLessonIndex = Math.min(
    ALL_SIGNS.length - 1,
    Math.max(0, lessonProgress.currentIndex),
  );
  const currentLessonSign = ALL_SIGNS[currentLessonIndex] ?? ALL_SIGNS[0] ?? null;
  const alphabetProgressPercent = Math.round((learnedIds.length / ALL_SIGNS.length) * 100);
  const orderedStructuredLessons = LEARNING_CATALOG;
  const getStructuredLessonState = (lesson: LearningLesson) => {
    if (lesson.id === "alphabet-foundations") {
      return {
        completed:
          learnedIds.length >= ALL_SIGNS.length ||
          lessonProgress.completedLessonIds.length >= ALL_SIGNS.length,
        lastPracticedAt: 0,
        mistakeCount: Object.values(mistakesById).reduce(
          (count, record) => count + (record.count ?? 0),
          0,
        ),
        practiceCount: quizCompletedCount,
        progressPercent: alphabetProgressPercent,
        statusLabel:
          learnedIds.length === 0
            ? "Not started"
            : learnedIds.length >= ALL_SIGNS.length
              ? "Done"
              : "In progress",
      };
    }

    const record = structuredProgress[lesson.id];
    const practiceCount = record?.practiceCount ?? 0;
    const completed = Boolean(record?.completed);
    const mistakeCount = record?.mistakeCount ?? 0;
    const progressPercent = completed ? 100 : practiceCount > 0 ? 56 : 0;

    return {
      completed,
      lastPracticedAt: record?.lastPracticedAt ?? 0,
      mistakeCount,
      practiceCount,
      progressPercent,
      statusLabel: completed ? "Done" : practiceCount > 0 ? "In progress" : "Not started",
    };
  };
  const recommendedStructuredLesson =
    orderedStructuredLessons.find((lesson) => !getStructuredLessonState(lesson).completed) ??
    orderedStructuredLessons[orderedStructuredLessons.length - 1] ??
    null;
  const activeStructuredLesson =
    orderedStructuredLessons.find((lesson) => lesson.id === activeStructuredLessonId) ??
    recommendedStructuredLesson ??
    null;
  const groupedStructuredLessons = {
    beginner: orderedStructuredLessons.filter((lesson) => lesson.category === "beginner"),
    intermediate: orderedStructuredLessons.filter((lesson) => lesson.category === "intermediate"),
    advanced: orderedStructuredLessons.filter((lesson) => lesson.category === "advanced"),
  } satisfies Record<LearningLessonCategory, LearningLesson[]>;

  useEffect(() => {
    if (activeStructuredLesson && activeStructuredLesson.id !== "alphabet-foundations") {
      void saveResumeActivity({
        route: "DemoSigns",
        subtitle: `${LEARNING_SECTION_META[activeStructuredLesson.category].title} lesson: ${activeStructuredLesson.title}`,
        title: "Learning lesson",
      });
      return;
    }

    if (!currentLessonSign) {
      return;
    }

    void saveResumeActivity({
      route: "DemoSigns",
      subtitle: `Lesson ${currentLessonIndex + 1} of ${ALL_SIGNS.length}: ${currentLessonSign.title}`,
      title: "Alphabet lesson",
    });
  }, [activeStructuredLesson, currentLessonIndex, currentLessonSign]);
  const lessonNeedsReview =
    currentLessonSign ? mistakesById[currentLessonSign.id]?.needsReview ?? false : false;
  const lessonMistakeCount =
    currentLessonSign ? mistakesById[currentLessonSign.id]?.count ?? 0 : 0;
  const suggestedPracticeSigns = Object.entries(mistakesById)
    .filter(([, record]) => record.needsReview)
    .sort(([, left], [, right]) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return right.lastIncorrectAt - left.lastIncorrectAt;
    })
    .map(([id]) => signById[id])
    .filter((sign): sign is AlphabetSign => Boolean(sign))
    .slice(0, 4);
  const assistantHints = suggestedPracticeSigns.length > 0
    ? {
        hints: [
          "Open one saved mistake and answer that lesson again before adding new letters.",
          "Use the review queue to focus on the hand shapes that still slow you down.",
          "Mark a letter as learned only after you can recognize it quickly and consistently.",
        ],
        message:
          "Your review list has active letters waiting, so a short cleanup pass will help more than jumping ahead.",
        title: "A quick review round will pay off",
      }
    : currentLessonSign && !lessonProgress.correctQuizIds.includes(currentLessonSign.id)
      ? {
          hints: [
            "Finish the quiz for the current lesson before moving to the next letter.",
            "Open the lesson card again if you need one more look at the hand shape.",
            "Save a mistake when you want this letter to stay in your dedicated review list.",
          ],
          message:
            "The current lesson is still active, so finishing it now will give you the clearest progress boost.",
          title: "Stay with the current letter",
        }
      : {
          hints: [
            "Open the next unlearned letter to keep your momentum steady.",
            "Alternate between one new letter and one quick review when you want the alphabet to stick faster.",
            "Use the progress bar to pace yourself instead of rushing through too many letters at once.",
          ],
          message:
            "You are in a strong rhythm. Keep sessions focused and repeatable so the hand shapes stay memorable.",
          title: "You are ready for the next step",
        };

  const filteredSections = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);

    return SECTIONS.map((section) => ({
      ...section,
      letters: section.letters.filter((sign) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          normalizeText(sign.title).includes(normalizedQuery) ||
          normalizeText(sign.letter).includes(normalizedQuery);

        const matchesCategory =
          selectedCategory === "all"
            ? true
            : selectedCategory === "favorites"
              ? favoriteIds.includes(sign.id)
              : selectedCategory === "recent"
                ? recentIds.includes(sign.id)
                : learnedIds.includes(sign.id);

        return matchesQuery && matchesCategory;
      }),
    })).filter((section) => section.letters.length > 0);
  }, [favoriteIds, learnedIds, recentIds, searchQuery, selectedCategory]);

  const totalVisibleSigns = filteredSections.reduce(
    (count, section) => count + section.letters.length,
    0,
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategory !== "all";

  const openSign = (sign: AlphabetSign) => {
    setSelectedSign(sign);
    setRecentIds((currentIds) => [
      sign.id,
      ...currentIds.filter((storedId) => storedId !== sign.id),
    ].slice(0, RECENT_LIMIT));
  };

  const toggleFavorite = (signId: string) => {
    setFavoriteIds((currentFavorites) =>
      currentFavorites.includes(signId)
        ? currentFavorites.filter((id) => id !== signId)
        : [signId, ...currentFavorites],
    );
  };

  const toggleLearned = (signId: string) => {
    const isCurrentlyLearned = learnedIds.includes(signId);

    setLearnedIds((currentLearned) =>
      currentLearned.includes(signId)
        ? currentLearned.filter((id) => id !== signId)
        : [signId, ...currentLearned],
    );

    if (!isCurrentlyLearned) {
      const sign = signById[signId];
      setActionFeedback({
        message: sign
          ? `${sign.title} is now marked as learned. Keep the same pace and move to the next letter.`
          : "This letter is now marked as learned.",
        metricLabel: "Progress",
        metricValue: `${Math.min(
          100,
          Math.round(((learnedIds.length + 1) / ALL_SIGNS.length) * 100),
        )}%`,
        title: "Nice progress",
        tone: "success",
      });
      void awardGamification({
        learnedSignId: signId,
        points: 20,
      }).then(setGamification);

      return;
    }

    setActionFeedback({
      message: "This letter moved back into review so you can practice it again.",
      metricLabel: "Status",
      metricValue: "Review",
      title: "Learning reset",
      tone: "info",
    });
  };

  const goToLesson = (nextIndex: number) => {
    const clampedIndex = Math.min(ALL_SIGNS.length - 1, Math.max(0, nextIndex));

    setLessonProgress((currentProgress) => ({
      ...currentProgress,
      currentIndex: clampedIndex,
    }));
    setLessonQuizAnswer("");
    setLessonQuizFeedback(null);
  };

  const completeLesson = (signId: string) => {
    setLessonProgress((currentProgress) => ({
      completedLessonIds: currentProgress.completedLessonIds.includes(signId)
        ? currentProgress.completedLessonIds
        : [...currentProgress.completedLessonIds, signId],
      correctQuizIds: currentProgress.correctQuizIds.includes(signId)
        ? currentProgress.correctQuizIds
        : [...currentProgress.correctQuizIds, signId],
      currentIndex: Math.min(ALL_SIGNS.length - 1, currentLessonIndex + 1),
    }));
  };

  const handleLessonQuizSubmit = () => {
    if (!currentLessonSign) {
      return;
    }

    const normalizedGuess = normalizeLetterGuess(lessonQuizAnswer);
    const isCorrect = normalizedGuess === currentLessonSign.letter.toLowerCase();

    setQuizCompletedCount((currentValue) => currentValue + 1);

    if (isCorrect) {
      setLessonQuizFeedback({
        isCorrect: true,
        message: `Correct. ${currentLessonSign.title} is ready to move forward.`,
      });
      setLearnedIds((currentLearned) =>
        currentLearned.includes(currentLessonSign.id)
          ? currentLearned
          : [currentLessonSign.id, ...currentLearned],
      );
      setMistakesById((currentMistakes) => {
        const existingRecord = currentMistakes[currentLessonSign.id];

        if (!existingRecord) {
          return currentMistakes;
        }

        return {
          ...currentMistakes,
          [currentLessonSign.id]: {
            ...existingRecord,
            needsReview: false,
          },
        };
      });
      completeLesson(currentLessonSign.id);
      setLessonQuizAnswer("");

      void awardGamification({
        learnedSignId: learnedIds.includes(currentLessonSign.id)
          ? undefined
          : currentLessonSign.id,
        points: learnedIds.includes(currentLessonSign.id) ? 10 : 24,
      }).then(setGamification);
      setActionFeedback({
        message: "You identified the hand shape correctly. Keep moving while the pattern is still fresh.",
        metricLabel: "Lesson score",
        metricValue: "100%",
        title: "Great recognition",
        tone: "success",
      });

      return;
    }

    setLessonQuizFeedback({
      isCorrect: false,
      message: `Not quite. This lesson is ${currentLessonSign.letter}. We saved it for review.`,
    });
    setMistakesById((currentMistakes) => ({
      ...currentMistakes,
      [currentLessonSign.id]: {
        count: (currentMistakes[currentLessonSign.id]?.count ?? 0) + 1,
        lastIncorrectAt: Date.now(),
        needsReview: true,
      },
    }));
    if (!favoriteIds.includes(currentLessonSign.id)) {
      setFavoriteIds((currentFavorites) => [currentLessonSign.id, ...currentFavorites]);
    }
    setActionFeedback({
      message: "That one needs another pass. Review the hand shape and answer the same lesson again.",
      metricLabel: "Lesson score",
      metricValue: "Try again",
      title: "Keep practicing",
      tone: "warning",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const handleOpenSource = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (linkingError) {
      console.log("open alphabet source error", linkingError);
    }
  };
  const selectStructuredLesson = (lesson: LearningLesson) => {
    setActiveStructuredLessonId(lesson.id);
    setStructuredPracticeFeedback(null);

    if (lesson.id === "alphabet-foundations") {
      clearFilters();
      return;
    }

    setStructuredProgress((currentProgress) => {
      const currentRecord = currentProgress[lesson.id];

      return {
        ...currentProgress,
        [lesson.id]: {
          completed: currentRecord?.completed ?? false,
          lastPracticedAt: Date.now(),
          mistakeCount: currentRecord?.mistakeCount ?? 0,
          practiceCount: currentRecord?.practiceCount ?? 0,
        },
      };
    });
  };
  const handleStructuredPracticeAnswer = (lesson: LearningLesson, optionId: string) => {
    const isCorrect = optionId === lesson.practiceAnswerId;

    setStructuredProgress((currentProgress) => {
      const currentRecord = currentProgress[lesson.id];

      return {
        ...currentProgress,
        [lesson.id]: {
          completed: isCorrect,
          lastPracticedAt: Date.now(),
          mistakeCount: (currentRecord?.mistakeCount ?? 0) + (isCorrect ? 0 : 1),
          practiceCount: (currentRecord?.practiceCount ?? 0) + 1,
        },
      };
    });

    setStructuredPracticeFeedback({
      isCorrect,
      message: isCorrect
        ? `${lesson.title} is marked as completed. Keep that momentum going.`
        : `Not quite. Review the visual again, then repeat the practice check.`,
    });
    setActionFeedback({
      message: isCorrect
        ? `You completed ${lesson.title}. The next recommendation will now adapt to your progress.`
        : `${lesson.title} needs another pass. We saved that mistake so you can revisit it calmly.`,
      metricLabel: isCorrect ? "Lesson status" : "Mistakes",
      metricValue: isCorrect
        ? "Done"
        : `${(structuredProgress[lesson.id]?.mistakeCount ?? 0) + 1}`,
      title: isCorrect ? "Lesson completed" : "Try again",
      tone: isCorrect ? "success" : "warning",
    });
  };
  const handleOpenStructuredPractice = (lesson: LearningLesson) => {
    selectStructuredLesson(lesson);

    if (lesson.id === "alphabet-foundations") {
      if (currentLessonSign) {
        openSign(currentLessonSign);
      }
      return;
    }

    setActionFeedback({
      message: `Practice mode is ready for ${lesson.title}. Use the quick check below, then open camera practice when you want to repeat gestures live.`,
      metricLabel: "Mode",
      metricValue: "Practice",
      title: "Practice mode ready",
      tone: "info",
    });
  };

  const unlockedBadges = BADGE_DEFINITIONS.filter((badge) =>
    gamification.badges.includes(badge.id),
  );
  const highestUnlockedBadge =
    unlockedBadges[unlockedBadges.length - 1] ?? null;
  const handleOpenCurrentLesson = () => {
    if (!currentLessonSign) {
      return;
    }

    clearFilters();
    goToLesson(currentLessonIndex);
    openSign(currentLessonSign);
  };
  const handleOpenDailyChallenge = () => {
    const challengeTarget = nextSignToLearn ?? currentLessonSign;

    if (!challengeTarget) {
      return;
    }

    const targetIndex = ALL_SIGNS.findIndex((sign) => sign.id === challengeTarget.id);
    if (targetIndex >= 0) {
      goToLesson(targetIndex);
    }
    clearFilters();
    openSign(challengeTarget);
  };
  const alphabetCardTitle =
    learnedIds.length === 0 ? "Start with the alphabet" : "Continue alphabet lessons";
  const alphabetCardDescription =
    learnedIds.length === 0
      ? "Begin with the A to Z lessons to learn the core hand shapes before relying on translation."
      : currentLessonSign
        ? `Return to ${currentLessonSign.title} and keep building your recognition one calm lesson at a time.`
        : "Keep moving through the alphabet and review difficult letters inside this learning flow.";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.learningIntro}>
          <Text style={[styles.learningIntroEyebrow, { color: colors.primary }]}>Learning</Text>
          <Text style={[styles.learningIntroTitle, { color: colors.text }]}>
            A complete learning section that stays secondary to translation.
          </Text>
          <Text style={[styles.learningIntroText, { color: colors.textSecondary }]}>
            Everything related to lessons, progress, review, and daily learning lives here in one clear vertical flow.
          </Text>
        </View>

        {currentLessonSign ? (
          <ResumeActivityCard
            iconName="book-open"
            onPress={handleOpenCurrentLesson}
            subtitle={`Lesson ${currentLessonIndex + 1} of ${ALL_SIGNS.length}: ${currentLessonSign.title}`}
            title="Alphabet lesson"
          />
        ) : null}

        <AlphabetLearningCard
          badge={`Lesson ${currentLessonIndex + 1}`}
          description={alphabetCardDescription}
          onPress={handleOpenCurrentLesson}
          title={alphabetCardTitle}
        />

        <LearningHubCard onPress={clearFilters} />

        <DailyChallengeCard
          isCompleted={Boolean(gamification.dailyChallenge.completedAt)}
          onPress={handleOpenDailyChallenge}
          progressCount={gamification.dailyChallenge.progressCount}
          rewardPoints={gamification.dailyChallenge.rewardPoints}
          targetCount={gamification.dailyChallenge.targetCount}
          taskLabel={gamification.dailyChallenge.taskLabel}
        />

        {(["beginner", "intermediate", "advanced"] as LearningLessonCategory[]).map(
          (category) => {
            const lessons = groupedStructuredLessons[category];
            const completedCount = lessons.filter(
              (lesson) => getStructuredLessonState(lesson).completed,
            ).length;

            return (
              <View
                key={category}
                style={[
                  styles.trackSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.trackSectionHeader}>
                  <View>
                    <Text style={[styles.trackSectionTitle, { color: colors.text }]}>
                      {LEARNING_SECTION_META[category].title}
                    </Text>
                    <Text
                      style={[
                        styles.trackSectionText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {LEARNING_SECTION_META[category].description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.trackSectionCountChip,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.trackSectionCountText, { color: colors.text }]}>
                      {completedCount}/{lessons.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.trackSectionList}>
                  {lessons.map((lesson) => {
                    const lessonState = getStructuredLessonState(lesson);
                    const isActive = activeStructuredLesson?.id === lesson.id;
                    const isRecommended = recommendedStructuredLesson?.id === lesson.id;

                    return (
                      <Pressable
                        key={lesson.id}
                        accessibilityRole="button"
                        onPress={() => selectStructuredLesson(lesson)}
                        style={({ pressed }) => [
                          styles.trackLessonCard,
                          {
                            backgroundColor: isActive ? lesson.background : colors.surfaceMuted,
                            borderColor: isActive ? `${lesson.accent}55` : colors.border,
                          },
                          pressed && styles.cardPressed,
                        ]}
                      >
                        <View style={styles.trackLessonHeader}>
                          <View
                            style={[
                              styles.trackLessonIcon,
                              { backgroundColor: colors.surface },
                            ]}
                          >
                            <Feather color={lesson.accent} name={lesson.iconName} size={16} />
                          </View>

                          <View style={styles.trackLessonChips}>
                            {isRecommended ? (
                              <View
                                style={[
                                  styles.trackLessonChip,
                                  {
                                    backgroundColor: colors.primarySofter,
                                    borderColor: colors.primarySoft,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.trackLessonChipText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  Recommended
                                </Text>
                              </View>
                            ) : null}
                            <View
                              style={[
                                styles.trackLessonChip,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.trackLessonChipText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {lessonState.statusLabel}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <Text style={[styles.trackLessonTitle, { color: colors.text }]}>
                          {lesson.title}
                        </Text>
                        <Text
                          style={[
                            styles.trackLessonDescription,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {lesson.description}
                        </Text>

                        <View style={styles.trackLessonProgressHeader}>
                          <Text
                            style={[
                              styles.trackLessonProgressLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Progress
                          </Text>
                          <Text
                            style={[
                              styles.trackLessonProgressValue,
                              { color: lesson.accent },
                            ]}
                          >
                            {lessonState.progressPercent}%
                          </Text>
                        </View>
                        <AnimatedProgressBar
                          fillColor={lesson.accent}
                          progress={lessonState.progressPercent / 100}
                          trackColor={`${lesson.accent}22`}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          },
        )}

        {activeStructuredLesson ? (
          <View
            style={[
              styles.lessonStudioCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.lessonStudioHeader}>
              <View>
                <Text style={[styles.lessonStudioEyebrow, { color: colors.primary }]}>
                  {recommendedStructuredLesson?.id === activeStructuredLesson.id
                    ? "Recommended next lesson"
                    : "Selected lesson"}
                </Text>
                <Text style={[styles.lessonStudioTitle, { color: colors.text }]}>
                  {activeStructuredLesson.title}
                </Text>
                <Text
                  style={[
                    styles.lessonStudioText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {activeStructuredLesson.description}
                </Text>
              </View>

              <View
                style={[
                  styles.lessonStudioStatus,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.lessonStudioStatusText, { color: colors.text }]}>
                  {getStructuredLessonState(activeStructuredLesson).statusLabel}
                </Text>
              </View>
            </View>

            <LearningLessonVisual
              accent={activeStructuredLesson.accent}
              background={activeStructuredLesson.background}
              iconName={activeStructuredLesson.iconName}
              label={activeStructuredLesson.visualLabel}
            />

            <View style={styles.lessonStudioProgressHeader}>
              <Text style={[styles.lessonStudioProgressLabel, { color: colors.text }]}>
                Lesson progress
              </Text>
              <Text
                style={[
                  styles.lessonStudioProgressValue,
                  { color: activeStructuredLesson.accent },
                ]}
              >
                {getStructuredLessonState(activeStructuredLesson).progressPercent}%
              </Text>
            </View>
            <AnimatedProgressBar
              fillColor={activeStructuredLesson.accent}
              progress={getStructuredLessonState(activeStructuredLesson).progressPercent / 100}
              trackColor={`${activeStructuredLesson.accent}22`}
            />

            <Text style={[styles.lessonStudioHelperText, { color: colors.textSecondary }]}>
              {activeStructuredLesson.helperText}
            </Text>

            <View style={styles.lessonStudioActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleOpenStructuredPractice(activeStructuredLesson)}
                style={({ pressed }) => [
                  styles.lessonStudioPrimaryButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.lessonStudioPrimaryButtonText}>
                  {activeStructuredLesson.id === "alphabet-foundations"
                    ? "Open A-Z lesson"
                    : "Start practice mode"}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate("SignToSpeech", { initialMode: "practice" })}
                style={({ pressed }) => [
                  styles.lessonStudioSecondaryButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.lessonStudioSecondaryButtonText}>Open camera practice</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.practiceCheckCard,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.practiceCheckEyebrow, { color: colors.primary }]}>
                Quick check
              </Text>
              <Text style={[styles.practiceCheckPrompt, { color: colors.text }]}>
                {activeStructuredLesson.practicePrompt}
              </Text>

              <View style={styles.practiceOptionList}>
                {activeStructuredLesson.practiceOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    onPress={() =>
                      handleStructuredPracticeAnswer(activeStructuredLesson, option.id)
                    }
                    style={({ pressed }) => [
                      styles.practiceOptionButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <Text style={[styles.practiceOptionText, { color: colors.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.practiceMetaRow}>
                <Text style={[styles.practiceMetaText, { color: colors.textSecondary }]}>
                  Mistakes saved: {getStructuredLessonState(activeStructuredLesson).mistakeCount}
                </Text>
                <Text style={[styles.practiceMetaText, { color: colors.textSecondary }]}>
                  Attempts: {getStructuredLessonState(activeStructuredLesson).practiceCount}
                </Text>
              </View>

              {structuredPracticeFeedback ? (
                <View
                  style={[
                    styles.practiceFeedbackCard,
                    {
                      backgroundColor: structuredPracticeFeedback.isCorrect
                        ? colors.successSoft
                        : colors.warningSoft,
                      borderColor: structuredPracticeFeedback.isCorrect
                        ? colors.successSoft
                        : colors.warningBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.practiceFeedbackText,
                      {
                        color: structuredPracticeFeedback.isCorrect
                          ? colors.success
                          : colors.warning,
                      },
                    ]}
                  >
                    {structuredPracticeFeedback.message}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <AssistantHintsCard
          hints={assistantHints.hints}
          message={assistantHints.message}
          title={assistantHints.title}
        />

        {actionFeedback ? (
          <ActionFeedbackCard
            message={actionFeedback.message}
            metricLabel={actionFeedback.metricLabel}
            metricValue={actionFeedback.metricValue}
            title={actionFeedback.title}
            tone={actionFeedback.tone}
          />
        ) : null}

        {currentLessonSign ? (
          <View
            style={[
              styles.lessonJourneyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.lessonJourneyHeader}>
              <View>
                <Text style={[styles.lessonJourneyEyebrow, { color: colors.primary }]}>
                  Step-by-step lessons
                </Text>
                <Text style={[styles.lessonJourneyTitle, { color: colors.text }]}>
                  Lesson {currentLessonIndex + 1} of {ALL_SIGNS.length}: {currentLessonSign.title}
                </Text>
                <Text
                  style={[styles.lessonJourneySubtitle, { color: colors.textSecondary }]}
                >
                  Move from A to Z with one focused letter at a time.
                </Text>
              </View>
              <Text style={[styles.lessonJourneyProgressValue, { color: colors.primary }]}>
                {completedLessonProgress}%
              </Text>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: colors.primarySoft }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.max(
                      completedLessonProgress,
                      lessonProgress.completedLessonIds.length > 0 ? 8 : 0,
                    )}%`,
                  },
                ]}
              />
            </View>

            <View
              style={[
                styles.lessonVisualCard,
                { backgroundColor: currentLessonSign.background },
              ]}
            >
              <Image
                resizeMode="contain"
                source={{ uri: currentLessonSign.imageUrl }}
                style={styles.lessonVisual}
              />
            </View>

            <View style={styles.lessonActionsRow}>
              <Pressable
                accessibilityRole="button"
                disabled={currentLessonIndex === 0}
                onPress={() => goToLesson(currentLessonIndex - 1)}
                style={({ pressed }) => [
                  styles.lessonNavButton,
                  currentLessonIndex === 0 && styles.lessonNavButtonDisabled,
                  pressed && currentLessonIndex > 0 && styles.cardPressed,
                ]}
              >
                <Text style={styles.lessonNavButtonText}>Previous</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => openSign(currentLessonSign)}
                style={({ pressed }) => [
                  styles.lessonOpenButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.lessonOpenButtonText}>Open lesson card</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={currentLessonIndex >= ALL_SIGNS.length - 1}
                onPress={() => goToLesson(currentLessonIndex + 1)}
                style={({ pressed }) => [
                  styles.lessonNavButton,
                  currentLessonIndex >= ALL_SIGNS.length - 1 &&
                    styles.lessonNavButtonDisabled,
                  pressed &&
                    currentLessonIndex < ALL_SIGNS.length - 1 &&
                    styles.cardPressed,
                ]}
              >
                <Text style={styles.lessonNavButtonText}>Next</Text>
              </Pressable>
            </View>

            <View style={styles.lessonSummaryRow}>
              <View
                style={[
                  styles.lessonSummaryBadge,
                  {
                    backgroundColor: lessonNeedsReview
                      ? colors.warningSoft
                      : colors.successSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.lessonSummaryBadgeText,
                    { color: lessonNeedsReview ? colors.warning : colors.success },
                  ]}
                >
                  {lessonNeedsReview
                    ? `${lessonMistakeCount} mistake${lessonMistakeCount > 1 ? "s" : ""}`
                    : "Ready to pass"}
                </Text>
              </View>
              <View
                style={[
                  styles.lessonSummaryBadge,
                  { backgroundColor: colors.primarySofter },
                ]}
              >
                <Text
                  style={[
                    styles.lessonSummaryBadgeText,
                    { color: colors.primary },
                  ]}
                >
                  {lessonProgress.correctQuizIds.includes(currentLessonSign.id)
                    ? "Quiz passed"
                    : "Quiz pending"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {nextSignToLearn ? (
          <View style={[styles.nextLessonCard, { backgroundColor: colors.hero }]}>
            <Text style={styles.nextLessonEyebrow}>Next lesson</Text>
            <Text style={styles.nextLessonTitle}>
              Practice {nextSignToLearn.title}
            </Text>
            <Text style={styles.nextLessonText}>
              Keep moving through the alphabet by opening the next letter you
              have not marked as learned yet.
            </Text>
            <View style={styles.nextLessonActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openSign(nextSignToLearn)}
                style={({ pressed }) => [
                  styles.primaryLessonButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.primaryLessonButtonText}>Open next letter</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => toggleLearned(nextSignToLearn.id)}
                style={({ pressed }) => [
                  styles.secondaryLessonButton,
                  learnedIds.includes(nextSignToLearn.id) &&
                    styles.learnedButtonActive,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text
                  style={[
                    styles.secondaryLessonButtonText,
                    learnedIds.includes(nextSignToLearn.id) &&
                      styles.learnedButtonTextActive,
                  ]}
                >
                  {learnedIds.includes(nextSignToLearn.id)
                    ? "Marked learned"
                    : "Mark as learned"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {currentLessonSign ? (
          <View
            style={[
              styles.quizCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.quizEyebrow}>Lesson quiz</Text>
            <Text style={styles.quizTitle}>
              Which letter does this lesson show?
            </Text>
            <Text style={styles.quizSubtitle}>
              Finish the quiz for the current lesson before moving on.
            </Text>

            <View
              style={[
                styles.quizImageCard,
                {
                  backgroundColor: currentLessonSign.background,
                },
              ]}
            >
              <Image
                resizeMode="contain"
                source={{ uri: currentLessonSign.imageUrl }}
                style={styles.quizImage}
              />
            </View>

            <View style={styles.quizAnswerBox}>
              <Text style={styles.quizAnswerLabel}>Your answer</Text>
              <TextInput
                accessibilityLabel="Type the letter shown in the current lesson"
                autoCapitalize="characters"
                maxLength={2}
                onChangeText={(value) => {
                  setLessonQuizAnswer(value);
                  if (lessonQuizFeedback) {
                    setLessonQuizFeedback(null);
                  }
                }}
                placeholder="Type A-Z"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.lessonQuizInput,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={lessonQuizAnswer}
              />
              <Text style={styles.quizAnswerText}>
                Lesson target: {currentLessonSign.title}
              </Text>
            </View>

            <View style={styles.quizStatsRow}>
              <View style={styles.quizStatCard}>
                <Text style={styles.quizStatValue}>{quizCompletedCount}</Text>
                <Text style={styles.quizStatLabel}>Completed</Text>
              </View>
              <View style={styles.quizStatCard}>
                <Text style={styles.quizStatValue}>
                  {suggestedPracticeSigns.length}
                </Text>
                <Text style={styles.quizStatLabel}>Review queue</Text>
              </View>
            </View>

            {lessonQuizFeedback ? (
              <View
                style={[
                  styles.lessonQuizFeedbackCard,
                  {
                    backgroundColor: lessonQuizFeedback.isCorrect
                      ? colors.successSoft
                      : colors.warningSoft,
                    borderColor: lessonQuizFeedback.isCorrect
                      ? colors.successSoft
                      : colors.warningBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.lessonQuizFeedbackText,
                    {
                      color: lessonQuizFeedback.isCorrect
                        ? colors.success
                        : colors.warning,
                    },
                  ]}
                >
                  {lessonQuizFeedback.message}
                </Text>
              </View>
            ) : null}

            <View style={styles.quizActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleLessonQuizSubmit}
                style={({ pressed }) => [
                  styles.quizPrimaryButton,
                  lessonQuizAnswer.trim().length === 0 && styles.lessonNavButtonDisabled,
                  pressed && styles.cardPressed,
                ]}
                disabled={lessonQuizAnswer.trim().length === 0}
              >
                <Text style={styles.quizPrimaryButtonText}>Check answer</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => openSign(currentLessonSign)}
                style={({ pressed }) => [
                  styles.quizSecondaryButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.quizSecondaryButtonText}>Review lesson</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (!favoriteIds.includes(currentLessonSign.id)) {
                    setFavoriteIds((currentFavorites) => [
                      currentLessonSign.id,
                      ...currentFavorites,
                    ]);
                  }
                  setMistakesById((currentMistakes) => ({
                    ...currentMistakes,
                    [currentLessonSign.id]: {
                      count: (currentMistakes[currentLessonSign.id]?.count ?? 0) + 1,
                      lastIncorrectAt: Date.now(),
                      needsReview: true,
                    },
                  }));
                  setLessonQuizFeedback({
                    isCorrect: false,
                    message: `${currentLessonSign.title} was added to your review list.`,
                  });
                  setActionFeedback({
                    message:
                      "This letter was saved for review, so you can come back to it after a short reset.",
                    metricLabel: "Review queue",
                    metricValue: `${suggestedPracticeSigns.length + 1}`,
                    title: "Saved for another pass",
                    tone: "warning",
                  });
                }}
                style={({ pressed }) => [
                  styles.quizTertiaryButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.quizTertiaryButtonText}>Save mistake</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {suggestedPracticeSigns.length > 0 ? (
          <View
            style={[
              styles.reviewSuggestionsCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.reviewSuggestionsTitle, { color: colors.text }]}>
              Practice these letters again
            </Text>
            <Text
              style={[styles.reviewSuggestionsText, { color: colors.textSecondary }]}
            >
              Saved mistakes stay here until you answer those letters correctly.
            </Text>

            <View style={styles.reviewSuggestionGrid}>
              {suggestedPracticeSigns.map((sign) => (
                <Pressable
                  key={sign.id}
                  accessibilityRole="button"
                  onPress={() => {
                    const nextIndex = ALL_SIGNS.findIndex((item) => item.id === sign.id);

                    if (nextIndex >= 0) {
                      goToLesson(nextIndex);
                    }
                    openSign(sign);
                  }}
                  style={({ pressed }) => [
                    styles.reviewSuggestionItem,
                    { backgroundColor: sign.background },
                    pressed && styles.cardPressed,
                  ]}
                >
                  <Text style={[styles.reviewSuggestionLetter, { color: sign.accent }]}>
                    {sign.letter}
                  </Text>
                  <Text style={[styles.reviewSuggestionName, { color: colors.text }]}>
                    {sign.title}
                  </Text>
                  <Text
                    style={[
                      styles.reviewSuggestionMeta,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {mistakesById[sign.id]?.count ?? 0} saved mistake
                    {(mistakesById[sign.id]?.count ?? 0) > 1 ? "s" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

          <View
            style={[
              styles.studyPlanCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
          <Text style={styles.studyPlanTitle}>How to learn with this screen</Text>
          <View style={styles.studyPlanList}>
            {STUDY_STEPS.map((step, index) => (
              <View key={step} style={styles.studyPlanRow}>
                <View style={styles.studyPlanIndex}>
                  <Text style={styles.studyPlanIndexText}>{index + 1}</Text>
                </View>
                <Text style={styles.studyPlanText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.toolbarCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TextInput
            accessibilityLabel="Search the sign alphabet"
            onChangeText={setSearchQuery}
            placeholder="Search a letter"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.surfaceMuted,
                color: colors.text,
              },
            ]}
            value={searchQuery}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => setSelectedCategory(option.value)}
                  style={({ pressed }) => [
                    styles.chip,
                    selectedCategory === option.value && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCategory === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {hasActiveFilters ? (
            <Pressable
              accessibilityRole="button"
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.resetButton,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.resetButtonText}>Reset filters</Text>
            </Pressable>
          ) : null}
        </View>

          <View
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalVisibleSigns}</Text>
            <Text style={styles.summaryLabel}>Visible</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{learnedIds.length}</Text>
            <Text style={styles.summaryLabel}>Learned</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{favoriteIds.length}</Text>
            <Text style={styles.summaryLabel}>Saved</Text>
          </View>
        </View>

        {recentSigns.length > 0 ? (
          <View style={styles.highlightSection}>
            <View style={styles.highlightHeader}>
              <Text style={styles.highlightTitle}>Recent letters</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedCategory("recent")}
              >
                <Text style={styles.highlightLink}>See all</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.carouselRow}>
                {recentSigns.map((sign) => (
                  <Pressable
                    key={sign.id}
                    accessibilityRole="button"
                    onPress={() => openSign(sign)}
                    style={({ pressed }) => [
                      styles.miniCard,
                      { backgroundColor: sign.background },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <Image
                      resizeMode="contain"
                      source={{ uri: sign.imageUrl }}
                      style={styles.miniCardImage}
                    />
                    <Text style={styles.miniCardTitle}>{sign.letter}</Text>
                    <Text style={styles.miniCardMeta}>{sign.title}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        {filteredSections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No letters found</Text>
            <Text style={styles.emptyText}>
              Try another search or reset the filters to see the full alphabet.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={clearFilters}
              style={({ pressed }) => [
                styles.emptyButton,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.emptyButtonText}>Show the full alphabet</Text>
            </Pressable>
          </View>
        ) : null}

        {filteredSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.letters.length}</Text>
            </View>

            <View style={styles.grid}>
              {section.letters.map((sign) => {
                const isFavorite = favoriteIds.includes(sign.id);
                const isLearned = learnedIds.includes(sign.id);

                return (
                  <Pressable
                    key={sign.id}
                    accessibilityRole="button"
                    onPress={() => openSign(sign)}
                    style={({ pressed }) => [
                      styles.signCard,
                      { backgroundColor: sign.background },
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.signCardTopRow}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: sign.accent,
                          },
                        ]}
                      >
                        <Text style={styles.badgeText}>{sign.letter}</Text>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        onPress={() => toggleFavorite(sign.id)}
                        style={({ pressed }) => [
                          styles.favoriteButton,
                          isFavorite && styles.favoriteButtonActive,
                          pressed && styles.chipPressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.favoriteButtonText,
                            isFavorite && styles.favoriteButtonTextActive,
                          ]}
                        >
                          {isFavorite ? "Saved" : "Save"}
                        </Text>
                      </Pressable>
                    </View>

                    <Image
                      resizeMode="contain"
                      source={{ uri: sign.imageUrl }}
                      style={styles.signImage}
                    />

                    <Text style={styles.signTitle}>{sign.title}</Text>
                    <Text style={styles.signSubtitle}>{sign.subtitle}</Text>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => toggleLearned(sign.id)}
                      style={({ pressed }) => [
                        styles.learnedButton,
                        isLearned && styles.learnedButtonActive,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.learnedButtonText,
                          isLearned && styles.learnedButtonTextActive,
                        ]}
                      >
                        {isLearned ? "Learned" : "Mark as learned"}
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedSign(null)}
        transparent
        visible={selectedSign !== null}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: selectedSign?.background ?? "#FFFFFF",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{selectedSign?.title}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedSign?.subtitle} · Practice the hand shape slowly.
                </Text>
              </View>

              {selectedSign ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => toggleFavorite(selectedSign.id)}
                  style={({ pressed }) => [
                    styles.modalSaveButton,
                    favoriteIds.includes(selectedSign.id) &&
                      styles.favoriteButtonActive,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalSaveButtonText,
                      favoriteIds.includes(selectedSign.id) &&
                        styles.favoriteButtonTextActive,
                    ]}
                  >
                    {favoriteIds.includes(selectedSign.id) ? "Saved" : "Save"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              bounces={false}
              centerContent
              contentContainerStyle={styles.zoomContainer}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                resizeMode="contain"
                source={{ uri: selectedSign?.imageUrl }}
                style={styles.modalImage}
              />
            </ScrollView>

            {selectedSign ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => toggleLearned(selectedSign.id)}
                style={({ pressed }) => [
                  styles.modalLearnedButton,
                  learnedIds.includes(selectedSign.id) &&
                    styles.learnedButtonActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={[
                    styles.modalLearnedButtonText,
                    learnedIds.includes(selectedSign.id) &&
                      styles.learnedButtonTextActive,
                  ]}
                >
                  {learnedIds.includes(selectedSign.id)
                    ? "Already learned"
                    : "Mark this letter as learned"}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  selectedSign ? void handleOpenSource(selectedSign.sourceUrl) : undefined
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Open source</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedSign(null)}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.closeButtonPressed,
                ]}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F7F4EE",
    flex: 1,
  },
  contentContainer: {
    gap: 18,
    padding: 16,
    paddingBottom: 32,
  },
  learningIntro: {
    marginBottom: 2,
  },
  learningIntroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  learningIntroTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 34,
    marginTop: 10,
    maxWidth: "94%",
  },
  learningIntroText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    maxWidth: "94%",
  },
  trackSection: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  trackSectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackSectionTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  trackSectionText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: "88%",
  },
  trackSectionCountChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  trackSectionCountText: {
    fontSize: 12,
    fontWeight: "800",
  },
  trackSectionList: {
    gap: 12,
    marginTop: 16,
  },
  trackLessonCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  trackLessonHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trackLessonIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  trackLessonChips: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  trackLessonChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trackLessonChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  trackLessonTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 14,
  },
  trackLessonDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  trackLessonProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 14,
  },
  trackLessonProgressLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  trackLessonProgressValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  lessonStudioCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  lessonStudioHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lessonStudioEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  lessonStudioTitle: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 8,
    maxWidth: "92%",
  },
  lessonStudioText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: "92%",
  },
  lessonStudioStatus: {
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  lessonStudioStatusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  lessonStudioProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 16,
  },
  lessonStudioProgressLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  lessonStudioProgressValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  lessonStudioHelperText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  lessonStudioActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  lessonStudioPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#10233B",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lessonStudioPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  lessonStudioSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lessonStudioSecondaryButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800",
  },
  practiceCheckCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  practiceCheckEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  practiceCheckPrompt: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
    marginTop: 10,
  },
  practiceOptionList: {
    gap: 10,
    marginTop: 14,
  },
  practiceOptionButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  practiceOptionText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  practiceMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  practiceMetaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  practiceFeedbackCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  practiceFeedbackText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  hero: {
    backgroundColor: "#10233B",
    borderRadius: 28,
    padding: 22,
  },
  heroEyebrow: {
    color: "#A8BED6",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
    marginTop: 10,
  },
  heroText: {
    color: "#D2DCE7",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  learningPathsCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  learningPathsEyebrow: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  learningPathsTitle: {
    color: "#10233B",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 8,
  },
  learningPathsText: {
    color: "#5E6F80",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  learningPathList: {
    gap: 12,
    marginTop: 16,
  },
  learningPathItem: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  learningPathTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  learningPathCount: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  learningPathCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  learningPathStatus: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  learningPathTitle: {
    color: "#10233B",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12,
  },
  learningPathSubtitle: {
    color: "#5E6F80",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  learningPathFocusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  learningPathFocusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  learningPathFocusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  gamificationRow: {
    flexDirection: "row",
    gap: 12,
  },
  gamificationCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 96,
    padding: 16,
  },
  gamificationValue: {
    color: "#10233B",
    fontSize: 22,
    fontWeight: "800",
  },
  gamificationLabel: {
    color: "#6D7D8C",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
    textTransform: "uppercase",
  },
  badgeBanner: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  badgeBannerTitle: {
    color: "#10233B",
    fontSize: 16,
    fontWeight: "800",
  },
  badgeBannerText: {
    color: "#627384",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  quickPickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickPickCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 126,
    padding: 16,
  },
  quickPickValue: {
    color: "#10233B",
    fontSize: 26,
    fontWeight: "800",
  },
  quickPickLabel: {
    color: "#10233B",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  quickPickHint: {
    color: "#6D7D8C",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  learningProgressCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  learningProgressTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  learningProgressTitle: {
    color: "#10233B",
    fontSize: 18,
    fontWeight: "800",
  },
  learningProgressText: {
    color: "#627384",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: "84%",
  },
  learningProgressValue: {
    color: "#1D4ED8",
    fontSize: 26,
    fontWeight: "800",
  },
  progressTrack: {
    backgroundColor: "#E7EEF8",
    borderRadius: 999,
    height: 12,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#1D4ED8",
    borderRadius: 999,
    height: "100%",
  },
  lessonJourneyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  lessonJourneyHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lessonJourneyEyebrow: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  lessonJourneyTitle: {
    color: "#10233B",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 28,
    marginTop: 8,
    maxWidth: "88%",
  },
  lessonJourneySubtitle: {
    color: "#5E6F80",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: "90%",
  },
  lessonJourneyProgressValue: {
    color: "#1D4ED8",
    fontSize: 22,
    fontWeight: "800",
  },
  lessonVisualCard: {
    alignItems: "center",
    borderRadius: 24,
    marginTop: 16,
    padding: 18,
  },
  lessonVisual: {
    height: 200,
    width: "100%",
  },
  lessonActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  lessonNavButton: {
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 999,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lessonNavButtonDisabled: {
    opacity: 0.45,
  },
  lessonNavButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800",
  },
  lessonOpenButton: {
    alignItems: "center",
    backgroundColor: "#10233B",
    borderRadius: 999,
    flex: 1.3,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lessonOpenButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  lessonSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  lessonSummaryBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  lessonSummaryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  nextLessonCard: {
    backgroundColor: "#10233B",
    borderRadius: 28,
    padding: 20,
  },
  nextLessonEyebrow: {
    color: "#8FB7FF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  nextLessonTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 10,
  },
  nextLessonText: {
    color: "#D2DCE7",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  nextLessonActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  primaryLessonButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryLessonButtonText: {
    color: "#10233B",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryLessonButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryLessonButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  quizCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  quizEyebrow: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  quizTitle: {
    color: "#10233B",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 10,
  },
  quizSubtitle: {
    color: "#5E6F80",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  quizImageCard: {
    alignItems: "center",
    borderRadius: 24,
    marginTop: 16,
    padding: 18,
  },
  quizImage: {
    height: 180,
    width: "100%",
  },
  quizAnswerBox: {
    backgroundColor: "#F7F4EE",
    borderRadius: 18,
    marginTop: 14,
    padding: 14,
  },
  quizAnswerLabel: {
    color: "#6D7D8C",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  quizAnswerText: {
    color: "#10233B",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  lessonQuizInput: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
  },
  quizStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  quizStatCard: {
    backgroundColor: "#F7F4EE",
    borderRadius: 18,
    flex: 1,
    padding: 14,
  },
  quizStatValue: {
    color: "#10233B",
    fontSize: 20,
    fontWeight: "800",
  },
  quizStatLabel: {
    color: "#6D7D8C",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
    textTransform: "uppercase",
  },
  lessonQuizFeedbackCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lessonQuizFeedbackText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  quizActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  quizPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#10233B",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quizPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  quizSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quizSecondaryButtonText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
  },
  quizTertiaryButton: {
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quizTertiaryButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800",
  },
  reviewSuggestionsCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  reviewSuggestionsTitle: {
    color: "#10233B",
    fontSize: 18,
    fontWeight: "800",
  },
  reviewSuggestionsText: {
    color: "#5E6F80",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  reviewSuggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  reviewSuggestionItem: {
    borderRadius: 18,
    minWidth: "47%",
    padding: 14,
  },
  reviewSuggestionLetter: {
    fontSize: 22,
    fontWeight: "800",
  },
  reviewSuggestionName: {
    color: "#10233B",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  reviewSuggestionMeta: {
    color: "#5E6F80",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 6,
  },
  studyPlanCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  studyPlanTitle: {
    color: "#10233B",
    fontSize: 18,
    fontWeight: "800",
  },
  studyPlanList: {
    gap: 12,
    marginTop: 14,
  },
  studyPlanRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  studyPlanIndex: {
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    marginRight: 10,
    width: 24,
  },
  studyPlanIndexText: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  studyPlanText: {
    color: "#5E6F80",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  toolbarCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  searchInput: {
    backgroundColor: "#F7F4EE",
    borderRadius: 16,
    color: "#10233B",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F7F4EE",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: "#10233B",
  },
  chipPressed: {
    opacity: 0.86,
  },
  chipText: {
    color: "#5B6C7D",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  resetButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EDF4FF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800",
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    backgroundColor: "#ECE3D6",
    height: 42,
    width: 1,
  },
  summaryValue: {
    color: "#10233B",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  summaryLabel: {
    color: "#6D7D8C",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "center",
    textTransform: "uppercase",
  },
  highlightSection: {
    gap: 12,
  },
  highlightHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  highlightTitle: {
    color: "#10233B",
    fontSize: 20,
    fontWeight: "800",
  },
  highlightLink: {
    color: "#1D4ED8",
    fontSize: 14,
    fontWeight: "800",
  },
  carouselRow: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 6,
  },
  miniCard: {
    borderRadius: 22,
    padding: 14,
    width: 160,
  },
  miniCardImage: {
    height: 120,
    width: "100%",
  },
  miniCardTitle: {
    color: "#10233B",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 10,
  },
  miniCardMeta: {
    color: "#5B6C7D",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED1",
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: "#10233B",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: "#6D7D8C",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  emptyButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#10233B",
    borderRadius: 16,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#10233B",
    fontSize: 20,
    fontWeight: "800",
  },
  sectionCount: {
    color: "#6D7D8C",
    fontSize: 13,
    fontWeight: "700",
  },
  grid: {
    gap: 12,
  },
  signCard: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 18,
  },
  signCardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardPressed: {
    opacity: 0.92,
  },
  favoriteButton: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  favoriteButtonActive: {
    backgroundColor: "#10233B",
  },
  favoriteButtonText: {
    color: "#10233B",
    fontSize: 12,
    fontWeight: "700",
  },
  favoriteButtonTextActive: {
    color: "#FFFFFF",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  signImage: {
    alignSelf: "center",
    height: 220,
    marginTop: 12,
    width: "100%",
  },
  signTitle: {
    color: "#10233B",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 12,
  },
  signSubtitle: {
    color: "#47586A",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  learnedButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 16,
    marginTop: 14,
    paddingVertical: 12,
  },
  learnedButtonActive: {
    backgroundColor: "#10233B",
  },
  learnedButtonText: {
    color: "#10233B",
    fontSize: 14,
    fontWeight: "800",
  },
  learnedButtonTextActive: {
    color: "#FFFFFF",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.84)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    borderRadius: 28,
    padding: 20,
    width: "100%",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalHeaderText: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    color: "#10233B",
    fontSize: 26,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#47586A",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },
  modalSaveButton: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalSaveButtonText: {
    color: "#10233B",
    fontSize: 12,
    fontWeight: "700",
  },
  zoomContainer: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  modalImage: {
    height: 340,
    marginTop: 18,
    width: "100%",
  },
  modalLearnedButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    marginTop: 18,
    paddingVertical: 14,
  },
  modalLearnedButtonText: {
    color: "#10233B",
    fontSize: 15,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 18,
    flex: 1,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: "#10233B",
    fontSize: 15,
    fontWeight: "700",
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#10233B",
    borderRadius: 18,
    flex: 1,
    paddingVertical: 14,
  },
  closeButtonPressed: {
    opacity: 0.84,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
