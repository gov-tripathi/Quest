"use client";

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak < 2) return null;

  const tier = Math.min(Math.floor(streak / 5), 5);
  const colors = [
    "",
    "text-amber-400 border-amber-600",
    "text-orange-400 border-orange-500",
    "text-red-400 border-red-500",
    "text-rose-300 border-rose-400",
    "text-purple-300 border-purple-400",
  ];
  const glowClass = tier >= 2 ? "animate-streak-glow" : "";

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold
                  ${colors[tier] ?? colors[1]} ${glowClass} bg-gray-900`}
    >
      <span className="text-base">🔥</span>
      <span>{streak} streak</span>
    </div>
  );
}
