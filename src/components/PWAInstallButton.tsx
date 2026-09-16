import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running in standalone kiosk mode, do not show button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 border border-[#e5a995]/40 bg-gradient-to-r from-[#e5a995]/20 to-[#f5d5c8]/20 hover:from-[#e5a995]/30 hover:to-[#f5d5c8]/30 active:scale-95 text-[#f5d5c8] hover:text-white rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer shadow-sm ${className}`}
        title="Nainstalovat jako aplikaci na plochu (Kiosk)"
      >
        <Download className="w-3.5 h-3.5 text-[#e5a995]" />
        <span>Nainstalovat na plochu</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 border border-[#e5a995]/30 bg-[#171210]/60 hover:bg-[#251d1a] active:scale-95 text-[#f5d5c8] rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${className}`}
          title="Instalace na plochu iPadu"
        >
          <Download className="w-3.5 h-3.5 text-[#e5a995]" />
          <span>Přidat na plochu</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-[#18110e] border border-[#e5a995]/30 rounded-3xl p-6 text-white text-center shadow-2xl relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-[#e5a995]/20 text-[#e5a995] flex items-center justify-center mx-auto mb-3">
                <Download className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-light text-white mb-2">Instalace na iPad (Kiosk)</h3>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                Spusťte aplikaci na celou obrazovku bez ovládacích prvků Safari:
              </p>

              <div className="space-y-3 text-left bg-black/30 border border-white/10 rounded-2xl p-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4 text-[#e5a995]" />
                  </div>
                  <span>1. Klepněte na tlačítko <strong>Sdílet</strong> v liště Safari.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4 text-[#e5a995]" />
                  </div>
                  <span>2. Vyberte položku <strong>Přidat na plochu</strong>.</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span>3. Otevřete aplikaci z ikony na ploše – poběží v kiosk módu.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-[#e5a995] text-[#1c120e] font-semibold text-xs transition active:scale-95"
              >
                Rozumím
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
