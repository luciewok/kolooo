import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { Lock, Play, RotateCcw, ShieldCheck, Home, Maximize2, Minimize2 } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  eventTitle: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onLockAdmin: () => void;
  onLockDevice?: () => void;
  onRefreshData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  eventTitle,
  viewMode,
  setViewMode,
  onLockAdmin,
  onLockDevice,
  onRefreshData,
}) => {
  // Official Google Pixel horizontal white vector logo
  const renderLogo = () => {
    return (
      <div className="flex items-center select-none">
        <img
          src="/Logo_Pixel_Horz_RGB_WHITE.svg"
          alt="Google Pixel"
          className="h-4.5 sm:h-5 md:h-5.5 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity duration-200"
          draggable={false}
        />
      </div>
    );
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request error:', e);
    }
  };

  const handleLogoClick = () => {
    if (viewMode === 'device_lock') return;
    setViewMode('attractor');
  };

  return (
    <header className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-3.5 sm:py-4 w-full max-w-7xl mx-auto">
      {/* Brand Logo */}
      <div 
        onClick={handleLogoClick}
        className="cursor-pointer transition hover:opacity-90 flex items-center gap-2"
        title="Návrat na úvodní obrazovku"
      >
        {renderLogo()}
      </div>

      {/* Top Right Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {viewMode === 'device_lock' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5 text-[#e5a995]" />
            <span>Kiosk uzamčen</span>
          </div>
        )}

        {(viewMode === 'attractor' || viewMode === 'wheel' || viewMode === 'quiz' || viewMode === 'quiz_result') && (
          <>
            {viewMode !== 'attractor' && (
              <button
                onClick={() => setViewMode('attractor')}
                className="flex items-center gap-1.5 border border-[#e5a995]/20 bg-[#171210]/60 hover:bg-[#251d1a] active:scale-95 text-slate-300 hover:text-white rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium transition backdrop-blur-md cursor-pointer"
                title="Přejít na úvodní obrazovku"
              >
                <Home className="w-3.5 h-3.5 text-[#e5a995]" />
                <span className="hidden sm:inline">Úvod</span>
              </button>
            )}

            <button
              onClick={() => setViewMode('pin_entry')}
              className="flex items-center gap-2 border border-[#e5a995]/30 bg-[#171210]/60 hover:bg-[#251d1a] active:scale-95 text-[#f5d5c8] hover:text-white rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium transition backdrop-blur-md cursor-pointer shadow-[0_0_15px_rgba(229,169,149,0.1)]"
            >
              <ShieldCheck className="w-4 h-4 text-[#e5a995]" />
              <span>Správa</span>
            </button>

            {onLockDevice && (
              <button
                onClick={onLockDevice}
                className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-[#e5a995] transition cursor-pointer"
                title="Uzamknout tablet (Kiosk Lock)"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {viewMode === 'pin_entry' && (
          <button
            onClick={() => setViewMode('attractor')}
            className="flex items-center gap-2 border border-[#e5a995]/30 bg-[#171210]/60 hover:bg-[#251d1a] active:scale-95 text-[#f5d5c8] hover:text-white rounded-full px-5 py-2 text-sm font-medium transition backdrop-blur-md cursor-pointer shadow-[0_0_15px_rgba(229,169,149,0.1)]"
          >
            <RotateCcw className="w-4 h-4 text-[#e5a995]" />
            <span>Zpět</span>
          </button>
        )}

        {viewMode === 'admin' && (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* PWA Install Button for easy tablet setup */}
            <PWAInstallButton />

            {/* Spustit kiosk button with rose-gold glow */}
            <button
              onClick={() => setViewMode('attractor')}
              className="flex items-center gap-2 bg-gradient-to-r from-[#f5d5c8] to-[#e5a995] text-[#1c120e] font-semibold px-4 sm:px-5 py-2 text-xs sm:text-sm rounded-full shadow-[0_0_25px_rgba(229,169,149,0.4)] hover:shadow-[0_0_35px_rgba(229,169,149,0.6)] hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-[#1c120e]" />
              <span>Spustit Kiosk</span>
            </button>

            {onRefreshData && (
              <button
                onClick={onRefreshData}
                className="hidden md:flex items-center gap-2 border border-[#e5a995]/30 bg-[#171210]/60 hover:bg-[#251d1a] text-[#f5d5c8] hover:text-white rounded-full px-4 py-2 text-sm font-medium transition backdrop-blur-md cursor-pointer"
              >
                <span>Aktualizovat data</span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              title={isFullscreen ? 'Ukončit celou obrazovku' : 'Režim celé obrazovky (Kiosk)'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onLockAdmin}
              className="flex items-center gap-2 border border-[#e5a995]/30 bg-[#171210]/60 hover:bg-[#251d1a] active:scale-95 text-[#f5d5c8] hover:text-white rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium transition backdrop-blur-md cursor-pointer"
              title="Zamknout administraci a vrátit se na úvod"
            >
              <Lock className="w-3.5 h-3.5 text-[#e5a995]" />
              <span>Zavřít</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


