"use client";

import { useEffect, useState } from "react";
import { getSupabase, getAccessToken } from "@/lib/supabase";
import { API_URL } from "@/lib/constants";
import type { LeaderboardEntry } from "@/lib/types";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntries(data.leaderboard ?? []);
      setPlayerEntry(data.playerEntry ?? null);
      setLoading(false);
    };
    load();

    // Supabase Realtime subscription
    const sb = getSupabase();
    const channel = sb
      .channel("leaderboard-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_state" }, () => {
        load();
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900/60 p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 rounded mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-2">
        <span className="text-xl">🏆</span>
        <h2 className="font-bold text-white text-lg">Leaderboard</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {entries.slice(0, 10).map((entry) => (
          <LeaderboardRow key={entry.id} entry={entry} />
        ))}
      </div>
      {playerEntry && !entries.some((e) => e.id === playerEntry.id) && (
        <>
          <div className="px-5 py-2 text-center text-gray-600 text-xs">· · ·</div>
          <LeaderboardRow entry={playerEntry} highlight />
        </>
      )}
    </div>
  );
}

function LeaderboardRow({ entry, highlight }: { entry: LeaderboardEntry; highlight?: boolean }) {
  const rankEmoji = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${highlight ? "bg-brand-950/50" : ""}`}>
      <span className="w-8 text-center text-sm font-bold text-gray-400">
        {rankEmoji ?? `#${entry.rank}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{entry.username}</p>
        <p className="text-xs text-gray-500">Level {entry.level}</p>
      </div>
      <span className="text-gold-400 font-bold text-sm">{entry.xp.toLocaleString()} XP</span>
    </div>
  );
}
