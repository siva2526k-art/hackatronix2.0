import React from 'react';
import {
  Activity,
  Cpu,
  Eye,
  SlidersHorizontal,
  Sparkles,
  Video,
  Upload,
  BarChart3,
  Info,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'multicam' | 'media' | 'benchmark' | 'architecture';
  setActiveTab: (tab: 'multicam' | 'media' | 'benchmark' | 'architecture') => void;
  onOpenDrawer: () => void;
  onOpenAiModal: () => void;
  cameraCount: number;
  avgFps: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenDrawer,
  onOpenAiModal,
  cameraCount,
  avgFps,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-inner shadow-emerald-500/10">
              <Eye className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-100 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
                  BallVision <span className="font-mono text-emerald-400 text-sm">AI</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-md">
                  Multi-Cam CV
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-sans">
                Real-Time Ball Detection & Kinematics Telemetry
              </p>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={onOpenAiModal}
              className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              title="AI Specialist"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenDrawer}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
              title="Pipeline Controls"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('multicam')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
              activeTab === 'multicam'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Multi-Cam Studio</span>
            {cameraCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-emerald-400/20 text-emerald-300 rounded-full">
                {cameraCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
              activeTab === 'media'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Media Inspection</span>
          </button>

          <button
            onClick={() => setActiveTab('benchmark')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
              activeTab === 'benchmark'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>F1 Benchmark</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>
        </nav>

        {/* Right Status & Actions (Desktop) */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Telemetry pill */}
          <div className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{avgFps} FPS</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gemini 2.5 Flash</span>
            </div>
          </div>

          <button
            onClick={onOpenDrawer}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>CV Tuning</span>
          </button>

          <button
            onClick={onOpenAiModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span>AI Kinematics</span>
          </button>
        </div>

      </div>
    </header>
  );
};
