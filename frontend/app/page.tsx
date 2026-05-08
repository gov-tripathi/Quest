"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Zap, Swords, BookOpen, ChevronRight, Star } from "lucide-react";
import { setGuestToken } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();

  const handleGuest = () => {
    setGuestToken();
    router.push("/leaderboard");
  };

  return (
    <main className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-grid-dark bg-grid-dark opacity-100 pointer-events-none" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full
                      bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400
                        border border-indigo-500/30 bg-indigo-500/[0.08] rounded-full px-3.5 py-1.5 mb-8">
          <Zap size={11} className="fill-indigo-400" />
          AI-powered GRE &amp; GMAT verbal prep
        </div>

        {/* Wordmark */}
        <h1 className="text-6xl font-black text-white tracking-tight mb-4">
          GRE<span className="text-indigo-400">Quest</span>
        </h1>
        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
          Unique questions every session. Adaptive difficulty.<br className="hidden sm:block" />
          Boss battles. Streak bonuses.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <button
            onClick={handleGuest}
            className="group flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl
                       bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base
                       transition-all active:scale-95 shadow-lg shadow-indigo-950"
          >
            <Swords size={17} />
            Play as Guest
            <ChevronRight size={15} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl
                       border border-white/[0.08] text-gray-300 hover:text-white hover:border-white/20
                       font-semibold text-base transition-all"
          >
            Sign In
          </Link>
        </div>
        <p className="text-gray-600 text-xs">No sign-up required for guest mode</p>

        {/* Feature pills */}
        <div className="mt-14 flex flex-wrap justify-center gap-2">
          {[
            { icon: <BookOpen size={13} />,  label: "5 question types" },
            { icon: <Swords   size={13} />,  label: "Boss battles" },
            { icon: <Trophy   size={13} />,  label: "Leaderboard" },
            { icon: <Star     size={13} />,  label: "Daily challenges" },
            { icon: <Zap      size={13} />,  label: "Adaptive difficulty" },
          ].map(({ icon, label }) => (
            <div key={label}
              className="flex items-center gap-1.5 text-xs text-gray-500 border border-white/[0.06]
                         bg-white/[0.02] rounded-full px-3 py-1.5"
            >
              {icon}
              {label}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
