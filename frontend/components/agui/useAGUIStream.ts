"use client";

import { useCallback, useRef, useState } from "react";
import type {
  StreamState, AGUIEvent, JSONPatchOp,
  QuestionData, LevelUpEvent, BossDefeatedEvent, StreakMilestoneEvent,
} from "@/lib/types";
import { getAccessToken } from "@/lib/supabase";
import { API_URL } from "@/lib/constants";
import { useGameStore } from "@/store/gameStore";

const INITIAL_STATE: StreamState = {
  phase: "idle",
  streamText: "",
  streamPhase: null,
  interrupt: null,
  isLoading: false,
  question: null,
  currentDifficulty: "medium",
  lastResult: null,
  bossHP: 5,
  playerHP: 3,
  bossDefeated: false,
  runId: null,
};

interface UseAGUIStreamOptions {
  onLevelUp?: (event: LevelUpEvent) => void;
  onBossDefeated?: (event: BossDefeatedEvent) => void;
  onStreakMilestone?: (event: StreakMilestoneEvent) => void;
}

async function readSSEStream(
  response: Response,
  onEvent: (event: AGUIEvent) => void
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      for (const line of block.split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            onEvent(JSON.parse(line.slice(6)) as AGUIEvent);
          } catch {
            // malformed event – skip
          }
        }
      }
    }
  }
}

