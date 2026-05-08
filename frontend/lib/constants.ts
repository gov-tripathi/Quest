import type { Topic } from "./types";

export const TOPICS: Topic[] = [
  {
    id: "vocab",
    label: "Vocabulary",
    description: "Master advanced GRE word meanings",
    icon: "📖",
    color: "from-indigo-600 to-purple-700",
  },
  {
    id: "text_completion",
    label: "Text Completion",
    description: "Fill in the blank with precision",
    icon: "✍️",
    color: "from-blue-600 to-cyan-700",
  },
  {
    id: "critical_reasoning",
    label: "Critical Reasoning",
    description: "Dissect arguments and find flaws",
    icon: "🧠",
    color: "from-emerald-600 to-teal-700",
  },
  {
    id: "sentence_equivalence",
    label: "Sentence Equivalence",
    description: "Find two words that fit equally well",
    icon: "⚖️",
    color: "from-orange-600 to-amber-700",
  },
  {
    id: "reading_comprehension",
    label: "Reading Comprehension",
    description: "Analyze passages with depth",
    icon: "📜",
    color: "from-rose-600 to-pink-700",
  },
];

export const LEVEL_THRESHOLDS = [
  { level: 1,  title: "Initiate",    xp: 0 },
  { level: 2,  title: "Scribe",      xp: 200 },
  { level: 3,  title: "Scholar",     xp: 500 },
  { level: 4,  title: "Adept",       xp: 900 },
  { level: 5,  title: "Sage",        xp: 1500 },
  { level: 6,  title: "Logician",    xp: 2300 },
  { level: 7,  title: "Rhetorician", xp: 3400 },
  { level: 8,  title: "Master",      xp: 5000 },
  { level: 9,  title: "Oracle",      xp: 7000 },
  { level: 10, title: "Lexicon Lord", xp: 10000 },
];

export const BOSS_NAMES: Record<string, string> = {
  vocab: "The Lexical Wraith",
  text_completion: "The Syntax Specter",
  critical_reasoning: "The Logic Lich",
  sentence_equivalence: "The Parallel Phantom",
  reading_comprehension: "The Passage Predator",
};

export function getLevelInfo(xp: number): { level: number; title: string; nextXp: number; progress: number } {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1];
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] ?? LEVEL_THRESHOLDS[i];
    }
  }
  const range = next.xp - current.xp || 1;
  const progress = Math.min(((xp - current.xp) / range) * 100, 100);
  return { level: current.level, title: current.title, nextXp: next.xp, progress };
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
