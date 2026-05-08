"use client";

import { useState } from "react";
import OptionsList from "@/components/game/OptionsList";

interface InterruptPanelProps {
  interrupt: { runId: string; reason: string };
  options: Record<string, string>;
  allowMultiple: boolean;
  onSubmit: (answer: string) => void;
}

export default function InterruptPanel({
  interrupt,
  options,
  allowMultiple,
  onSubmit,
}: InterruptPanelProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const handleSelect = (letter: string) => {
    if (allowMultiple) {
      setSelected((prev) =>
        prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
      );
    } else {
      setSelected([letter]);
    }
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    onSubmit(allowMultiple ? selected.sort().join(",") : selected[0]);
    setSelected([]);
  };

  return (
    <div className="mt-4">
      <OptionsList
        options={options}
        selected={selected}
        allowMultiple={allowMultiple}
        onSelect={handleSelect}
        disabled={false}
      />
      <button
        onClick={handleSubmit}
        disabled={selected.length === 0}
        className="mt-4 w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40
                   text-white font-bold text-lg transition-all active:scale-95"
      >
        {allowMultiple ? `Submit (${selected.length}/2 selected)` : "Submit Answer"}
      </button>
    </div>
  );
}
