import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Plus,
  X,
  Sparkles,
  Layers,
  Activity,
  AlertCircle,
  Eye,
  RefreshCw,
  VideoOff,
} from 'lucide-react';
import { BallDetectorPipeline } from '../engine/ballDetectorPipeline';
import { CameraStreamTileState, PipelineConfig, DetectedBall } from '../types';

interface LiveCameraStudioProps {
  pipelineConfig: PipelineConfig;
  onTriggerAiSnapshot: (base64Frame: string, detectedBalls: DetectedBall[], cameraLabel: string) => void;
  onUpdateCameraStates: (states: CameraStreamTileState[]) => void;
}

interface ActiveCameraInstance {
  id: string;
  deviceId: string;
  label: string;
  stream: MediaStream | null;
  pipeline: BallDetectorPipeline;
  isActive: boolean;
  error?: string;
  showTrails: boolean;
  showBoundingBox: boolean;
  showCandidates: boolean;
}

interface TileMetrics {
  fps: number;
  latencyMs: number;
  detectedBalls: DetectedBall[];
}

export const LiveCameraStudio: React.FC<LiveCameraStudioProps> = ({
  pipelineConfig,
  onTriggerAiSnapshot,
  onUpdateCameraStates,
}) => {
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraInstances, setCameraInstances] = useState<ActiveCameraInstance[]>([]);
  const [selectedDeviceToAdd, setSelectedDeviceToAdd] = useState<string>('');
  const [isRefreshingDevices, setIsRefreshingDevices] = useState<boolean>(false);
  const [tileMetricsMap, setTileMetricsMap] = useState<Map<string, TileMetrics>>(new Map());

  // References to video and canvas elements for each camera tile ID
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const animationFrameIds = useRef<Map<string, number>>(new Map());
  const tileMetricsRef = useRef<Map<string, TileMetrics>>(new Map());
  const cameraInstancesRef = useRef<ActiveCameraInstance[]>([]);

  // Sync ref to current instances for unmount cleanup
  useEffect(() => {
    cameraInstancesRef.current = cameraInstances;
  }, [cameraInstances]);

  // Periodic metrics sync to parent and local display (300ms throttle)
  useEffect(() => {
    const interval = setInterval(() => {
      setTileMetricsMap(new Map(tileMetricsRef.current));

      const tileStates: CameraStreamTileState[] = cameraInstances.map((inst) => {
        const metrics = tileMetricsRef.current.get(inst.id) || { fps: 0, latencyMs: 0, detectedBalls: [] };
        return {
          cameraId: inst.id,
          label: inst.label,
          isActive: inst.isActive,
          fps: metrics.fps,
          latencyMs: metrics.latencyMs,
          detectedBalls: metrics.detectedBalls,
        };
      });

      onUpdateCameraStates(tileStates);
    }, 300);

    return () => clearInterval(interval);
  }, [cameraInstances, onUpdateCameraStates]);

  // 1. Enumerate connected video input devices
  const enumerateCameras = async () => {
    setIsRefreshingDevices(true);
    try {
      // Request initial permission if needed to get full device labels
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        tempStream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        // User may deny or ignore camera permission on initial query
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);

      if (videoDevices.length > 0 && !selectedDeviceToAdd) {
        setSelectedDeviceToAdd(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate video devices:', err);
    } finally {
      setIsRefreshingDevices(false);
    }
  };

  useEffect(() => {
    enumerateCameras();

    // Load persisted camera IDs from localStorage
    const savedCameraDeviceIds = localStorage.getItem('ballvision_active_cameras');
    if (savedCameraDeviceIds) {
      try {
        const deviceIds: string[] = JSON.parse(savedCameraDeviceIds);
        deviceIds.forEach((id) => addCameraTile(id));
      } catch (e) {
        // Fallback default
      }
    } else {
      // Default to 1 camera on load if available
      addCameraTile('');
    }

    return () => {
      // Clean up all stream tracks on component unmount
      cameraInstancesRef.current.forEach((inst) => {
        if (inst.stream) {
          inst.stream.getTracks().forEach((track) => track.stop());
        }
      });
      animationFrameIds.current.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);

  // Update pipeline config across all active pipelines when global settings change
  useEffect(() => {
    cameraInstances.forEach((inst) => {
      inst.pipeline.updateConfig(pipelineConfig);
    });
  }, [pipelineConfig]);

  // Persist active device IDs to localStorage
  useEffect(() => {
    const activeDeviceIds = cameraInstances.map((inst) => inst.deviceId);
    localStorage.setItem('ballvision_active_cameras', JSON.stringify(activeDeviceIds));
  }, [cameraInstances]);

  // 2. Add Camera Tile
  const addCameraTile = async (targetDeviceId?: string) => {
    const tileId = `cam_tile_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const pipeline = new BallDetectorPipeline(tileId, pipelineConfig);

    let label = `Camera Feed ${cameraInstances.length + 1}`;
    let stream: MediaStream | null = null;
    let error: string | undefined = undefined;

    const deviceToUse = targetDeviceId || selectedDeviceToAdd;

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceToUse
          ? { deviceId: { exact: deviceToUse }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0];
      if (track) {
        label = track.label || label;
      }
    } catch (err: any) {
      console.warn(`Camera device access failed for ${deviceToUse}:`, err);
      error = 'Failed to access camera stream. Check device permissions or unplugged cable.';
    }

    const newInstance: ActiveCameraInstance = {
      id: tileId,
      deviceId: deviceToUse,
      label,
      stream,
      pipeline,
      isActive: stream !== null && stream.active,
      error,
      showTrails: true,
      showBoundingBox: true,
      showCandidates: false,
    };

    setCameraInstances((prev) => [...prev, newInstance]);
  };

  // 3. Remove Camera Tile & Stop Stream Tracks
  const removeCameraTile = (id: string) => {
    // Cancel animation frame loop
    const frameId = animationFrameIds.current.get(id);
    if (frameId) {
      cancelAnimationFrame(frameId);
      animationFrameIds.current.delete(id);
    }

    tileMetricsRef.current.delete(id);

    setCameraInstances((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.stream) {
        target.stream.getTracks().forEach((track) => track.stop());
      }
      return prev.filter((item) => item.id !== id);
    });

    videoRefs.current.delete(id);
    canvasRefs.current.delete(id);
  };

  // 4. Processing Loop for each Camera Tile
  useEffect(() => {
    cameraInstances.forEach((instance) => {
      if (!instance.stream || !instance.isActive) return;

      const videoEl = videoRefs.current.get(instance.id);
      const canvasEl = canvasRefs.current.get(instance.id);

      if (!videoEl || !canvasEl) return;

      if (videoEl.srcObject !== instance.stream) {
        videoEl.srcObject = instance.stream;
        videoEl.play().catch(() => {});
      }

      // Start detection frame loop for this tile
      const processTileFrame = () => {
        if (!videoEl || videoEl.paused || videoEl.ended || !instance.isActive) return;

        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          // Sync canvas dimensions
          if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
            canvasEl.width = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
          }

          // Run Computer Vision pipeline
          const result = instance.pipeline.processFrame(videoEl);

          // Update metrics ref without triggering 60fps React state re-renders
          tileMetricsRef.current.set(instance.id, {
            fps: result.fps,
            latencyMs: result.latencyMs,
            detectedBalls: result.detectedBalls,
          });

          // Draw Overlay on Canvas
          drawOverlayOnCanvas(
            canvasEl,
            result.detectedBalls,
            result.candidateBlobs,
            instance.showBoundingBox,
            instance.showTrails,
            instance.showCandidates
          );
        }

        const nextFrameId = requestAnimationFrame(processTileFrame);
        animationFrameIds.current.set(instance.id, nextFrameId);
      };

      // Start animation loop if not running
      if (!animationFrameIds.current.has(instance.id)) {
        const initialFrameId = requestAnimationFrame(processTileFrame);
        animationFrameIds.current.set(instance.id, initialFrameId);
      }
    });
  }, [cameraInstances]);

  // Draw HUD overlay (Bounding box, velocity vector, specular glint badge, motion trail)
  const drawOverlayOnCanvas = (
    canvas: HTMLCanvasElement,
    balls: DetectedBall[],
    candidates: any[],
    showBbox: boolean,
    showTrails: boolean,
    showCandidates: boolean
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Candidate Blobs if enabled
    if (showCandidates) {
      candidates.forEach((c) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    balls.forEach((ball) => {
      // 1. Draw Motion Trails
      if (showTrails && ball.trajectoryTrail.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < ball.trajectoryTrail.length; i++) {
          const pt = ball.trajectoryTrail[i];
          if (i === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 2. Draw Bounding Box & Center Target
      if (showBbox) {
        const [x1, y1, x2, y2] = ball.bbox;
        const w = x2 - x1;
        const h = y2 - y1;

        // Bounding Box
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, w, h);

        // Corner Crosshairs
        const cornerLen = Math.min(12, Math.floor(w / 4));
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;

        // Top-Left Corner
        ctx.beginPath();
        ctx.moveTo(x1, y1 + cornerLen);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 + cornerLen, y1);
        ctx.stroke();

        // Top-Right Corner
        ctx.beginPath();
        ctx.moveTo(x2 - cornerLen, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y1 + cornerLen);
        ctx.stroke();

        // Bottom-Left Corner
        ctx.beginPath();
        ctx.moveTo(x1, y2 - cornerLen);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x1 + cornerLen, y2);
        ctx.stroke();

        // Bottom-Right Corner
        ctx.beginPath();
        ctx.moveTo(x2 - cornerLen, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 - cornerLen);
        ctx.stroke();

        // Center Point
        ctx.beginPath();
        ctx.arc(ball.center.x, ball.center.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();

        // Velocity Arrow
        if (ball.velocity.speedPxPerSec > 10) {
          const arrowLength = Math.min(60, ball.velocity.speedPxPerSec / 10);
          const angle = Math.atan2(ball.velocity.vy, ball.velocity.vx);
          const endX = ball.center.x + Math.cos(angle) * arrowLength;
          const endY = ball.center.y + Math.sin(angle) * arrowLength;

          ctx.beginPath();
          ctx.moveTo(ball.center.x, ball.center.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = '#f59e0b'; // Amber velocity vector
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // HUD Text Header Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(x1, Math.max(0, y1 - 26), Math.max(140, w), 22);

        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(
          `${ball.classLabel} | ${ball.confidence}%`,
          x1 + 4,
          Math.max(14, y1 - 10)
        );

        // Sub-text Telemetry stats
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(x1, y2 + 2, Math.max(160, w), 18);
        ctx.fillStyle = '#22d3ee';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(
          `V: ${ball.velocity.speedPxPerSec}px/s | G: ${ball.specularGlint} | C: ${ball.circularity}`,
          x1 + 4,
          y2 + 14
        );
      }
    });
  };

  // Helper to trigger AI Snapshot for a specific tile
  const captureTileSnapshot = (instance: ActiveCameraInstance) => {
    const canvas = canvasRefs.current.get(instance.id);
    const video = videoRefs.current.get(instance.id);
    const metrics = tileMetricsRef.current.get(instance.id);
    const detectedBalls = metrics ? metrics.detectedBalls : [];

    if (!canvas || !video) return;

    // Snapshot image base64
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 360;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(video, 0, 0);
      tempCtx.drawImage(canvas, 0, 0);
      const base64 = tempCanvas.toDataURL('image/jpeg', 0.85);
      onTriggerAiSnapshot(base64, detectedBalls, instance.label);
    }
  };

  // Dynamic Grid Class
  const getGridClass = () => {
    const count = cameraInstances.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2';
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-2 text-slate-300 text-sm font-medium w-full sm:w-auto">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Active Camera Streams ({cameraInstances.length})</span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {/* Refresh Devices button */}
          <button
            onClick={enumerateCameras}
            disabled={isRefreshingDevices}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700/80"
            title="Rescan Video Input Devices"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingDevices ? 'animate-spin' : ''}`} />
          </button>

          {/* Device Selector */}
          <select
            value={selectedDeviceToAdd}
            onChange={(e) => setSelectedDeviceToAdd(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 max-w-[220px] truncate"
          >
            {availableDevices.length === 0 ? (
              <option value="">Default Web Camera</option>
            ) : (
              availableDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `Camera ${idx + 1}`}
                </option>
              ))
            )}
          </select>

          {/* Add Camera Button */}
          <button
            onClick={() => addCameraTile()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Stream</span>
          </button>
        </div>
      </div>

      {/* Camera Grid Tiles */}
      {cameraInstances.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
            <VideoOff className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-slate-200 font-semibold text-sm">No Active Camera Tiles</h3>
            <p className="text-slate-400 text-xs max-w-sm mt-1">
              Click &quot;Add Stream&quot; above to launch concurrent computer vision pipelines for your attached cameras.
            </p>
          </div>
          <button
            onClick={() => addCameraTile()}
            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl transition-colors"
          >
            Mount Default Camera
          </button>
        </div>
      ) : (
        <div className={`grid ${getGridClass()} gap-4`}>
          {cameraInstances.map((instance) => {
            const metrics = tileMetricsMap.get(instance.id) || { fps: 0, latencyMs: 0, detectedBalls: [] };

            return (
              <div
                key={instance.id}
                className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group shadow-xl"
              >
                {/* Tile Header Bar */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/80 border-b border-slate-800 text-xs z-10">
                  <div className="flex items-center space-x-2 truncate max-w-[60%]">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        instance.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-semibold text-slate-200 truncate">{instance.label}</span>
                  </div>

                  {/* Telemetry Stats Pills & Close */}
                  <div className="flex items-center space-x-2">
                    {instance.isActive ? (
                      <>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {metrics.fps} FPS
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700 hidden sm:inline-block">
                          {metrics.latencyMs}ms
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          {metrics.detectedBalls.length} Objects
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Camera Offline
                      </span>
                    )}

                  {/* AI Telemetry Button */}
                  <button
                    onClick={() => captureTileSnapshot(instance)}
                    disabled={!instance.isActive}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors disabled:opacity-40"
                    title="Send Snapshot to Gemini 2.5 Flash Kinematics Specialist"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  {/* Close Tile */}
                  <button
                    onClick={() => removeCameraTile(instance.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                    title="Stop & Close Camera"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Video Viewport Stage */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {instance.error ? (
                  <div className="p-6 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                    <p className="text-slate-300 text-xs font-mono">{instance.error}</p>
                    <button
                      onClick={() => addCameraTile(instance.deviceId)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-mono border border-slate-700"
                    >
                      Retry Stream Access
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(instance.id, el);
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current.set(instance.id, el);
                      }}
                      className="absolute inset-0 w-full h-full pointer-events-none object-contain"
                    />
                  </>
                )}

                {/* Overlay Toggle Control Pill (Bottom Left of Stage) */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center space-x-1.5 bg-slate-950/80 backdrop-blur border border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() =>
                      setCameraInstances((prev) =>
                        prev.map((i) => (i.id === instance.id ? { ...i, showBoundingBox: !i.showBoundingBox } : i))
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                      instance.showBoundingBox
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    BBox
                  </button>

                  <button
                    onClick={() =>
                      setCameraInstances((prev) =>
                        prev.map((i) => (i.id === instance.id ? { ...i, showTrails: !i.showTrails } : i))
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                      instance.showTrails
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Activity className="w-3 h-3 inline mr-1" />
                    Trails
                  </button>

                  <button
                    onClick={() =>
                      setCameraInstances((prev) =>
                        prev.map((i) => (i.id === instance.id ? { ...i, showCandidates: !i.showCandidates } : i))
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                      instance.showCandidates
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3 h-3 inline mr-1" />
                    Candidates
                  </button>
                </div>
              </div>

              {/* Bottom Quick Telemetry Summary Bar */}
              <div className="px-3 py-2 bg-slate-950 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">TARGET HUE</span>
                  <span className="text-emerald-400 font-semibold uppercase">{pipelineConfig.targetHuePreset}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CONF THRESHOLD</span>
                  <span className="text-slate-200">{pipelineConfig.confidenceThreshold}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EMA SMOOTHING</span>
                  <span className="text-cyan-400">α = {pipelineConfig.emaAlpha}</span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
