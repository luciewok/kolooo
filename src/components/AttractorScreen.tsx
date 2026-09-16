import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface AttractorScreenProps {
  onStartQuiz: () => void;
  eventTitle?: string;
  totalQuestions?: number;
}

export const AttractorScreen: React.FC<AttractorScreenProps> = ({
  onStartQuiz,
  eventTitle = 'PixelLab',
  totalQuestions = 8,
}) => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full max-w-4xl mx-auto px-4 py-8 text-center select-none overflow-hidden">
      {/* 1. DYNAMIC ORBITING LIGHT GLOW EFFECTS (Soft, diffused ambient light drift) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10 overflow-hidden">
        {/* Revolving gentle ambient light aura */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
          className="w-[340px] sm:w-[480px] md:w-[600px] h-[340px] sm:h-[480px] md:h-[600px] rounded-full absolute"
        >
          {/* Main soft warm rose-gold ambient bloom */}
          <div 
            className="absolute -top-24 sm:-top-32 left-1/2 -translate-x-1/2 w-56 sm:w-72 h-56 sm:h-72 rounded-full"
            style={{
              background: 'radial-gradient(circle at center, rgba(245, 213, 200, 0.25) 0%, rgba(229, 169, 149, 0.12) 35%, rgba(229, 169, 149, 0.03) 70%, transparent 100%)',
            }}
          />
          {/* Secondary soft balancing bloom */}
          <div 
            className="absolute -bottom-24 sm:-bottom-32 left-1/2 -translate-x-1/2 w-52 sm:w-64 h-52 sm:h-64 rounded-full"
            style={{
              background: 'radial-gradient(circle at center, rgba(200, 143, 113, 0.18) 0%, rgba(180, 110, 80, 0.06) 45%, transparent 100%)',
            }}
          />
        </motion.div>

        {/* Central soft warm aura */}
        <div
          className="w-72 sm:w-96 h-72 sm:h-96 rounded-full absolute pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(229, 169, 149, 0.14) 0%, rgba(245, 213, 200, 0.04) 55%, transparent 100%)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full flex flex-col items-center relative z-10"
      >
        {/* Top Badge with subtle shine */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e5a995]/10 border border-[#e5a995]/30 text-[#e5a995] text-xs sm:text-sm font-medium tracking-wide mb-6 backdrop-blur-md shadow-[0_0_25px_rgba(229,169,149,0.2)]"
        >
          <Sparkles className="w-4 h-4 text-[#e5a995] animate-pulse" />
          <span>Google Pixel 11</span>
        </motion.div>

        {/* Main Display Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-light text-white tracking-tight max-w-2xl leading-[1.15] mb-5">
          Otestuj své znalosti
          <br />
          a&nbsp;roztoč{' '}
          <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995]">
            Kolo štěstí
          </span>
        </h1>

        <p className="text-slate-300 text-base sm:text-xl font-light max-w-xl leading-relaxed mb-10 sm:mb-14">
          Vyplň krátký kvíz o&nbsp;{totalQuestions}&nbsp;otázkách a&nbsp;roztoč kolo o&nbsp;garantované stylové dárky!
        </p>

        {/* Big Pulsing Launch CTA Button with Animated Light Aura */}
        <div className="relative inline-flex items-center justify-center">
          {/* Pulsing ring aura behind button */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#fcefe9] via-[#e5a995] to-[#f43f5e] blur-xl opacity-45 animate-pulse" />

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onStartQuiz}
            className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold text-lg sm:text-xl py-4 sm:py-5 px-10 sm:px-14 rounded-full shadow-[0_0_35px_rgba(229,169,149,0.5)] hover:shadow-[0_0_60px_rgba(229,169,149,0.85)] transition-all cursor-pointer"
          >
            <span>Pojďme na to!</span>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
