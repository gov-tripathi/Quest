"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

export default function LevelUpOverlay() {
  const levelUpPending    = useGameStore((s) => s.levelUpPending);
  const setLevelUpPending = useGameStore((s) => s.setLevelUpPending);

  useEffect(() => {
    if (!levelUpPending) return;
    const t = setTimeout(() => setLevelUpPending(null), 3500);
    return () => clearTimeout(t);
  }, [levelUpPending, setLevelUpPending]);

  return (
    <AnimatePresence>
      {levelUpPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setLevelUpPending(null)}
        >
          <motion.div
            initial={{ scale: 0.5, y: 30, opacity: 0 }}
            animate={{ scale: 1,   y: 0,  opacity: 1 }}
            exit={{   scale: 0.9,         opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="text-center px-10 py-9 rounded-3xl border border-indigo-500/30
                       bg-[#0d1220] shadow-2xl shadow-indigo-950/80 max-w-xs"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-900/50">
              <Zap size={28} className="text-white fill-white" />
            </div>
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-2">Level up</p>
            <p className="text-5xl font-black text-white mb-1">{levelUpPending.level}</p>
            <p className="text-indigo-300 text-xl font-bold mb-4">{levelUpPending.title}</p>
            <p className="text-gray-600 text-xs">Tap to continue</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
