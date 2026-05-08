"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Zap, ChevronRight } from "lucide-react";
import { useAGUIStream } from "@/components/agui/useAGUIStream";
import { useGameStore } from "@/store/gameStore";
import { TOPICS } from "@/lib/constants";
import type { BossDefeatedEvent } from "@/lib/types";
import BossDefeatedOverlay from "@/components/ui/BossDefeatedOverlay";

export default function PlayPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const topic = TOPICS.find((t) => t.id === topicId);

  const [selected,          setSelected]          = useState<string[]>([]);
  const [bossEvent,         setBossEvent]          = useState<BossDefeatedEvent | null>(null);
  const [questionStartTime, setQuestionStartTime]  = useState(0);
  const gameState = useGameStore((s) => s.gameState);

  const { state, startSession, submitAnswer, requestHint } = useAGUIStream({
    onBossDefeated: (e) => setBossEvent(e),
  });

  const handleStart = () => {
    setSelected([]);
    setQuestionStartTime(Date.now());
    startSession(topicId);
  };

  const handleSelect = (letter: string) => {
    if ((state.phase !== "running" && state.phase !== "answering") || !state.question) return;
    if (state.question.allowMultiple) {
      setSelected((prev) =>
        prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
      );
    } else {
      handleSubmit(letter);
    }
  };

  const handleSubmit = (answer?: string) => {
    const ans = answer ?? (state.question?.allowMultiple ? selected.sort().join(",") : selected[0]);
    if (!ans) return;
    submitAnswer(ans, Date.now() - questionStartTime);
    setSelected([]);
  };

  const handleNext = () => {
    setSelected([]);
    setQuestionStartTime(Date.now());
    startSession(topicId);
  };

  const isAnswering   = (state.phase === "running" || state.phase === "answering") && !!state.question && state.streamPhase !== "explanation";
  const showResult    = !!state.lastResult && (state.streamPhase === "explanation" || state.phase === "done");

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-slide-up">
      <BossDefeatedOverlay event={bossEvent} onClose={() => setBossEvent(null)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/home"
            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center
                       text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h1 className="font-bold text-white text-sm">{topic?.label}</h1>
            <p className="text-xs text-gray-600">{state.currentDifficulty}</p>
          </div>
        </div>
        {gameState && gameState.streak >= 2 && (
          <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
            <Zap size={13} className="fill-amber-400" />
            {gameState.streak}
          </div>
        )}
      </div>

      {/* Loading bar */}
      {state.isLoading && (
        <div className="h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse w-full" />
        </div>
      )}

      {/* Error */}
      {state.phase === "error" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
          <p className="text-red-400 font-semibold mb-1">Connection failed</p>
          <p className="text-gray-500 text-xs mb-5 font-mono">{state.streamText}</p>
          <button onClick={handleStart}
            className="px-6 py-2.5 rounded-xl border border-white/[0.08] text-gray-400 hover:text-white text-sm font-semibold transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Idle */}
      {state.phase === "idle" && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-12 text-center">
          <div className={`text-6xl mb-4 inline-block p-5 rounded-2xl bg-gradient-to-br ${topic?.color} bg-opacity-10`}>
            {topic?.icon}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{topic?.label}</h2>
          <p className="text-gray-500 text-sm mb-8">{topic?.description}</p>
          <button
            onClick={handleStart}
            className={`px-8 py-3.5 rounded-xl bg-gradient-to-r ${topic?.color} text-white font-bold text-sm
                        transition-all active:scale-95 shadow-lg flex items-center gap-2 mx-auto`}
          >
            Start Practice
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Question text streaming */}
      {state.streamText && state.streamPhase === "question" && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md bg-gradient-to-r ${topic?.color} text-white opacity-80`}>
              {topic?.label}
            </span>
            <span className="text-xs text-gray-600 capitalize">{state.currentDifficulty}</span>
          </div>
          <p className="text-gray-100 leading-relaxed text-base whitespace-pre-wrap">
            {state.streamText}
            {state.isLoading && (
              <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle rounded-full" />
            )}
          </p>
        </div>
      )}

      {/* Options */}
      {state.question && isAnswering && (
        <div className="space-y-2">
          {Object.entries(state.question.options).sort().map(([letter, text]) => (
            <button
              key={letter}
              onClick={() => handleSelect(letter)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all
                ${selected.includes(letter)
                  ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-200"
                  : "border-white/[0.06] bg-[#0d1220] text-gray-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                }`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.06]
                               text-xs font-black text-gray-400 mr-3 shrink-0">{letter}</span>
              {text}
            </button>
          ))}
          {state.question.allowMultiple && (
            <button
              onClick={() => handleSubmit()}
              disabled={selected.length < 2}
              className="mt-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30
                         text-white font-bold text-sm transition-all active:scale-[0.99]"
            >
              Submit ({selected.length}/2 selected)
            </button>
          )}
          <button
            onClick={requestHint}
            className="w-full py-2.5 rounded-xl border border-white/[0.06] text-gray-500
                       hover:border-amber-500/30 hover:text-amber-400 text-xs font-medium transition-all
                       flex items-center justify-center gap-2"
          >
            <Lightbulb size={13} />
            Hint — caps XP at 50%
          </button>
        </div>
      )}

      {/* Hint */}
      {state.streamPhase === "hint" && state.streamText && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-5 py-4">
          <p className="text-xs text-amber-400 font-semibold mb-1.5 flex items-center gap-1.5">
            <Lightbulb size={12} /> Hint
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">{state.streamText}</p>
        </div>
      )}

      {/* Post-answer options (highlighted) */}
      {state.question && showResult && state.lastResult && (
        <div className="space-y-2">
          {Object.entries(state.question.options).sort().map(([letter, text]) => {
            const isCorrect = state.lastResult!.correctAnswers.includes(letter);
            return (
              <div key={letter}
                className={`px-4 py-3.5 rounded-xl border text-sm font-medium
                  ${isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/[0.04] bg-[#0d1220]/60 text-gray-600"
                  }`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-black mr-3 shrink-0
                  ${isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-white/[0.04] text-gray-600"}`}>
                  {letter}
                </span>
                {text}
              </div>
            );
          })}
        </div>
      )}

      {/* Explanation */}
      {state.lastResult && (state.streamPhase === "explanation" || state.phase === "done") && (
        <div className={`rounded-2xl border p-5
          ${state.lastResult.isCorrect
            ? "border-emerald-500/20 bg-emerald-500/[0.05]"
            : "border-red-500/20 bg-red-500/[0.05]"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{state.lastResult.isCorrect ? "✓" : "✗"}</span>
              <span className={`font-bold text-base ${state.lastResult.isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                {state.lastResult.isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>
            {state.lastResult.isCorrect && state.lastResult.xpEarned > 0 && (
              <span className="text-amber-400 font-black text-sm animate-xp-pulse flex items-center gap-1">
                <Zap size={12} className="fill-amber-400" />
                +{state.lastResult.xpEarned} XP
              </span>
            )}
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {state.streamText}
            {state.streamPhase === "explanation" && (
              <span className="inline-block w-0.5 h-3.5 bg-gray-400 animate-pulse ml-0.5 align-middle rounded-full" />
            )}
          </p>
        </div>
      )}

      {/* Next */}
      {state.phase === "done" && (
        <button
          onClick={handleNext}
          className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${topic?.color} text-white font-bold text-sm
                      transition-all active:scale-[0.99] flex items-center justify-center gap-2`}
        >
          Next Question
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
