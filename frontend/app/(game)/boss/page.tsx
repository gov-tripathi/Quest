"use client";

import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { TOPICS, BOSS_NAMES } from "@/lib/constants";
import { Swords, Lock, ChevronRight } from "lucide-react";

export default function BossSelectPage() {
  const { topicProgress } = useGameStore();
  const progressMap = Object.fromEntries(topicProgress.map((p) => [p.topic_id, p]));

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Boss Battles</p>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Swords size={26} className="text-red-400" />
          Choose your opponent
        </h1>
        <p className="text-gray-500 text-sm mt-1">Answer 5 questions to unlock each boss. Expert difficulty, no hints.</p>
      </div>

      <div className="space-y-2">
        {TOPICS.map((topic) => {
          const prog     = progressMap[topic.id];
          const answered = prog?.answered ?? 0;
          const defeated = prog?.boss_defeated ?? false;
          const unlocked = answered >= 5 || defeated;
          const needed   = Math.max(0, 5 - answered);
          const bossName = BOSS_NAMES[topic.id] ?? "The Boss";

          return (
            <div key={topic.id}
              className={`rounded-2xl border p-4 flex items-center gap-4 transition-all
                ${unlocked
                  ? "border-white/[0.06] bg-[#0d1220] hover:border-white/10"
                  : "border-white/[0.03] bg-[#0d1220]/60 opacity-60"
                }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0
                              ${unlocked ? "bg-red-500/10 border border-red-500/20" : "bg-white/[0.03]"}`}>
                {unlocked ? topic.icon : <Lock size={16} className="text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${unlocked ? "text-red-300" : "text-gray-600"}`}>
                  {bossName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {defeated
                    ? "✓ Defeated"
                    : unlocked
                    ? `${topic.label} · Expert`
                    : `Answer ${needed} more ${topic.label} questions to unlock`}
                </p>
              </div>
              {defeated && (
                <span className="text-xs text-emerald-400 font-semibold shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                  Defeated
                </span>
              )}
              {unlocked && (
                <Link href={`/boss/${topic.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg shrink-0
                             bg-gradient-to-r from-red-700 to-rose-600 text-white text-xs font-bold
                             hover:opacity-90 transition-all"
                >
                  <Swords size={11} />
                  {defeated ? "Rematch" : "Fight"}
                  <ChevronRight size={11} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
