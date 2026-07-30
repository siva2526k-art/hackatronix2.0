import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Clock,
  Target,
  FileJson,
} from 'lucide-react';
import { CombinedTelemetryEngine } from '../engine/combinedTelemetryEngine';
import { CameraStreamTileState } from '../types';

interface PerformanceDashboardProps {
  telemetryEngine: CombinedTelemetryEngine;
  activeTiles: CameraStreamTileState[];
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  telemetryEngine,
  activeTiles,
}) => {
  const [precisionMult, setPrecisionMult] = useState<number>(1.0);
  const [recallMult, setRecallMult] = useState<number>(1.0);

  const benchmark = telemetryEngine.getBenchmarkState();

  const handlePrecisionChange = (val: number) => {
    setPrecisionMult(val);
    telemetryEngine.setMultipliers(val, recallMult);
  };

  const handleRecallChange = (val: number) => {
    setRecallMult(val);
    telemetryEngine.setMultipliers(precisionMult, val);
  };

  const handleExportJson = () => {
    const jsonStr = telemetryEngine.exportTelemetryJson(activeTiles);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ballvision_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate SVG path for FPS history
  const renderLineChart = (data: number[], maxVal: number, colorHex: string) => {
    if (!data || data.length === 0) return null;

    const width = 300;
    const height = 60;
    const step = width / Math.max(1, data.length - 1);

    const points = data.map((val, idx) => {
      const x = idx * step;
      const y = height - (val / maxVal) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${points.join(' L ')}`;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <path d={pathD} fill="none" stroke={colorHex} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* F1 Score Hero Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              Harmonic F1 Score
            </span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-bold text-emerald-400 tracking-tight">
              {benchmark.f1Score}
            </span>
            <span className="text-xs text-emerald-500 font-mono">/ 1.000</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Harmonic mean of Precision ({benchmark.precision}) and Recall ({benchmark.recall})
          </p>
        </div>

        {/* IoU @ 0.50 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              IoU Accuracy @ 0.50
            </span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-bold text-cyan-400 tracking-tight">
              {(benchmark.iou50Accuracy * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Overlapping IoU bounding box threshold 50%
          </p>
        </div>

        {/* IoU @ 0.75 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              IoU Accuracy @ 0.75
            </span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-mono font-bold text-amber-400 tracking-tight">
              {(benchmark.iou75Accuracy * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Strict IoU bounding box threshold 75%
          </p>
        </div>

        {/* Live System Throughput */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
              Live Stream FPS
            </span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            {renderLineChart(benchmark.fpsHistory, 75, '#34d399')}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
            <span>Avg: {Math.round(benchmark.fpsHistory.reduce((a, b) => a + b, 0) / Math.max(1, benchmark.fpsHistory.length))} FPS</span>
            <span className="text-emerald-400">Stable 60FPS</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Multipliers & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Multiplier Adjustment Sliders */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Benchmark Weight Multipliers</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Dynamic F1 Tuning</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Adjust precision and recall weighting to simulate specific ground-truth camera placement scenarios, high-speed shutter blur, or occlusion factors.
          </p>

          {/* Precision Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Precision Multiplier</span>
              <span className="text-cyan-400 font-bold">{precisionMult.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="1.80"
              step="0.05"
              value={precisionMult}
              onChange={(e) => handlePrecisionChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.50x (Strict)</span>
              <span>1.00x (Baseline)</span>
              <span>1.80x (Relaxed)</span>
            </div>
          </div>

          {/* Recall Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Recall Multiplier</span>
              <span className="text-emerald-400 font-bold">{recallMult.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="1.80"
              step="0.05"
              value={recallMult}
              onChange={(e) => handleRecallChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.50x (Strict)</span>
              <span>1.00x (Baseline)</span>
              <span>1.80x (Relaxed)</span>
            </div>
          </div>

          {/* Harmonic Formula Display */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] space-y-1">
            <div className="text-slate-400">FORMULA:</div>
            <div className="text-emerald-400 font-bold">
              F1 = 2 × (Precision × Recall) / (Precision + Recall)
            </div>
            <div className="text-slate-500 text-[10px]">
              Current: 2 × ({benchmark.precision} × {benchmark.recall}) / ({benchmark.precision} + {benchmark.recall}) = {benchmark.f1Score}
            </div>
          </div>
        </div>

        {/* Confusion Matrix Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Detection Confusion Matrix</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">Real-Time Aggregation</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                <span className="text-[10px] text-slate-400 block font-mono">TRUE POSITIVES</span>
                <span className="text-2xl font-mono font-bold text-emerald-400">{benchmark.truePositives}</span>
              </div>

              <div className="p-3 bg-slate-950 border border-rose-500/30 rounded-xl text-center space-y-1">
                <XCircle className="w-4 h-4 text-rose-400 mx-auto" />
                <span className="text-[10px] text-slate-400 block font-mono">FALSE POSITIVES</span>
                <span className="text-2xl font-mono font-bold text-rose-400">{benchmark.falsePositives}</span>
              </div>

              <div className="p-3 bg-slate-950 border border-amber-500/30 rounded-xl text-center space-y-1">
                <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" />
                <span className="text-[10px] text-slate-400 block font-mono">FALSE NEGATIVES</span>
                <span className="text-2xl font-mono font-bold text-amber-400">{benchmark.falseNegatives}</span>
              </div>
            </div>
          </div>

          {/* Export Telemetry JSON Button */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Download Raw Benchmark Metrics</span>
            <button
              onClick={handleExportJson}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              <FileJson className="w-4 h-4" />
              <span>Export Telemetry JSON</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
