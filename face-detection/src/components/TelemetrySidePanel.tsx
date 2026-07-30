import React from 'react';
import { FaceDistanceResult, TelemetryLogEntry, GeminiAnalysisResult } from '../types';
import { Sparkles, Terminal } from 'lucide-react';

interface TelemetrySidePanelProps {
  result: FaceDistanceResult | null;
  logs: TelemetryLogEntry[];
  aiAnalysis: GeminiAnalysisResult | null;
  onOpenGeminiAiModal: () => void;
  isAiLoading: boolean;
}

export const TelemetrySidePanel: React.FC<TelemetrySidePanelProps> = ({
  result,
  logs,
  aiAnalysis,
  onOpenGeminiAiModal,
  isAiLoading,
}) => {
  const z = result?.zSmoothedCm || 0;
  const rawZ = result?.zRawCm || 0;
  const angle = result?.angleDeg || 0;
  const wPx = result?.wPx || 0;

  return (
    <aside className="w-full bg-[#121212] border border-[#333] lg:border-t-0 lg:border-r-0 lg:border-b-0 lg:border-l flex flex-col font-mono h-full">
      {/* 1. Monocular Distance Primary Readout */}
      <section className="p-4 border-b border-[#333]">
        <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2 font-bold">
          Monocular Distance
        </label>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-[#38bdf8] leading-none tracking-tight">
            {z.toFixed(1)}
          </span>
          <span className="text-xl text-[#38bdf8]/60 font-bold">cm</span>
        </div>

        {/* 2x2 Telemetry Metric Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="bg-black/40 p-2 border border-[#333]">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">METERS</div>
            <div className="text-xs text-white font-bold">{(z / 100).toFixed(3)}m</div>
          </div>
          <div className="bg-black/40 p-2 border border-[#333]">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">ANGLE θ</div>
            <div className="text-xs text-white font-bold">{angle >= 0 ? '+' : ''}{angle.toFixed(2)}°</div>
          </div>
          <div className="bg-black/40 p-2 border border-[#333]">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">FACE WIDTH</div>
            <div className="text-xs text-white font-bold">{wPx.toFixed(1)}px</div>
          </div>
          <div className="bg-black/40 p-2 border border-[#333]">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">RAW Z</div>
            <div className="text-xs text-white font-bold">{rawZ.toFixed(1)}cm</div>
          </div>
        </div>
      </section>

      {/* 2. Gemini AI Telemetry Section */}
      <section className="p-4 border-b border-[#333]">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">
            Gemini AI Telemetry
          </label>
          <button
            onClick={onOpenGeminiAiModal}
            disabled={isAiLoading}
            className="text-[10px] text-[#38bdf8] hover:underline cursor-pointer flex items-center gap-1 font-bold"
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>{isAiLoading ? 'Analyzing...' : 'Deep Audit'}</span>
          </button>
        </div>

        {aiAnalysis ? (
          <div className="space-y-2 text-[11px] bg-black/40 p-2.5 border border-[#333]">
            <p className="text-gray-300 leading-relaxed text-[10px]">{aiAnalysis.summary}</p>
            <div className="flex items-center justify-between border-t border-[#333] pt-1.5 text-[10px]">
              <span className="text-gray-500">Ergonomic Score:</span>
              <span className="text-[#22c55e] font-bold">{aiAnalysis.ergonomicScore} / 100</span>
            </div>
          </div>
        ) : (
          <div className="bg-black/40 p-2.5 border border-[#333] text-[10px] text-gray-400">
            <p className="mb-1 text-gray-300">Live Gemini optical AI ready.</p>
            <button
              onClick={onOpenGeminiAiModal}
              className="mt-1 text-[#38bdf8] underline hover:text-white font-bold cursor-pointer"
            >
              Run Gemini Telemetry Audit &rarr;
            </button>
          </div>
        )}
      </section>

      {/* 3. Audit Log Feed */}
      <section className="flex-1 flex flex-col p-4 overflow-hidden min-h-[220px]">
        <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2 font-bold flex items-center justify-between">
          <span>Audit Log Feed</span>
          <span className="text-[9px] text-[#22c55e] font-mono">● LIVE</span>
        </label>
        <div className="flex-1 bg-black/50 border border-[#333] p-2 text-[9px] overflow-y-auto font-mono scrollbar-thin">
          <div className="space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-600 italic py-2 text-center">[INITIALIZING TELEMETRY STREAM...]</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="leading-tight">
                  <span
                    className={
                      log.type === 'CALIB'
                        ? 'text-[#22c55e] font-bold'
                        : log.type === 'WARN'
                        ? 'text-[#ea580c] font-bold'
                        : log.type === 'AI'
                        ? 'text-[#38bdf8] font-bold'
                        : 'text-gray-400'
                    }
                  >
                    [{log.timestamp}] [{log.type}]: {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </aside>
  );
};

