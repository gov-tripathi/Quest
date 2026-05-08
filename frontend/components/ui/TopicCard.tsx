"use client";

import Link from "next/link";
import type { Topic } from "@/lib/types";
import type { TopicProgress } from "@/lib/types";
import { BOSS_NAMES } from "@/lib/constants";

interface TopicCardProps {
  topic: Topic;
  progress?: TopicProgress;
}

export default function TopicCard({ topic, progress }: TopicCardProps) {
  const answered = progress?.answered ?? 0;
  const correct = progress?.correct ?? 0;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;
  const bossUnlocked = answered >= 5 || (progress?.boss_defeated ?? false);

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/70 overflow-hidden hover:border-gray-500 transition-colors">
      <div className={`bg-gradient-to-br ${topic.color} p-5`}>
        <div className="text-4xl mb-2">{topic.icon}</div>
        <h3 className="text-white font-bold text-xl">{topic.label}</h3>
        <p className="text-white/70 text-sm mt-1">{topic.description}</p>
      </div>
      <div className="p-4 space-y-3">
        {accuracy !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{answered} answered</span>
            <span className={accuracy >= 70 ? "text-green-400" : accuracy >= 50 ? "text-yellow-400" : "text-red-400"}>
              {accuracy}% accuracy
            </span>
          </div>
        )}
        <Link
          href={`/play/${topic.id}`}
          className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-all
                      bg-gradient-to-r ${topic.color} text-white hover:opacity-90 active:scale-95`}
        >
          Practice
        </Link>
        {bossUnlocked && (
          <Link
            href={`/boss/${topic.id}`}
            className="block text-center py-2.5 rounded-xl font-semibold text-sm border border-red-700
                       text-red-400 hover:bg-red-950/40 transition-all active:scale-95"
          >
            ⚔️ {progress?.boss_defeated ? "Rematch" : "Challenge"} {BOSS_NAMES[topic.id]}
          </Link>
        )}
        {!bossUnlocked && (
          <p className="text-center text-xs text-gray-600">
            Answer {5 - answered} more to unlock boss
          </p>
        )}
      </div>
    </div>
  );
}
