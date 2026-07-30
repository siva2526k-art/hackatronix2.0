import React, { useState } from 'react';
import { GeminiAnalysisResult, FaceDistanceResult } from '../types';
import { Sparkles, X, RefreshCw, Send, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

interface GeminiAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: FaceDistanceResult | null;
  aiAnalysis: GeminiAnalysisResult | null;
  isLoading: boolean;
  onRequestAnalysis: (customPrompt?: string) => void;
}

export const GeminiAiModal: React.FC<GeminiAiModalProps> = ({
  isOpen,
  onClose,
  result,
  aiAnalysis,
  isLoading,
  onRequestAnalysis,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isLoading) return;
    onRequestAnalysis(customPrompt);
    setCustomPrompt('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none">
      <div className="bg-[#121212] border border-[#38bdf8]/50 p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#333]">
          <div className="w-8 h-8 bg-black border border-[#38bdf8] flex items-center justify-center text-[#38bdf8] shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">Google Gemini AI Telemetry Analysis</h2>
            <p className="text-[11px] text-[#38bdf8] font-mono">
              Model: gemini-3.6-flash // Live Monocular CV Telemetry
            </p>
          </div>
        </div>

        {/* Analysis Loading or Output */}
        {isLoading ? (
          <div className="my-8 text-center space-y-3 py-6 bg-black/50 border border-[#333]">
            <RefreshCw className="w-6 h-6 text-[#38bdf8] animate-spin mx-auto" />
            <p className="text-xs text-[#38bdf8] font-bold uppercase">Querying Gemini AI Telemetry Agent...</p>
            <p className="text-[11px] text-gray-400">Evaluating focal length variance, quantization noise, and screen posture ergonomics.</p>
          </div>
        ) : aiAnalysis ? (
          <div className="space-y-3 text-xs">
            {/* Ergonomic Score Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-black/50 border border-[#333] p-3">
              <div>
                <span className="text-gray-500 text-[10px] uppercase block">ERGONOMIC POSTURE SCORE</span>
                <span className="text-2xl font-black text-[#22c55e]">{aiAnalysis.ergonomicScore} / 100</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-[10px] uppercase block">STATUS</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-black border border-[#22c55e] text-[#22c55e]">
                  {aiAnalysis.status}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-black/50 border border-[#333] p-3 space-y-1">
              <span className="text-[#38bdf8] font-bold block text-[10px] uppercase tracking-wider">Executive Summary</span>
              <p className="text-gray-300 leading-relaxed text-[11px]">{aiAnalysis.summary}</p>
            </div>

            {/* Optical Diagnosis */}
            <div className="bg-black/50 border border-[#333] p-3 space-y-1">
              <span className="text-indigo-300 font-bold block text-[10px] uppercase tracking-wider">Optical Telemetry Diagnosis</span>
              <p className="text-gray-300 leading-relaxed text-[11px]">{aiAnalysis.opticalDiagnosis}</p>
            </div>

            {/* Recommendations List */}
            {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
              <div className="bg-black/50 border border-[#333] p-3 space-y-2">
                <span className="text-[#22c55e] font-bold block text-[10px] uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5" /> Actionable Recommendations
                </span>
                <ul className="space-y-1 text-[11px]">
                  {aiAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                      <span className="text-[#22c55e] font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="my-6 text-center py-6 bg-black/40 border border-[#333]">
            <p className="text-xs text-gray-300 mb-3">No recent Gemini AI analysis run yet.</p>
            <button
              onClick={() => onRequestAnalysis()}
              className="px-4 py-1.5 bg-[#38bdf8] hover:bg-sky-400 text-black font-bold text-xs font-mono cursor-pointer uppercase"
            >
              Run Gemini AI Telemetry Audit
            </button>
          </div>
        )}

        {/* Custom Diagnostic Prompt Form */}
        <form onSubmit={handleCustomSubmit} className="mt-4 pt-3 border-t border-[#333] flex gap-2">
          <input
            type="text"
            placeholder="Ask Gemini CV expert a custom question..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-black border border-[#333] px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-[#38bdf8]"
          />
          <button
            type="submit"
            disabled={isLoading || !customPrompt.trim()}
            className="px-4 py-1.5 bg-black border border-[#38bdf8] text-[#38bdf8] hover:bg-[#38bdf8] hover:text-black font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors uppercase"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ASK</span>
          </button>
        </form>
      </div>
    </div>
  );
};
