export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceDistanceResult {
  timestamp: number;
  width: number;
  height: number;
  wPx: number;
  zRawCm: number;
  zSmoothedCm: number;
  angleDeg: number;
  angleRad: number;
  focalLengthPx: number;
  realFaceWidthM: number; // default 0.14m (14cm)
  centerX: number;
  centerY: number;
  noseX: number;
  noseY: number;
  zygomaticLeft: { x: number; y: number };
  zygomaticRight: { x: number; y: number };
  deltaZCm: number;
  isCalibrated: boolean;
  calibrationKey?: string;
  isSkinFallbackActive: boolean;
  trackingConfidence: number;
  fps: number;
}

export interface CalibrationProfile {
  deviceId: string;
  resolutionWidth: number;
  resolutionHeight: number;
  focalLengthPx: number;
  calibratedAt: string;
  referenceDistanceM: number; // 0.50m = 50cm
  realFaceWidthM: number;
}

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
}

export interface TelemetryLogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARN' | 'CALIB' | 'FALLBACK' | 'AI';
  message: string;
}

export interface GeminiAnalysisResult {
  summary: string;
  opticalDiagnosis: string;
  ergonomicScore: number;
  status: 'OPTIMAL' | 'TOO_CLOSE' | 'TOO_FAR' | 'HIGH_ANGLE' | 'UNCALIBRATED' | 'RUNNING_LOCAL' | 'KEY_MISSING';
  recommendations: string[];
  focalLengthRecommendation?: string;
  fallback?: boolean;
}
