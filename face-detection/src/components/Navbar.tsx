import React from 'react';
import { Activity, ShieldCheck, Target, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';

interface NavbarProps {
  fps: number;
  isCalibrated: boolean;
  onOpenCalibration: () => void;
  onOpenAudit5xModal: () => void;
  onOpenGeminiAiModal: () => void;
  isAiLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  fps,
  isCalibrated,
  onOpenCalibration,
  onOpenAudit5xModal,
  onOpenGeminiAiModal,
  isAiLoading,
}) => {
  return (
    <header className="bg-[#121212] border-b border-[#38bdf8]/30 px-4 py-2 flex flex-wrap items-center justify-between h-auto sm:h-12 shadow-[0_4px_20px_rgba(56,189,248,0.1)] text-mono select-none gap-2">
      {/* Title & Engine State */}
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e] shrink-0" />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xs sm:text-sm font-bold tracking-tighter text-[#38bdf8] font-mono">
            HACKTRONIX 2.0 // FACE_DISTANCE_TELEMETRY_V2.0.4
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#141414] border border-[#333] text-gray-400 font-mono tracking-tight hidden md:inline-block">
            STABLE_ONNX_RUNTIME_WEB_WGPU
          </span>
        </div>
      </div>

      {/* FPS & Action Buttons */}
      <div className="flex items-center gap-3 text-[11px]">
        {/* Frame Rate Counter */}
        <div className="text-right hidden sm:block">
          <div className="text-gray-500 uppercase text-[9px] font-mono">Frame Rate</div>
          <div className={`font-bold font-mono ${fps > 25 ? 'text-[#22c55e]' : fps > 15 ? 'text-amber-400' : 'text-rose-400'}`}>
            {fps.toFixed(2)} FPS
          </div>
        </div>

        {/* 5x Bug Diagnostic Button */}
        <button
          onClick={onOpenAudit5xModal}
          className="px-3 py-1 bg-[#141414] border border-[#333] hover:border-[#ea580c] text-[#ea580c] transition-colors text-[11px] font-mono flex items-center gap-1.5 cursor-pointer uppercase font-semibold"
          title="Inspect 5x Distance Underestimation Bug Diagnostic Audit"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#ea580c]" />
          <span>Audit 5x Bug</span>
        </button>

        {/* 50cm Calibration Button */}
        <button
          onClick={onOpenCalibration}
          className={`px-3 py-1 text-[11px] font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            isCalibrated
              ? 'bg-[#22c55e] text-black hover:bg-[#16a34a]'
              : 'bg-[#ea580c] text-white hover:bg-[#c2410c] animate-pulse'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{isCalibrated ? 'CALIBRATED (50CM)' : 'CALIBRATE (50CM)'}</span>
        </button>

        {/* Gemini AI Telemetry Analysis Button */}
        <button
          onClick={onOpenGeminiAiModal}
          disabled={isAiLoading}
          className="px-3 py-1 bg-[#141414] border border-[#38bdf8]/50 hover:border-[#38bdf8] text-[#38bdf8] text-[11px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {isAiLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse" />
          )}
          <span>GEMINI AI AUDIT</span>
        </button>
      </div>
    </header>
  );
};

