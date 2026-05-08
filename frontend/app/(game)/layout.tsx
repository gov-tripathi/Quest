"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Swords, Trophy, BookOpen, Zap,
  User, LogOut, ChevronRight,
} from "lucide-react";
import { getSupabase, getGuestToken, clearGuestToken } from "@/lib/supabase";
import { useGameStore } from "@/store/gameStore";
import { getLevelInfo } from "@/lib/constants";

const NAV = [
  { href: "/home",    icon: LayoutDashboard, label: "Dashboard" },
  { href: "/play",    icon: BookOpen,        label: "Practice" },
  { href: "/leaderboard", icon: Trophy,      label: "Leaderboard" },
  { href: "/boss",    icon: Swords,          label: "Boss Battle" },
  { href: "/daily",   icon: Zap,             label: "Daily" },
];

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const { gameState, loadGameState } = useGameStore();

  useEffect(() => {
    if (getGuestToken()) { loadGameState(); return; }
    const sb = getSupabase();
    sb.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else loadGameState();
    });
  }, [router, loadGameState]);

  const handleSignOut = async () => {
    if (getGuestToken()) { clearGuestToken(); router.replace("/"); return; }
    await getSupabase().auth.signOut();
    router.replace("/");
  };

  const isGuest = !!getGuestToken();
  const levelInfo = gameState ? getLevelInfo(gameState.xp) : null;

  return (
    <div className="flex min-h-screen bg-[#080c14]">
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full z-40 flex flex-col
          bg-[#0d1220] border-r border-white/[0.05]
          transition-all duration-200 ease-out
          ${collapsed ? "w-[60px]" : "w-52"}
        `}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b border-white/[0.05] shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm">GQ</span>
          </div>
          {!collapsed && (
            <span className="ml-3 font-black text-white text-sm tracking-tight whitespace-nowrap">
              GRE<span className="text-indigo-400">Quest</span>
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 space-y-0.5 px-1.5 overflow-hidden">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 whitespace-nowrap group
                  ${active
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                  }
                `}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
                {!collapsed && active && (
                  <ChevronRight size={14} className="ml-auto text-indigo-400 opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: player + sign out */}
        <div className="border-t border-white/[0.05] p-1.5 space-y-0.5 shrink-0">
          <Link href="/profile"
            className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] transition-all whitespace-nowrap"
          >
            <User size={18} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <span>Profile</span>}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm text-gray-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all whitespace-nowrap"
          >
            <LogOut size={18} strokeWidth={1.8} className="shrink-0" />
            {!collapsed && <span>{isGuest ? "Exit" : "Sign out"}</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen ml-[60px]">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-white/[0.04] bg-[#080c14]/80 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-2">
            {isGuest && (
              <span className="text-xs text-amber-400/80 font-semibold border border-amber-500/30 rounded-full px-2.5 py-0.5 bg-amber-500/[0.06]">
                Guest mode
              </span>
            )}
          </div>

          {/* XP pill */}
          {gameState && levelInfo && (
            <div className="flex items-center gap-3">
              {gameState.streak >= 2 && (
                <div className="flex items-center gap-1.5 text-amber-400 text-sm font-bold">
                  <Zap size={14} className="fill-amber-400" />
                  <span>{gameState.streak}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-[10px] font-black">{levelInfo.level}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">{levelInfo.title}</span>
                    <span className="text-xs text-indigo-400 font-bold">{gameState.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="w-24 h-0.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                      style={{ width: `${levelInfo.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
