import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { GameState, TopicProgress, JSONPatchOp } from "@/lib/types";

interface GameStore {
  gameState: GameState | null;
  topicProgress: TopicProgress[];
  isLoading: boolean;
  levelUpPending: { level: number; title: string } | null;

  loadGameState: () => Promise<void>;
  applyPatch: (patch: JSONPatchOp[]) => void;
  setLevelUpPending: (v: { level: number; title: string } | null) => void;
}

const defaultGameState: GameState = {
  xp: 0, level: 1, streak: 0, bestStreak: 0,
  dailyStreak: 0, bossesDefeated: 0,
  totalAnswered: 0, totalCorrect: 0, lastPlayedAt: null,
};

function applyJsonPatch(obj: Record<string, unknown>, patch: JSONPatchOp[]): void {
  for (const op of patch) {
    const parts = op.path.split("/").filter(Boolean);
    let target: Record<string, unknown> = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (target[parts[i]] == null) target[parts[i]] = {};
      target = target[parts[i]] as Record<string, unknown>;
    }
    const key = parts[parts.length - 1];
    if (op.op === "replace" || op.op === "add") target[key] = op.value;
    else if (op.op === "remove") delete target[key];
  }
}

function mapDbState(db: Record<string, unknown>): GameState {
  return {
    xp:            (db.xp as number)              ?? 0,
    level:         (db.level as number)            ?? 1,
    streak:        (db.streak as number)           ?? 0,
    bestStreak:    (db.best_streak as number)      ?? 0,
    dailyStreak:   (db.daily_streak as number)     ?? 0,
    bossesDefeated:(db.bosses_defeated as number)  ?? 0,
    totalAnswered: (db.total_answered as number)   ?? 0,
    totalCorrect:  (db.total_correct as number)    ?? 0,
    lastPlayedAt:  (db.last_played_at as string)   ?? null,
  };
}

export const useGameStore = create<GameStore>()(
  immer((set) => ({
    gameState: null,
    topicProgress: [],
    isLoading: false,
    levelUpPending: null,

    loadGameState: async () => {
      set((s) => { s.isLoading = true; });

      // Guest mode: no Supabase, use in-memory defaults
      const guestToken = typeof window !== "undefined"
        ? localStorage.getItem("grequest_guest_token")
        : null;

      if (guestToken) {
        set((s) => {
          s.gameState = { ...defaultGameState };
          s.topicProgress = [];
          s.isLoading = false;
        });
        return;
      }

      // Supabase mode
      try {
        const { getSupabase } = await import("@/lib/supabase");
        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) { set((s) => { s.isLoading = false; }); return; }

        const [gsRes, tpRes] = await Promise.all([
          sb.from("game_state").select("*").eq("user_id", user.id).single(),
          sb.from("topic_progress").select("*").eq("user_id", user.id),
        ]);

        set((s) => {
          s.gameState = gsRes.data ? mapDbState(gsRes.data) : { ...defaultGameState };
          s.topicProgress = tpRes.data ?? [];
          s.isLoading = false;
        });
      } catch {
        set((s) => { s.isLoading = false; });
      }
    },

    applyPatch: (patch) => {
      set((s) => {
        if (!s.gameState) return;
        applyJsonPatch(s.gameState as unknown as Record<string, unknown>, patch);
      });
    },

    setLevelUpPending: (v) => set((s) => { s.levelUpPending = v; }),
  }))
);
