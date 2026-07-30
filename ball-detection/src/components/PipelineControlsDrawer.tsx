import React from "react";
import { Sliders, Sun, Palette, ShieldCheck, Gauge, RotateCcw } from "lucide-react";
import { PipelineConfig } from "../types";

interface PipelineControlsDrawerProps {
  config: PipelineConfig;
  onChangeConfig: (newConfig: PipelineConfig) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const PipelineControlsDrawer: React.FC<PipelineControlsDrawerProps> = ({
  config,
  onChangeConfig,
  isOpen,
  onToggleOpen,
}) => {
  const resetToDefaults = () => {
    onChangeConfig({
      ...config,
      f1Tuning: {
        confidenceThreshold: 0.45,
        nmsIouThreshold: 0.45,
        precisionWeight: 1.0,
        recallWeight: 1.0,
        emaSmoothingAlpha: 0.35,
        maxDisappearedFrames: 10,
      },
      plausibility: {
        minCircularityRatio: 0.60,
        minRadiusPx: 6,
        maxRadiusPx: 250,
        enableSpecularHighlightCheck: true,
        minSpecularThreshold: 0.25,
      },
      colorFilter: {
        enabled: false,
        preset: "all",
        targetHue: 55,
        hueTolerance: 25,
        minSaturation: 0.2,
        minLightness: 0.2,
      },
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all">
      {/* Header bar */}
      <div
        onClick={onToggleOpen}
        className="px-4 py-3 bg-slate-950 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
            OpenCV Pipeline Tuning & Filters
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetToDefaults();
            }}
            className="text-[11px] font-mono text-slate-400 hover:text-emerald-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <span className="text-xs text-slate-400 font-mono">
            {isOpen ? "[ Collapse - ]" : "[ Expand + ]"}
          </span>
        </div>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="p-4 space-y-6 text-xs border-t border-slate-800">
          
          {/* 1. Detection Thresholds & NMS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" /> 1. Primary Thresholds & NMS IoU
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Confidence Threshold */}
              <div>
                <div className="flex justify-between text-slate-300 font-mono mb-1">
                  <span>Confidence Threshold</span>
                  <span className="text-emerald-400 font-bold">
                    {(config.f1Tuning.confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={config.f1Tuning.confidenceThreshold}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      f1Tuning: {
                        ...config.f1Tuning,
                        confidenceThreshold: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer bg-slate-800 rounded"
                />
              </div>

              {/* NMS IoU Threshold */}
              <div>
                <div className="flex justify-between text-slate-300 font-mono mb-1">
                  <span>NMS IoU Threshold</span>
                  <span className="text-emerald-400 font-bold">
                    {(config.f1Tuning.nmsIouThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={config.f1Tuning.nmsIouThreshold}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      f1Tuning: {
                        ...config.f1Tuning,
                        nmsIouThreshold: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer bg-slate-800 rounded"
                />
              </div>
            </div>
          </div>

          {/* 2. Secondary Plausibility Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 2. Secondary Plausibility Filter
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Circularity Ratio */}
              <div>
                <div className="flex justify-between text-slate-300 font-mono mb-1">
                  <span>Min Circularity Ratio</span>
                  <span className="text-emerald-400 font-bold">
                    {config.plausibility.minCircularityRatio.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="0.95"
                  step="0.05"
                  value={config.plausibility.minCircularityRatio}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      plausibility: {
                        ...config.plausibility,
                        minCircularityRatio: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer bg-slate-800 rounded"
                />
              </div>

              {/* Radius Pixel Bounds */}
              <div>
                <div className="flex justify-between text-slate-300 font-mono mb-1">
                  <span>Radius Bounds (px)</span>
                  <span className="text-emerald-400 font-bold">
                    {config.plausibility.minRadiusPx} - {config.plausibility.maxRadiusPx}px
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={config.plausibility.minRadiusPx}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        plausibility: {
                          ...config.plausibility,
                          minRadiusPx: parseInt(e.target.value) || 4,
                        },
                      })
                    }
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-center"
                  />
                  <input
                    type="number"
                    min="50"
                    max="500"
                    value={config.plausibility.maxRadiusPx}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        plausibility: {
                          ...config.plausibility,
                          maxRadiusPx: parseInt(e.target.value) || 250,
                        },
                      })
                    }
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-center"
                  />
                </div>
              </div>

              {/* Specular Highlight Check */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" /> Specular Glint Check
                  </span>
                  <input
                    type="checkbox"
                    checked={config.plausibility.enableSpecularHighlightCheck}
                    onChange={(e) =>
                      onChangeConfig({
                        ...config,
                        plausibility: {
                          ...config.plausibility,
                          enableSpecularHighlightCheck: e.target.checked,
                        },
                      })
                    }
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-slate-400 font-mono text-[11px] mb-1">
                  <span>Min Glint Score</span>
                  <span className="text-amber-400 font-bold">
                    {config.plausibility.minSpecularThreshold.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  disabled={!config.plausibility.enableSpecularHighlightCheck}
                  value={config.plausibility.minSpecularThreshold}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      plausibility: {
                        ...config.plausibility,
                        minSpecularThreshold: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-amber-400 cursor-pointer bg-slate-800 rounded disabled:opacity-30"
                />
              </div>
            </div>
          </div>

          {/* 3. Post-Detection Color Filter (Hue Selector & Tolerances) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> 3. Post-Detection Color Targeting Filter
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-slate-400 text-[11px]">Enable Filter</span>
                <input
                  type="checkbox"
                  checked={config.colorFilter.enabled}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      colorFilter: {
                        ...config.colorFilter,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="accent-emerald-500 w-4 h-4"
                />
              </label>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Colors" },
                { id: "tennis_yellow", label: "Tennis Yellow (Lime)" },
                { id: "basketball_orange", label: "Basketball Orange" },
                { id: "cricket_red", label: "Cricket Red" },
                { id: "soccer_white", label: "Soccer White" },
                { id: "custom", label: "Custom Hue" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    onChangeConfig({
                      ...config,
                      colorFilter: {
                        ...config.colorFilter,
                        enabled: p.id !== "all",
                        preset: p.id as any,
                      },
                    })
                  }
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-all ${
                    config.colorFilter.preset === p.id
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Hue & Tolerance sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-slate-300 font-mono mb-1">
                  <span>Target Hue Angle</span>
                  <span className="text-emerald-400 font-bold">
                    {config.colorFilter.targetHue}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  disabled={!config.colorFilter.enabled}
                  value={config.colorFilter.targetHue}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      colorFilter: {
                        ...config.colorFilter,
                        targetHue: parseInt(e.target.value),
                        preset: "custom",
                      },
                    })
                  }
                  className="w-full accent-cyan-400 cursor-pointer bg-slate-800 rounded disabled:opacity-30"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-mono mb-1">
                  <span>Hue Tolerance Window (±Δ)</span>
                  <span className="text-emerald-400 font-bold">
                    ±{config.colorFilter.hueTolerance}°
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  disabled={!config.colorFilter.enabled}
                  value={config.colorFilter.hueTolerance}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      colorFilter: {
                        ...config.colorFilter,
                        hueTolerance: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-cyan-400 cursor-pointer bg-slate-800 rounded disabled:opacity-30"
                />
              </div>
            </div>
          </div>

          {/* 4. EMA Smoothing & Display Overlays */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-3">
            <div>
              <div className="flex justify-between text-slate-300 font-mono mb-1">
                <span>EMA Temporal Smoothing (Alpha)</span>
                <span className="text-emerald-400 font-bold">
                  {config.f1Tuning.emaSmoothingAlpha.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={config.f1Tuning.emaSmoothingAlpha}
                onChange={(e) =>
                  onChangeConfig({
                    ...config,
                    f1Tuning: {
                      ...config.f1Tuning,
                      emaSmoothingAlpha: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full accent-emerald-500 cursor-pointer bg-slate-800 rounded"
              />
            </div>

            <div className="flex items-center justify-around bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.showHUDOverlays}
                  onChange={(e) =>
                    onChangeConfig({ ...config, showHUDOverlays: e.target.checked })
                  }
                  className="accent-emerald-500 w-4 h-4"
                />
                HUD Bounding Box
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.showTrajectoryTrails}
                  onChange={(e) =>
                    onChangeConfig({ ...config, showTrajectoryTrails: e.target.checked })
                  }
                  className="accent-emerald-500 w-4 h-4"
                />
                Motion Trails
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.showLandmarkMesh}
                  onChange={(e) =>
                    onChangeConfig({ ...config, showLandmarkMesh: e.target.checked })
                  }
                  className="accent-cyan-400 w-4 h-4"
                />
                Face Mesh
              </label>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
