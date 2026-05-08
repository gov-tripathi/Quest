"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Swords, ChevronRight } from "lucide-react";
import { getSupabase, setGuestToken } from "@/lib/supabase";

const SUPABASE_CONFIGURED =
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://placeholder.supabase.co" &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function SignupPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SUPABASE_CONFIGURED) { setError("Supabase not configured — use Guest mode."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setError(""); setLoading(true);
    const sb = getSupabase();
    const { data, error: err } = await sb.auth.signUp({ email, password });
    if (err) { setError(err.message); setLoading(false); return; }
    if (data.user && username) {
      await sb.from("profiles").update({ username }).eq("id", data.user.id);
    }
    router.push("/home");
  };

  const handleGuest = () => { setGuestToken(); router.push("/leaderboard"); };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[#080c14]">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-white">
            GRE<span className="text-indigo-400">Quest</span>
          </Link>
          <p className="text-gray-500 mt-1.5 text-sm">Begin your quest.</p>
        </div>

        {/* Guest CTA */}
        <button onClick={handleGuest}
          className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                     bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm
                     transition-all active:scale-95"
        >
          <Swords size={16} />
          Play as Guest — no sign-up
          <ChevronRight size={14} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {SUPABASE_CONFIGURED ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-gray-600 text-xs">or create account</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <form onSubmit={handleSignup}
              className="rounded-2xl border border-white/[0.06] bg-[#0d1220] p-6 space-y-4"
            >
              {error && (
                <div className="text-red-400 text-xs bg-red-500/[0.08] border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              {[
                { label: "Username", type: "text",     value: username, set: setUsername, placeholder: "lexicon_lord_99" },
                { label: "Email",    type: "email",    value: email,    set: setEmail,    placeholder: "you@example.com" },
                { label: "Password", type: "password", value: password, set: setPassword, placeholder: "6+ characters" },
              ].map(({ label, type, value, set, placeholder }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs text-gray-500">{label}</label>
                  <input type={type} value={value} onChange={(e) => set(e.target.value)}
                    required={label !== "Username"}
                    className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-white text-sm
                               focus:outline-none focus:border-indigo-500/60 transition-colors placeholder:text-gray-600"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08]
                           text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-40"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          </>
        ) : (
          <p className="text-center text-gray-600 text-xs">
            Account creation requires Supabase — see README to configure.
          </p>
        )}

        <p className="text-center text-gray-600 text-xs">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
