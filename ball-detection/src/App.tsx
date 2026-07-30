import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LiveCameraStudio } from './components/LiveCameraStudio';
import { MediaUploadStudio } from './components/MediaUploadStudio';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { AboutArchitecture } from './components/AboutArchitecture';
import { PipelineControlsDrawer } from './components/PipelineControlsDrawer';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { CombinedTelemetryEngine } from './engine/combinedTelemetryEngine';
import {
  CameraStreamTileState,
  DEFAULT_PIPELINE_CONFIG,
  DetectedBall,
  PipelineConfig,
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'multicam' | 'media' | 'benchmark' | 'architecture'>('multicam');
  const [pipelineConfig, setPipelineConfig] = useState<PipelineConfig>(DEFAULT_PIPELINE_CONFIG);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // AI Modal Snapshot Data State
  const [aiSnapshotBase64, setAiSnapshotBase64] = useState<string | undefined>(undefined);
  const [aiDetectedBalls, setAiDetectedBalls] = useState<DetectedBall[]>([]);
  const [aiSourceName, setAiSourceName] = useState<string>('Live Camera Viewfinder');

  // Camera States from LiveCameraStudio
  const [cameraTileStates, setCameraTileStates] = useState<CameraStreamTileState[]>([]);

  // Singleton Telemetry Engine
  const telemetryEngine = useMemo(() => new CombinedTelemetryEngine(), []);

  // Update telemetry metrics whenever live tiles update
  const handleUpdateCameraStates = useCallback((states: CameraStreamTileState[]) => {
    setCameraTileStates(states);
    telemetryEngine.updateLiveTelemetry(states);
  }, [telemetryEngine]);

  // Trigger AI Modal with frame snapshot
  const handleTriggerAiSnapshot = (
    base64Frame: string,
    detectedBalls: DetectedBall[],
    sourceName: string
  ) => {
    setAiSnapshotBase64(base64Frame);
    setAiDetectedBalls(detectedBalls);
    setAiSourceName(sourceName);
    setIsAiModalOpen(true);
  };

  // Calculate average FPS across active streams
  const activeTileList = cameraTileStates.filter((t) => t.isActive);
  const avgFps =
    activeTileList.length > 0
      ? Math.round(
          activeTileList.reduce((acc, curr) => acc + curr.fps, 0) / activeTileList.length
        )
      : 60;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        cameraCount={activeTileList.length}
        avgFps={avgFps}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-5">
        {activeTab === 'multicam' && (
          <LiveCameraStudio
            pipelineConfig={pipelineConfig}
            onTriggerAiSnapshot={handleTriggerAiSnapshot}
            onUpdateCameraStates={handleUpdateCameraStates}
          />
        )}

        {activeTab === 'media' && (
          <MediaUploadStudio
            pipelineConfig={pipelineConfig}
            onTriggerAiSnapshot={handleTriggerAiSnapshot}
          />
        )}

        {activeTab === 'benchmark' && (
          <PerformanceDashboard
            telemetryEngine={telemetryEngine}
            activeTiles={cameraTileStates}
          />
        )}

        {activeTab === 'architecture' && <AboutArchitecture />}
      </main>

      {/* Slide-over OpenCV Controls Drawer */}
      <PipelineControlsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        config={pipelineConfig}
        onChangeConfig={setPipelineConfig}
      />

      {/* Gemini 2.5 Flash Telemetry Specialist Modal */}
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        base64Frame={aiSnapshotBase64}
        detectedBalls={aiDetectedBalls}
        sourceName={aiSourceName}
      />

      {/* High Density Footer */}
      <footer className="h-10 border-t border-slate-800 bg-[#0f172a] flex items-center px-4 justify-between shrink-0 font-mono text-[10px] text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            <span className="uppercase">ENGINE: SYNCHRONIZED</span>
          </div>
          <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>
          <span className="hidden sm:inline-block text-slate-500 uppercase">BALLVISION AI v2.5-FLASH</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 uppercase font-bold">100% CLIENT-SIDE CV</span>
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded text-[10px] font-bold hover:bg-cyan-500/20 uppercase"
          >
            GEMINI 2.5 REPORT
          </button>
        </div>
      </footer>

    </div>
  );
}
