/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Navbar } from "./components/Navbar";
import { LiveCameraStudio } from "./components/LiveCameraStudio";
import { MediaUploadStudio } from "./components/MediaUploadStudio";
import { PerformanceDashboard } from "./components/PerformanceDashboard";
import { AboutArchitecture } from "./components/AboutArchitecture";
import { AiAnalysisModal } from "./components/AiAnalysisModal";
import { ActiveTab, BallDetection, DetectionMode, PipelineConfig } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("camera");

  // Global Pipeline Configuration State
  const [config, setConfig] = useState<PipelineConfig>({
    mode: "ball",
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
    showHUDOverlays: true,
    showTrajectoryTrails: true,
    showCrosshairs: true,
  });

  // AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [capturedBalls, setCapturedBalls] = useState<BallDetection[]>([]);

  const handleTriggerAiAnalysis = (
    frameBase64: string,
    balls: BallDetection[]
  ) => {
    setCapturedFrame(frameBase64);
    setCapturedBalls(balls);
    setAiModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        liveFps={35.8}
      />

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        
        {activeTab === "camera" && (
          <LiveCameraStudio
            config={config}
            setConfig={setConfig}
            onTriggerAiAnalysis={handleTriggerAiAnalysis}
          />
        )}

        {activeTab === "upload" && (
          <MediaUploadStudio
            config={config}
            onTriggerAiAnalysis={handleTriggerAiAnalysis}
          />
        )}

        {activeTab === "dashboard" && (
          <PerformanceDashboard
            config={config}
            setConfig={setConfig}
          />
        )}

        {activeTab === "ai_assistant" && (
          <div className="p-8 text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl mx-auto my-12">
            <h2 className="text-xl font-bold text-white">Gemini AI Vision Studio</h2>
            <p className="text-xs text-slate-400">
              Trigger instant server-side AI Vision analysis directly from the Live Camera Studio or Media Upload Studio using the "AI Telemetry Analysis" button.
            </p>
            <button
              onClick={() => handleTriggerAiAnalysis("", [])}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
            >
              Open Gemini AI Assistant
            </button>
          </div>
        )}

        {activeTab === "about" && <AboutArchitecture />}

      </main>

      {/* Serverless Gemini AI Vision Analysis Modal */}
      <AiAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        frameBase64={capturedFrame}
        balls={capturedBalls}
        config={config}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        <p>BallVision AI Telemetry System • Powered by OpenCV, Vite, React, & Gemini 3.6 Flash</p>
      </footer>

    </div>
  );
}
