import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ArrowLeft } from 'lucide-react';

interface PinPadModalProps {
  correctPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinPadModal: React.FC<PinPadModalProps> = ({
  correctPin,
  onSuccess,
  onCancel,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  // Normalise target PIN: digits only, defaults to '1234'
  const cleanTarget = (correctPin && /^\d+$/.test(correctPin.trim())) ? correctPin.trim() : '1234';
  const targetLength = cleanTarget.length;

  const verifyPin = (pinToTest: string) => {
    if (pinToTest === cleanTarget) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setEnteredPin('');
      }, 500);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (enteredPin.length < targetLength) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setError(false);

      if (nextPin.length === targetLength) {
        verifyPin(nextPin);
      }
    }
  };

  const handleClear = () => {
    setEnteredPin('');
    setError(false);
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleSubmit = () => {
    verifyPin(enteredPin);
  };

  // Listen for physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enteredPin, cleanTarget, targetLength, onCancel]);

  return (
    <div className="relative z-10 flex flex-col items-center justify-center w-full px-4 py-4 sm:py-6 select-none">
      {/* Back button to return to application */}
      <button
        type="button"
        onClick={onCancel}
        className="mb-4 inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Zpět na úvodní obrazovku</span>
      </button>

      {/* Lock Icon */}
      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#e5a995]/10 border border-[#e5a995]/30 flex items-center justify-center text-[#e5a995] mb-4 shadow-[0_0_20px_rgba(229,169,149,0.2)]">
        <Lock className="w-7 h-7 text-[#e5a995]" />
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-light text-white tracking-wide mb-1 text-center">
        Sekce pro obsluhu
      </h1>
      <p className="text-slate-400 text-xs sm:text-sm font-light mb-6 text-center">
        Zadejte 4místný PIN pro vstup do administrace
      </p>

      {/* Main Glassmorphic PIN Container */}
      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm bg-[#16100e]/95 border border-[#e5a995]/20 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center"
      >
        {/* PIN Dots Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8 h-6">
          {Array.from({ length: targetLength }).map((_, idx) => {
            const isFilled = idx < enteredPin.length;
            return (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  scale: isFilled ? 1.15 : 1,
                  backgroundColor: isFilled ? '#f5d5c8' : 'rgba(229, 169, 149, 0.2)',
                }}
                className={`w-3.5 h-3.5 rounded-full transition-colors duration-200 ${
                  isFilled ? 'shadow-[0_0_12px_rgba(229,169,149,0.8)]' : 'border border-[#e5a995]/30'
                }`}
              />
            );
          })}
        </div>

        {/* Error notification */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-sm font-medium mb-4 -mt-4 text-center"
            >
              Nesprávný PIN
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad Grid (Touch & Click friendly) */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 sm:h-16 rounded-2xl bg-white/[0.07] hover:bg-white/[0.14] active:scale-95 transition border border-white/10 text-2xl font-medium text-white flex items-center justify-center cursor-pointer select-none"
            >
              {digit}
            </button>
          ))}

          {/* SMAZAT */}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 sm:h-16 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 transition border border-white/10 text-xs sm:text-sm font-semibold text-red-400 tracking-wider flex items-center justify-center cursor-pointer select-none uppercase"
          >
            Smazat
          </button>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 sm:h-16 rounded-2xl bg-white/[0.07] hover:bg-white/[0.14] active:scale-95 transition border border-white/10 text-2xl font-medium text-white flex items-center justify-center cursor-pointer select-none"
          >
            0
          </button>

          {/* BACKSPACE / ZPĚT */}
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 sm:h-16 rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] active:scale-95 transition border border-white/10 text-xs sm:text-sm font-semibold text-slate-300 tracking-wider flex items-center justify-center cursor-pointer select-none uppercase"
          >
            Zpět
          </button>
        </div>
      </motion.div>

      {/* Vstoupit Glowing Button */}
      <motion.button
        type="button"
        onClick={handleSubmit}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-6 bg-gradient-to-r from-[#f5d5c8] to-[#e5a995] text-[#1c120e] text-base font-semibold px-10 py-3.5 rounded-full shadow-[0_0_25px_rgba(229,169,149,0.35)] hover:shadow-[0_0_35px_rgba(229,169,149,0.65)] transition cursor-pointer select-none"
      >
        Vstoupit
      </motion.button>
    </div>
  );
};
