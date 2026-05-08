"use client";

interface BossHPBarProps {
  label: string;
  hp: number;
  maxHp: number;
  color: "red" | "green";
  icon?: string;
}

export default function BossHPBar({ label, hp, maxHp, color, icon }: BossHPBarProps) {
  const pct = Math.max((hp / maxHp) * 100, 0);
  const bars = color === "red" ? "from-red-600 to-red-500" : "from-green-600 to-emerald-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-gray-300">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </span>
        <span className={color === "red" ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
          {hp}/{maxHp}
        </span>
      </div>
      <div className="h-4 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
        <div
          className={`h-full bg-gradient-to-r ${bars} transition-all duration-500 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
