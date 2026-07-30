import React, { useState, useRef } from "react";
import { Upload, Sparkles } from "lucide-react";
import { BallDetection, PipelineConfig } from "../types";
import { combinedTelemetryEngine } from "../engine/combinedTelemetryEngine";

interface MediaUploadStudioProps {
  config: PipelineConfig;
  onTriggerAiAnalysis: (frameBase64: string, balls: BallDetection[]) => void;
}

export const MediaUploadStudio: React.FC<MediaUploadStudioProps> = ({
  config,
  onTriggerAiAnalysis,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedBalls, setDetectedBalls] = useState<BallDetection[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreviewUrl(url);

    if (file.type.startsWith("video/")) {
      setMediaType("video");
      setDetectedBalls([]);
    } else {
      setMediaType("image");
      setTimeout(() => processStaticImage(url), 100);
    }
  };

  const processStaticImage = (url: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;

    img.onload = () => {
      if (canvasRef.current && overlayCanvasRef.current) {
        const canvas = canvasRef.current;
        const overlay = overlayCanvasRef.current;

        canvas.width = img.width;
        canvas.height = img.height;
        overlay.width = img.width;
        overlay.height = img.height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height);

          const { balls } = combinedTelemetryEngine.processFrame(canvas, overlay, config);
          setDetectedBalls(balls);
        }
      }
      setIsProcessing(false);
    };
  };

  const processVideoFrame = () => {
    if (videoRef.current && canvasRef.current && overlayCanvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayCanvasRef.current;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      overlay.width = canvas.width;
      overlay.height = canvas.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { balls } = combinedTelemetryEngine.processFrame(canvas, overlay, config);
        setDetectedBalls(balls);
      }
    }
  };

  const handleRunAiAnalysis = () => {
    if (canvasRef.current) {
      const frameBase64 = canvasRef.current.toDataURL("image/jpeg", 0.9);
      onTriggerAiAnalysis(frameBase64, detectedBalls);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Dropzone Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-400" /> Media Upload & Telemetry Inspection
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload sports imagery or high-speed video files to run offline frame telemetry and Gemini AI analysis
          </p>
        </div>

        {/* Upload Drop Area */}
        <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950 p-8 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors group text-center">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold text-slate-200">
            Click to upload Image or Video
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Supports PNG, JPG, WebP, MP4, WebM (up to 50MB)
          </span>
        </label>
      </div>

      {/* Main Preview & Telemetry Table Grid */}
      {mediaPreviewUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Media Preview Box */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[360px]">
              
              {/* Hidden Canvas Elements */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Video element if video mode */}
              {mediaType === "video" && (
                <video
                  ref={videoRef}
                  src={mediaPreviewUrl}
                  onTimeUpdate={processVideoFrame}
                  controls
                  className="w-full h-auto max-h-[500px] object-contain block"
                />
              )}

              {/* Static Image element if image mode */}
              {mediaType === "image" && (
                <img
                  ref={imageRef}
                  src={mediaPreviewUrl}
                  alt="Upload preview"
                  className="w-full h-auto max-h-[500px] object-contain block"
                />
              )}

              {/* Overlay Canvas for HUD Bounding Boxes */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 pointer-events-none w-full h-full object-contain"
              />

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center text-emerald-400 font-mono text-xs gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  Running Computer Vision Pipeline...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {selectedFile?.name} ({(selectedFile?.size || 0) / (1024 * 1024) > 1 ? `${((selectedFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB` : `${Math.round((selectedFile?.size || 0) / 1024)} KB`})
              </span>

              <button
                onClick={handleRunAiAnalysis}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Run Gemini AI Analysis
              </button>
            </div>
          </div>

          {/* Right Col: Telemetry Bounding Box Table */}
          <div className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-200 block border-b border-slate-800 pb-2">
                Detected Objects Summary
              </span>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 text-[10px] block">Balls Found</span>
                <span className="text-emerald-400 text-base font-bold">
                  {detectedBalls.length}
                </span>
              </div>

              {/* Bounding Box Coordinate Table */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 block">
                  Bounding Box Coordinates [x1, y1, x2, y2]
                </span>

                <div className="space-y-2 max-h-60 overflow-y-auto font-mono text-[11px]">
                  {detectedBalls.map((b) => (
                    <div
                      key={`b-${b.id}`}
                      className="p-2.5 bg-slate-950 border border-emerald-500/30 rounded-lg space-y-1"
                    >
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>{b.className} #{b.id}</span>
                        <span>{(b.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-slate-400">
                        Box: [{b.bbox.join(", ")}]
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Circularity: {b.circularity} | Glint: {b.specularScore}
                      </div>
                    </div>
                  ))}

                  {detectedBalls.length === 0 && (
                    <div className="p-4 bg-slate-950 text-slate-500 text-center rounded-lg">
                      No ball targets detected on current frame
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
