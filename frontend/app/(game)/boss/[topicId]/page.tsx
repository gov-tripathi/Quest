"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Swords, ChevronRight } from "lucide-react";
import { useAGUIStream } from "@/components/agui/useAGUIStream";
import BossHPBar from "@/components/game/BossHPBar";
import InterruptPanel from "@/components/agui/InterruptPanel";
import BossDefeatedOverlay from "@/components/ui/BossDefeatedOverlay";
import { TOPICS, BOSS_NAMES } from "@/lib/constants";
import type { BossDefeatedEvent } from "@/lib/types";

export default function BossPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const topic    = TOPICS.find((t) => t.id === topicId);
  const bossName = BOSS_NAMES[topicId] ?? "The Boss";

  const [bossEvent,         setBossEvent]         = useState<BossDefeatedEvent | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);

  const { state, startBoss, resumeBoss } = useAGUIStream({
    onBossDefeated: (e) => setBossEvent(e),
  });

  const handleStart = () => {
    setQuestionStartTime(Date.now());
    startBoss(topicId);
  };

  const handleAnswer = (answer: string) => {
    if (!state.interrupt) return;
    resumeBoss(state.interrupt.runId, answer, Date.now() - questionStartTime);
    setQuestionStartTime(Date.now());
  };

  const isVictory = state.phase === "done" && state.bossDefeated;
  const isDefeat  = state.phase === "done" && !state.bossDefeated && state.playerHP <= 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-slide-up">
      <BossDefeatedOverlay event={bossEvent} onClose={() => setBossEvent(null)} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/boss"
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center
                     text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="font-black text-red-400 text-sm flex items-center gap-1.5">
            <Swords size={14} /> Boss Battle
          </h1>
          <p className="text-xs text-gray-600">{topic?.label}</p>
        </div>
      </div>

      {/* Loading bar */}
      {state.isLoading && (
        <div className="h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 animate-pulse w-full" />
        </div>
      )}

      {/* HP Bars */}
      {state.phase !== "idle" && (
        <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-5 space-y-3">
          <BossHPBar label={bossName} hp={state.bossHP} maxHp={5} color="red"   icon="🐉" />
          <BossHPBar label="You"      hp={state.playerHP} maxHp={3} color="green" icon="🛡️" />
        </div>
      )}

      {/* Idle */}
      {state.phase === "idle" && (
        <div className="rounded-2xl border border-red-500/10 bg-[#0d1220] p-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20
                          flex items-center justify-center text-4xl mx-auto mb-5">
            🐉
          </div>
          <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-2">Boss Battle</p>
          <h2 className="text-2xl font-black text-white mb-2">{bossName}</h2>
          <p className="text-gray-500 text-sm mb-1">{topic?.label} · Expert difficulty</p>
          <p className="text-gray-600 text-xs mb-8">5 HP · You have 3 HP · No hints</p>
          <button onClick={handleStart}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl
                       bg-gradient-to-r from-red-700 to-rose-600 text-white font-bold
                       transition-all active:scale-95 shadow-lg shadow-red-950/50"
          >
            <Swords size={16} />
            Begin Battle
          </button>
        </div>
      )}

      {/* Narration */}
      <AnimatePresence>
        {state.streamText && state.streamPhase === "narration" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-red-500/10 bg-red-500/[0.04] px-5 py-4"
          >
            <p className="text-red-200/80 italic text-sm leading-relaxed">
              {state.streamText}
              {state.isLoading && (
                <span className="inline-block w-0.5 h-3.5 bg-red-400 animate-pulse ml-0.5 align-middle rounded-full" />
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question */}
      {state.streamText && state.streamPhase === "question" && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-500/20 text-red-400">
              Boss · Expert
            </span>
          </div>
          <p className="text-gray-100 leading-relaxed text-base whitespace-pre-wrap">
            {state.streamText}
            {state.isLoading && !state.interrupt && (
              <span className="inline-block w-0.5 h-4 bg-red-400 animate-pulse ml-0.5 align-middle rounded-full" />
            )}
          </p>
        </div>
      )}

      {/* Answer panel */}
      {state.interrupt && state.question && (
        <InterruptPanel
          interrupt={state.interrupt}
          options={state.question.options}
          allowMultiple={state.question.allowMultiple}
          onSubmit={handleAnswer}
        />
      )}

      {/* Victory */}
      {isVictory && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <h2 className="text-2xl font-black text-white mb-1">Victory!</h2>
          <p className="text-gray-400 text-sm mb-6">You defeated {bossName}!</p>
          <Link href="/boss"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
                       text-white font-bold text-sm transition-all"
          >
            Return to Boss Select
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Defeat */}
      {isDefeat && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-8 text-center">
          <div className="text-4xl mb-3">💀</div>
          <h2 className="text-2xl font-black text-white mb-1">Defeated</h2>
          <p className="text-gray-400 text-sm mb-6">{bossName} prevails… this time.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleStart}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-700 to-rose-600
                         text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <Swords size={14} /> Rematch
            </button>
            <Link href="/boss"
              className="px-6 py-3 rounded-xl border border-white/[0.08] text-gray-400
                         hover:text-white hover:border-white/20 font-semibold text-sm transition-all"
            >
              Retreat
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
