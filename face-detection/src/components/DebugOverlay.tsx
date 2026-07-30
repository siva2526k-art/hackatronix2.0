import React, { useState } from 'react';
import { FaceDistanceResult } from '../types';
import { Bug, X, Minimize2, Maximize2 } from 'lucide-react';

interface DebugOverlayProps {
  result: FaceDistanceResult | null;
  isOpen: boolean;
  onClose: () => void;
  focalLengthPx: number;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  result,
  isOpen,
  onClose,
  focalLengthPx,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 right-4 z-40 bg-[#121212]/95 border border-[#333] shadow-2xl p-3 font-mono w-80 text-xs text-slate-200 select-none transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333]">
        <span className="text-[#38bdf8] font-bold flex items-center gap-1.5 text-xs uppercase tracking-tight">
          <Bug className="w-3.5 h-3.5" /> HUD Telemetry Debug
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-white p-0.5 cursor-pointer"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-rose-400 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex justify-between">
            <span className="text-gray-500">Track Resolution:</span>
            <span className="text-[#38bdf8] font-bold">{result ? `${result.width}x${result.height}` : 'N/A'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Z Smoothed:</span>
            <span className="text-[#22c55e] font-bold">{result?.zSmoothedCm.toFixed(2)} cm</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Z Raw (Unfiltered):</span>
            <span className="text-gray-300">{result?.zRawCm.toFixed(2)} cm</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Horizontal Angle θ:</span>
            <span className="text-[#38bdf8]">{result?.angleDeg.toFixed(2)}° ({result?.angleRad.toFixed(3)} rad)</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Active Focal Length f:</span>
            <span className="text-[#ea580c] font-bold">{Math.round(focalLengthPx)} px</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Face Width w_px:</span>
            <span className="text-[#38bdf8]">{result?.wPx.toFixed(2)} px</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Quantization Noise ΔZ:</span>
            <span className="text-[#ea580c] font-bold">±{result?.deltaZCm.toFixed(2)} cm</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Calibration State:</span>
            <span className={`font-bold ${result?.isCalibrated ? 'text-[#22c55e]' : 'text-[#ea580c]'}`}>
              {result?.isCalibrated ? 'CALIBRATED_50CM' : 'UNCALIBRATED_DEFAULT'}
            </span>
          </div>

          <div className="pt-2 border-t border-[#333] text-[10px] text-gray-500 break-all">
            <span className="text-gray-400 font-bold block mb-0.5">Key:</span>
            {result?.calibrationKey || 'none (default f = 0.85 * width)'}
          </div>
        </div>
      )}
    </div>
  );
};
