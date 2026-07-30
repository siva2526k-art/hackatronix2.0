import React from 'react';
import {
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Code2,
  Server,
  Eye,
  Sparkles,
} from 'lucide-react';

export const AboutArchitecture: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              BallVision AI — Computer Vision Architecture & Pipeline Topology
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              High-FPS Monocular 2D Ball Tracking & Multi-Camera Telemetry System
            </p>
          </div>
        </div>
      </div>

      {/* 4 Pipeline Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Pillar 1: Candidate Generation & Specular Glint */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <Eye className="w-4 h-4" />
            <span>1. Candidate Generation & 3D Specular Glint</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Performs accelerated spatial grid sampling on raw canvas pixel buffers. Converts RGB values to HSV colorspace to calculate target sports ball hue matching scores.
          </p>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-400 space-y-1">
            <div className="text-slate-300 font-bold">Mathematical Formulas:</div>
            <div>• Circularity Ratio: C = 4π × Area / Perimeter²</div>
            <div>• Specular Highlight: Top-center quadrant luminance contrast delta</div>
            <div>• Target Hue Match: S_hue = max(0, 1 - |H - H_target| / Tolerance)</div>
          </div>
        </div>

        {/* Pillar 2: NMS IoU & EMA Smoothing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>2. NMS IoU Suppression & EMA Smoothing</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sorts candidate circular blobs by combined plausibility score and applies Non-Maximum Suppression (NMS) to eliminate duplicate bounding boxes based on Intersection over Union (IoU).
          </p>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-400 space-y-1">
            <div className="text-slate-300 font-bold">Temporal Smoothing:</div>
            <div>• IoU = Area(Box_A ∩ Box_B) / Area(Box_A ∪ Box_B)</div>
            <div>• EMA Position: X_t = α × X_new + (1 - α) × X_prev</div>
            <div>• Velocity Vector: V = ΔPosition / ΔTime (px/sec)</div>
          </div>
        </div>

        {/* Pillar 3: Zero Face Detection Guarantee */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>3. Zero Face Detection & Privacy Overhead</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The application contains strictly ZERO facial detection, skeletal pose estimation, or biometric tracking dependencies. This ensures lightweight, privacy-preserving, ultra-high-FPS performance on standard client hardware.
          </p>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>100% Client-Side Real-Time Computer Vision Loop</span>
          </div>
        </div>

        {/* Pillar 4: Vercel Serverless & Gemini 2.5 Flash Proxy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
            <Server className="w-4 h-4" />
            <span>4. Vercel Serverless API Proxy Topology</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All AI telemetry requests are proxied server-side through <code className="text-emerald-400 font-mono">/api/gemini</code>. Secrets remain strictly hidden on the backend, using <code className="text-cyan-400 font-mono">@google/genai</code> SDK with free-tier model <code className="text-amber-400 font-mono">gemini-2.5-flash</code>.
          </p>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-400">
            Endpoint: POST /api/gemini (CORS Headers enabled)
          </div>
        </div>

      </div>

      {/* Deployment Spec Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span>Vercel Deployment Compliance (`vercel.json`)</span>
        </div>
        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}`}
        </pre>
      </div>

    </div>
  );
};
