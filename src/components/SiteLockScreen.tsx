import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface SiteLockScreenProps {
  adminPin: string;
  onUnlock: () => void;
}

export const SiteLockScreen: React.FC<SiteLockScreenProps> = ({ adminPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === adminPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl"
      >
        <div className="w-16 h-16 bg-sky-500/20 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-sky-400" />
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-2">Web je uzamčen</h2>
        <p className="text-sm text-slate-400 mb-8">
          Pro přístup k aplikaci zadejte PIN kód.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError(false);
              }}
              placeholder="Zadejte 4místný PIN"
              className={`w-full bg-black/40 border ${error ? 'border-rose-500' : 'border-white/15 focus:border-sky-500'} rounded-2xl px-6 py-4 text-center text-2xl tracking-widest font-mono text-white placeholder-slate-600 focus:outline-none transition-colors`}
              autoFocus
            />
            {error && (
              <p className="absolute -bottom-6 left-0 right-0 text-rose-400 text-xs text-center animate-pulse">
                Nesprávný PIN kód
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={pin.length < 4}
            className="mt-8 w-full bg-sky-500 hover:bg-sky-400 text-black font-semibold rounded-2xl px-6 py-4 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Odemknout aplikaci
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
