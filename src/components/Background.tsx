import React from 'react';

export const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#080606]">
      {/* Top Center Warm Rose-Gold Ambient Spotlight (hardware accelerated radial gradient, 0 GPU blur overhead) */}
      <div 
        className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[90%] max-w-[800px] h-[65%] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(226, 168, 130, 0.22) 0%, rgba(180, 110, 80, 0.08) 45%, rgba(8, 6, 6, 0) 70%)',
        }}
      />

      {/* Bottom Right Subtle Bronze Glow (pure radial gradient) */}
      <div 
        className="absolute -bottom-[20%] -right-[10%] w-[70%] max-w-[600px] h-[60%] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(200, 143, 113, 0.15) 0%, rgba(8, 6, 6, 0) 70%)',
        }}
      />

      {/* Signature Pixel 11 Pro Camera Visor Silhouette in Top Background */}
      <div className="absolute top-8 sm:top-10 left-1/2 -translate-x-1/2 w-[280px] sm:w-[380px] h-[55px] sm:h-[75px] rounded-full border border-[#e5a995]/20 bg-[#120c0a]/70 shadow-[0_0_25px_rgba(229,169,149,0.08)] flex items-center justify-end px-6 sm:px-8 pointer-events-none opacity-40">
        <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-gradient-to-tr from-[#38bdf8] via-[#e5a995] to-[#f43f5e] opacity-85 shadow-[0_0_10px_rgba(229,169,149,0.5)]" />
      </div>

      {/* Soft Vignette Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(4, 3, 3, 0.75) 100%)',
        }}
      />
    </div>
  );
};