export function useAGUIStream(options: UseAGUIStreamOptions = {}) {
  const [state, setState] = useState<StreamState>(INITIAL_STATE);
  const sessionIdRef = useRef<string | null>(null);
  const applyPatch = useGameStore((s) => s.applyPatch);
  const setLevelUpPending = useGameStore((s) => s.setLevelUpPending);

  const processEvent = useCallback(
    (event: AGUIEvent) => {
      switch (event.type) {
        case "RUN_STARTED":
          setState((s) => ({
            ...s,
            phase: "running",
            isLoading: false,
            runId: event.runId as string,
          }));
          break;

        case "AGENT_ACTION":
          setState((s) => ({ ...s, isLoading: true }));
          break;

        case "TEXT_MESSAGE_START":
          setState((s) => ({
            ...s,
            streamText: "",
            streamPhase: event.phase as StreamState["streamPhase"],
            isLoading: false,
          }));
          break;

        case "TEXT_MESSAGE_CONTENT":
          setState((s) => ({
            ...s,
            streamText: s.streamText + (event.delta as string),
          }));
          break;

        case "TEXT_MESSAGE_END":
          setState((s) => ({ ...s, isLoading: false }));
          break;

        case "QUESTION_READY":
          setState((s) => ({
            ...s,
            question: {
              options: event.options as Record<string, string>,
              questionType: event.questionType as string,
              allowMultiple: event.allowMultiple as boolean,
            } satisfies QuestionData,
          }));
          break;

        case "STATE_SNAPSHOT":
          // Full game state replaces local; delegate to store
          break;

        case "STATE_DELTA": {
          const patch = event.patch as JSONPatchOp[];
          // Update stream state for battle-relevant fields
          setState((s) => {
            const next = { ...s };
            for (const op of patch) {
              if (op.path === "/bossHP") next.bossHP = op.value as number;
              if (op.path === "/playerHP") next.playerHP = op.value as number;
              if (op.path === "/bossDefeated") next.bossDefeated = true;
              if (op.path === "/currentDifficulty") next.currentDifficulty = op.value as string;
              if (op.path === "/isCorrect")
                next.lastResult = {
                  isCorrect: op.value as boolean,
                  xpEarned: 0,
                  correctAnswers: [],
                };
              if (op.path === "/xpEarned" && next.lastResult)
                next.lastResult.xpEarned = op.value as number;
              if (op.path === "/correctAnswers" && next.lastResult)
                next.lastResult.correctAnswers = op.value as string[];
            }
            return next;
          });
          // Delegate XP / level updates to global store
          applyPatch(patch);
          break;
        }

        case "INTERRUPT":
          setState((s) => ({
            ...s,
            phase: "interrupt",
            interrupt: { runId: event.runId as string, reason: event.reason as string },
            isLoading: false,
          }));
          break;

        case "LEVEL_UP":
          setLevelUpPending({ level: event.level as number, title: event.title as string });
          options.onLevelUp?.({
            level: event.level as number,
            title: event.title as string,
            xp: event.xp as number,
          });
          break;

        case "BOSS_DEFEATED":
          options.onBossDefeated?.({
            topicId: event.topicId as string,
            rewardXp: event.rewardXp as number,
            bossName: event.bossName as string,
          });
          break;

        case "STREAK_MILESTONE":
          options.onStreakMilestone?.({
            streak: event.streak as number,
            bonusXp: event.bonusXp as number,
          });
          break;

        case "DIFFICULTY_SHIFT":
          setState((s) => ({ ...s, currentDifficulty: event.to as string }));
          break;

        case "RUN_FINISHED":
          setState((s) => ({
            ...s,
            // Stay in "answering" if question is ready but not yet evaluated
            phase: s.question && !s.lastResult ? "answering" : "done",
            isLoading: false,
          }));
          break;

        case "ERROR":
          setState((s) => ({
            ...s,
            phase: "error",
            isLoading: false,
          }));
          break;
      }
    },
    [applyPatch, options, setLevelUpPending]
  );

  const startSession = useCallback(
    async (topicId: string, mode: string = "practice") => {
      setState({ ...INITIAL_STATE, phase: "running", isLoading: true });
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_URL}/api/session/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ topic_id: topicId, mode }),
        });
        if (!res.ok) throw new Error(`Backend error ${res.status}`);
        await readSSEStream(res, (ev) => {
          if (ev.type === "RUN_STARTED") sessionIdRef.current = ev.runId as string;
          processEvent(ev);
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          phase: "error",
          isLoading: false,
          streamText: err instanceof Error ? err.message : "Could not reach server",
        }));
      }
    },
    [processEvent]
  );

  const submitAnswer = useCallback(
    async (answer: string, timeTakenMs?: number) => {
      if (!sessionIdRef.current) return;
      setState((s) => ({ ...s, phase: "running", isLoading: true, streamText: "", lastResult: null }));
      try {
        const token = await getAccessToken();
        const res = await fetch(`${API_URL}/api/session/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            answer,
            time_taken_ms: timeTakenMs,
          }),
        });
        if (!res.ok) throw new Error(`Backend error ${res.status}`);
        await readSSEStream(res, processEvent);
      } catch (err) {
        setState((s) => ({
          ...s,
          phase: "error",
          isLoading: false,
          streamText: err instanceof Error ? err.message : "Could not reach server",
        }));
      }
    },
    [processEvent]
  );

  const requestHint = useCallback(async () => {
    if (!sessionIdRef.current) return;
    setState((s) => ({ ...s, isLoading: true }));
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}/api/session/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ session_id: sessionIdRef.current }),
    });
    await readSSEStream(res, processEvent);
  }, [processEvent]);

  const startBoss = useCallback(
    async (topicId: string) => {
      setState({ ...INITIAL_STATE, phase: "running", isLoading: true, bossHP: 5, playerHP: 3 });
      const token = await getAccessToken();
      const res = await fetch(`${API_URL}/api/boss/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic_id: topicId }),
      });
      await readSSEStream(res, (ev) => {
        if (ev.type === "RUN_STARTED") sessionIdRef.current = ev.runId as string;
        processEvent(ev);
      });
    },
    [processEvent]
  );

  const resumeBoss = useCallback(
    async (runId: string, answer: string, timeTakenMs?: number) => {
      const token = await getAccessToken();
      setState((s) => ({ ...s, phase: "running", isLoading: true, interrupt: null }));
      await fetch(`${API_URL}/api/boss/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ run_id: runId, answer, time_taken_ms: timeTakenMs }),
      });
    },
    []
  );

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return {
    state,
    startSession,
    submitAnswer,
    requestHint,
    startBoss,
    resumeBoss,
    reset,
  };
}
