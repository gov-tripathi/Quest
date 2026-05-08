"use client";

import { useEffect, useState } from "react";
import { Trophy, Zap, Shield, Flame, Crown } from "lucide-react";
import { getAccessToken } from "@/lib/supabase";
import { API_URL } from "@/lib/constants";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const res  = await fetch(`${API_URL}/api/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEntries(data.leaderboard ?? []);
        setPlayerEntry(data.playerEntry ?? null);
      } catch { /* no-op — guest mode may not have leaderboard */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Global rankings</p>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Trophy size={28} className="text-amber-400" />
          Leaderboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">Top verbal masters worldwide.</p>
      </div>

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[entries[1], entries[0], entries[2]].map((entry, idx) => {
            const rank    = [2, 1, 3][idx];
            const heights = ["h-24", "h-32", "h-20"];
            const colors  = [
              "from-gray-500/20 to-gray-600/10 border-gray-500/20",
              "from-amber-500/20 to-amber-600/10 border-amber-500/30",
              "from-orange-500/20 to-orange-600/10 border-orange-500/20",
            ];
            const crowns = ["text-gray-400", "text-amber-400", "text-orange-400"];
            return (
              <div key={entry.id}
                className={`${idx === 1 ? "order-2" : idx === 0 ? "order-1" : "order-3"}
                  rounded-2xl border bg-gradient-to-b ${colors[idx]}
                  flex flex-col items-center justify-end p-3 gap-1 ${heights[idx]}`}
              >
                <Crown size={16} className={crowns[idx]} />
                <p className="text-xs font-bold text-white text-center truncate w-full text-center">
                  {entry.username ?? "Anonymous"}
                </p>
                <p className={`text-xs font-black ${crowns[idx]}`}>
                  {entry.xp.toLocaleString()} XP
                </p>
                <div className="text-[10px] text-gray-500">#{rank}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
          <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Rank</span>
          <div className="flex gap-8 text-xs text-gray-500 uppercase tracking-widest font-semibold pr-1">
            <span>XP</span>
            <span>Lv</span>
            <span>Streak</span>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-white/[0.04]">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                <div className="w-7 h-4 bg-white/[0.06] rounded" />
                <div className="w-8 h-8 rounded-full bg-white/[0.06]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/[0.06] rounded w-28" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-16" />
                </div>
                <div className="w-16 h-3 bg-white/[0.06] rounded" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-gray-600">
            <Trophy size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No rankings yet — be the first!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {entries.slice(0, 20).map((entry) => (
              <Row key={entry.id} entry={entry} isMe={playerEntry?.id === entry.id} />
            ))}
            {playerEntry && !entries.slice(0, 20).some((e) => e.id === playerEntry.id) && (
              <>
                <div className="px-5 py-2 text-center text-gray-700 text-xs">· · ·</div>
                <Row entry={playerEntry} isMe />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe?: boolean }) {
  const rankIcon =
    entry.rank === 1 ? <Crown size={14} className="text-amber-400" /> :
    entry.rank === 2 ? <Crown size={14} className="text-gray-400"  /> :
    entry.rank === 3 ? <Crown size={14} className="text-orange-500" /> :
    <span className="text-xs text-gray-600 font-mono">{entry.rank}</span>;

  const initials = (entry.username ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 transition-colors
      ${isMe ? "bg-indigo-500/[0.07] border-l-2 border-indigo-500" : "hover:bg-white/[0.02]"}`}
    >
      <div className="w-6 flex justify-center shrink-0">{rankIcon}</div>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-600/40
                      border border-white/10 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-black text-white">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isMe ? "text-indigo-300" : "text-white"}`}>
          {entry.username ?? "Anonymous"}
          {isMe && <span className="ml-1.5 text-[10px] text-indigo-500 font-normal">you</span>}
        </p>
        <p className="text-xs text-gray-600">Level {entry.level}</p>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-1 text-amber-400">
          <Zap size={11} className="fill-amber-400" />
          <span className="text-xs font-bold">{entry.xp.toLocaleString()}</span>
        </div>
        <span className="text-xs text-gray-500 w-5 text-center font-mono">{entry.level}</span>
        <div className="flex items-center gap-1 text-orange-400 w-8">
          {entry.best_streak > 0 && (
            <>
              <Flame size={11} />
              <span className="text-xs font-bold">{entry.best_streak}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
