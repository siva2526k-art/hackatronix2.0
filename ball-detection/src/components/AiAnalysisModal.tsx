import React, { useState, useEffect } from "react";
import { Sparkles, Send, X, Bot, AlertCircle, RefreshCw } from "lucide-react";
import { BallDetection, FaceDetection, PipelineConfig } from "../types";

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  frameBase64: string | null;
  balls: BallDetection[];
  faces: FaceDetection[];
  config: PipelineConfig;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  frameBase64,
  balls,
  faces,
  config,
}) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Primary call to Vercel Serverless Function proxy /api/gemini
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frameBase64,
          detections: balls,
          faceDetections: faces,
          mode: config.mode,
          promptCustom: customPrompt,
        }),
      });

      if (!res.ok) {
        // Fallback to Express backend /api/gemini_analysis if dev server
        const fallbackRes = await fetch("/api/gemini_analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: frameBase64,
            detections: balls,
            mode: config.mode,
          }),
        });

        if (!fallbackRes.ok) {
          const errData = await fallbackRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to reach Gemini server proxy.");
        }

        const fallbackData = await fallbackRes.json();
        setAnalysisText(fallbackData.analysis);
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setAnalysisText(data.analysis);
    } catch (err: any) {
      console.error("Gemini Analysis Error:", err);
      setErrorMsg(
        err.message || "Failed to analyze telemetry frame. Please ensure GEMINI_API_KEY is configured."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !analysisText && !isLoading) {
      runAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Gemini 3.6 Flash Telemetry Specialist</h3>
              <p className="text-[11px] text-slate-400">Server-Side Proxy Vision AI</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Frame Preview + Object Tags */}
          {frameBase64 && (
            <div className="flex gap-4 items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <img
                src={frameBase64}
                alt="Telemetry Frame"
                className="w-28 h-20 object-cover rounded-lg border border-slate-800"
              />
              <div className="space-y-1 font-mono">
                <span className="text-slate-300 font-bold block">
                  Captured Frame Metadata
                </span>
                <span className="text-emerald-400 block">
                  Balls: {balls.length > 0 ? balls.map((b) => b.className).join(", ") : "None"}
                </span>
                <span className="text-cyan-400 block">
                  Faces: {faces.length} detected
                </span>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              <p className="text-slate-300 font-bold">Analyzing Ball & Face Kinematics...</p>
              <p className="text-slate-500 text-[11px]">
                Computing trajectory vectors, specular glint features, and pose alignment
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4" /> Gemini AI Proxy Error
              </div>
              <p className="text-slate-300">{errorMsg}</p>
            </div>
          )}

          {/* Render Analysis Markdown Result */}
          {analysisText && !isLoading && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-sans text-slate-200 leading-relaxed whitespace-pre-line">
              {analysisText}
            </div>
          )}

        </div>

        {/* Custom Question Prompt Input */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
          <input
            type="text"
            placeholder="Ask a specific question (e.g. 'Estimate spin rate and light reflections')..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
          />
          <button
            onClick={runAnalysis}
            disabled={isLoading}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" /> Re-Analyze
          </button>
        </div>

      </div>
    </div>
  );
};
