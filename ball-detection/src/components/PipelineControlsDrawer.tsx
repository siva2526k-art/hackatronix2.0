import React from 'react';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
  Eye,
  Activity,
  Layers,
  CircleDot,
  Check,
} from 'lucide-react';
import { DEFAULT_PIPELINE_CONFIG, PipelineConfig, SPORTS_PRESETS, SportsPresetType } from '../types';

interface PipelineControlsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: PipelineConfig;
  onChangeConfig: (newConfig: PipelineConfig) => void;
}

export const PipelineControlsDrawer: React.FC<PipelineControlsDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
}) => {
  if (!isOpen) return null;

  const handleUpdate = (updates: Partial<PipelineConfig>) => {
    onChangeConfig({ ...config, ...updates });
  };

  const handleSelectPreset = (presetId: SportsPresetType) => {
    const preset = SPORTS_PRESETS[presetId];
    if (preset) {
      onChangeConfig({
        ...config,
        targetHuePreset: presetId,
        customHue: preset.hue,
        hueTolerance: preset.tolerance,
        minRadius: preset.minRadius,
        maxRadius: preset.maxRadius,
      });
    }
  };

  const handleReset = () => {
    onChangeConfig({ ...DEFAULT_PIPELINE_CONFIG });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl overflow-y-auto">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>OpenCV Pipeline Tuning</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs font-mono flex items-center space-x-1"
              title="Reset to Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Sliders */}
        <div className="p-5 space-y-6 text-xs font-sans">
          
          {/* Target Sports Preset Selector */}
          <div className="space-y-2.5">
            <label className="font-semibold text-slate-200 font-mono text-[11px] block uppercase tracking-wider text-slate-400">
              1. Target Hue Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SPORTS_PRESETS) as SportsPresetType[]).map((key) => {
                const preset = SPORTS_PRESETS[key];
                const isSelected = config.targetHuePreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectPreset(key)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? `${preset.badgeBg} text-slate-100 font-semibold shadow-sm`
                        : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-slate-900"
                        style={{ backgroundColor: preset.colorHex }}
                      />
                      <span className="truncate text-[11px]">{preset.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Hue & Tolerance if Custom or Selected */}
          {config.targetHuePreset === 'custom' && (
            <div className="p-3 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-300">Custom Target Hue</span>
                  <span className="text-cyan-400 font-bold">{config.customHue}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={config.customHue}
                  onChange={(e) => handleUpdate({ customHue: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-300">Hue Tolerance</span>
                  <span className="text-cyan-400 font-bold">±{config.hueTolerance}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={config.hueTolerance}
                  onChange={(e) => handleUpdate({ hueTolerance: parseInt(e.target.value) })}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 2. Confidence Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-300 font-semibold">2. Confidence Threshold</span>
              <span className="text-emerald-400 font-bold">{config.confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="95"
              value={config.confidenceThreshold}
              onChange={(e) => handleUpdate({ confidenceThreshold: parseInt(e.target.value) })}
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-mono">Filters candidate blobs below this confidence score.</p>
          </div>

          {/* 3. NMS IoU Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-300 font-semibold">3. NMS IoU Threshold</span>
              <span className="text-cyan-400 font-bold">{config.nmsIouThreshold}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={config.nmsIouThreshold}
              onChange={(e) => handleUpdate({ nmsIouThreshold: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-mono">Non-Maximum Suppression overlap threshold for duplicate boxes.</p>
          </div>

          {/* 4. Radius Range Bounds */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-300 font-semibold">4. Radius Bounds (Min - Max)</span>
              <span className="text-amber-400 font-bold">{config.minRadius}px - {config.maxRadius}px</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-mono">MIN RADIUS</span>
                <input
                  type="range"
                  min="4"
                  max="100"
                  value={config.minRadius}
                  onChange={(e) => handleUpdate({ minRadius: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono">MAX RADIUS</span>
                <input
                  type="range"
                  min="20"
                  max="250"
                  value={config.maxRadius}
                  onChange={(e) => handleUpdate({ maxRadius: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 5. Min Specular Glint Rating */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-300 font-semibold">5. Min Specular Glint Rating</span>
              <span className="text-emerald-400 font-bold">{config.minSpecularGlint.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.00"
              max="0.80"
              step="0.05"
              value={config.minSpecularGlint}
              onChange={(e) => handleUpdate({ minSpecularGlint: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-mono">Checks 3D spherical specular highlight luminance in top-center quadrant.</p>
          </div>

          {/* 6. Min Circularity Ratio */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-300 font-semibold">6. Min Circularity Ratio</span>
              <span className="text-cyan-400 font-bold">{config.minCircularity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.95"
              step="0.05"
              value={config.minCircularity}
              onChange={(e) => handleUpdate({ minCircularity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* 7. EMA Temporal Smoothing Factor */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-slate-300 font-semibold">7. EMA Smoothing Factor (α)</span>
              <span className="text-amber-400 font-bold">α = {config.emaAlpha.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.00"
              step="0.05"
              value={config.emaAlpha}
              onChange={(e) => handleUpdate({ emaAlpha: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 font-mono">Lower α = smoother box trajectory; Higher α = faster velocity response.</p>
          </div>

          {/* 8. Motion Trails & Length */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs">Render Trajectory Trails</span>
              <input
                type="checkbox"
                checked={config.showTrails}
                onChange={(e) => handleUpdate({ showTrails: e.target.checked })}
                className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
              />
            </div>

            {config.showTrails && (
              <div className="space-y-1 pt-1 border-t border-slate-800/80">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-400">Trail Length (Frames)</span>
                  <span className="text-emerald-400 font-bold">{config.trailLength}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={config.trailLength}
                  onChange={(e) => handleUpdate({ trailLength: parseInt(e.target.value) })}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            Apply & Close Tuning Drawer
          </button>
        </div>

      </div>
    </div>
  );
};
