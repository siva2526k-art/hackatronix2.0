import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SubHeader } from './components/SubHeader';
import { VisionCanvas } from './components/VisionCanvas';
import { TelemetrySidePanel } from './components/TelemetrySidePanel';
import { DebugOverlay } from './components/DebugOverlay';
import { CalibrationModal } from './components/CalibrationModal';
import { DiagnosticReportModal } from './components/DiagnosticReportModal';
import { GeminiAiModal } from './components/GeminiAiModal';
import { FooterStatusBar } from './components/FooterStatusBar';

import {
  FaceDistanceResult,
  CameraDeviceInfo,
  TelemetryLogEntry,
  GeminiAnalysisResult,
  CalibrationProfile,
} from './types';
import {
  DEFAULT_REAL_FACE_WIDTH_M,
  computeDistanceAndAngle,
  detectSkinToneFallback,
} from './utils/cvMath';
import { getActiveFocalLength } from './utils/calibrationStorage';
import { getFaceLandmarker } from './services/mediaPipeService';

export default function App() {
  // Video and Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stream & Device State
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });
  const [realFaceWidthM, setRealFaceWidthM] = useState<number>(DEFAULT_REAL_FACE_WIDTH_M);

  // Telemetry Results State
  const [telemetryResult, setTelemetryResult] = useState<FaceDistanceResult | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [focalLengthPx, setFocalLengthPx] = useState<number>(1088);
  const [isCalibrated, setIsCalibrated] = useState<boolean>(false);
  const [isSkinFallbackActive, setIsSkinFallbackActive] = useState<boolean>(false);

  // Logs & Session
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const [sessionId] = useState<string>(() => 'SESSION_' + Math.random().toString(36).substring(2, 9).toUpperCase());

  // Modals & Overlays
  const [isDebugOverlayOpen, setIsDebugOverlayOpen] = useState<boolean>(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);
  const [isAudit5xOpen, setIsAudit5xOpen] = useState<boolean>(false);
  const [isGeminiAiOpen, setIsGeminiAiOpen] = useState<boolean>(false);

  // Gemini AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Refs for Animation Loop to avoid stale closures
  const prevZRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(performance.now());
  const animFrameIdRef = useRef<number | null>(null);
  const isMirroredRef = useRef<boolean>(isMirrored);
  const realFaceWidthMRef = useRef<number>(realFaceWidthM);
  const focalLengthPxRef = useRef<number>(focalLengthPx);

  useEffect(() => {
    isMirroredRef.current = isMirrored;
  }, [isMirrored]);

  useEffect(() => {
    realFaceWidthMRef.current = realFaceWidthM;
  }, [realFaceWidthM]);

  useEffect(() => {
    focalLengthPxRef.current = focalLengthPx;
  }, [focalLengthPx]);

  // Helper to add audit log line
  const addLog = useCallback((type: 'INFO' | 'WARN' | 'CALIB' | 'FALLBACK' | 'AI', message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newEntry: TelemetryLogEntry = {
      id: Math.random().toString(),
      timestamp,
      type,
      message,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 40)]);
  }, []);

  // 1. Enumerate Cameras
  useEffect(() => {
    async function initDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission first
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.substring(0, 5)}`,
          }));

        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
        addLog('INFO', `Camera enumeration complete. Found ${videoDevs.length} devices.`);
      } catch (err) {
        console.warn('Camera permission or enumeration error:', err);
        addLog('WARN', 'Camera access pending permission or device error.');
      }
    }
    initDevices();
  }, [addLog]);

  // 2. Initialize Offscreen Canvas
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // 3. Start Camera Video Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const w = videoRef.current.videoWidth || 1280;
          const h = videoRef.current.videoHeight || 720;
          setResolution({ width: w, height: h });

          // Load active focal length from LocalStorage or default
          const focalInfo = getActiveFocalLength(selectedDeviceId, w, h);
          setFocalLengthPx(focalInfo.focalLengthPx);
          setIsCalibrated(focalInfo.isCalibrated);

          addLog(
            'INFO',
            `Stream bound: ${w}x${h} | Focal f=${Math.round(focalInfo.focalLengthPx)}px (${
              focalInfo.isCalibrated ? 'CALIBRATED' : 'DEFAULT_0.85W'
            })`
          );
        }
      } catch (err) {
        console.error('Failed to start camera stream:', err);
        addLog('WARN', 'Camera stream failed to start.');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [selectedDeviceId, addLog]);

  // 4. Main MediaPipe Landmarker Loop
  useEffect(() => {
    let isCancelled = false;

    async function runLoop() {
      const landmarker = await getFaceLandmarker();
      if (!landmarker && !isCancelled) {
        addLog('WARN', 'MediaPipe landmarker loading, using skin fallback.');
      }

      const processFrame = () => {
        if (isCancelled) return;

        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          const now = performance.now();
          const frameWidth = video.videoWidth;
          const frameHeight = video.videoHeight;

          // FPS calculation
          frameCountRef.current++;
          if (now - fpsTimerRef.current >= 1000) {
            setFps(Math.round((frameCountRef.current * 1000) / (now - fpsTimerRef.current)));
            frameCountRef.current = 0;
            fpsTimerRef.current = now;
          }

          let wPx = 0;
          let noseX = 0;
          let noseY = 0;
          let zygomaticLeft = { x: 0, y: 0 };
          let zygomaticRight = { x: 0, y: 0 };
          let skinFallbackUsed = false;

          if (landmarker) {
            try {
              const mpResults = landmarker.detectForVideo(video, now);
              if (mpResults && mpResults.faceLandmarks && mpResults.faceLandmarks.length > 0) {
                const landmarks = mpResults.faceLandmarks[0];

                // Landmark #234: Left zygomatic arch / temple
                // Landmark #454: Right zygomatic arch / temple
                // Landmark #1: Nose tip
                const lm234 = landmarks[234];
                const lm454 = landmarks[454];
                const lm1 = landmarks[1];

                if (lm234 && lm454 && lm1) {
                  const x1 = lm234.x * frameWidth;
                  const y1 = lm234.y * frameHeight;
                  const x2 = lm454.x * frameWidth;
                  const y2 = lm454.y * frameHeight;

                  wPx = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
                  noseX = lm1.x * frameWidth;
                  noseY = lm1.y * frameHeight;

                  zygomaticLeft = { x: x1, y: y1 };
                  zygomaticRight = { x: x2, y: y2 };
                }
              }
            } catch (err) {
              // MediaPipe frame error, fall back to skin detection
            }
          }

          // Skin Tone Fallback if MediaPipe returns 0 px
          if (wPx <= 0 && offscreenCanvasRef.current) {
            const fallback = detectSkinToneFallback(video, offscreenCanvasRef.current);
            if (fallback.found) {
              wPx = fallback.wPx;
              noseX = fallback.noseX;
              noseY = fallback.noseY;
              skinFallbackUsed = true;
            }
          }

          setIsSkinFallbackActive(skinFallbackUsed);

          // Calculate Geometry
          if (wPx > 0) {
            const mathRes = computeDistanceAndAngle({
              frameWidth,
              frameHeight,
              wPx,
              noseX,
              noseY,
              focalLengthPx: focalLengthPxRef.current,
              realFaceWidthM: realFaceWidthMRef.current,
              isMirrored: isMirroredRef.current,
              prevZCm: prevZRef.current,
            });

            prevZRef.current = mathRes.zSmoothedCm;

            setTelemetryResult({
              timestamp: now,
              width: frameWidth,
              height: frameHeight,
              wPx,
              zRawCm: mathRes.zRawCm,
              zSmoothedCm: mathRes.zSmoothedCm,
              angleDeg: mathRes.angleDeg,
              angleRad: mathRes.angleRad,
              focalLengthPx: focalLengthPxRef.current,
              realFaceWidthM: realFaceWidthMRef.current,
              centerX: mathRes.cx,
              centerY: mathRes.cy,
              noseX,
              noseY,
              zygomaticLeft,
              zygomaticRight,
              deltaZCm: mathRes.deltaZCm,
              isCalibrated,
              isSkinFallbackActive: skinFallbackUsed,
              trackingConfidence: skinFallbackUsed ? 0.65 : 0.98,
              fps,
            });
          }
        }

        animFrameIdRef.current = requestAnimationFrame(processFrame);
      };

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    }

    runLoop();

    return () => {
      isCancelled = true;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [addLog, isCalibrated, fps]);

  // Handle 50cm Calibration Completion
  const handleCalibrationComplete = (profile: CalibrationProfile) => {
    setFocalLengthPx(profile.focalLengthPx);
    setIsCalibrated(true);
    addLog(
      'CALIB',
      `50cm Calibration complete! Saved focal length f = ${Math.round(profile.focalLengthPx)}px`
    );
  };

  // Request Gemini AI Telemetry Analysis
  const requestGeminiAnalysis = async (customPrompt?: string) => {
    setIsAiLoading(true);
    addLog('AI', 'Initiating Gemini AI telemetry analysis query...');

    try {
      const telemetryPayload = {
        zSmoothedCm: telemetryResult?.zSmoothedCm || 50,
        zRawCm: telemetryResult?.zRawCm || 50,
        wPx: telemetryResult?.wPx || 120,
        angleDeg: telemetryResult?.angleDeg || 0,
        focalLengthPx,
        width: resolution.width,
        height: resolution.height,
        isCalibrated,
        realFaceWidthM,
        deltaZCm: telemetryResult?.deltaZCm || 0.8,
        isSkinFallbackActive,
        customPrompt,
      };

      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry: telemetryPayload }),
      });

      const data: GeminiAnalysisResult = await res.json();
      setAiAnalysis(data);
      addLog('AI', `Gemini Analysis complete. Ergonomic score: ${data.ergonomicScore}/100.`);
      setIsGeminiAiOpen(true);
    } catch (err) {
      console.error('Failed to analyze with Gemini:', err);
      addLog('WARN', 'Gemini AI service query returned fallback analysis.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100 flex flex-col font-mono selection:bg-cyan-500 selection:text-black">
      {/* 1. Navbar Header */}
      <Navbar
        fps={fps}
        isCalibrated={isCalibrated}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        onOpenAudit5xModal={() => setIsAudit5xOpen(true)}
        onOpenGeminiAiModal={() => requestGeminiAnalysis()}
        isAiLoading={isAiLoading}
      />

      {/* 2. Sub-Header Toolbar */}
      <SubHeader
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
        isMirrored={isMirrored}
        onToggleMirror={() => setIsMirrored(!isMirrored)}
        resolutionWidth={resolution.width}
        resolutionHeight={resolution.height}
        realFaceWidthM={realFaceWidthM}
        onChangeRealFaceWidth={setRealFaceWidthM}
        isDebugOverlayOpen={isDebugOverlayOpen}
        onToggleDebugOverlay={() => setIsDebugOverlayOpen(!isDebugOverlayOpen)}
      />

      {/* 3. Main Workspace Grid */}
      <main className="flex-1 p-4 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Primary Vision Display (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <VisionCanvas
            videoRef={videoRef}
            canvasRef={canvasRef}
            result={telemetryResult}
            isMirrored={isMirrored}
            isSkinFallbackActive={isSkinFallbackActive}
          />
        </div>

        {/* Right Column: Telemetry Side Panel (Span 1) */}
        <div className="lg:col-span-1">
          <TelemetrySidePanel
            result={telemetryResult}
            logs={logs}
            aiAnalysis={aiAnalysis}
            onOpenGeminiAiModal={() => setIsGeminiAiOpen(true)}
            isAiLoading={isAiLoading}
          />
        </div>
      </main>

      {/* 4. Debug HUD Overlay */}
      <DebugOverlay
        result={telemetryResult}
        isOpen={isDebugOverlayOpen}
        onClose={() => setIsDebugOverlayOpen(false)}
        focalLengthPx={focalLengthPx}
      />

      {/* 5. Modals */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        result={telemetryResult}
        deviceId={selectedDeviceId}
        realFaceWidthM={realFaceWidthM}
        onCalibrationComplete={handleCalibrationComplete}
      />

      <DiagnosticReportModal
        isOpen={isAudit5xOpen}
        onClose={() => setIsAudit5xOpen(false)}
      />

      <GeminiAiModal
        isOpen={isGeminiAiOpen}
        onClose={() => setIsGeminiAiOpen(false)}
        result={telemetryResult}
        aiAnalysis={aiAnalysis}
        isLoading={isAiLoading}
        onRequestAnalysis={requestGeminiAnalysis}
      />

      {/* 6. Footer Status Bar */}
      <FooterStatusBar
        sessionId={sessionId}
        isCalibrated={isCalibrated}
        fps={fps}
      />
    </div>
  );
}
