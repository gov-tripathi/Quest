"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Swords, ChevronRight } from "lucide-react";
import { getSupabase, setGuestToken } from "@/lib/supabase";

const SUPABASE_CONFIGURED =
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error: err } = await getSupabase().auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setLoading(false); }
    else router.push("/home");
  };

  const handleGuest = () => { setGuestToken(); router.push("/leaderboard"); };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#080c14]">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-white">
            GRE<span className="text-indigo-400">Quest</span>
          </Link>
          <p className="text-gray-500 mt-1.5 text-sm">Welcome back, warrior.</p>
        </div>

        {/* Guest CTA */}
        <button onClick={handleGuest}
          className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                     bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm
                     transition-all active:scale-95"
        >
          <Swords size={16} />
          Play as Guest
          <ChevronRight size={14} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {SUPABASE_CONFIGURED && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-gray-600 text-xs">or sign in</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <form onSubmit={handleLogin}
              className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-6 space-y-4"
            >
              {error && (
                <div className="text-red-400 text-xs bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-white text-sm
                             focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-gray-600"
                  placeholder="you@example.com" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-white text-sm
                             focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-gray-600"
                  placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08]
                           text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-gray-600 text-xs">
          No account?{" "}
          <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">Sign up free</Link>
        </p>
      </div>
    </main>
  );
}
