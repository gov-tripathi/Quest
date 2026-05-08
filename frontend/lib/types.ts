// ─── AG-UI Event Types ────────────────────────────────────────────────────────

export type AGUIEventType =
  | "RUN_STARTED"
  | "STATE_SNAPSHOT"
  | "AGENT_ACTION"
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  | "STATE_DELTA"
  | "INTERRUPT"
  | "LEVEL_UP"
  | "BOSS_DEFEATED"
  | "STREAK_MILESTONE"
  | "DIFFICULTY_SHIFT"
  | "QUESTION_READY"
  | "RUN_FINISHED"
  | "ERROR";

export interface AGUIEvent {
  type: AGUIEventType;
  [key: string]: unknown;
}

export interface JSONPatchOp {
  op: "replace" | "add" | "remove";
  path: string;
  value?: unknown;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  dailyStreak: number;
  bossesDefeated: number;
  totalAnswered: number;
  totalCorrect: number;
  lastPlayedAt: string | null;
}

export interface TopicProgress {
  topic_id: string;
  correct: number;
  answered: number;
  boss_defeated: boolean;
  last_seen_at: string | null;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  bosses_defeated: number;
  best_streak: number;
  rank: number;
}

// ─── Question ─────────────────────────────────────────────────────────────────

export interface QuestionData {
  options: Record<string, string>;
  questionType: string;
  allowMultiple: boolean;
}

// ─── Stream State ─────────────────────────────────────────────────────────────

export type StreamPhase = "question" | "explanation" | "narration" | "hint" | null;
export type SessionPhase = "idle" | "running" | "answering" | "interrupt" | "done" | "error";

export interface StreamState {
  phase: SessionPhase;
  streamText: string;
  streamPhase: StreamPhase;
  interrupt: { runId: string; reason: string } | null;
  isLoading: boolean;
  question: QuestionData | null;
  currentDifficulty: string;
  lastResult: {
    isCorrect: boolean;
    xpEarned: number;
    correctAnswers: string[];
  } | null;
  bossHP: number;
  playerHP: number;
  bossDefeated: boolean;
  runId: string | null;
}

// ─── Boss ─────────────────────────────────────────────────────────────────────

export interface BossDefeatedEvent {
  topicId: string;
  rewardXp: number;
  bossName: string;
}

export interface LevelUpEvent {
  level: number;
  title: string;
  xp: number;
}

export interface StreakMilestoneEvent {
  streak: number;
  bonusXp: number;
}

// ─── Achievement ──────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  earned: boolean;
  earned_at: string | null;
}

// ─── Topic ────────────────────────────────────────────────────────────────────

export interface Topic {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}
