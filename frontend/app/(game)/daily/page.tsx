"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ArrowLeft, ChevronRight, CheckCircle } from "lucide-react";
import { getAccessToken } from "@/lib/supabase";
import { API_URL, TOPICS } from "@/lib/constants";

interface DailyChallenge {
  id: string;
  date: string;
  topic_id: string;
  difficulty: string;
  bonus_xp: number;
}

export default function DailyPage() {
  const [challenge,  setChallenge]  = useState<DailyChallenge | null>(null);
  const [completed,  setCompleted]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const res   = await fetch(`${API_URL}/api/daily-challenge`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("not ok");
        const data = await res.json();
        setChallenge(data.challenge ?? null);
        setCompleted(data.completed ?? false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const topic = TOPICS.find((t) => t.id === challenge?.topic_id);

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Link href="/home"
          className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center
                     text-gray-500 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <ArrowLeft size={15} />
        </Link>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Daily</p>
          <h1 className="font-black text-white text-xl tracking-tight">Daily Challenge</h1>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-10 animate-pulse flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06]" />
          <div className="h-4 w-32 bg-white/[0.06] rounded" />
          <div className="h-3 w-48 bg-white/[0.04] rounded" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-10 text-center">
          <p className="text-gray-500 text-sm mb-4">Couldn't load today's challenge.</p>
          <Link href="/home"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>
      )}

      {!loading && !error && !challenge && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-10 text-center">
          <Star size={32} className="mx-auto mb-3 text-gray-600" />
          <h2 className="text-lg font-bold text-white mb-1">No challenge today</h2>
          <p className="text-gray-500 text-sm mb-6">Check back soon!</p>
          <Link href="/home"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-white/[0.08]
                       text-gray-400 hover:text-white text-sm font-semibold transition-all"
          >
            <ArrowLeft size={13} />
            Back to Dashboard
          </Link>
        </div>
      )}

      {!loading && !error && challenge && (
        <div className={`rounded-2xl border p-8 text-center
          ${completed
            ? "border-emerald-500/20 bg-emerald-500/[0.04]"
            : "border-amber-500/20 bg-amber-500/[0.04]"
          }`}
        >
          {completed ? (
            <>
              <CheckCircle size={40} className="mx-auto mb-4 text-emerald-400" />
              <h2 className="text-2xl font-black text-white mb-2">Challenge Complete!</h2>
              <p className="text-gray-400 text-sm mb-1">You've already completed today's challenge.</p>
              <p className="text-gray-600 text-xs">Come back tomorrow for a new one.</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20
                              flex items-center justify-center mx-auto mb-5">
                <Star size={24} className="text-amber-400 fill-amber-400" />
              </div>
              <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-2">
                Today's Challenge
              </p>
              <h2 className="text-2xl font-black text-white mb-1">{topic?.label ?? challenge.topic_id}</h2>
              <p className="text-gray-500 text-sm mb-1 capitalize">{challenge.difficulty} difficulty</p>
              <p className="text-amber-400 font-bold text-lg mb-8">
                2× XP · +{challenge.bonus_xp} bonus XP
              </p>
              <Link
                href={`/play/${challenge.topic_id}?mode=daily`}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl
                           bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold
                           transition-all active:scale-95 shadow-lg shadow-amber-950/50"
              >
                Start Challenge
                <ChevronRight size={16} />
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
