import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Cpu,
  Brain,
  Video,
} from 'lucide-react';
import { DetectedBall } from '../types';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  base64Frame?: string;
  detectedBalls: DetectedBall[];
  sourceName: string;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  base64Frame,
  detectedBalls,
  sourceName,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [userPrompt, setUserPrompt] = useState<string>('');

  const fetchAnalysis = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const telemetryPayload = {
      source: sourceName,
      timestamp: new Date().toISOString(),
      detectedObjectCount: detectedBalls.length,
      objects: detectedBalls.map((ball) => ({
        id: ball.id,
        classLabel: ball.classLabel,
        confidencePercent: ball.confidence,
        bbox: ball.bbox,
        center: ball.center,
        radius: ball.radius,
        circularity: ball.circularity,
        specularGlint: ball.specularGlint,
        velocityPxPerSec: ball.velocity.speedPxPerSec,
        velocityVector: { vx: ball.velocity.vx, vy: ball.velocity.vy },
      })),
    };

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Frame,
          telemetry: telemetryPayload,
          prompt: userPrompt || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reach Gemini API Proxy.');
      }

      setAnalysisText(data.text);
    } catch (err: any) {
      console.error('Gemini Analysis error:', err);
      setErrorMsg(err.message || 'Error processing request with Gemini 2.5 Flash.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysisText) {
      fetchAnalysis();
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl bg-[#0f172a] border border-slate-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 font-mono">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
              <Sparkles className="w-4 h-4 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-slate-100 font-bold text-xs uppercase tracking-wider flex items-center space-x-2">
                <span>Gemini 2.5 Flash Specialist</span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  v2.5-FLASH
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Source: {sourceName} | {detectedBalls.length} Active Detections
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 font-sans">
          
          {/* Frame Snapshot Preview & Custom Query Prompt */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-slate-950 border border-slate-800 rounded-xl">
            {base64Frame ? (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                <img src={base64Frame} alt="Captured Snapshot" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs font-mono">
                No Snapshot Frame
              </div>
            )}

            <div className="md:col-span-2 space-y-2 flex flex-col justify-between">
              <div>
                <label className="text-slate-300 font-mono text-[11px] block font-semibold">
                  Custom AI Kinematics Prompt (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Estimate ball spin, launch angle, or lighting adjustments..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={fetchAnalysis}
                  disabled={isLoading}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Processing...' : 'Run Analysis'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Result Output Area */}
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-slate-300 text-xs font-mono">
                Synthesizing camera telemetry and running ball kinematics physics engine with Gemini 2.5 Flash...
              </p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-rose-300 text-xs font-mono">
              <div className="flex items-center space-x-2 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Gemini API Request Error</span>
              </div>
              <p>{errorMsg}</p>
            </div>
          ) : analysisText ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3 text-slate-200 text-xs leading-relaxed font-sans whitespace-pre-wrap max-h-[380px] overflow-y-auto">
                {analysisText}
              </div>
            </div>
          ) : null}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Serverless Proxy Route: /api/gemini</span>
          </div>

          <div className="flex items-center space-x-2">
            {analysisText && (
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-mono border border-slate-700 transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Insights</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
