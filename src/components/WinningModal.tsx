import React from 'react';
import { motion } from 'motion/react';
import { Prize } from '../types';
import { resolvePrizeImage } from '../utils/storage';
import { CheckCircle2 } from 'lucide-react';

interface WinningModalProps {
  prize: Prize;
  onClose: () => void;
}

export const WinningModal: React.FC<WinningModalProps> = ({ prize, onClose }) => {
  const imageSrc = prize.image || resolvePrizeImage(prize);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-[#16100e]/95 border border-[#e5a995]/30 rounded-3xl p-8 sm:p-10 text-center shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden"
      >
        {/* Glow ambient circle behind prize */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(229, 169, 149, 0.22) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
          {imageSrc && (
            <motion.div
              initial={{ scale: 0.8, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-white/5 border border-[#e5a995]/30 p-3 mb-4 shadow-[0_15px_35px_rgba(229,169,149,0.25)] flex items-center justify-center relative backdrop-blur-sm"
            >
              <img
                src={imageSrc}
                alt={prize.name}
                className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
              />
            </motion.div>
          )}

          <span className="text-[11px] uppercase tracking-widest text-[#e5a995] font-semibold mb-1">
            Vyhráváš
          </span>

          <h2 className="text-3xl sm:text-4xl font-light text-[#f5d5c8] mb-2 tracking-tight">
            {prize.name}
          </h2>

          <p className="text-slate-300 text-sm sm:text-base font-light mb-7 leading-relaxed">
            Gratulujeme!
          </p>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold py-3.5 px-6 rounded-full shadow-[0_0_25px_rgba(229,169,149,0.35)] hover:shadow-[0_0_35px_rgba(229,169,149,0.65)] hover:scale-[1.02] active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-[#1c120e]" />
            <span>Další soutěžící</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
