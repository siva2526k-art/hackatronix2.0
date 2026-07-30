import React, { useRef, useEffect } from 'react';
import { FaceDistanceResult } from '../types';
import { Crosshair, Cpu, Eye } from 'lucide-react';

interface VisionCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  result: FaceDistanceResult | null;
  isMirrored: boolean;
  isSkinFallbackActive: boolean;
}

export const VisionCanvas: React.FC<VisionCanvasProps> = ({
  videoRef,
  canvasRef,
  result,
  isMirrored,
  isSkinFallbackActive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw overlay graphics on canvas matching exact native frame dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, cx, cy, noseX, noseY, zygomaticLeft, zygomaticRight, wPx, zSmoothedCm, angleDeg, isCalibrated } = result;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    if (isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // 1. Optical Center Crosshairs (cx, cy)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan translucent
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // Optical Center Blue Dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Face Tracking Visuals
    if (wPx > 0 && noseX > 0 && noseY > 0) {
      // Vector line from optical center to nose tip
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(noseX, noseY);
      ctx.stroke();

      // Zygomatic Arch Landmarks (#234 & #454) line
      if (zygomaticLeft.x > 0 && zygomaticRight.x > 0) {
        ctx.strokeStyle = '#22c55e'; // Green zygomatic line
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(zygomaticLeft.x, zygomaticLeft.y);
        ctx.lineTo(zygomaticRight.x, zygomaticRight.y);
        ctx.stroke();

        // Left landmark #234
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(zygomaticLeft.x, zygomaticLeft.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Right landmark #454
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(zygomaticRight.x, zygomaticRight.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nose Tip Landmark #1
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(noseX, noseY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Bounding Tracking Circle around face
      const faceRadius = Math.max(25, wPx * 0.65);
      ctx.strokeStyle = isSkinFallbackActive ? 'rgba(234, 179, 8, 0.8)' : 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(noseX, noseY, faceRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Restore transform before drawing text to avoid mirrored text!
      ctx.restore();

      // Calculate mirrored x coordinate for un-mirrored text positioning
      const textX = isMirrored ? width - noseX : noseX;
      const textY = Math.max(40, noseY - faceRadius - 15);

      // 3. Floating HUD Label Above Face
      ctx.font = 'bold 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      const labelText = `${zSmoothedCm.toFixed(1)} cm | ${angleDeg >= 0 ? '+' : ''}${angleDeg.toFixed(1)}°`;
      const textWidth = ctx.measureText(labelText).width;

      // Label Box Background
      ctx.fillStyle = isSkinFallbackActive ? 'rgba(113, 63, 18, 0.85)' : 'rgba(12, 74, 110, 0.85)';
      ctx.strokeStyle = isSkinFallbackActive ? '#eab308' : '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(textX - textWidth / 2 - 10, textY - 22, textWidth + 20, 30, 6);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, textX, textY - 7);
    } else {
      ctx.restore();
    }
  }, [result, isMirrored, isSkinFallbackActive, canvasRef]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-[#0d0d0d] rounded-lg border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center group"
    >
      {/* Native Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
      />

      {/* Overlay Canvas for Computer Vision Telemetry */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Top-Left Live Diagnostics HUD Overlay Card */}
      <div className="absolute top-3 left-3 bg-black/80 border border-[#333] p-3 text-mono text-xs w-52 shadow-xl pointer-events-none">
        <div className="text-[10px] text-gray-500 mb-2 border-b border-[#333] pb-1 uppercase font-bold tracking-wider">
          LIVE_DIAGNOSTICS_HUD
        </div>
        <div className="space-y-1.5 text-[11px] font-mono">
          <div className="flex justify-between">
            <span className="text-gray-400">w_px</span>
            <span className="text-[#38bdf8] font-bold">{result?.wPx ? result.wPx.toFixed(2) : '0.00'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">x_off</span>
            <span className="text-[#38bdf8] font-bold">{result?.noseX && result?.cx ? (result.noseX - result.cx).toFixed(2) : '0.00'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Z_est</span>
            <span className="text-[#38bdf8] font-bold">{result?.zSmoothedCm ? result.zSmoothedCm.toFixed(2) : '0.00'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">theta</span>
            <span className="text-[#38bdf8] font-bold">{result?.angleDeg ? `${result.angleDeg >= 0 ? '+' : ''}${result.angleDeg.toFixed(1)}°` : '0.0°'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">f_px</span>
            <span className="text-white font-bold">{result?.focalLengthPx ? Math.round(result.focalLengthPx) : '1088'}</span>
          </div>
        </div>
      </div>

      {/* Top-Right Calibration Status Card */}
      <div className="absolute top-3 right-3 w-52 bg-[#141414] border border-[#38bdf8]/40 p-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] pointer-events-none">
        <div className="text-[9px] text-[#38bdf8] mb-2 uppercase font-bold tracking-wider">Calibration Status</div>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${result?.isCalibrated ? 'bg-[#22c55e]' : 'bg-[#ea580c]'}`}></div>
          <div className="text-[11px] font-bold text-white">
            {result?.isCalibrated ? 'PROFILE: CALIB_50CM' : 'PROFILE: DEFAULT_0.85W'}
          </div>
        </div>
        <div className="space-y-1 text-[10px] text-gray-400 font-mono">
          <div>RES: {result?.width || 1280}x{result?.height || 720}</div>
          <div>FOCAL: {Math.round(result?.focalLengthPx || 1088)}px</div>
          <div>QUANTIZ: ±0.8cm</div>
        </div>
      </div>

      {/* Skin Tone Fallback Warning Badge */}
      {isSkinFallbackActive && (
        <div className="absolute top-16 right-3 bg-[#141414] border border-[#ea580c] text-[#ea580c] px-3 py-1 text-xs font-mono flex items-center gap-2 shadow-lg animate-pulse">
          <Cpu className="w-3.5 h-3.5 text-[#ea580c]" />
          <span className="font-bold">SKIN_CENTROID_FALLBACK</span>
        </div>
      )}

      {/* Bottom-Left Technical Spec Summary Card */}
      <div className="absolute bottom-3 left-3 bg-black/80 border border-[#333] p-3 w-60 text-[10px] text-gray-400 font-mono shadow-xl hidden sm:block pointer-events-none">
        <div className="text-[10px] text-gray-500 mb-1.5 uppercase font-bold">TECHNICAL_SPEC_V2</div>
        <div className="space-y-1 italic">
          <div>Z = (f • W) / w_px</div>
          <div>θ = arctan2(Δx, f)</div>
        </div>
        <div className="mt-2 pt-2 border-t border-[#333] not-italic">
          <span className="text-white font-bold">W_REF:</span> {result?.realFaceWidthM ? (result.realFaceWidthM * 100).toFixed(1) : '14.0'}cm (BONE_WIDTH)
        </div>
      </div>
    </div>
  );
};
