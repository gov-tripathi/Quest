"use client";

import { getLevelInfo } from "@/lib/constants";

interface XPBarProps {
  xp: number;
  compact?: boolean;
}

export default function XPBar({ xp, compact = false }: XPBarProps) {
  const { level, title, nextXp, progress } = getLevelInfo(xp);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-brand-300 font-bold">Lv.{level}</span>
        <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden min-w-[60px]">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{xp.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-brand-300">
          Level {level} — {title}
        </span>
        <span className="text-gray-400">
          {xp.toLocaleString()} / {nextXp.toLocaleString()} XP
        </span>
      </div>
      <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-700 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
