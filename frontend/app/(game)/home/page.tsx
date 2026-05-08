"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { TOPICS, getLevelInfo } from "@/lib/constants";
import { Zap, Target, Flame, Shield, BookOpen, Swords, Star } from "lucide-react";
import Sparkline from "@/components/ui/Sparkline";

export default function HomePage() {
  const { gameState, topicProgress, loadGameState } = useGameStore();
  useEffect(() => { loadGameState(); }, [loadGameState]);

  const progressMap = Object.fromEntries(topicProgress.map((p) => [p.topic_id, p]));
  const levelInfo = gameState ? getLevelInfo(gameState.xp) : null;

  const accuracy = gameState && gameState.totalAnswered > 0
    ? Math.round((gameState.totalCorrect / gameState.totalAnswered) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Dashboard · All time</p>
        <h1 className="text-3xl font-black text-white tracking-tight">
          {levelInfo ? levelInfo.title : "Welcome"}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's how your verbal mastery is trending.</p>
      </div>

      {/* Last activity banner */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center">
            <BookOpen size={15} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Last activity</p>
            <p className="text-sm font-semibold text-white">Practice Session</p>
          </div>
          <span className="ml-auto text-xs text-gray-600">Today</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: "Total Answered",  value: gameState?.totalAnswered ?? 0,   unit: "q" },
            { label: "Correct",         value: gameState?.totalCorrect ?? 0,    unit: "q" },
            { label: "Accuracy",        value: accuracy,                         unit: "%" },
            { label: "Bosses Defeated", value: gameState?.bossesDefeated ?? 0,  unit: "/5" },
          ].map(({ label, value, unit }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-2xl font-black text-white">
                {value.toLocaleString()}
                <span className="text-sm font-normal text-gray-500 ml-0.5">{unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Zap size={15} className="text-indigo-400" />}
          label="Total XP"
          value={gameState?.xp.toLocaleString() ?? "0"}
          sub={levelInfo ? `Level ${levelInfo.level}` : ""}
          sparkData={[20, 35, 28, 50, 45, 60, 55, 80, 70, 95]}
          color="indigo"
        />
        <StatCard
          icon={<Flame size={15} className="text-orange-400" />}
          label="Current streak"
          value={gameState?.streak ?? 0}
          sub={`Best: ${gameState?.bestStreak ?? 0}`}
          sparkData={[1,2,3,5,4,6,5,7,8,gameState?.streak ?? 0]}
          color="orange"
        />
        <StatCard
          icon={<Target size={15} className="text-emerald-400" />}
          label="Accuracy"
          value={`${accuracy}%`}
          sub={`${gameState?.totalAnswered ?? 0} questions`}
          sparkData={[60,55,65,70,68,75,72,80,accuracy,accuracy]}
          color="emerald"
        />
        <StatCard
          icon={<Shield size={15} className="text-purple-400" />}
          label="Bosses"
          value={`${gameState?.bossesDefeated ?? 0}/5`}
          sub="defeated"
          sparkData={[0,0,1,1,1,2,2,3,gameState?.bossesDefeated ?? 0, gameState?.bossesDefeated ?? 0]}
          color="purple"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link href="/daily"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20
                     text-amber-400 text-sm font-semibold hover:bg-amber-500/15 transition-all"
        >
          <Star size={14} className="fill-amber-400" />
          Daily Challenge
        </Link>
        <Link href="/leaderboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]
                     text-gray-400 text-sm font-semibold hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <Swords size={14} />
          Leaderboard
        </Link>
      </div>

      {/* Topics */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4">Topics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TOPICS.map((topic) => {
            const prog = progressMap[topic.id];
            const answered = prog?.answered ?? 0;
            const correct  = prog?.correct  ?? 0;
            const acc      = answered > 0 ? Math.round((correct / answered) * 100) : null;
            const bossUnlocked = answered >= 5 || (prog?.boss_defeated ?? false);

            return (
              <div key={topic.id}
                className="group rounded-2xl border border-white/[0.06] bg-[#0d1220] p-4 hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-gradient-to-br ${topic.color} bg-opacity-20`}>
                    {topic.icon}
                  </div>
                  {acc !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      acc >= 70 ? "text-emerald-400 bg-emerald-500/10"
                      : acc >= 50 ? "text-amber-400 bg-amber-500/10"
                      : "text-red-400 bg-red-500/10"
                    }`}>{acc}%</span>
                  )}
                </div>
                <p className="text-sm font-bold text-white mb-0.5">{topic.label}</p>
                <p className="text-xs text-gray-500 mb-3">{answered} answered</p>
                <div className="flex gap-2">
                  <Link href={`/play/${topic.id}`}
                    className={`flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-gradient-to-r ${topic.color} text-white hover:opacity-90 transition-all`}
                  >
                    Practice
                  </Link>
                  {bossUnlocked && (
                    <Link href={`/boss/${topic.id}`}
                      className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-red-700/50 text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      Boss
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, sparkData, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  sparkData: number[];
  color: "indigo" | "orange" | "emerald" | "purple";
}) {
  const stroke = {
    indigo:  "#818cf8",
    orange:  "#fb923c",
    emerald: "#34d399",
    purple:  "#c084fc",
  }[color];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04]`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-black text-white leading-tight">{value}</p>
        <p className="text-xs text-gray-600">{sub}</p>
      </div>
      <Sparkline data={sparkData} stroke={stroke} height={32} />
    </div>
  );
}
