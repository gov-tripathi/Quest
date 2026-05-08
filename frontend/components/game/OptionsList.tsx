"use client";

interface OptionsListProps {
  options: Record<string, string>;
  selected: string[];
  allowMultiple?: boolean;
  onSelect: (letter: string) => void;
  disabled?: boolean;
  correctAnswers?: string[];
  showResult?: boolean;
}

export default function OptionsList({
  options,
  selected,
  allowMultiple = false,
  onSelect,
  disabled = false,
  correctAnswers = [],
  showResult = false,
}: OptionsListProps) {
  const letters = Object.keys(options).sort();

  const getStyle = (letter: string) => {
    const isSelected = selected.includes(letter);
    const isCorrect = correctAnswers.includes(letter);

    if (showResult) {
      if (isCorrect) return "border-green-500 bg-green-500/20 text-green-300";
      if (isSelected && !isCorrect) return "border-red-500 bg-red-500/20 text-red-300";
      return "border-gray-700 bg-gray-800/50 text-gray-400";
    }

    if (isSelected) return "border-brand-400 bg-brand-900/60 text-white";
    return "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-brand-600 hover:bg-brand-900/30";
  };

  return (
    <div className="space-y-2">
      {letters.map((letter) => (
        <button
          key={letter}
          onClick={() => !disabled && onSelect(letter)}
          disabled={disabled && !showResult}
          className={`w-full text-left px-4 py-3 rounded-xl border transition-all
                      ${getStyle(letter)}
                      ${!disabled && !showResult ? "cursor-pointer active:scale-[0.98]" : "cursor-default"}`}
        >
          <span className="font-bold mr-3 text-sm opacity-70">{letter}</span>
          {options[letter]}
        </button>
      ))}
    </div>
  );
}
