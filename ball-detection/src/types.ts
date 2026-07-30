export type SportsPresetType = 'tennis' | 'basketball' | 'cricket' | 'soccer' | 'custom';

export interface SportsPresetInfo {
  id: SportsPresetType;
  name: string;
  hue: number; // 0 - 360
  tolerance: number; // +- degrees
  minRadius: number;
  maxRadius: number;
  typicalDiameterMm: number;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
}

export interface PipelineConfig {
  confidenceThreshold: number; // 10% to 95%
  nmsIouThreshold: number; // 10% to 90%
  minRadius: number; // 4px to 250px
  maxRadius: number; // 4px to 250px
  minSpecularGlint: number; // 0.0 to 1.0
  targetHuePreset: SportsPresetType;
  customHue: number; // 0 to 360
  hueTolerance: number; // 5 to 60
  emaAlpha: number; // 0.05 to 1.0
  minCircularity: number; // 0.3 to 0.95
  showTrails: boolean;
  trailLength: number; // 5 to 50
  showCandidates: boolean;
  showColorMask: boolean;
  showBoundingBox: boolean;
}

export interface DetectedBall {
  id: string;
  classLabel: string;
  confidence: number; // 0 - 100
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  center: { x: number; y: number };
  radius: number;
  circularity: number; // 0 - 1
  specularGlint: number; // 0 - 1
  hueMatchScore: number; // 0 - 1
  velocity: {
    vx: number; // px / sec
    vy: number; // px / sec
    speedPxPerSec: number;
  };
  trajectoryTrail: { x: number; y: number; timestamp: number }[];
}

export interface CandidateBlob {
  x: number;
  y: number;
  radius: number;
  circularity: number;
  specularGlint: number;
  hueMatchScore: number;
  contrast: number;
}

export interface FrameProcessingResult {
  detectedBalls: DetectedBall[];
  candidateBlobs: CandidateBlob[];
  fps: number;
  latencyMs: number;
  processedWidth: number;
  processedHeight: number;
  colorMaskDataUrl?: string;
}

export interface CameraStreamTileState {
  cameraId: string;
  label: string;
  isActive: boolean;
  fps: number;
  latencyMs: number;
  detectedBalls: DetectedBall[];
  lastSnapshotBase64?: string;
  streamTrack?: MediaStreamTrack;
}

export interface TelemetryBenchmarkState {
  precisionMultiplier: number;
  recallMultiplier: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  iou50Accuracy: number;
  iou75Accuracy: number;
  fpsHistory: number[];
  latencyHistory: number[];
}

export const SPORTS_PRESETS: Record<SportsPresetType, SportsPresetInfo> = {
  tennis: {
    id: 'tennis',
    name: 'Tennis Ball (Lime)',
    hue: 70, // Yellow-green
    tolerance: 22,
    minRadius: 8,
    maxRadius: 80,
    typicalDiameterMm: 67,
    colorHex: '#84cc16',
    badgeBg: 'bg-lime-500/20 border-lime-500/40',
    badgeText: 'text-lime-400',
  },
  basketball: {
    id: 'basketball',
    name: 'Basketball (Orange)',
    hue: 20, // Bright Orange
    tolerance: 20,
    minRadius: 18,
    maxRadius: 200,
    typicalDiameterMm: 240,
    colorHex: '#f97316',
    badgeBg: 'bg-orange-500/20 border-orange-500/40',
    badgeText: 'text-orange-400',
  },
  cricket: {
    id: 'cricket',
    name: 'Cricket Ball (Red)',
    hue: 0, // Deep Red
    tolerance: 18,
    minRadius: 10,
    maxRadius: 100,
    typicalDiameterMm: 72,
    colorHex: '#ef4444',
    badgeBg: 'bg-red-500/20 border-red-500/40',
    badgeText: 'text-red-400',
  },
  soccer: {
    id: 'soccer',
    name: 'Soccer / White Ball',
    hue: 0, // High Value, Low Saturation
    tolerance: 180, // Accepts any hue with low sat & high val
    minRadius: 15,
    maxRadius: 180,
    typicalDiameterMm: 220,
    colorHex: '#f8fafc',
    badgeBg: 'bg-slate-200/20 border-slate-300/40',
    badgeText: 'text-slate-200',
  },
  custom: {
    id: 'custom',
    name: 'Custom Target Hue',
    hue: 190, // Cyan default
    tolerance: 30,
    minRadius: 6,
    maxRadius: 220,
    typicalDiameterMm: 100,
    colorHex: '#22d3ee',
    badgeBg: 'bg-cyan-500/20 border-cyan-500/40',
    badgeText: 'text-cyan-400',
  },
};

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  confidenceThreshold: 45,
  nmsIouThreshold: 35,
  minRadius: 8,
  maxRadius: 180,
  minSpecularGlint: 0.15,
  targetHuePreset: 'tennis',
  customHue: 70,
  hueTolerance: 22,
  emaAlpha: 0.45,
  minCircularity: 0.60,
  showTrails: true,
  trailLength: 20,
  showCandidates: false,
  showColorMask: false,
  showBoundingBox: true,
};
