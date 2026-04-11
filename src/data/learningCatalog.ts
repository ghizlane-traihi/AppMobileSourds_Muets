import { Feather } from "@expo/vector-icons";
import type React from "react";

export type LearningLessonCategory = "beginner" | "intermediate" | "advanced";

export type PracticeOption = {
  id: string;
  label: string;
};

export type LearningLesson = {
  accent: string;
  background: string;
  category: LearningLessonCategory;
  description: string;
  helperText: string;
  iconName: React.ComponentProps<typeof Feather>["name"];
  id: string;
  practiceAnswerId: string;
  practiceOptions: PracticeOption[];
  practicePrompt: string;
  subtitle: string;
  title: string;
  visualLabel: string;
};

export const LEARNING_SECTION_META: Record<
  LearningLessonCategory,
  {
    description: string;
    title: string;
  }
> = {
  beginner: {
    description: "Build the base with alphabet, hand shapes, and numbers.",
    title: "Beginner",
  },
  intermediate: {
    description: "Move into useful words, short phrases, and daily expressions.",
    title: "Intermediate",
  },
  advanced: {
    description: "Practice realistic conversations and everyday scenarios.",
    title: "Advanced",
  },
};

export const LEARNING_CATALOG: LearningLesson[] = [
  {
    accent: "#1D4ED8",
    background: "#EAF3FF",
    category: "beginner",
    description:
      "Learn the full A to Z hand alphabet with clear visuals and step-by-step practice.",
    helperText: "Best first lesson for brand new learners.",
    iconName: "book-open",
    id: "alphabet-foundations",
    practiceAnswerId: "alphabet",
    practiceOptions: [
      { id: "alphabet", label: "A to Z finger spelling" },
      { id: "numbers", label: "Counting 0 to 9" },
      { id: "phrases", label: "Everyday expressions" },
    ],
    practicePrompt: "Which skill does this lesson build first?",
    subtitle: "Alphabet",
    title: "Alphabet foundations",
    visualLabel: "A-Z",
  },
  {
    accent: "#0F766E",
    background: "#DFF7F2",
    category: "beginner",
    description:
      "Practice the most common beginner hand positions before moving into faster recognition.",
    helperText: "Useful before camera practice.",
    iconName: "aperture",
    id: "basic-hand-shapes",
    practiceAnswerId: "shapes",
    practiceOptions: [
      { id: "shapes", label: "Core hand positions" },
      { id: "shopping", label: "Buying and asking prices" },
      { id: "conversation", label: "Short conversations" },
    ],
    practicePrompt: "What is the focus of this lesson?",
    subtitle: "Hand shapes",
    title: "Basic hand shapes",
    visualLabel: "Shape",
  },
  {
    accent: "#B45309",
    background: "#FFF1D6",
    category: "beginner",
    description:
      "Build confidence with signs for numbers 0 to 9 and simple counting practice.",
    helperText: "A practical lesson for dates, prices, and simple answers.",
    iconName: "hash",
    id: "numbers-0-9",
    practiceAnswerId: "numbers",
    practiceOptions: [
      { id: "numbers", label: "Numbers from 0 to 9" },
      { id: "alphabet", label: "Finger spelling only" },
      { id: "help", label: "Emergency assistance" },
    ],
    practicePrompt: "What will you practice in this lesson?",
    subtitle: "Numbers",
    title: "Numbers 0 to 9",
    visualLabel: "0-9",
  },
  {
    accent: "#7C3AED",
    background: "#EFE7FF",
    category: "intermediate",
    description:
      "Learn essential words such as Hello, Thank you, Yes, and No.",
    helperText: "Great after alphabet confidence starts to grow.",
    iconName: "message-circle",
    id: "common-words",
    practiceAnswerId: "common-words",
    practiceOptions: [
      { id: "common-words", label: "Hello, Thank you, Yes, No" },
      { id: "alphabet", label: "A, B, C, D only" },
      { id: "shopping", label: "Pay, buy, receipt" },
    ],
    practicePrompt: "Which set matches this lesson?",
    subtitle: "Useful words",
    title: "Common words",
    visualLabel: "Words",
  },
  {
    accent: "#BE123C",
    background: "#FFE3EA",
    category: "intermediate",
    description:
      "Combine signs into short, simple sentences that feel natural in daily use.",
    helperText: "Focus on connecting ideas instead of isolated signs.",
    iconName: "align-left",
    id: "simple-sentences",
    practiceAnswerId: "simple-sentences",
    practiceOptions: [
      { id: "simple-sentences", label: "Short sentence patterns" },
      { id: "numbers", label: "Counting practice" },
      { id: "greeting", label: "Formal introductions only" },
    ],
    practicePrompt: "What changes at this level?",
    subtitle: "Sentence building",
    title: "Simple sentences",
    visualLabel: "Say more",
  },
  {
    accent: "#0369A1",
    background: "#DFF4FF",
    category: "intermediate",
    description:
      "Use common daily expressions for needs, responses, and polite interaction.",
    helperText: "Useful for calmer, more natural day-to-day communication.",
    iconName: "sunrise",
    id: "everyday-expressions",
    practiceAnswerId: "everyday-expressions",
    practiceOptions: [
      { id: "everyday-expressions", label: "Daily expressions and responses" },
      { id: "alphabet", label: "Letter drills only" },
      { id: "advanced", label: "Long conversations" },
    ],
    practicePrompt: "Which topic belongs here?",
    subtitle: "Daily phrases",
    title: "Everyday expressions",
    visualLabel: "Daily",
  },
  {
    accent: "#334155",
    background: "#E8EDF3",
    category: "advanced",
    description:
      "Practice short conversations so you can follow turn-taking and context more smoothly.",
    helperText: "A strong bridge between isolated phrases and real interaction.",
    iconName: "users",
    id: "short-conversations",
    practiceAnswerId: "short-conversations",
    practiceOptions: [
      { id: "short-conversations", label: "Short back-and-forth exchanges" },
      { id: "numbers", label: "Basic counting" },
      { id: "alphabet", label: "Letter review" },
    ],
    practicePrompt: "What makes this lesson more advanced?",
    subtitle: "Conversation flow",
    title: "Short conversations",
    visualLabel: "Talk",
  },
  {
    accent: "#0F766E",
    background: "#DCF7EE",
    category: "advanced",
    description:
      "Use greeting signs in real situations such as meeting someone or starting a conversation.",
    helperText: "Applies familiar words inside real context.",
    iconName: "smile",
    id: "greeting-scenarios",
    practiceAnswerId: "greeting-scenarios",
    practiceOptions: [
      { id: "greeting-scenarios", label: "Greeting someone in context" },
      { id: "shopping", label: "Buying and paying" },
      { id: "help", label: "Calling for help" },
    ],
    practicePrompt: "Which real-life scenario matches this lesson?",
    subtitle: "Greeting",
    title: "Greeting scenarios",
    visualLabel: "Hi",
  },
  {
    accent: "#B45309",
    background: "#FFF1D9",
    category: "advanced",
    description:
      "Practice shopping exchanges like asking prices, quantities, and simple questions.",
    helperText: "Good for practical communication in public spaces.",
    iconName: "shopping-bag",
    id: "shopping-scenarios",
    practiceAnswerId: "shopping-scenarios",
    practiceOptions: [
      { id: "shopping-scenarios", label: "Shopping requests and questions" },
      { id: "alphabet", label: "Finger spelling practice" },
      { id: "sentence", label: "Short sentence grammar only" },
    ],
    practicePrompt: "Which situation are you practicing?",
    subtitle: "Shopping",
    title: "Shopping scenarios",
    visualLabel: "Shop",
  },
  {
    accent: "#BE123C",
    background: "#FFE6EB",
    category: "advanced",
    description:
      "Learn how to ask for help clearly in urgent or stressful daily situations.",
    helperText: "Important for accessibility and confidence outside the classroom.",
    iconName: "life-buoy",
    id: "asking-for-help",
    practiceAnswerId: "asking-for-help",
    practiceOptions: [
      { id: "asking-for-help", label: "Asking for help and support" },
      { id: "greeting", label: "Meeting someone new" },
      { id: "numbers", label: "Counting objects" },
    ],
    practicePrompt: "What is the practical goal of this lesson?",
    subtitle: "Support",
    title: "Asking for help",
    visualLabel: "Help",
  },
];
