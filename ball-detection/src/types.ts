export type DetectionMode = "ball";

export type ActiveTab = "camera" | "upload" | "dashboard" | "ai_assistant" | "about";

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

export interface BallDetection {
  id: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  className: string; // e.g. "Soccer Ball", "Basketball", "Tennis Ball", "Volleyball", "Cricket Ball"
  center: [number, number]; // [cx, cy]
  radius: number;
  circularity: number;
  specularScore: number;
  hueValue: number;
  colorMatchScore: number;
  velocity?: [number, number]; // [vx, vy] px/s
  speedPxPerSec?: number;
}

export interface SpatialTelemetry {
  relativeVelocityPxSec: number;
  trajectoryCurvature: "Linear" | "Parabolic" | "Unstable" | "Stationary";
}

export interface ColorFilterSettings {
  enabled: boolean;
  preset: "all" | "tennis_yellow" | "basketball_orange" | "soccer_white" | "cricket_red" | "custom";
  targetHue: number; // 0 to 360
  hueTolerance: number; // 5 to 60
  minSaturation: number; // 0 to 1
  minLightness: number; // 0 to 1
}

export interface PlausibilityFilterSettings {
  minCircularityRatio: number; // 0.3 to 1.0 (1.0 = perfect circle)
  minRadiusPx: number; // 4 to 200
  maxRadiusPx: number; // 20 to 500
  enableSpecularHighlightCheck: boolean;
  minSpecularThreshold: number; // 0.1 to 1.0
}

export interface F1TuningSettings {
  confidenceThreshold: number; // 0.1 to 0.99
  nmsIouThreshold: number; // 0.1 to 0.9
  precisionWeight: number; // 0.1 to 2.0
  recallWeight: number; // 0.1 to 2.0
  emaSmoothingAlpha: number; // 0.05 to 0.95
  maxDisappearedFrames: number; // 1 to 30
}

export interface PipelineConfig {
  mode: DetectionMode;
  f1Tuning: F1TuningSettings;
  plausibility: PlausibilityFilterSettings;
  colorFilter: ColorFilterSettings;
  showHUDOverlays: boolean;
  showTrajectoryTrails: boolean;
  showCrosshairs: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  instantFps: number;
  maxFps: number;
  processingTimeMs: number;
  avgConfidence: number;
  detectedBallCount: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalFramesProcessed: number;
  fpsHistory: number[];
  latencyHistory: number[];
  confidenceHistory: number[];
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  mode: DetectionMode;
  ballCount: number;
  ballTypes: string[];
  fps: number;
  processingMs: number;
}
