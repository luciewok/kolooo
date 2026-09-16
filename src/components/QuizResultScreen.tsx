import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Trophy, Mail, ArrowRight, CheckCircle2, Sparkles, RotateCcw, AlertCircle, Clock } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface QuizResultScreenProps {
  score: number;
  totalQuestions: number;
  minPassingScore?: number;
  onProceedToWheel: () => void;
  onSaveEmail: (email: string) => void;
  onTryAgain: () => void;
  soundEnabled?: boolean;
}

export const QuizResultScreen: React.FC<QuizResultScreenProps> = ({
  score,
  totalQuestions,
  minPassingScore = 5,
  onProceedToWheel,
  onSaveEmail,
  onTryAgain,
  soundEnabled = true,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [countdown, setCountdown] = useState(15);

  const isPassed = score >= minPassingScore;
  const isPerfect = score === totalQuestions;

  useEffect(() => {
    if (isPerfect) {
      soundEngine.playWin(soundEnabled);
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#fff7f4', '#faede7', '#f5d5c8', '#e5a995', '#c87d65'],
        });
      } catch {
        // Confetti fallback
      }
    } else if (!isPassed) {
      soundEngine.playTryAgain(soundEnabled);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onTryAgain();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isPerfect, isPassed, onTryAgain, soundEnabled]);

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || !emailRegex.test(clean)) {
      setEmailError('Zadejte platnou e-mailovou adresu.');
      return;
    }

    setEmailError('');
    onSaveEmail(clean);
    onProceedToWheel();
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] w-full max-w-xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full bg-[#140e0c]/95 border border-[#e5a995]/30 rounded-3xl p-6 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.85)] text-center relative overflow-hidden"
      >
        {/* Glow backdrop */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none rounded-full"
          style={{
            background: isPassed 
              ? 'radial-gradient(circle, rgba(229, 169, 149, 0.16) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(244, 63, 94, 0.12) 0%, transparent 70%)',
          }}
        />

        {!isPassed ? (
          /* --- FAILED / LESS THAN 5 SCORE VIEW --- */
          <div className="flex flex-col items-center">
            {/* Friendly retry icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#2a1714] border border-[#f43f5e]/30 flex items-center justify-center text-[#fca5a5] mb-4 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <RotateCcw className="w-8 h-8 sm:w-9 sm:h-9 text-[#f5d5c8]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-medium mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-[#e5a995]" />
              <span>Výsledek kvízu: {score} z {totalQuestions} správně (pro zatočení potřeba alespoň {minPassingScore})</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight mb-3">
              Škoda! Můžeš to zkusit znovu.
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm font-light leading-relaxed max-w-md mb-6">
              K roztočení Kola štěstí je potřeba odpovědět správně alespoň na {minPassingScore} otázek. Nevadí, projdi si kvíz ještě jednou a ukaž, co v tobě je!
            </p>

            <button
              onClick={onTryAgain}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold py-4 px-6 rounded-2xl shadow-[0_0_25px_rgba(229,169,149,0.35)] hover:shadow-[0_0_35px_rgba(229,169,149,0.6)] hover:scale-[1.01] active:scale-95 transition cursor-pointer text-base"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Zkusit znovu</span>
            </button>

            {/* Auto-redirect countdown indicator */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mt-4">
              <Clock className="w-3.5 h-3.5" />
              <span>Návrat na začátek za {countdown} s</span>
            </div>
          </div>
        ) : isPerfect ? (
          /* --- PERFECT SCORE (8/8) VIEW --- */
          <div className="flex flex-col items-center">
            {/* Trophy Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-[#e5a995] to-[#fcefe9] flex items-center justify-center text-[#1c120e] mb-4 shadow-[0_0_30px_rgba(229,169,149,0.5)]">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-[#1c120e]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#e5a995]/20 border border-[#e5a995]/40 text-[#f5d5c8] text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#e5a995]" />
              <span>Perfektní výsledek • {score} z {totalQuestions}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight mb-2">
              Postupuješ do slosování!
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm font-light leading-relaxed max-w-md mb-6">
              Zodpověděl/a jsi všechny otázky bez jediné chyby. Zanech nám svůj e-mail, abychom tě mohli kontaktovat v případě výhry <strong className="text-[#f5d5c8] font-semibold">hlavní ceny eventu</strong>.
            </p>

            {/* Email Form */}
            <form onSubmit={handleSubmitEmail} className="w-full space-y-3.5 mb-4">
              <div className="text-left">
                <label className="block text-xs font-medium text-slate-300 mb-1.5 pl-1">
                  Tvůj e-mail pro slosování:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="např. jmeno@email.cz"
                    className="w-full pl-10 pr-4 py-3.5 bg-white/[0.06] border border-white/15 focus:border-[#e5a995] rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none transition shadow-inner"
                  />
                </div>
                {emailError && (
                  <p className="text-rose-400 text-xs mt-1 pl-1">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold py-3.5 px-6 rounded-2xl shadow-[0_0_25px_rgba(229,169,149,0.35)] hover:shadow-[0_0_35px_rgba(229,169,149,0.6)] hover:scale-[1.01] active:scale-95 transition cursor-pointer text-sm sm:text-base"
              >
                <span>Uložit e-mail a roztočit Kolo štěstí</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Skip Option */}
            <button
              type="button"
              onClick={onProceedToWheel}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition cursor-pointer py-1"
            >
              Nechci zadávat e-mail, chci rovnou točit kolem
            </button>
          </div>
        ) : (
          /* --- 5-7/8 (PASSED BUT NOT PERFECT) VIEW --- */
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-[#e5a995]/15 border border-[#e5a995]/30 flex items-center justify-center text-[#e5a995] mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#e5a995]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-medium mb-3">
              <span>Výsledek kvízu: {score} z {totalQuestions} správně</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight mb-3">
              Skvělá práce!
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm font-light leading-relaxed max-w-md mb-8">
              Splnil/a jsi podmínku kvízu a nyní tě čeká zasloužená výhra z Kola štěstí!
            </p>

            <button
              onClick={onProceedToWheel}
              className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#fcefe9] via-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold py-4 px-6 rounded-2xl shadow-[0_0_25px_rgba(229,169,149,0.35)] hover:shadow-[0_0_35px_rgba(229,169,149,0.6)] hover:scale-[1.01] active:scale-95 transition cursor-pointer text-base"
            >
              <span>Roztočit Kolo štěstí</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
