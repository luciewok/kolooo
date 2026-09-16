import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QuizQuestion } from '../types';
import { soundEngine } from '../utils/audio';
import { ArrowLeft, Check, X } from 'lucide-react';

interface QuizScreenProps {
  questions: QuizQuestion[];
  onComplete: (score: number, totalQuestions: number) => void;
  onCancel: () => void;
  soundEnabled?: boolean;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  questions,
  onComplete,
  onCancel,
  soundEnabled = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const currentQuestion = questions[currentIndex] || questions[0];
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  const handleSelectOption = (optionId: string, isCorrect: boolean) => {
    if (isAdvancing) return;
    setSelectedOptionId(optionId);
    setIsAdvancing(true);

    if (isCorrect) {
      soundEngine.playCorrect(soundEnabled);
    } else {
      soundEngine.playWrong(soundEnabled);
    }

    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) {
      setScore(newScore);
    }

    // Give player clear time to see the tick / cross indicator icon
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOptionId(null);
        setIsAdvancing(false);
      } else {
        onComplete(newScore, questions.length);
      }
    }, 750);
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full max-w-2xl mx-auto px-4 py-4 sm:py-6">
      <div className="w-full bg-[#140e0c]/95 border border-[#e5a995]/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative overflow-hidden">
        {/* Glow backdrop element */}
        <div 
          className="absolute top-0 right-10 w-48 h-48 pointer-events-none rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(229, 169, 149, 0.12) 0%, transparent 70%)',
          }}
        />

        {/* Top Progress Bar & Question Counter */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-medium text-[#f5d5c8] mb-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Zrušit kvíz a vrátit se na úvod"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="uppercase tracking-wider text-[11px] text-[#e5a995] font-semibold">
                Kvíz o Google Pixel 11
              </span>
            </div>
            <span className="font-mono text-slate-300">
              Otázka {currentIndex + 1} z {questions.length}
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#f5d5c8] to-[#e5a995] rounded-full"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Content with motion slide */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col"
          >
            {/* Question Title */}
            <h2 className="text-xl sm:text-2xl font-light text-white leading-snug mb-6 tracking-tight min-h-[58px]">
              {currentQuestion.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptionId === opt.id;
                const letter = optionLetters[idx] || `${idx + 1}`;

                // Styling based on whether this option is selected and if it's correct/wrong
                let buttonStyle = 'bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border-white/10 hover:border-[#e5a995]/40 text-slate-200';
                let badgeStyle = 'bg-white/10 text-[#f5d5c8] group-hover:bg-[#e5a995]/20';

                if (isSelected) {
                  if (opt.isCorrect) {
                    buttonStyle = 'bg-emerald-500/15 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.01]';
                    badgeStyle = 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]';
                  } else {
                    buttonStyle = 'bg-rose-500/15 border-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.3)] scale-[1.01]';
                    badgeStyle = 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]';
                  }
                } else if (isAdvancing) {
                  buttonStyle = 'bg-white/[0.02] border-white/5 opacity-40 cursor-default';
                  badgeStyle = 'bg-white/5 text-slate-500';
                }

                return (
                  <button
                    key={opt.id}
                    disabled={isAdvancing}
                    onClick={() => handleSelectOption(opt.id, opt.isCorrect)}
                    className={`w-full text-left p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 group select-none min-h-[56px] ${buttonStyle}`}
                  >
                    {/* Feedback Badge: Letter or Tick / Cross icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${badgeStyle}`}
                    >
                      {isSelected ? (
                        opt.isCorrect ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <X className="w-5 h-5 stroke-[2.5]" />
                        )
                      ) : (
                        letter
                      )}
                    </div>

                    {/* Option Text */}
                    <span className="text-sm sm:text-base font-normal text-white leading-snug flex-1">
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Bottom subtle guidance */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span>Klepnutím na možnost přejdete dál</span>
          <span className="text-[#e5a995]">100% skóre = zařazení do slosování</span>
        </div>
      </div>
    </div>
  );
};
