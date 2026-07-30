import {
  CandidateBlob,
  DEFAULT_PIPELINE_CONFIG,
  DetectedBall,
  FrameProcessingResult,
  PipelineConfig,
  SPORTS_PRESETS,
} from '../types';

export class BallDetectorPipeline {
  private cameraId: string;
  private config: PipelineConfig;
  private previousTracks: Map<string, DetectedBall> = new Map();
  private lastFrameTime: number = 0;
  private fpsBuffer: number[] = [];
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;

  constructor(cameraId: string, config?: Partial<PipelineConfig>) {
    this.cameraId = cameraId;
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  public updateConfig(newConfig: Partial<PipelineConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): PipelineConfig {
    return { ...this.config };
  }

  public resetState() {
    this.previousTracks.clear();
    this.lastFrameTime = 0;
    this.fpsBuffer = [];
  }

  /**
   * RGB to HSV conversion
   * R, G, B in [0, 255]
   * H in [0, 360), S in [0, 1], V in [0, 1]
   */
  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rf = r / 255;
    const gf = g / 255;
    const bf = b / 255;

    const max = Math.max(rf, gf, bf);
    const min = Math.min(rf, gf, bf);
    const delta = max - min;

    let h = 0;
    let s = max === 0 ? 0 : delta / max;
    let v = max;

    if (delta !== 0) {
      if (max === rf) {
        h = ((gf - bf) / delta) % 6;
      } else if (max === gf) {
        h = (bf - rf) / delta + 2;
      } else {
        h = (rf - gf) / delta + 4;
      }
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    return { h, s, v };
  }

  /**
   * Calculates Hue match score [0, 1]
   */
  private calculateHueScore(h: number, s: number, v: number): number {
    const preset = SPORTS_PRESETS[this.config.targetHuePreset] || SPORTS_PRESETS.tennis;
    const targetHue = this.config.targetHuePreset === 'custom' ? this.config.customHue : preset.hue;
    const tolerance = this.config.targetHuePreset === 'custom' ? this.config.hueTolerance : preset.tolerance;

    // Special handler for Soccer / White spherical objects
    if (this.config.targetHuePreset === 'soccer') {
      if (s < 0.28 && v > 0.60) {
        const satScore = 1 - s / 0.28;
        const valScore = (v - 0.60) / 0.40;
        return Math.min(1, Math.max(0, satScore * 0.5 + valScore * 0.5));
      }
      return 0;
    }

    // Require reasonable saturation & brightness for colored balls
    if (s < 0.20 || v < 0.20) return 0;

    let diff = Math.abs(h - targetHue);
    if (diff > 180) diff = 360 - diff;

    if (diff > tolerance) return 0;

    return 1 - diff / tolerance;
  }

  /**
   * Computes Intersection over Union (IoU) between two bounding boxes
   */
  private computeIoU(b1: [number, number, number, number], b2: [number, number, number, number]): number {
    const x1 = Math.max(b1[0], b2[0]);
    const y1 = Math.max(b1[1], b2[1]);
    const x2 = Math.min(b1[2], b2[2]);
    const y2 = Math.min(b1[3], b2[3]);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    if (intersectionArea === 0) return 0;

    const b1Area = (b1[2] - b1[0]) * (b1[3] - b1[1]);
    const b2Area = (b2[2] - b2[0]) * (b2[3] - b2[1]);

    const unionArea = b1Area + b2Area - intersectionArea;
    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  /**
   * Analyzes top-center quadrant for 3D spherical specular highlight glints
   */
  private analyzeSpecularGlint(
    imgData: ImageData,
    width: number,
    cx: number,
    cy: number,
    radius: number
  ): number {
    const data = imgData.data;
    let topGlintMaxVal = 0;
    let avgBallVal = 0;
    let sampleCount = 0;

    const topYMin = Math.max(0, Math.floor(cy - radius * 0.6));
    const topYMax = Math.max(0, Math.floor(cy - radius * 0.1));
    const topXMin = Math.max(0, Math.floor(cx - radius * 0.3));
    const topXMax = Math.min(width - 1, Math.floor(cx + radius * 0.3));

    // Sample pixels inside ball bounding box
    const step = Math.max(1, Math.floor(radius / 8));

    for (let py = Math.floor(cy - radius); py <= Math.floor(cy + radius); py += step) {
      for (let px = Math.floor(cx - radius); px <= Math.floor(cx + radius); px += step) {
        if (px < 0 || px >= width || py < 0 || py >= imgData.height) continue;
        const distSq = (px - cx) ** 2 + (py - cy) ** 2;
        if (distSq > radius ** 2) continue;

        const idx = (py * width + px) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        avgBallVal += luminance;
        sampleCount++;

        if (px >= topXMin && px <= topXMax && py >= topYMin && py <= topYMax) {
          if (luminance > topGlintMaxVal) {
            topGlintMaxVal = luminance;
          }
        }
      }
    }

    if (sampleCount === 0) return 0;
    avgBallVal /= sampleCount;

    if (avgBallVal === 0) return 0;

    // Specular highlight ratio
    const glintRatio = (topGlintMaxVal - avgBallVal) / 255;
    return Math.min(1, Math.max(0, glintRatio * 2.5));
  }

  /**
   * Process a live HTMLVideoElement, HTMLImageElement, or Canvas source
   */
  public processFrame(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): FrameProcessingResult {
    const startTime = performance.now();

    const srcWidth = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const srcHeight = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    // If source is invalid or inactive, return 0 detections cleanly
    if (!srcWidth || !srcHeight || srcWidth <= 0 || srcHeight <= 0) {
      return {
        detectedBalls: [],
        candidateBlobs: [],
        fps: 0,
        latencyMs: 0,
        processedWidth: 0,
        processedHeight: 0,
      };
    }

    // Downscale processing resolution for real-time 60FPS high performance CV
    const maxDimension = 480;
    let scale = 1;
    if (Math.max(srcWidth, srcHeight) > maxDimension) {
      scale = maxDimension / Math.max(srcWidth, srcHeight);
    }

    const procWidth = Math.floor(srcWidth * scale);
    const procHeight = Math.floor(srcHeight * scale);

    if (this.offscreenCanvas.width !== procWidth || this.offscreenCanvas.height !== procHeight) {
      this.offscreenCanvas.width = procWidth;
      this.offscreenCanvas.height = procHeight;
    }

    if (!this.offscreenCtx) {
      return {
        detectedBalls: [],
        candidateBlobs: [],
        fps: 0,
        latencyMs: 0,
        processedWidth: procWidth,
        processedHeight: procHeight,
      };
    }

    // Draw frame to offscreen canvas
    this.offscreenCtx.drawImage(source, 0, 0, procWidth, procHeight);
    const imgData = this.offscreenCtx.getImageData(0, 0, procWidth, procHeight);
    const data = imgData.data;

    // 1. Grid Sampling & Color Candidate Detection
    const step = 4; // Scan every 4th pixel for high responsiveness
    const candidateMap: { x: number; y: number; score: number }[] = [];

    let totalLuminance = 0;
    let checkedPixels = 0;

    for (let y = step; y < procHeight - step; y += step) {
      for (let x = step; x < procWidth - step; x += step) {
        const idx = (y * procWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
        checkedPixels++;

        const hsv = this.rgbToHsv(r, g, b);
        const hueScore = this.calculateHueScore(hsv.h, hsv.s, hsv.v);

        if (hueScore > 0.3) {
          candidateMap.push({ x, y, score: hueScore });
        }
      }
    }

    // Zero Detections check for blank or completely black/white scenes
    const avgFrameLuminance = checkedPixels > 0 ? totalLuminance / checkedPixels : 0;
    if (avgFrameLuminance < 3 || candidateMap.length === 0) {
      const now = performance.now();
      const latency = Math.round(now - startTime);

      return {
        detectedBalls: [],
        candidateBlobs: [],
        fps: this.calculateFps(now),
        latencyMs: latency,
        processedWidth: procWidth,
        processedHeight: procHeight,
      };
    }

    // 2. Spatial Clustering of Candidate Points to form Blobs
    const rawBlobs: CandidateBlob[] = [];
    const visited = new Set<number>();
    const clusterRadius = Math.max(10, Math.floor(this.config.minRadius * scale * 1.5));

    for (let i = 0; i < candidateMap.length; i++) {
      if (visited.has(i)) continue;

      let sumX = 0;
      let sumY = 0;
      let count = 0;
      let maxHueScore = 0;

      const clusterQueue = [candidateMap[i]];
      visited.add(i);

      let head = 0;
      while (head < clusterQueue.length) {
        const pt = clusterQueue[head++];
        sumX += pt.x;
        sumY += pt.y;
        count++;
        if (pt.score > maxHueScore) maxHueScore = pt.score;

        for (let j = 0; j < candidateMap.length; j++) {
          if (visited.has(j)) continue;
          const other = candidateMap[j];
          const dx = pt.x - other.x;
          const dy = pt.y - other.y;
          if (dx * dx + dy * dy <= clusterRadius * clusterRadius) {
            visited.add(j);
            clusterQueue.push(other);
          }
        }
      }

      if (count >= 3) {
        const cx = Math.round(sumX / count);
        const cy = Math.round(sumY / count);

        // Estimate blob radius based on cluster area extent
        let maxDist = 0;
        for (const pt of clusterQueue) {
          const d = Math.sqrt((pt.x - cx) ** 2 + (pt.y - cy) ** 2);
          if (d > maxDist) maxDist = d;
        }

        const estRadiusProc = Math.max(3, maxDist + step);
        const estRadiusOriginal = estRadiusProc / scale;

        // Radius filtering
        if (
          estRadiusOriginal >= this.config.minRadius &&
          estRadiusOriginal <= this.config.maxRadius
        ) {
          // Circularity assessment: ratio of active perimeter / interior count
          const circularity = Math.min(1, Math.max(0.3, 1 - Math.abs(maxDist - estRadiusProc) / estRadiusProc));
          const specularGlint = this.analyzeSpecularGlint(imgData, procWidth, cx, cy, estRadiusProc);

          rawBlobs.push({
            x: Math.round(cx / scale),
            y: Math.round(cy / scale),
            radius: Math.round(estRadiusOriginal),
            circularity: parseFloat(circularity.toFixed(2)),
            specularGlint: parseFloat(specularGlint.toFixed(2)),
            hueMatchScore: parseFloat(maxHueScore.toFixed(2)),
            contrast: Math.min(1, count / 30),
          });
        }
      }
    }

    // 3. Score & Filter Candidates by Plausibility
    interface ScoredCandidate {
      blob: CandidateBlob;
      confidence: number;
      bbox: [number, number, number, number];
    }

    const scoredCandidates: ScoredCandidate[] = [];

    for (const blob of rawBlobs) {
      if (blob.circularity < this.config.minCircularity) continue;
      if (blob.specularGlint < this.config.minSpecularGlint && this.config.minSpecularGlint > 0.05) continue;

      // Weighted confidence formula
      const rawConf =
        blob.hueMatchScore * 40 +
        blob.circularity * 30 +
        blob.specularGlint * 15 +
        blob.contrast * 15;

      const confidence = Math.min(99, Math.round(rawConf));

      if (confidence >= this.config.confidenceThreshold) {
        const r = blob.radius;
        const bbox: [number, number, number, number] = [
          Math.max(0, blob.x - r),
          Math.max(0, blob.y - r),
          Math.min(srcWidth, blob.x + r),
          Math.min(srcHeight, blob.y + r),
        ];

        scoredCandidates.push({ blob, confidence, bbox });
      }
    }

    // 4. Non-Maximum Suppression (NMS)
    scoredCandidates.sort((a, b) => b.confidence - a.confidence);

    const nmsKeep: ScoredCandidate[] = [];
    const nmsThreshold = this.config.nmsIouThreshold / 100;

    for (const item of scoredCandidates) {
      let suppress = false;
      for (const kept of nmsKeep) {
        const iou = this.computeIoU(item.bbox, kept.bbox);
        if (iou > nmsThreshold) {
          suppress = true;
          break;
        }
      }
      if (!suppress) {
        nmsKeep.push(item);
      }
    }

    // 5. Exponential Moving Average (EMA) Smoothing & Velocity Calculation
    const nowTime = performance.now();
    const deltaTimeSec = this.lastFrameTime > 0 ? (nowTime - this.lastFrameTime) / 1000 : 0.033;
    this.lastFrameTime = nowTime;

    const alpha = this.config.emaAlpha;
    const finalDetectedBalls: DetectedBall[] = [];
    const currentTracks = new Map<string, DetectedBall>();

    const activePreset = SPORTS_PRESETS[this.config.targetHuePreset] || SPORTS_PRESETS.tennis;

    nmsKeep.forEach((item, index) => {
      const ballId = `cam_${this.cameraId}_ball_${index + 1}`;
      const prev = this.previousTracks.get(ballId) || this.previousTracks.get(`cam_${this.cameraId}_ball_${index}`);

      let smoothedX = item.blob.x;
      let smoothedY = item.blob.y;
      let smoothedR = item.blob.radius;
      let vx = 0;
      let vy = 0;
      let speedPxPerSec = 0;
      let trail = prev ? [...prev.trajectoryTrail] : [];

      if (prev) {
        smoothedX = Math.round(alpha * item.blob.x + (1 - alpha) * prev.center.x);
        smoothedY = Math.round(alpha * item.blob.y + (1 - alpha) * prev.center.y);
        smoothedR = Math.round(alpha * item.blob.radius + (1 - alpha) * prev.radius);

        if (deltaTimeSec > 0) {
          vx = Math.round((smoothedX - prev.center.x) / deltaTimeSec);
          vy = Math.round((smoothedY - prev.center.y) / deltaTimeSec);
          speedPxPerSec = Math.round(Math.sqrt(vx * vx + vy * vy));
        }
      }

      // Maintain trajectory trail points
      trail.push({ x: smoothedX, y: smoothedY, timestamp: nowTime });
      if (trail.length > this.config.trailLength) {
        trail = trail.slice(trail.length - this.config.trailLength);
      }

      const smoothedBbox: [number, number, number, number] = [
        Math.max(0, smoothedX - smoothedR),
        Math.max(0, smoothedY - smoothedR),
        Math.min(srcWidth, smoothedX + smoothedR),
        Math.min(srcHeight, smoothedY + smoothedR),
      ];

      const detectedBall: DetectedBall = {
        id: ballId,
        classLabel: activePreset.name,
        confidence: item.confidence,
        bbox: smoothedBbox,
        center: { x: smoothedX, y: smoothedY },
        radius: smoothedR,
        circularity: item.blob.circularity,
        specularGlint: item.blob.specularGlint,
        hueMatchScore: item.blob.hueMatchScore,
        velocity: { vx, vy, speedPxPerSec },
        trajectoryTrail: trail,
      };

      currentTracks.set(ballId, detectedBall);
      finalDetectedBalls.push(detectedBall);
    });

    this.previousTracks = currentTracks;

    const latency = Math.round(performance.now() - startTime);
    const fps = this.calculateFps(nowTime);

    return {
      detectedBalls: finalDetectedBalls,
      candidateBlobs: rawBlobs,
      fps,
      latencyMs: latency,
      processedWidth: procWidth,
      processedHeight: procHeight,
    };
  }

  private calculateFps(now: number): number {
    this.fpsBuffer.push(now);
    if (this.fpsBuffer.length > 20) {
      this.fpsBuffer.shift();
    }
    if (this.fpsBuffer.length < 2) return 30;

    const elapsedMs = now - this.fpsBuffer[0];
    if (elapsedMs <= 0) return 30;

    const calculatedFps = Math.round(((this.fpsBuffer.length - 1) * 1000) / elapsedMs);
    return Math.min(120, Math.max(1, calculatedFps));
  }
}
