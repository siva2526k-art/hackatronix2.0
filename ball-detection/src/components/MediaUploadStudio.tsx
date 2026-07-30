import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Play,
  Pause,
  Sparkles,
  Table,
  CheckCircle2,
  Info,
  Sliders,
} from 'lucide-react';
import { BallDetectorPipeline } from '../engine/ballDetectorPipeline';
import { DetectedBall, PipelineConfig } from '../types';

interface MediaUploadStudioProps {
  pipelineConfig: PipelineConfig;
  onTriggerAiSnapshot: (base64Frame: string, detectedBalls: DetectedBall[], mediaName: string) => void;
}

export const MediaUploadStudio: React.FC<MediaUploadStudioProps> = ({
  pipelineConfig,
  onTriggerAiSnapshot,
}) => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [detectedBalls, setDetectedBalls] = useState<DetectedBall[]>([]);
  const [candidateCount, setCandidateCount] = useState<number>(0);
  const [processingTimeMs, setProcessingTimeMs] = useState<number>(0);

  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipelineRef = useRef<BallDetectorPipeline>(new BallDetectorPipeline('media_studio', pipelineConfig));

  // Sync config changes
  useEffect(() => {
    pipelineRef.current.updateConfig(pipelineConfig);
    if (mediaType === 'image' && imageRef.current) {
      processMediaElement(imageRef.current);
    }
  }, [pipelineConfig]);

  // Handle File Upload Drop / Change
  const handleFileChange = (file: File) => {
    if (!file) return;

    if (mediaUrl) {
      URL.revokeObjectURL(mediaUrl);
    }

    const newUrl = URL.createObjectURL(file);
    setMediaFile(file);
    setMediaUrl(newUrl);

    if (file.type.startsWith('video/')) {
      setMediaType('video');
      setIsPlayingVideo(false);
    } else {
      setMediaType('image');
      setIsPlayingVideo(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const lastStateUpdateRef = useRef<number>(0);

  // Run pipeline processing on source element
  const processMediaElement = (source: HTMLImageElement | HTMLVideoElement, isVideoLoop = false) => {
    if (!source || !canvasRef.current) return;

    const width = source instanceof HTMLImageElement ? source.naturalWidth || source.width : source.videoWidth;
    const height = source instanceof HTMLImageElement ? source.naturalHeight || source.height : source.videoHeight;

    if (!width || !height) return;

    canvasRef.current.width = width;
    canvasRef.current.height = height;

    const start = performance.now();
    const result = pipelineRef.current.processFrame(source);
    const latency = Math.round(performance.now() - start);

    drawOverlay(canvasRef.current, result.detectedBalls);

    const now = performance.now();
    if (!isVideoLoop || now - lastStateUpdateRef.current > 200) {
      lastStateUpdateRef.current = now;
      setProcessingTimeMs(latency);
      setDetectedBalls(result.detectedBalls);
      setCandidateCount(result.candidateBlobs.length);
    }
  };

  // Video Frame Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        processMediaElement(videoRef.current, true);
        animId = requestAnimationFrame(loop);
      }
    };

    if (isPlayingVideo) {
      animId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlayingVideo]);

  const drawOverlay = (canvas: HTMLCanvasElement, balls: DetectedBall[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    balls.forEach((ball) => {
      const [x1, y1, x2, y2] = ball.bbox;
      const w = x2 - x1;
      const h = y2 - y1;

      // Motion Trail
      if (ball.trajectoryTrail.length > 1) {
        ctx.beginPath();
        ball.trajectoryTrail.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Box
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x1, y1, w, h);

      // Center
      ctx.beginPath();
      ctx.arc(ball.center.x, ball.center.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();

      // Label Header
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(x1, Math.max(0, y1 - 24), Math.max(120, w), 22);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(`${ball.classLabel} (${ball.confidence}%)`, x1 + 4, Math.max(14, y1 - 8));
    });
  };

  const handleAiAnalysis = () => {
    if (!canvasRef.current) return;

    const tempCanvas = document.createElement('canvas');
    let srcWidth = 640;
    let srcHeight = 360;

    if (mediaType === 'image' && imageRef.current) {
      srcWidth = imageRef.current.naturalWidth;
      srcHeight = imageRef.current.naturalHeight;
    } else if (mediaType === 'video' && videoRef.current) {
      srcWidth = videoRef.current.videoWidth;
      srcHeight = videoRef.current.videoHeight;
    }

    tempCanvas.width = srcWidth;
    tempCanvas.height = srcHeight;
    const ctx = tempCanvas.getContext('2d');

    if (ctx) {
      if (mediaType === 'image' && imageRef.current) {
        ctx.drawImage(imageRef.current, 0, 0);
      } else if (mediaType === 'video' && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0);
      }
      ctx.drawImage(canvasRef.current, 0, 0);

      const base64 = tempCanvas.toDataURL('image/jpeg', 0.85);
      onTriggerAiSnapshot(base64, detectedBalls, mediaFile?.name || 'Uploaded Media');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative bg-slate-900/90 border-2 border-dashed border-slate-700/80 hover:border-emerald-500/80 rounded-2xl p-6 text-center transition-all cursor-pointer group"
      >
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-200 font-semibold text-sm">
              {mediaFile ? mediaFile.name : 'Drop Sports Image or Video Here'}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Supports PNG, JPG, WebP, MP4, WebM (Computer vision executes client-side in real time)
            </p>
          </div>
        </div>
      </div>

      {/* Main Inspection Viewport Stage */}
      {mediaUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage Viewport */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
            {/* Viewport Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs">
              <div className="flex items-center space-x-2 font-mono text-slate-300">
                {mediaType === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Film className="w-4 h-4 text-cyan-400" />
                )}
                <span className="font-semibold truncate max-w-[200px]">{mediaFile?.name}</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-mono text-[11px] text-slate-400">
                  Latency: <span className="text-emerald-400 font-bold">{processingTimeMs}ms</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Candidates: <span className="text-cyan-400 font-bold">{candidateCount}</span>
                </span>

                <button
                  onClick={handleAiAnalysis}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Telemetry</span>
                </button>
              </div>
            </div>

            {/* Stage Frame */}
            <div className="relative bg-black flex items-center justify-center min-h-[360px] overflow-hidden">
              {mediaType === 'image' ? (
                <img
                  ref={imageRef}
                  src={mediaUrl}
                  alt="Inspection Target"
                  onLoad={(e) => processMediaElement(e.currentTarget)}
                  className="max-h-[500px] w-auto object-contain"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  controls={false}
                  loop
                  onLoadedData={(e) => processMediaElement(e.currentTarget)}
                  onTimeUpdate={(e) => processMediaElement(e.currentTarget)}
                  className="max-h-[500px] w-auto object-contain"
                />
              )}

              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none object-contain"
              />
            </div>

            {/* Video Controls Bar */}
            {mediaType === 'video' && (
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlayingVideo) {
                        videoRef.current.pause();
                        setIsPlayingVideo(false);
                      } else {
                        videoRef.current.play();
                        setIsPlayingVideo(true);
                      }
                    }
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
                >
                  {isPlayingVideo ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlayingVideo ? 'Pause Video' : 'Play & Track'}</span>
                </button>

                <div className="text-xs text-slate-400 font-mono">
                  Frame-by-frame real-time candidate processing active
                </div>
              </div>
            )}
          </div>

          {/* Coordinate Bounding Box Telemetry Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2 text-slate-200 font-semibold text-sm">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>Bounding Box Telemetry ({detectedBalls.length})</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  NMS Filtered
                </span>
              </div>

              {detectedBalls.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Info className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="text-slate-400 text-xs font-mono">No ball objects detected at current threshold.</p>
                  <p className="text-slate-500 text-[11px]">
                    Try adjusting Hue Tolerance or Confidence Threshold in CV Tuning.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mt-3 max-h-[420px] overflow-y-auto pr-1">
                  {detectedBalls.map((ball) => (
                    <div
                      key={ball.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between text-slate-200 font-bold border-b border-slate-800/80 pb-1.5">
                        <span className="text-emerald-400">{ball.classLabel}</span>
                        <span className="text-cyan-400">{ball.confidence}% Conf</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">BOUNDS [x1, y1, x2, y2]</span>
                          <span className="text-slate-300">
                            [{ball.bbox.join(', ')}]
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">CENTER (X, Y)</span>
                          <span className="text-slate-300">
                            ({ball.center.x}, {ball.center.y})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">CIRCULARITY</span>
                          <span className="text-emerald-400 font-semibold">{ball.circularity}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">SPECULAR GLINT</span>
                          <span className="text-cyan-400 font-semibold">{ball.specularGlint}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">RADIUS</span>
                          <span className="text-amber-400 font-semibold">{ball.radius}px</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Summary Pill */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero face detection dependencies enabled. Monocular 2D high-F1 ball CV.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
