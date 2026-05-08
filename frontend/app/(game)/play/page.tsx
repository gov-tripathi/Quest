"use client";

import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { TOPICS, BOSS_NAMES } from "@/lib/constants";
import { ChevronRight, Swords } from "lucide-react";

export default function PracticePage() {
  const { topicProgress } = useGameStore();
  const progressMap = Object.fromEntries(topicProgress.map((p) => [p.topic_id, p]));

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Practice</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Choose a topic</h1>
        <p className="text-gray-500 text-sm mt-1">AI-generated questions, unique every session.</p>
      </div>

      <div className="space-y-2">
        {TOPICS.map((topic) => {
          const prog     = progressMap[topic.id];
          const answered = prog?.answered ?? 0;
          const correct  = prog?.correct  ?? 0;
          const acc      = answered > 0 ? Math.round((correct / answered) * 100) : null;
          const bossUnlocked = answered >= 5 || (prog?.boss_defeated ?? false);

          return (
            <div key={topic.id}
              className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-4 flex items-center gap-4
                         hover:border-white/10 transition-all group"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0
                              bg-gradient-to-br ${topic.color} bg-opacity-20`}>
                {topic.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{topic.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{topic.description}</p>
              </div>
              {acc !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                  acc >= 70 ? "text-emerald-400 bg-emerald-500/10"
                  : acc >= 50 ? "text-amber-400 bg-amber-500/10"
                  : "text-red-400 bg-red-500/10"
                }`}>{acc}%</span>
              )}
              <div className="flex items-center gap-2 shrink-0">
                {bossUnlocked && (
                  <Link href={`/boss/${topic.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-700/40
                               text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Swords size={12} />
                    Boss
                  </Link>
                )}
                <Link href={`/play/${topic.id}`}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold
                              bg-gradient-to-r ${topic.color} hover:opacity-90 transition-all`}
                >
                  Practice
                  <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
