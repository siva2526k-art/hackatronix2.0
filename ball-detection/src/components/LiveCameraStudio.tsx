import React, { useRef, useState, useEffect } from "react";
import {
  Camera,
  Plus,
  X,
  Play,
  Square,
  Sparkles,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  BallDetection,
  PerformanceMetrics,
  PipelineConfig,
  SpatialTelemetry,
} from "../types";
import { BallDetectorPipeline } from "../engine/ballDetectorPipeline";
import { PipelineControlsDrawer } from "./PipelineControlsDrawer";

interface LiveCameraStudioProps {
  config: PipelineConfig;
  setConfig: React.Dispatch<React.SetStateAction<PipelineConfig>>;
  onTriggerAiAnalysis: (frameBase64: string, balls: BallDetection[]) => void;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraTileState {
  id: string; // Unique tile instance ID
  deviceId: string;
  label: string;
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  fps: number;
  latencyMs: number;
  detections: BallDetection[];
  pipeline: BallDetectorPipeline; // Independent pipeline instance per tile
}

const LOCAL_STORAGE_KEY = "ballvision_active_cameras_v2";

export const LiveCameraStudio: React.FC<LiveCameraStudioProps> = ({
  config,
  setConfig,
  onTriggerAiAnalysis,
}) => {
  const [availableDevices, setAvailableDevices] = useState<CameraDevice[]>([]);
  const [tiles, setTiles] = useState<CameraTileState[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDeviceToAdd, setSelectedDeviceToAdd] = useState<string>("");

  // Refs for tracking DOM elements per tile ID
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const hiddenCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const overlayCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const animFrameIds = useRef<Map<string, number>>(new Map());

  // 1. Enumerate available camera devices
  useEffect(() => {
    async function enumerateCameras() {
      try {
        // Request temporary stream to ensure camera labels are populated
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).catch(() => null);
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (tempStream) tempStream.getTracks().forEach((t) => t.stop());

        const videoInputs = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, idx) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${idx + 1}`,
          }));

        setAvailableDevices(videoInputs);

        // Load saved camera device IDs from LocalStorage or default to first camera
        const savedIdsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        let initialDeviceIds: string[] = [];

        if (savedIdsJson) {
          try {
            initialDeviceIds = JSON.parse(savedIdsJson);
          } catch (e) {
            initialDeviceIds = [];
          }
        }

        if (initialDeviceIds.length === 0 && videoInputs.length > 0) {
          initialDeviceIds = [videoInputs[0].deviceId];
        }

        // Initialize tiles for starting device IDs
        if (initialDeviceIds.length > 0) {
          const initialTiles: CameraTileState[] = initialDeviceIds.map((devId, idx) => {
            const match = videoInputs.find((v) => v.deviceId === devId);
            return {
              id: `tile-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              deviceId: devId,
              label: match ? match.label : `Camera ${idx + 1}`,
              stream: null,
              isActive: false,
              error: null,
              fps: 0,
              latencyMs: 0,
              detections: [],
              pipeline: new BallDetectorPipeline(), // Isolated pipeline instance per tile
            };
          });
          setTiles(initialTiles);
        }
      } catch (err) {
        console.error("Camera enumeration error:", err);
      }
    }

    enumerateCameras();
  }, []);

  // Save active tile device IDs to localStorage
  useEffect(() => {
    if (tiles.length > 0) {
      const ids = tiles.map((t) => t.deviceId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
    }
  }, [tiles]);

  // 2. Manage streams and detection loops per tile
  useEffect(() => {
    tiles.forEach((tile) => {
      if (!tile.isActive && !tile.error && !tile.stream) {
        startTileStream(tile.id, tile.deviceId);
      }
    });
  }, [tiles]);

  const startTileStream = async (tileId: string, deviceId: string) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setTiles((prev) =>
        prev.map((t) =>
          t.id === tileId ? { ...t, stream, isActive: true, error: null } : t
        )
      );
    } catch (err: any) {
      console.warn(`Failed to start camera tile ${tileId}:`, err);
      setTiles((prev) =>
        prev.map((t) =>
          t.id === tileId
            ? { ...t, error: "Camera stream unavailable or already in use.", isActive: true }
            : t
        )
      );
    }
  };

  // Run per-tile detection loops
  useEffect(() => {
    tiles.forEach((tile) => {
      if (tile.isActive && !animFrameIds.current.has(tile.id)) {
        runTileLoop(tile.id);
      }
    });

    return () => {
      animFrameIds.current.forEach((frameId) => cancelAnimationFrame(frameId));
    };
  }, [tiles, config]);

  const runTileLoop = (tileId: string) => {
    let frameTimes: number[] = [];

    const loop = () => {
      const video = videoRefs.current.get(tileId);
      const hiddenCanvas = hiddenCanvasRefs.current.get(tileId);
      const overlayCanvas = overlayCanvasRefs.current.get(tileId);
      const tile = tiles.find((t) => t.id === tileId);

      if (hiddenCanvas && overlayCanvas && tile) {
        const startTime = performance.now();
        const ctx = hiddenCanvas.getContext("2d", { willReadFrequently: true });

        const w = video?.videoWidth || 640;
        const h = video?.videoHeight || 480;

        if (hiddenCanvas.width !== w || hiddenCanvas.height !== h) {
          hiddenCanvas.width = w;
          hiddenCanvas.height = h;
        }

        if (ctx) {
          if (video && video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, w, h);
          } else {
            // Demo fallback animation if video stream is unattached or paused
            drawTileDemoFrame(ctx, w, h, tileId);
          }

          // Execute THIS tile's isolated pipeline instance
          const detections = tile.pipeline.processFrame(hiddenCanvas, config);

          // Render overlay bounding boxes onto THIS tile's overlay canvas
          const overlayCtx = overlayCanvas.getContext("2d");
          if (overlayCtx) {
            overlayCanvas.width = w;
            overlayCanvas.height = h;
            overlayCtx.clearRect(0, 0, w, h);
            tile.pipeline.drawAnnotations(overlayCtx, detections, config);
          }

          const procMs = Math.max(1, Math.round(performance.now() - startTime));
          frameTimes.push(procMs);
          if (frameTimes.length > 20) frameTimes.shift();

          const avgMs = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const fps = Number((1000 / avgMs).toFixed(1));

          // Update state for this tile
          setTiles((prev) =>
            prev.map((t) =>
              t.id === tileId
                ? { ...t, detections, fps, latencyMs: procMs }
                : t
            )
          );
        }
      }

      const frameId = requestAnimationFrame(loop);
      animFrameIds.current.set(tileId, frameId);
    };

    const frameId = requestAnimationFrame(loop);
    animFrameIds.current.set(tileId, frameId);
  };

  const drawTileDemoFrame = (ctx: CanvasRenderingContext2D, w: number, h: number, seed: string) => {
    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    const t = Date.now() * 0.002 + (seed.length * 10);
    const bx = Math.round(w / 2 + Math.cos(t) * 140);
    const by = Math.round(h / 2 + Math.sin(t * 1.3) * 80);

    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.arc(bx, by, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(bx - 5, by - 5, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  // Add a new camera tile
  const handleAddCamera = (deviceId: string) => {
    if (!deviceId) return;
    const match = availableDevices.find((d) => d.deviceId === deviceId);

    const newTile: CameraTileState = {
      id: `tile-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      deviceId,
      label: match ? match.label : `Camera ${tiles.length + 1}`,
      stream: null,
      isActive: false,
      error: null,
      fps: 0,
      latencyMs: 0,
      detections: [],
      pipeline: new BallDetectorPipeline(), // Independent pipeline instance
    };

    setTiles((prev) => [...prev, newTile]);
    setSelectedDeviceToAdd("");
  };

  // Remove a camera tile cleanly
  const handleRemoveTile = (tileId: string) => {
    // 1. Cancel animation loop
    if (animFrameIds.current.has(tileId)) {
      cancelAnimationFrame(animFrameIds.current.get(tileId)!);
      animFrameIds.current.delete(tileId);
    }

    // 2. Stop media stream tracks
    const tile = tiles.find((t) => t.id === tileId);
    if (tile && tile.stream) {
      tile.stream.getTracks().forEach((track) => track.stop());
    }

    // 3. Remove DOM element refs
    videoRefs.current.delete(tileId);
    hiddenCanvasRefs.current.delete(tileId);
    overlayCanvasRefs.current.delete(tileId);

    // 4. Update tile state
    setTiles((prev) => prev.filter((t) => t.id !== tileId));
  };

  // Trigger Gemini AI analysis for a specific tile
  const handleTriggerTileAi = (tileId: string) => {
    const hiddenCanvas = hiddenCanvasRefs.current.get(tileId);
    const tile = tiles.find((t) => t.id === tileId);
    if (hiddenCanvas && tile) {
      const dataUrl = hiddenCanvas.toDataURL("image/jpeg", 0.9);
      onTriggerAiAnalysis(dataUrl, tile.detections);
    }
  };

  // Calculate aggregated metrics across all active tiles
  const totalActiveBalls = tiles.reduce((acc, t) => acc + t.detections.length, 0);
  const avgFps = tiles.length > 0 ? (tiles.reduce((acc, t) => acc + t.fps, 0) / tiles.length) : 0;
  const avgLatency = tiles.length > 0 ? Math.round(tiles.reduce((acc, t) => acc + t.latencyMs, 0) / tiles.length) : 0;

  // Unused available camera options for "Add Camera" dropdown
  const unusedDevices = availableDevices.filter(
    (dev) => !tiles.some((t) => t.deviceId === dev.deviceId)
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header & Multi-Camera Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" /> Live Multi-Camera Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Run independent YOLOv8 ball detection loops simultaneously across multiple camera feeds
          </p>
        </div>

        {/* Add Camera Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {unusedDevices.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <select
                value={selectedDeviceToAdd}
                onChange={(e) => setSelectedDeviceToAdd(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-mono px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">
                  Select Camera to Add...
                </option>
                {unusedDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId} className="bg-slate-900 text-white">
                    {dev.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleAddCamera(selectedDeviceToAdd)}
                disabled={!selectedDeviceToAdd}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" /> Add Camera
              </button>
            </div>
          )}

          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Active Feeds: <strong className="text-white">{tiles.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Viewport & Telemetry Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Responsive Multi-Camera Grid */}
        <div className="lg:col-span-2 space-y-4">
          
          {tiles.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Active Camera Feeds</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Select a connected video device from the dropdown above and click "Add Camera" to start multi-stream ball telemetry.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                tiles.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {tiles.map((tile) => (
                <div
                  key={tile.id}
                  className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col group min-h-[300px]"
                >
                  {/* Tile Header Bar */}
                  <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-slate-200 truncate max-w-[140px]" title={tile.label}>
                        {tile.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {tile.detections.length} BALLS
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {tile.fps.toFixed(0)} FPS
                      </span>

                      <button
                        onClick={() => handleTriggerTileAi(tile.id)}
                        title="Run Gemini AI on this camera feed"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleRemoveTile(tile.id)}
                        title="Close camera feed"
                        className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tile Viewfinder Body */}
                  <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs.current.set(tile.id, el);
                          if (tile.stream && el.srcObject !== tile.stream) {
                            el.srcObject = tile.stream;
                            el.play().catch(() => {});
                          }
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="hidden"
                    />

                    {/* Hidden Canvas */}
                    <canvas
                      ref={(el) => {
                        if (el) hiddenCanvasRefs.current.set(tile.id, el);
                      }}
                      className="hidden"
                    />

                    {/* Interactive Overlay Canvas */}
                    <canvas
                      ref={(el) => {
                        if (el) overlayCanvasRefs.current.set(tile.id, el);
                      }}
                      className="w-full h-auto block object-contain"
                    />

                    {tile.error && (
                      <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center gap-2 text-amber-400 text-xs font-mono">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                        <span>{tile.error}</span>
                      </div>
                    )}
                  </div>

                  {/* Tile Footer Telemetry Strip */}
                  <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Latency: <strong className="text-white">{tile.latencyMs}ms</strong></span>
                    <span className="truncate max-w-[160px]">
                      {tile.detections.length > 0
                        ? tile.detections.map((d) => d.className).join(", ")
                        : "No targets"}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* Expandable Pipeline Control Drawer */}
          <PipelineControlsDrawer
            config={config}
            onChangeConfig={setConfig}
            isOpen={isDrawerOpen}
            onToggleOpen={() => setIsDrawerOpen(!isDrawerOpen)}
          />
        </div>

        {/* Right Col: Aggregated Spatial Telemetry Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> Aggregated Telemetry
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                MULTI-STREAM
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block mb-1">Average FPS</span>
                <span className="text-emerald-400 text-lg font-extrabold">
                  {avgFps.toFixed(1)}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block mb-1">Avg Latency</span>
                <span className="text-cyan-400 text-lg font-extrabold">
                  {avgLatency} ms
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2">
                <span className="text-slate-400 text-[11px] block mb-1">Total Active Detected Balls</span>
                <span className="text-emerald-400 text-2xl font-extrabold">
                  {totalActiveBalls}
                </span>
              </div>
            </div>

            {/* Per-Tile Detections List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Tile Detection Feeds
              </span>

              {tiles.length === 0 ? (
                <div className="p-3 bg-slate-950 rounded-lg text-slate-500 text-center text-xs font-mono">
                  No active camera feeds
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-xs">
                  {tiles.map((tile) => (
                    <div
                      key={`sidebar-${tile.id}`}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-slate-200 font-bold border-b border-slate-900 pb-1">
                        <span className="truncate max-w-[140px] text-emerald-400">{tile.label}</span>
                        <span className="text-[10px] text-slate-400">{tile.detections.length} targets</span>
                      </div>

                      {tile.detections.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic block">No ball targets</span>
                      ) : (
                        tile.detections.map((b) => (
                          <div
                            key={`b-${tile.id}-${b.id}`}
                            className="flex justify-between text-[11px] text-slate-300"
                          >
                            <span>{b.className} #{b.id}</span>
                            <span className="text-emerald-400">{(b.confidence * 100).toFixed(1)}%</span>
                          </div>
                        ))
                      )}
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
