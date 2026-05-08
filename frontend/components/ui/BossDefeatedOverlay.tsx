"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Zap } from "lucide-react";
import type { BossDefeatedEvent } from "@/lib/types";

interface Props {
  event: BossDefeatedEvent | null;
  onClose: () => void;
}

export default function BossDefeatedOverlay({ event, onClose }: Props) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.4, y: 20, opacity: 0 }}
            animate={{ scale: 1,   y: 0,  opacity: 1 }}
            exit={{   scale: 0.9,         opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="text-center px-10 py-9 rounded-3xl border border-red-500/20
                       bg-[#0d1220] shadow-2xl shadow-red-950/60 max-w-xs"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600
                            flex items-center justify-center mx-auto mb-5">
              <Swords size={28} className="text-white" />
            </div>
            <p className="text-xs text-red-400 font-bold uppercase tracking-widest mb-2">Boss defeated</p>
            <p className="text-white text-xl font-black mb-4">{event.bossName}</p>
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-3xl mb-5">
              <Zap size={22} className="fill-amber-400" />
              +{event.rewardXp} XP
            </div>
            <p className="text-gray-600 text-xs">Tap to continue</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
