import React, { useRef, useState, useEffect } from "react";
import {
  Camera,
  Square,
  Play,
  RotateCcw,
  Sparkles,
  Activity,
  Crosshair,
  Target,
  Zap,
  Maximize2,
} from "lucide-react";
import {
  BallDetection,
  FaceDetection,
  PerformanceMetrics,
  PipelineConfig,
  SpatialTelemetry,
} from "../types";
import { combinedTelemetryEngine } from "../engine/combinedTelemetryEngine";
import { PipelineControlsDrawer } from "./PipelineControlsDrawer";

interface LiveCameraStudioProps {
  config: PipelineConfig;
  setConfig: React.Dispatch<React.SetStateAction<PipelineConfig>>;
  onTriggerAiAnalysis: (frameBase64: string, balls: BallDetection[], faces: FaceDetection[]) => void;
}

export const LiveCameraStudio: React.FC<LiveCameraStudioProps> = ({
  config,
  setConfig,
  onTriggerAiAnalysis,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    fps: 35.2,
    instantFps: 36,
    maxFps: 42,
    processingTimeMs: 28,
    avgConfidence: 93.4,
    detectedBallCount: 1,
    detectedFaceCount: 1,
    precision: 95.2,
    recall: 92.4,
    f1Score: 93.8,
    totalFramesProcessed: 420,
    fpsHistory: [32, 34, 35, 36, 35, 37],
    latencyHistory: [28, 26, 25, 29, 24],
    confidenceHistory: [92, 94, 95, 93],
  });

  const [liveBalls, setLiveBalls] = useState<BallDetection[]>([]);
  const [liveFaces, setLiveFaces] = useState<FaceDetection[]>([]);
  const [spatialTelemetry, setSpatialTelemetry] = useState<SpatialTelemetry>({
    ballToFaceDistancePx: 142,
    spatialAlignmentPercentage: 88,
    relativeVelocityPxSec: 210,
    trajectoryCurvature: "Parabolic",
    attentionFocusAngleDeg: -24,
  });

  const animFrameId = useRef<number | null>(null);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera permission denied or device unavailable. Running simulation demo mode.");
      setIsCameraActive(true);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Main high-FPS animation loop
  useEffect(() => {
    if (!isCameraActive) return;

    const processLoop = () => {
      if (hiddenCanvasRef.current && overlayCanvasRef.current) {
        const hiddenCanvas = hiddenCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const ctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });

        const w = videoRef.current?.videoWidth || 640;
        const h = videoRef.current?.videoHeight || 480;

        if (hiddenCanvas.width !== w || hiddenCanvas.height !== h) {
          hiddenCanvas.width = w;
          hiddenCanvas.height = h;
        }

        if (ctx) {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            ctx.drawImage(videoRef.current, 0, 0, w, h);
          } else {
            // Draw simulated sports field canvas demo frame if webcam not feeding video stream
            drawDemoSyntheticFrame(ctx, w, h);
          }

          const { balls, faces, spatial, metrics } = combinedTelemetryEngine.processFrame(
            hiddenCanvas,
            overlayCanvas,
            config
          );

          setLiveBalls(balls);
          setLiveFaces(faces);
          setSpatialTelemetry(spatial);
          setCurrentMetrics(metrics);
        }
      }

      animFrameId.current = requestAnimationFrame(processLoop);
    };

    animFrameId.current = requestAnimationFrame(processLoop);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isCameraActive, config]);

  // Synthetic demo frame if real webcam feed is absent
  const drawDemoSyntheticFrame = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, w, h);

    // Sports Field Grid Lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.arc(w / 2, h / 2, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const t = Date.now() * 0.002;
    const bx = Math.round(w / 2 + Math.cos(t) * 180);
    const by = Math.round(h / 2 + Math.sin(t * 1.5) * 100);

    // Draw tennis ball graphic
    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.arc(bx, by, 22, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight spot
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(bx - 6, by - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    // Player Face
    const fx = Math.round(w / 2 - 120);
    const fy = Math.round(h / 2 - 30);
    ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx, fy, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  const captureSnapshot = () => {
    if (hiddenCanvasRef.current) {
      const dataUrl = hiddenCanvasRef.current.toDataURL("image/jpeg", 0.9);
      onTriggerAiAnalysis(dataUrl, liveBalls, liveFaces);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" /> Live Viewfinder & Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time monocular 2D ball tracking, face landmarks, and spatial vector telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-4 h-4 fill-current" /> Start Stream
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <Square className="w-4 h-4 fill-current" /> Stop Stream
            </button>
          )}

          <button
            onClick={captureSnapshot}
            disabled={!isCameraActive}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" /> AI Telemetry Analysis
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-mono">
          {cameraError}
        </div>
      )}

      {/* Main Grid Layout: Viewfinder + Telemetry Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Main Canvas Viewfinder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[380px] flex items-center justify-center">
            
            {/* Hidden raw video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
            />

            {/* Hidden processing canvas */}
            <canvas ref={hiddenCanvasRef} className="hidden" />

            {/* Main Interactive Telemetry Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className={`w-full h-auto block ${!isCameraActive ? "hidden" : ""}`}
            />

            {/* Placeholder UI when camera is OFF */}
            {!isCameraActive && (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-200">Camera Stream Inactive</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Click "Start Stream" to initialize real-time YOLOv8 ball detection, face mesh tracking, and spatial telemetry
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" /> Initialize Stream
                </button>
              </div>
            )}

            {/* Live Camera Badge */}
            {isCameraActive && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-400 font-bold">LIVE TELEMETRY</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">{currentMetrics.fps} FPS</span>
              </div>
            )}
          </div>

          {/* Expandable Pipeline Control Drawer */}
          <PipelineControlsDrawer
            config={config}
            onChangeConfig={setConfig}
            isOpen={isDrawerOpen}
            onToggleOpen={() => setIsDrawerOpen(!isDrawerOpen)}
          />
        </div>

        {/* Right Col: Live Spatial Metrics Panel */}
        <div className="space-y-4">
          
          {/* Spatial Metrics Cards */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> Spatial Telemetry Log
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block mb-1">Live FPS</span>
                <span className="text-emerald-400 text-lg font-extrabold">
                  {currentMetrics.fps}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block mb-1">Latency</span>
                <span className="text-cyan-400 text-lg font-extrabold">
                  {currentMetrics.processingTimeMs} ms
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block mb-1">Detected Balls</span>
                <span className="text-emerald-400 text-lg font-extrabold">
                  {currentMetrics.detectedBallCount}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block mb-1">Detected Faces</span>
                <span className="text-cyan-400 text-lg font-extrabold">
                  {currentMetrics.detectedFaceCount}
                </span>
              </div>
            </div>

            {/* Ball-to-Face Spatial Correlation */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> Player-Ball Distance
                </span>
                <span className="text-amber-400 font-mono font-bold">
                  {spatialTelemetry.ballToFaceDistancePx
                    ? `${spatialTelemetry.ballToFaceDistancePx} px`
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-900">
                <span className="text-slate-400">Alignment Rating</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {spatialTelemetry.spatialAlignmentPercentage
                    ? `${spatialTelemetry.spatialAlignmentPercentage}%`
                    : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Trajectory Curve</span>
                <span className="text-cyan-400 font-mono font-bold">
                  {spatialTelemetry.trajectoryCurvature}
                </span>
              </div>
            </div>

            {/* Detections List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Current Object Targets
              </span>

              {liveBalls.length === 0 && liveFaces.length === 0 ? (
                <div className="p-3 bg-slate-950 rounded-lg text-slate-500 text-center text-xs font-mono">
                  No objects currently tracked
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {liveBalls.map((b) => (
                    <div
                      key={`ball-${b.id}`}
                      className="p-2 bg-slate-950 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {b.className} #{b.id}
                      </span>
                      <span className="text-slate-300">
                        {(b.confidence * 100).toFixed(1)}% conf
                      </span>
                    </div>
                  ))}

                  {liveFaces.map((f) => (
                    <div
                      key={`face-${f.id}`}
                      className="p-2 bg-slate-950 border border-cyan-500/30 rounded-lg flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-500" />
                        Face #{f.id} ({f.emotion})
                      </span>
                      <span className="text-slate-300">
                        {(f.confidence * 100).toFixed(1)}% conf
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
