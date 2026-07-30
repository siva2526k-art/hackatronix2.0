import React from "react";
import { Info, Cpu, Layers, ShieldCheck, Palette, Sparkles, Code2, CheckCircle } from "lucide-react";

export const AboutArchitecture: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Hero Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">
              System Architecture & Pipeline Physics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified 2D Ball & Face Telemetry System built with OpenCV, Canvas Computer Vision, and Gemini AI
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          BallVision & Face AI is a monocular 2D real-time computer vision platform designed for high-FPS, high-F1 tracking under varying lighting conditions. It integrates a multi-stage filtering architecture to eliminate false positives and bounding box jitter during high-velocity movement.
        </p>
      </div>

      {/* Pipeline Stages Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Stage 1 */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3">
          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4" /> Stage 1: Candidate Generation & YOLO Scanning
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Extracts regional color blobs and structural gradient boundaries across the image canvas. Candidate bounding boxes undergo Non-Maximum Suppression (NMS) to eliminate duplicate overlapping boxes.
          </p>
        </div>

        {/* Stage 2 */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3">
          <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Stage 2: Geometric & Specular Plausibility
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Calculates circularity ratio (4πA/P²), bounding box aspect ratio, and checks for 3D spherical specular highlight glints in the top-center quadrant of candidate balls.
          </p>
        </div>

        {/* Stage 3 */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3">
          <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
            <Palette className="w-4 h-4" /> Stage 3: HSV Color Filter & Hue Selector
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Converts RGB color space to HSL/HSV. Applies user-selected hue targets (e.g., Tennis Lime, Basketball Orange, Cricket Red, Soccer White) with configurable tolerance windows (±Δ hue).
          </p>
        </div>

        {/* Stage 4 */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3">
          <span className="text-xs font-mono font-bold text-purple-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Stage 4: Vercel Serverless Gemini Proxy
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            Calls Gemini 3.6 Flash via serverless function proxy (<code className="text-cyan-400">/api/gemini.ts</code>) to keep GEMINI_API_KEY secure while delivering sports kinematics and facial biomechanics analysis.
          </p>
        </div>

      </div>

      {/* Key Architectural Highlights */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-3 text-xs">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> Key Features
        </h3>

        <ul className="space-y-2 text-slate-300 font-mono">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Exponential Moving Average (EMA) temporal smoothing factor prevents bounding box flicker.
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            68-point facial landmark mesh & pose estimation (Pitch, Yaw, Roll, Gaze vector).
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Live spatial correlation vectors linking player position to ball trajectory in real-time.
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            100% client-side fallback ensure canvas tracking continues even without network connection.
          </li>
        </ul>
      </div>

    </div>
  );
};
