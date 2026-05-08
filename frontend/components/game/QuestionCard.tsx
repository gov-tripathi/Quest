"use client";

interface QuestionCardProps {
  text: string;
  isStreaming?: boolean;
  difficulty?: string;
  topicLabel?: string;
}

const difficultyColors: Record<string, string> = {
  medium: "text-blue-400 bg-blue-900/30 border-blue-700",
  hard:   "text-orange-400 bg-orange-900/30 border-orange-700",
  expert: "text-red-400 bg-red-900/30 border-red-700",
  boss:   "text-red-300 bg-red-900/40 border-red-600",
};

export default function QuestionCard({ text, isStreaming, difficulty, topicLabel }: QuestionCardProps) {
  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900/60 backdrop-blur p-6">
      {(difficulty || topicLabel) && (
        <div className="flex items-center gap-2 mb-4">
          {topicLabel && (
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              {topicLabel}
            </span>
          )}
          {difficulty && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${difficultyColors[difficulty] ?? difficultyColors.medium}`}>
              {difficulty.toUpperCase()}
            </span>
          )}
        </div>
      )}
      <p className="text-gray-100 text-lg leading-relaxed whitespace-pre-wrap">
        {text}
        {isStreaming && (
          <span className="inline-block w-0.5 h-5 bg-brand-400 animate-pulse ml-0.5 align-middle" />
        )}
      </p>
    </div>
  );
}
