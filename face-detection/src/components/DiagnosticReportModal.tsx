import React from 'react';
import { AlertTriangle, X, Check, Code, HelpCircle } from 'lucide-react';

interface DiagnosticReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticReportModal: React.FC<DiagnosticReportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#ea580c]/60 p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#333]">
          <div className="w-8 h-8 bg-black border border-[#ea580c] flex items-center justify-center text-[#ea580c] shrink-0">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">5x Underestimation Bug Diagnostic Audit</h2>
            <p className="text-[11px] text-[#ea580c] font-mono">
              Root Cause Analysis: Why 50 cm is miscalculated as ~10-11 cm
            </p>
          </div>
        </div>

        {/* Introduction */}
        <p className="text-xs text-gray-300 leading-relaxed mb-4 bg-black/40 border border-[#333] p-3">
          In monocular face distance estimation, a 5x underestimation error (e.g., actual distance <span className="text-[#22c55e] font-bold">50 cm</span> measured as <span className="text-[#ea580c] font-bold">11 cm</span>) is a common failure mode caused by 4 specific computer vision pipeline defects. HackTronix 2.0 addresses all 4 causes:
        </p>

        {/* 4 Root Causes Breakdown */}
        <div className="space-y-3 text-xs">
          {/* Cause 1 */}
          <div className="bg-black/50 border border-[#333] p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[#ea580c] font-bold text-xs uppercase">
              <span className="w-4 h-4 bg-black border border-[#ea580c] flex items-center justify-center text-[10px] text-[#ea580c]">1</span>
              Resolution Focal Scale Mismatch (~2.8x Error)
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Hardcoding a fixed focal length (e.g., <span className="text-[#38bdf8] font-bold">f = 1400px</span> optimized for 1080p) while running the camera stream at 640x480 (where true <span className="text-[#38bdf8] font-bold">f ≈ 500px</span>).
            </p>
            <div className="bg-black border border-[#333] p-2 text-[10px] text-[#22c55e]">
              ✓ HackTronix Fix: Dynamic focal length resolution estimator <span className="text-white">f_default = round(resolutionWidth * 0.85)</span> or 1-Point 50cm pinhole calibration.
            </div>
          </div>

          {/* Cause 2 */}
          <div className="bg-black/50 border border-[#333] p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[#ea580c] font-bold text-xs uppercase">
              <span className="w-4 h-4 bg-black border border-[#ea580c] flex items-center justify-center text-[10px] text-[#ea580c]">2</span>
              Bounding Box Padding vs Zygomatic Arch (~3.6x Error)
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Using a full face bounding box (which includes forehead, hair, and chin padding = ~180px) while assuming it represents facial bone width (zygomatic distance = ~50px).
            </p>
            <div className="bg-black border border-[#333] p-2 text-[10px] text-[#22c55e]">
              ✓ HackTronix Fix: Precise MediaPipe Face Mesh landmarks <span className="text-white">#234 (Left Arch)</span> and <span className="text-white">#454 (Right Arch)</span> with default <span className="text-white">W = 0.14m (14cm)</span>.
            </div>
          </div>

          {/* Cause 3 */}
          <div className="bg-black/50 border border-[#333] p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[#ea580c] font-bold text-xs uppercase">
              <span className="w-4 h-4 bg-black border border-[#ea580c] flex items-center justify-center text-[10px] text-[#ea580c]">3</span>
              CSS Rendered Canvas vs Native Track Width Scaling (~2x Error)
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Calculating pixel width <span className="text-[#38bdf8]">w_px</span> from CSS client dimensions (e.g. 400px wide element) instead of native video track resolution (e.g. 1280x720).
            </p>
            <div className="bg-black border border-[#333] p-2 text-[10px] text-[#22c55e]">
              ✓ HackTronix Fix: All landmark pixel coordinates are calculated strictly against native <span className="text-white">video.videoWidth</span> and <span className="text-white">video.videoHeight</span>.
            </div>
          </div>

          {/* Cause 4 */}
          <div className="bg-black/50 border border-[#333] p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[#ea580c] font-bold text-xs uppercase">
              <span className="w-4 h-4 bg-black border border-[#ea580c] flex items-center justify-center text-[10px] text-[#ea580c]">4</span>
              Unit Conversion Omission
            </div>
            <p className="text-gray-300 leading-relaxed text-[11px]">
              Mixing meters (<span className="text-white">W = 0.14m</span>) and pixels without multiplying resulting depth <span className="text-white">Z_meters</span> by 100 into centimeters <span className="text-white">Z_cm</span>.
            </p>
            <div className="bg-black border border-[#333] p-2 text-[10px] text-[#22c55e]">
              ✓ HackTronix Fix: Explicit unit math <span className="text-white">Z_meters = (f * W) / w_px</span> and <span className="text-white">Z_cm = Z_meters * 100</span>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-[#333] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-mono font-bold cursor-pointer uppercase"
          >
            Acknowledge &amp; Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
