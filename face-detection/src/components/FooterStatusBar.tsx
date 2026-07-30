import React from 'react';

interface FooterStatusBarProps {
  sessionId: string;
  isCalibrated: boolean;
  fps: number;
}

export const FooterStatusBar: React.FC<FooterStatusBarProps> = ({
  sessionId,
  isCalibrated,
  fps,
}) => {
  return (
    <footer className="h-8 bg-[#141414] border-t border-[#333] flex items-center justify-between px-4 text-[10px] text-gray-500 font-mono font-medium select-none shrink-0">
      <div className="flex items-center gap-4">
        <span>SESSION_ID: <span className="text-gray-300 font-bold">{sessionId}</span></span>
        <span className="text-[#333]">|</span>
        <span>WASM_BACKEND: <span className="text-gray-300 font-bold">SIMD_WEBGL_GPU</span></span>
        <span className="text-[#333]">|</span>
        <span>ACCURACY: <span className="text-[#22c55e] font-bold">{isCalibrated ? '±0.8cm' : '±1.2cm'}</span></span>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        <span className="text-gray-300 uppercase animate-pulse font-bold">System_Running_Stable ({fps} Hz)</span>
      </div>
    </footer>
  );
};

