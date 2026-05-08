"use client";

interface ExplanationBoxProps {
  text: string;
  isCorrect: boolean;
  xpEarned?: number;
  isStreaming?: boolean;
}

export default function ExplanationBox({ text, isCorrect, xpEarned, isStreaming }: ExplanationBoxProps) {
  return (
    <div className={`rounded-2xl border p-5 mt-4 ${
      isCorrect
        ? "border-green-700 bg-green-950/50"
        : "border-red-700 bg-red-950/50"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isCorrect ? "✅" : "❌"}</span>
          <span className={`font-bold text-lg ${isCorrect ? "text-green-400" : "text-red-400"}`}>
            {isCorrect ? "Correct!" : "Incorrect"}
          </span>
        </div>
        {isCorrect && xpEarned !== undefined && xpEarned > 0 && (
          <span className="text-gold-400 font-bold text-lg animate-xp-pulse">
            +{xpEarned} XP
          </span>
        )}
      </div>
      <p className="text-gray-300 leading-relaxed">
        {text}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
        )}
      </p>
    </div>
  );
}
