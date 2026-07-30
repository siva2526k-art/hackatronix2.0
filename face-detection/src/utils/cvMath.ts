export const DEFAULT_REAL_FACE_WIDTH_M = 0.14; // 14 cm zygomatic width
export const CALIBRATION_REF_DISTANCE_M = 0.50; // 50 cm

export interface CVCalculationParams {
  frameWidth: number;
  frameHeight: number;
  wPx: number;
  noseX: number;
  noseY: number;
  focalLengthPx: number;
  realFaceWidthM?: number;
  isMirrored?: boolean;
  prevZCm?: number | null;
}

/**
 * Calculates default uncalibrated focal length from stream width
 * Based on standard laptop/webcam optics (~65 deg FOV)
 */
export function getDefaultFocalLength(resolutionWidth: number): number {
  return Math.round(resolutionWidth * 0.85);
}

/**
 * Calculates focal length from 50cm calibration
 * f = (w_px * Z_ref) / W
 */
export function calculateCalibratedFocalLength(
  wPx: number,
  refDistanceM: number = CALIBRATION_REF_DISTANCE_M,
  realFaceWidthM: number = DEFAULT_REAL_FACE_WIDTH_M
): number {
  if (wPx <= 0 || realFaceWidthM <= 0) return 0;
  return (wPx * refDistanceM) / realFaceWidthM;
}

/**
 * Clamps a value between min and max
 */
export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Distance-Adaptive Temporal Depth Smoothing (EMA)
 * distanceRatio = clamp(0.2, 1.5, Z_raw / 100)
 * alpha = clamp(0.08, 0.35, 0.40 - 0.20 * distanceRatio)
 * Z_smoothed = alpha * Z_raw + (1 - alpha) * Z_prev
 */
export function computeSmoothedDistance(zRawCm: number, prevZCm: number | null): number {
  if (prevZCm === null || isNaN(prevZCm) || prevZCm <= 0) {
    return zRawCm;
  }
  const distanceRatio = clamp(0.2, 1.5, zRawCm / 100);
  const alpha = clamp(0.08, 0.35, 0.40 - 0.20 * distanceRatio);
  return alpha * zRawCm + (1 - alpha) * prevZCm;
}

/**
 * Computes quantization depth error propagation
 * Delta Z = (Z_raw / w_px) * Delta w_px (where Delta w_px = 1.0 px noise)
 */
export function computeQuantizationError(zRawCm: number, wPx: number, deltaWPx: number = 1.0): number {
  if (wPx <= 0) return 0;
  return (zRawCm / wPx) * deltaWPx;
}

/**
 * Computes monocular depth Z and horizontal angle Theta
 */
export function computeDistanceAndAngle(params: CVCalculationParams) {
  const {
    frameWidth,
    frameHeight,
    wPx,
    noseX,
    focalLengthPx,
    realFaceWidthM = DEFAULT_REAL_FACE_WIDTH_M,
    isMirrored = true,
    prevZCm = null,
  } = params;

  const cx = frameWidth / 2;
  const cy = frameHeight / 2;

  // Monocular Depth Formula
  // Z_meters = (f * W) / w_px
  // Z_cm = Z_meters * 100
  const zMeters = wPx > 0 ? (focalLengthPx * realFaceWidthM) / wPx : 0;
  const zRawCm = zMeters * 100;
  const zSmoothedCm = computeSmoothedDistance(zRawCm, prevZCm);

  // Horizontal Angle Formula
  // Delta x = isMirrored ? -(x - cx) : (x - cx)
  // theta_rad = arctan2(Delta x, f)
  const deltaX = isMirrored ? -(noseX - cx) : (noseX - cx);
  const angleRad = Math.atan2(deltaX, focalLengthPx);
  const angleDeg = (angleRad * 180) / Math.PI;

  // Quantization Error
  const deltaZCm = computeQuantizationError(zRawCm, wPx, 1.0);

  return {
    cx,
    cy,
    zRawCm,
    zSmoothedCm,
    angleRad,
    angleDeg,
    deltaX,
    deltaZCm,
  };
}

/**
 * Resilient Canvas Skin-Tone Fallback Estimator
 * Samples video canvas to detect face centroid and bounding width if MediaPipe is loading/failing
 */
export function detectSkinToneFallback(
  videoElement: HTMLVideoElement,
  offscreenCanvas: HTMLCanvasElement
): { found: boolean; wPx: number; noseX: number; noseY: number } {
  if (!videoElement.videoWidth || !videoElement.videoHeight) {
    return { found: false, wPx: 0, noseX: 0, noseY: 0 };
  }

  const sampleW = 160;
  const sampleH = 120;
  offscreenCanvas.width = sampleW;
  offscreenCanvas.height = sampleH;

  const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { found: false, wPx: 0, noseX: 0, noseY: 0 };

  ctx.drawImage(videoElement, 0, 0, sampleW, sampleH);
  const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  const data = imgData.data;

  let count = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = sampleW;
  let maxX = 0;

  for (let y = 0; y < sampleH; y += 2) {
    for (let x = 0; x < sampleW; x += 2) {
      const idx = (y * sampleW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Skin threshold
      if (
        r > 80 &&
        g > 40 &&
        b > 20 &&
        r > g &&
        r > b &&
        Math.abs(r - g) > 15 &&
        r - g > 10
      ) {
        count++;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  if (count < 50) {
    return { found: false, wPx: 0, noseX: 0, noseY: 0 };
  }

  const scaleX = videoElement.videoWidth / sampleW;
  const scaleY = videoElement.videoHeight / sampleH;

  const rawSkinWidth = (maxX - minX) * scaleX;
  const wPx = Math.max(20, rawSkinWidth * 0.72); // Approx zygomatic scale from skin mask

  const noseX = (sumX / count) * scaleX;
  const noseY = (sumY / count) * scaleY;

  return {
    found: true,
    wPx,
    noseX,
    noseY,
  };
}
