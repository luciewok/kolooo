/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Prize, SpinLog, SystemSettings, ViewMode, QuizQuestion, CompetitionEntry } from './types';
import {
  getStoredPrizes,
  saveStoredPrizes,
  getStoredSettings,
  saveStoredSettings,
  getStoredSpins,
  addSpinLog,
  clearSpinLogs,
  resetPrizesToDefault,
  getStoredQuestions,
  saveStoredQuestions,
  resetQuestionsToDefault,
  getStoredCompetitionEntries,
  addCompetitionEntry,
  deleteCompetitionEntry,
  clearCompetitionEntries,
  isDeviceUnlocked,
  setDeviceUnlocked,
  restoreStorageFromIndexedDB,
} from './utils/storage';
import { queueEntryForGoogleSheets, queueSpinForGoogleSheets } from './services/googleSheets';
import { Background } from './components/Background';
import { Header } from './components/Header';
import { Wheel } from './components/Wheel';
import { PinPadModal } from './components/PinPadModal';
import { AdminPanel } from './components/AdminPanel';
import { WinningModal } from './components/WinningModal';
import { DeviceLockScreen } from './components/DeviceLockScreen';
import { SiteLockScreen } from './components/SiteLockScreen';
import { AttractorScreen } from './components/AttractorScreen';
import { QuizScreen } from './components/QuizScreen';
import { QuizResultScreen } from './components/QuizResultScreen';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return isDeviceUnlocked() ? 'attractor' : 'device_lock';
  });
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    pin: '1234',
    eventTitle: 'PixelLab',
    eventSubTitle: 'Roztoč kolo štěstí a oslav příchod nového Google Pixel 11 Pro!',
    soundEnabled: true,
    minSpinsDuration: 5,
  });
  const [spins, setSpins] = useState<SpinLog[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [competitionEntries, setCompetitionEntries] = useState<CompetitionEntry[]>([]);
  const [activeWinningPrize, setActiveWinningPrize] = useState<Prize | null>(null);

  // Active quiz state
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizTotalQuestions, setQuizTotalQuestions] = useState<number>(8);
  const [isSiteUnlockedSession, setIsSiteUnlockedSession] = useState<boolean>(false);

  // Initialize data on mount from ultra-reliable local storage & IndexedDB
  useEffect(() => {
    // 1. Initial local load
    setPrizes(getStoredPrizes());
    setSettings(getStoredSettings());
    setSpins(getStoredSpins());
    setQuestions(getStoredQuestions());
    setCompetitionEntries(getStoredCompetitionEntries());

    // 2. Safety recovery from IndexedDB (survives phone demo mode resets and power cycles)
    restoreStorageFromIndexedDB().then(({ restoredEntries, restoredSpins }: { restoredEntries: CompetitionEntry[]; restoredSpins: SpinLog[] }) => {
      if (restoredEntries && restoredEntries.length > 0) {
        setCompetitionEntries((prev) => {
          const map = new Map<string, CompetitionEntry>();
          // local memory first
          prev.forEach((e) => map.set(e.id, e));
          // recovered ones append if not exist
          restoredEntries.forEach((e) => {
            if (!map.has(e.id)) map.set(e.id, e);
          });
          return Array.from(map.values());
        });
      }
      if (restoredSpins && restoredSpins.length > 0) {
        setSpins((prev) => {
          const map = new Map<string, SpinLog>();
          prev.forEach((s) => map.set(s.id, s));
          restoredSpins.forEach((s) => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          return Array.from(map.values());
        });
      }
    });
  }, []);

  // Update prizes helper (local)
  const handleUpdatePrizes = (updated: Prize[]) => {
    setPrizes(updated);
    saveStoredPrizes(updated);
  };

  // Update settings helper (local)
  const handleUpdateSettings = (updated: SystemSettings) => {
    setSettings(updated);
    saveStoredSettings(updated);
  };

  // Update questions helper
  const handleUpdateQuestions = (updated: QuizQuestion[]) => {
    setQuestions(updated);
    saveStoredQuestions(updated);
  };

  // Reset questions to default
  const handleResetQuestions = () => {
    const defaults = resetQuestionsToDefault();
    setQuestions(defaults);
  };

  // Add competition email entry (local + Google Sheets)
  const handleSaveEmailEntry = (email: string) => {
    const newEntry = addCompetitionEntry(email, quizScore, quizTotalQuestions);
    setCompetitionEntries((prev) => {
      const exists = prev.some((e) => e.email === newEntry.email);
      if (exists) return prev;
      return [newEntry, ...prev];
    });
    // Queue for instant Google Sheets sync (and offline recovery)
    queueEntryForGoogleSheets(newEntry);
  };

  // Delete competition entry (local only)
  const handleDeleteCompetitionEntry = (id: string) => {
    const updated = deleteCompetitionEntry(id);
    setCompetitionEntries(updated);
  };

  // Clear all competition entries (local only)
  const handleClearCompetitionEntries = () => {
    clearCompetitionEntries();
    setCompetitionEntries([]);
  };

  // Handle prize won on spin end (local + Google Sheets)
  const handleSpinEnd = (winningPrize: Prize) => {
    const newSpin = addSpinLog(winningPrize);
    setSpins((prev) => [newSpin, ...prev]);
    queueSpinForGoogleSheets(newSpin);
    setActiveWinningPrize(winningPrize);

    // If prize has a limited stock, decrement remaining pieces
    if (winningPrize.stock !== undefined && winningPrize.stock !== null) {
      setPrizes((prevPrizes) => {
        const updated = prevPrizes.map((p) => {
          if (p.id === winningPrize.id) {
            const current = typeof p.stock === 'number' ? p.stock : 0;
            const nextStock = Math.max(0, current - 1);
            return {
              ...p,
              stock: nextStock,
            };
          }
          return p;
        });
        saveStoredPrizes(updated);
        return updated;
      });
    }
  };

  // Clear spin logs
  const handleClearSpins = () => {
    clearSpinLogs();
    setSpins([]);
  };

  // Reset prizes to default
  const handleResetPrizes = () => {
    const defaults = resetPrizesToDefault();
    setPrizes(defaults);
  };

  // Promoter unlocks kiosk
  const handleUnlockDevice = () => {
    setDeviceUnlocked(true);
    setViewMode('attractor');
  };

  // Promoter locks kiosk
  const handleLockDevice = () => {
    setDeviceUnlocked(false);
    setViewMode('device_lock');
  };

  // When participant completes the 8 quiz questions
  const handleQuizComplete = (score: number, total: number) => {
    setQuizScore(score);
    setQuizTotalQuestions(total);
    setViewMode('quiz_result');
  };

  // Close winning modal -> reset to attractor for next visitor
  const handleFinishTurn = () => {
    setActiveWinningPrize(null);
    setViewMode('attractor');
  };

  // If the site is explicitly locked in settings and the user has not temporarily unlocked it with PIN in this session
  const isGloballyLocked = Boolean(settings.siteLocked) && !isSiteUnlockedSession;

  if (isGloballyLocked) {
    return (
      <SiteLockScreen
        adminPin={settings.pin || '1234'}
        onUnlock={() => {
          setIsSiteUnlockedSession(true);
          setViewMode('admin');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col font-sans selection:bg-white/20 relative overflow-x-hidden">
      {/* Ambient Dark Gradient Background */}
      <Background />

      {/* Top Bar Header */}
      <Header
        eventTitle={settings.eventTitle || 'PixelLab'}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onLockAdmin={() => setViewMode('attractor')}
        onLockDevice={handleLockDevice}
        onRefreshData={() => {
          setPrizes(getStoredPrizes());
          setSpins(getStoredSpins());
          setQuestions(getStoredQuestions());
          setCompetitionEntries(getStoredCompetitionEntries());
        }}
      />

      {/* Main View Area */}
      <main
        className={`flex-1 flex flex-col items-center relative z-10 w-full max-w-7xl mx-auto px-2 sm:px-4 ${
          viewMode === 'admin' ? 'justify-start pt-2 sm:pt-4 md:pt-6' : 'justify-center'
        }`}
      >
        <AnimatePresence mode="wait">
          {/* 1. DEVICE LOCK SCREEN (Promoter station security) */}
          {viewMode === 'device_lock' && (
            <motion.div
              key="device_lock_view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <DeviceLockScreen
                onUnlock={handleUnlockDevice}
                correctPin={settings.pin || '1234'}
              />
            </motion.div>
          )}

          {/* 2. ATTRACTOR SCREEN (Passersby landing invitation) */}
          {viewMode === 'attractor' && (
            <motion.div
              key="attractor_view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <AttractorScreen
                onStartQuiz={() => setViewMode('quiz')}
                eventTitle={settings.eventTitle || 'PixelLab'}
                totalQuestions={questions.length || 8}
              />
            </motion.div>
          )}

          {/* 3. QUIZ SCREEN (8 questions interactive) */}
          {viewMode === 'quiz' && (
            <motion.div
              key="quiz_view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <QuizScreen
                questions={questions}
                soundEnabled={settings.soundEnabled}
                onComplete={handleQuizComplete}
                onCancel={() => setViewMode('attractor')}
              />
            </motion.div>
          )}

          {/* 4. QUIZ RESULT & EMAIL COLLECTION */}
          {viewMode === 'quiz_result' && (
            <motion.div
              key="quiz_result_view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <QuizResultScreen
                score={quizScore}
                totalQuestions={quizTotalQuestions}
                minPassingScore={settings.minPassingScore ?? 5}
                soundEnabled={settings.soundEnabled}
                onSaveEmail={handleSaveEmailEntry}
                onProceedToWheel={() => setViewMode('wheel')}
                onTryAgain={() => setViewMode('attractor')}
              />
            </motion.div>
          )}

          {/* 5. WHEEL OF FORTUNE */}
          {viewMode === 'wheel' && (
            <motion.div
              key="wheel_view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center flex-1"
            >
              <Wheel
                prizes={prizes}
                soundEnabled={settings.soundEnabled}
                onToggleSound={() =>
                  handleUpdateSettings({
                    ...settings,
                    soundEnabled: !settings.soundEnabled,
                  })
                }
                onSpinEnd={handleSpinEnd}
                eventTitle={settings.eventTitle}
                eventSubTitle={settings.eventSubTitle}
              />
            </motion.div>
          )}

          {/* 6. PIN PAD MODAL (Admin entry) */}
          {viewMode === 'pin_entry' && (
            <motion.div
              key="pin_view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center justify-center my-auto py-6"
            >
              <PinPadModal
                correctPin={settings.pin || '1234'}
                onSuccess={() => setViewMode('admin')}
                onCancel={() => setViewMode('attractor')}
              />
            </motion.div>
          )}

          {/* 7. ADMIN PANEL */}
          {viewMode === 'admin' && (
            <motion.div
              key="admin_view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <AdminPanel
                prizes={prizes}
                spins={spins}
                settings={settings}
                questions={questions}
                competitionEntries={competitionEntries}
                onUpdatePrizes={handleUpdatePrizes}
                onUpdateSettings={handleUpdateSettings}
                onClearSpins={handleClearSpins}
                onResetPrizes={handleResetPrizes}
                onUpdateQuestions={handleUpdateQuestions}
                onResetQuestions={handleResetQuestions}
                onDeleteEntry={handleDeleteCompetitionEntry}
                onClearEntries={handleClearCompetitionEntries}
                onLockDevice={handleLockDevice}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Celebration Winner Modal on wheel spin */}
      <AnimatePresence>
        {activeWinningPrize && (
          <WinningModal
            prize={activeWinningPrize}
            onClose={handleFinishTurn}
          />
        )}
      </AnimatePresence>

      {/* Floating Bottom-Right Sound Button (Absolute screen corner) */}
      <button
        onClick={() =>
          handleUpdateSettings({
            ...settings,
            soundEnabled: !settings.soundEnabled,
          })
        }
        title={settings.soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk'}
        aria-label={settings.soundEnabled ? 'Vypnout zvuk' : 'Zapnout zvuk'}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#171210]/80 hover:bg-[#251d1a] active:scale-95 border border-[#e5a995]/30 text-[#f5d5c8] hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-lg opacity-75 hover:opacity-100"
      >
        {settings.soundEnabled ? (
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e5a995]" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
        )}
      </button>
    </div>
  );
}
