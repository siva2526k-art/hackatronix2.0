import React, { useState, useEffect } from 'react';
import { FaceDistanceResult, CalibrationProfile } from '../types';
import { Target, CheckCircle2, ShieldCheck, X, RefreshCw, AlertCircle } from 'lucide-react';
import { calculateCalibratedFocalLength } from '../utils/cvMath';
import { saveCalibrationProfile } from '../utils/calibrationStorage';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: FaceDistanceResult | null;
  deviceId: string;
  realFaceWidthM: number;
  onCalibrationComplete: (profile: CalibrationProfile) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  result,
  deviceId,
  realFaceWidthM,
  onCalibrationComplete,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [samples, setSamples] = useState<number[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [calculatedFocal, setCalculatedFocal] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(null);
      setSamples([]);
      setIsSuccess(false);
      setCalculatedFocal(null);
    }
  }, [isOpen]);

  // Collect samples during countdown
  useEffect(() => {
    if (countdown !== null && countdown > 0 && result && result.wPx > 0) {
      setSamples((prev) => [...prev, result.wPx]);
    }
  }, [countdown, result]);

  // Handle countdown timer
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Calculate average w_px from samples
      const validSamples = samples.filter((s) => s > 0);
      const avgWPx =
        validSamples.length > 0
          ? validSamples.reduce((a, b) => a + b, 0) / validSamples.length
          : result?.wPx || 0;

      if (avgWPx > 0 && result) {
        // f = (w_px * 0.5m) / W
        const f = calculateCalibratedFocalLength(avgWPx, 0.50, realFaceWidthM);
        setCalculatedFocal(f);

        const profile: CalibrationProfile = {
          deviceId: deviceId || 'default_cam',
          resolutionWidth: result.width,
          resolutionHeight: result.height,
          focalLengthPx: f,
          calibratedAt: new Date().toISOString(),
          referenceDistanceM: 0.50,
          realFaceWidthM,
        };

        saveCalibrationProfile(profile);
        setIsSuccess(true);
        onCalibrationComplete(profile);
      }
    }
  }, [countdown, samples, result, deviceId, realFaceWidthM, onCalibrationComplete]);

  if (!isOpen) return null;

  const currentWPx = result?.wPx || 0;
  const isFaceDetected = currentWPx > 0;

  const startCalibration = () => {
    setSamples([]);
    setIsSuccess(false);
    setCalculatedFocal(null);
    setCountdown(5);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#333] p-6 max-w-lg w-full shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#333]">
          <div className="w-8 h-8 bg-black border border-[#38bdf8]/50 flex items-center justify-center text-[#38bdf8]">
            <Target className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">1-Point Pinhole Calibration (50cm)</h2>
            <p className="text-[11px] text-gray-400 font-mono">Reference: Z_ref = 0.50m (50 cm)</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-xs text-slate-300 mb-5">
          <div className="bg-black/50 border border-[#333] p-3 space-y-1">
            <span className="text-[#38bdf8] font-bold block text-[11px] uppercase tracking-wider">CALIBRATION INSTRUCTIONS:</span>
            <p className="text-[11px] text-gray-300">1. Position face exactly <span className="text-[#22c55e] font-bold">50 cm</span> from the camera lens.</p>
            <p className="text-[11px] text-gray-300">2. Keep head facing directly forward at camera center.</p>
            <p className="text-[11px] text-gray-300">3. Click &quot;START 5-SEC CALIBRATION&quot; and hold steady.</p>
          </div>

          {/* Live Status Indicators */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-black/40 border border-[#333] p-2 flex items-center justify-between">
              <span className="text-gray-500">FACE DETECT:</span>
              <span className={`font-bold ${isFaceDetected ? 'text-[#22c55e]' : 'text-rose-400'}`}>
                {isFaceDetected ? 'DETECTED' : 'SEARCHING...'}
              </span>
            </div>
            <div className="bg-black/40 border border-[#333] p-2 flex items-center justify-between">
              <span className="text-gray-500">LIVE w_px:</span>
              <span className="text-[#38bdf8] font-bold">{currentWPx.toFixed(1)} px</span>
            </div>
          </div>
        </div>

        {/* Countdown / Result Display */}
        {countdown !== null && countdown > 0 && (
          <div className="my-5 text-center space-y-2 bg-black/60 border border-[#38bdf8]/50 p-5">
            <p className="text-[11px] text-[#38bdf8] font-bold tracking-wider uppercase">HOLD STEADY AT 50CM</p>
            <div className="text-5xl font-black text-[#38bdf8] animate-bounce">{countdown}</div>
            <p className="text-[10px] text-gray-400">Sampling zygomatic landmark dimensions...</p>
          </div>
        )}

        {isSuccess && calculatedFocal && (
          <div className="my-5 bg-black/60 border border-[#22c55e]/60 p-4 space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 text-[#22c55e] font-bold text-xs uppercase">
              <CheckCircle2 className="w-4 h-4" /> CALIBRATION SUCCESSFUL
            </div>
            <p className="text-xs text-gray-200">
              New Focal Length <span className="text-[#22c55e] font-bold">f = {Math.round(calculatedFocal)} px</span> saved to profile.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#333]">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#141414] border border-[#333] text-gray-400 hover:text-white text-xs font-mono cursor-pointer"
          >
            {isSuccess ? 'CLOSE' : 'CANCEL'}
          </button>
          <button
            onClick={startCalibration}
            disabled={!isFaceDetected || (countdown !== null && countdown > 0)}
            className="px-4 py-1 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs font-mono flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${countdown !== null && countdown > 0 ? 'animate-spin' : ''}`} />
            <span>{countdown !== null && countdown > 0 ? 'CALIBRATING...' : 'START 5-SEC CALIBRATION'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
