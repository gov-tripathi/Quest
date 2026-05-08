"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Swords, Trophy, Zap, Target } from "lucide-react";
import { getAccessToken, getSupabase, getGuestToken } from "@/lib/supabase";
import { useGameStore } from "@/store/gameStore";
import { API_URL, getLevelInfo, TOPICS } from "@/lib/constants";
import type { Achievement } from "@/lib/types";

export default function ProfilePage() {
  const { gameState, topicProgress, loadGameState } = useGameStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    loadGameState();
    (async () => {
      if (getGuestToken()) { setUsername("Guest"); return; }
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const profile = await sb.from("profiles").select("username").eq("id", user.id).single();
      setUsername(profile.data?.username ?? user.email ?? "");
      const token = await getAccessToken();
      try {
        const res = await fetch(`${API_URL}/api/me/achievements`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAchievements(await res.json());
      } catch { /* achievements are optional */ }
    })();
  }, [loadGameState]);

  const progressMap = Object.fromEntries(topicProgress.map((p) => [p.topic_id, p]));
  const levelInfo   = gameState ? getLevelInfo(gameState.xp) : null;
  const initials    = username.slice(0, 2).toUpperCase() || "?";
  const accuracy    = gameState && gameState.totalAnswered > 0
    ? Math.round((gameState.totalCorrect / gameState.totalAnswered) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link href="/home"
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center
                     text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <ArrowLeft size={15} />
        </Link>
        <h1 className="font-bold text-white">Profile</h1>
      </div>

      {/* Player card */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                          flex items-center justify-center text-xl font-black text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{username || "—"}</h2>
            {levelInfo && (
              <p className="text-indigo-400 text-sm font-semibold">
                Level {levelInfo.level} · {levelInfo.title}
              </p>
            )}
          </div>
        </div>

        {/* XP bar */}
        {levelInfo && (
          <div className="mb-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{gameState?.xp.toLocaleString()} XP</span>
              <span>{levelInfo.nextXp.toLocaleString()} XP next</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Target  size={13} className="text-indigo-400" />, label: "Answered",    value: gameState?.totalAnswered ?? 0 },
            { icon: <Zap     size={13} className="text-emerald-400"/>, label: "Accuracy",    value: `${accuracy}%` },
            { icon: <Trophy  size={13} className="text-amber-400"  />, label: "Best streak", value: gameState?.bestStreak ?? 0 },
            { icon: <Swords  size={13} className="text-red-400"    />, label: "Bosses",      value: `${gameState?.bossesDefeated ?? 0}/5` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">{icon}{label}</div>
              <p className="text-xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Topic accuracy */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-5">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4">Topic accuracy</p>
        <div className="space-y-4">
          {TOPICS.map((topic) => {
            const prog     = progressMap[topic.id];
            const answered = prog?.answered ?? 0;
            const pct      = answered > 0 ? Math.round(((prog?.correct ?? 0) / answered) * 100) : null;
            return (
              <div key={topic.id} className="flex items-center gap-3">
                <span className="text-base shrink-0">{topic.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400 truncate">{topic.label}</span>
                    <span className={
                      pct === null ? "text-gray-600"
                      : pct >= 70  ? "text-emerald-400"
                      : pct >= 50  ? "text-amber-400"
                      : "text-red-400"
                    }>{pct !== null ? `${pct}%` : "—"}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${topic.color} transition-all duration-700`}
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                </div>
                {prog?.boss_defeated && (
                  <Swords size={13} className="text-red-400 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-4">
            Achievements · {achievements.filter((a) => a.earned).length}/{achievements.length}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {achievements.map((ach) => (
              <div key={ach.id}
                className={`flex items-start gap-3 rounded-xl p-3 border transition-all
                  ${ach.earned
                    ? "border-amber-500/20 bg-amber-500/[0.05]"
                    : "border-white/[0.04] bg-white/[0.02] opacity-40"
                  }`}
              >
                <span className="text-xl shrink-0">{ach.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{ach.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ach.description}</p>
                  {ach.earned && (
                    <p className="text-xs text-amber-500 mt-1 font-semibold">+{ach.xp_reward} XP</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
