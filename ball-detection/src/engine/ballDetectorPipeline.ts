import { BallDetection, PipelineConfig } from "../types";

export class BallDetectorPipeline {
  private trackedBalls: Map<number, {
    id: number;
    bbox: [number, number, number, number];
    smoothBbox: [number, number, number, number];
    center: [number, number];
    history: [number, number][];
    velocity: [number, number];
    lastSeenFrame: number;
    className: string;
    confidence: number;
    radius: number;
    circularity: number;
    specularScore: number;
    hueValue: number;
  }> = new Map();

  private nextBallId = 1;
  private currentFrame = 0;

  /**
   * Primary frame detector operating directly on an HTMLCanvasElement or ImageData
   */
  public processFrame(
    sourceCanvas: HTMLCanvasElement,
    config: PipelineConfig
  ): BallDetection[] {
    this.currentFrame++;
    const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    if (width === 0 || height === 0) return [];

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Step 1: Candidate Region Extraction using Color + Geometric Contours
    const rawCandidates = this.extractCandidates(data, width, height, config);

    // Step 2: NMS (Non-Maximum Suppression) IoU Filtering
    const nmsCandidates = this.applyNMS(rawCandidates, config.f1Tuning.nmsIouThreshold);

    // Step 3: Secondary Plausibility Filtering (Circularity, Min/Max Radius, Specular Highlight)
    const plausibilityFiltered = nmsCandidates.filter((candidate) =>
      this.checkPlausibility(candidate, config)
    );

    // Step 4: Post-Detection Color Filtering (Hue Selector & Tolerance)
    const colorFiltered = plausibilityFiltered.filter((candidate) =>
      this.checkColorFilter(candidate, config)
    );

    // Step 5: Confidence Thresholding
    const confFiltered = colorFiltered.filter(
      (c) => c.confidence >= config.f1Tuning.confidenceThreshold
    );

    // Step 6: Temporal Motion Tracking & EMA Box Smoothing
    const trackedDetections = this.updateTracks(confFiltered, config);

    return trackedDetections;
  }

  /**
   * Extract candidate ball regions using color blobs & gradient edge boundaries
   */
  private extractCandidates(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    config: PipelineConfig
  ): {
    bbox: [number, number, number, number];
    confidence: number;
    className: string;
    radius: number;
    circularity: number;
    specularScore: number;
    hueValue: number;
  }[] {
    const candidates: {
      bbox: [number, number, number, number];
      confidence: number;
      className: string;
      radius: number;
      circularity: number;
      specularScore: number;
      hueValue: number;
    }[] = [];

    // Grid sampling over frame to detect high-contrast or circular color blobs
    const stepX = Math.max(12, Math.floor(width / 40));
    const stepY = Math.max(12, Math.floor(height / 40));

    const visited = new Uint8Array(width * height);

    for (let y = stepY; y < height - stepY; y += stepY) {
      for (let x = stepX; x < width - stepX; x += stepX) {
        const idx = (y * width + x) * 4;
        if (visited[y * width + x]) continue;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const [h, s, l] = this.rgbToHsl(r, g, b);

        // Check if color stands out from background
        const isTargetColor = this.isProminentColor(h, s, l, config.colorFilter);

        if (isTargetColor) {
          // Region Grow / Bounding Box Estimation
          const bbox = this.growRegion(data, visited, x, y, width, height, h, s, l);
          if (!bbox) continue;

          const [x1, y1, x2, y2] = bbox;
          const boxW = x2 - x1;
          const boxH = y2 - y1;
          const aspect = boxW / (boxH || 1);

          if (aspect >= 0.5 && aspect <= 1.8 && boxW >= 6 && boxH >= 6) {
            const radius = Math.round((boxW + boxH) / 4);
            const area = boxW * boxH;
            const perimeter = 2 * (boxW + boxH);
            const circularity = Math.min(1.0, (4 * Math.PI * (Math.PI * radius * radius)) / (perimeter * perimeter || 1));

            const specularScore = this.calculateSpecularHighlight(data, width, x1, y1, x2, y2);
            const className = this.determineBallClass(h, s, l, radius);

            let confidence = Math.min(0.98, 0.65 + (circularity * 0.2) + (specularScore * 0.15));
            if (s > 0.4) confidence += 0.05;

            candidates.push({
              bbox,
              confidence: Number(confidence.toFixed(2)),
              className,
              radius,
              circularity: Number(circularity.toFixed(2)),
              specularScore: Number(specularScore.toFixed(2)),
              hueValue: Math.round(h),
            });
          }
        }
      }
    }

    return candidates;
  }

  private isProminentColor(
    h: number,
    s: number,
    l: number,
    colorFilter: PipelineConfig["colorFilter"]
  ): boolean {
    if (l < 0.1) return false; // Too dark
    if (s < 0.15 && l < 0.8) return false; // Dull background

    // If color filter is disabled or preset is 'all', accept any vivid color or bright sphere
    if (!colorFilter.enabled || colorFilter.preset === "all") {
      return s > 0.25 || l > 0.75;
    }

    let targetHue = colorFilter.targetHue;
    let tol = colorFilter.hueTolerance;

    if (colorFilter.preset === "tennis_yellow") {
      targetHue = 55;
      tol = 25;
    } else if (colorFilter.preset === "basketball_orange") {
      targetHue = 22;
      tol = 18;
    } else if (colorFilter.preset === "cricket_red") {
      targetHue = 5;
      tol = 20;
    } else if (colorFilter.preset === "soccer_white") {
      return l > 0.7 && s < 0.25;
    }

    let hueDiff = Math.abs(h - targetHue);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;

    return hueDiff <= tol && s >= colorFilter.minSaturation && l >= colorFilter.minLightness;
  }

  private growRegion(
    data: Uint8ClampedArray,
    visited: Uint8Array,
    startX: number,
    startY: number,
    width: number,
    height: number,
    refH: number,
    refS: number,
    refL: number
  ): [number, number, number, number] | null {
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;

    const queue: [number, number][] = [[startX, startY]];
    visited[startY * width + startX] = 1;

    let count = 0;
    const maxPixels = 2500; // Limit flood fill size for high FPS performance

    while (queue.length > 0 && count < maxPixels) {
      const [cx, cy] = queue.shift()!;
      count++;

      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);

      const neighbors: [number, number][] = [
        [cx + 4, cy], [cx - 4, cy], [cx, cy + 4], [cx, cy - 4]
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const vIdx = ny * width + nx;
          if (!visited[vIdx]) {
            visited[vIdx] = 1;
            const pIdx = vIdx * 4;
            const [h, s, l] = this.rgbToHsl(data[pIdx], data[pIdx + 1], data[pIdx + 2]);

            let hueDiff = Math.abs(h - refH);
            if (hueDiff > 180) hueDiff = 360 - hueDiff;

            if (hueDiff < 30 && Math.abs(l - refL) < 0.35) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    if (count < 4) return null;
    return [minX, minY, maxX, maxY];
  }

  /**
   * Specular Highlight Checking
   * Spherical 3D balls reflect point light sources creating bright specular reflections near top-center.
   */
  private calculateSpecularHighlight(
    data: Uint8ClampedArray,
    width: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const boxW = x2 - x1;
    const boxH = y2 - y1;
    if (boxW < 4 || boxH < 4) return 0.5;

    // Sample top-center quadrant [20% to 50% from top]
    const sampleMinX = Math.floor(x1 + boxW * 0.2);
    const sampleMaxX = Math.floor(x1 + boxW * 0.8);
    const sampleMinY = Math.floor(y1 + boxH * 0.1);
    const sampleMaxY = Math.floor(y1 + boxH * 0.5);

    let maxLuminance = 0;
    let avgLuminance = 0;
    let samples = 0;

    for (let sy = sampleMinY; sy <= sampleMaxY; sy += 2) {
      for (let sx = sampleMinX; sx <= sampleMaxX; sx += 2) {
        const idx = (sy * width + sx) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        maxLuminance = Math.max(maxLuminance, lum);
        avgLuminance += lum;
        samples++;
      }
    }

    if (samples === 0) return 0.5;
    avgLuminance /= samples;

    // Contrast ratio between peak specular spot and surrounding body
    const specularGlintScore = Math.min(1.0, (maxLuminance - avgLuminance) * 2.5 + maxLuminance * 0.5);
    return Math.max(0.1, specularGlintScore);
  }

  /**
   * Non-Maximum Suppression (NMS) based on Intersection over Union (IoU)
   */
  private applyNMS(
    candidates: {
      bbox: [number, number, number, number];
      confidence: number;
      className: string;
      radius: number;
      circularity: number;
      specularScore: number;
      hueValue: number;
    }[],
    iouThreshold: number
  ) {
    if (candidates.length <= 1) return candidates;

    // Sort descending by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    const keep: typeof candidates = [];
    const suppressed = new Set<number>();

    for (let i = 0; i < candidates.length; i++) {
      if (suppressed.has(i)) continue;

      const current = candidates[i];
      keep.push(current);

      for (let j = i + 1; j < candidates.length; j++) {
        if (suppressed.has(j)) continue;

        const iou = this.calculateIoU(current.bbox, candidates[j].bbox);
        if (iou >= iouThreshold) {
          suppressed.add(j);
        }
      }
    }

    return keep;
  }

  private calculateIoU(a: [number, number, number, number], b: [number, number, number, number]): number {
    const xA = Math.max(a[0], b[0]);
    const yA = Math.max(a[1], b[1]);
    const xB = Math.min(a[2], b[2]);
    const yB = Math.min(a[3], b[3]);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = (a[2] - a[0]) * (a[3] - a[1]);
    const boxBArea = (b[2] - b[0]) * (b[3] - b[1]);

    const unionArea = boxAArea + boxBArea - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
  }

  /**
   * Secondary Plausibility Filter
   */
  private checkPlausibility(
    candidate: {
      radius: number;
      circularity: number;
      specularScore: number;
    },
    config: PipelineConfig
  ): boolean {
    const { plausibility } = config;

    if (candidate.radius < plausibility.minRadiusPx || candidate.radius > plausibility.maxRadiusPx) {
      return false;
    }

    if (candidate.circularity < plausibility.minCircularityRatio) {
      return false;
    }

    if (plausibility.enableSpecularHighlightCheck) {
      if (candidate.specularScore < plausibility.minSpecularThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * Post-Detection Color Filter Validation
   */
  private checkColorFilter(
    candidate: {
      hueValue: number;
    },
    config: PipelineConfig
  ): boolean {
    const { colorFilter } = config;
    if (!colorFilter.enabled || colorFilter.preset === "all") {
      return true;
    }

    let targetHue = colorFilter.targetHue;
    let tol = colorFilter.hueTolerance;

    if (colorFilter.preset === "tennis_yellow") {
      targetHue = 55;
    } else if (colorFilter.preset === "basketball_orange") {
      targetHue = 22;
    } else if (colorFilter.preset === "cricket_red") {
      targetHue = 5;
    } else if (colorFilter.preset === "soccer_white") {
      return true;
    }

    let diff = Math.abs(candidate.hueValue - targetHue);
    if (diff > 180) diff = 360 - diff;

    return diff <= tol;
  }

  /**
   * Exponential Moving Average (EMA) Track Update & Smoothing
   */
  private updateTracks(
    candidates: {
      bbox: [number, number, number, number];
      confidence: number;
      className: string;
      radius: number;
      circularity: number;
      specularScore: number;
      hueValue: number;
    }[],
    config: PipelineConfig
  ): BallDetection[] {
    const alpha = config.f1Tuning.emaSmoothingAlpha;
    const maxDisappeared = config.f1Tuning.maxDisappearedFrames;

    const result: BallDetection[] = [];

    for (const cand of candidates) {
      const [rx1, ry1, rx2, ry2] = cand.bbox;
      const rcx = Math.round((rx1 + rx2) / 2);
      const rcy = Math.round((ry1 + ry2) / 2);

      let bestTrackId: number | null = null;
      let minDist = Infinity;

      for (const [id, track] of this.trackedBalls.entries()) {
        const [tcx, tcy] = track.center;
        const dist = Math.hypot(rcx - tcx, rcy - tcy);
        if (dist < 120 && dist < minDist) {
          minDist = dist;
          bestTrackId = id;
        }
      }

      if (bestTrackId !== null) {
        const track = this.trackedBalls.get(bestTrackId)!;
        const [px1, py1, px2, py2] = track.smoothBbox;

        // EMA smoothing formula: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
        const sx1 = Math.round(alpha * rx1 + (1 - alpha) * px1);
        const sy1 = Math.round(alpha * ry1 + (1 - alpha) * py1);
        const sx2 = Math.round(alpha * rx2 + (1 - alpha) * px2);
        const sy2 = Math.round(alpha * ry2 + (1 - alpha) * py2);

        const smoothBbox: [number, number, number, number] = [sx1, sy1, sx2, sy2];
        const scx = Math.round((sx1 + sx2) / 2);
        const scy = Math.round((sy1 + sy2) / 2);

        // Velocity calculation in px/s
        const vx = (scx - track.center[0]) * 30; // Assuming 30 FPS
        const vy = (scy - track.center[1]) * 30;
        const speed = Math.round(Math.hypot(vx, vy));

        track.smoothBbox = smoothBbox;
        track.bbox = cand.bbox;
        track.center = [scx, scy];
        track.history.push([scx, scy]);
        if (track.history.length > 20) track.history.shift();
        track.velocity = [Math.round(vx), Math.round(vy)];
        track.lastSeenFrame = this.currentFrame;
        track.confidence = cand.confidence;
        track.className = cand.className;

        result.push({
          id: bestTrackId,
          bbox: smoothBbox,
          confidence: cand.confidence,
          className: cand.className,
          center: [scx, scy],
          radius: cand.radius,
          circularity: cand.circularity,
          specularScore: cand.specularScore,
          hueValue: cand.hueValue,
          colorMatchScore: 94,
          velocity: [Math.round(vx), Math.round(vy)],
          speedPxPerSec: speed,
        });
      } else {
        const ballId = this.nextBallId++;
        const scx = rcx;
        const scy = rcy;

        this.trackedBalls.set(ballId, {
          id: ballId,
          bbox: cand.bbox,
          smoothBbox: cand.bbox,
          center: [scx, scy],
          history: [[scx, scy]],
          velocity: [0, 0],
          lastSeenFrame: this.currentFrame,
          className: cand.className,
          confidence: cand.confidence,
          radius: cand.radius,
          circularity: cand.circularity,
          specularScore: cand.specularScore,
          hueValue: cand.hueValue,
        });

        result.push({
          id: ballId,
          bbox: cand.bbox,
          confidence: cand.confidence,
          className: cand.className,
          center: [scx, scy],
          radius: cand.radius,
          circularity: cand.circularity,
          specularScore: cand.specularScore,
          hueValue: cand.hueValue,
          colorMatchScore: 92,
          velocity: [0, 0],
          speedPxPerSec: 0,
        });
      }
    }

    // Purge inactive tracks
    for (const [id, track] of this.trackedBalls.entries()) {
      if (this.currentFrame - track.lastSeenFrame > maxDisappeared) {
        this.trackedBalls.delete(id);
      }
    }

    return result;
  }

  /**
   * Draw High-Visibility Green Bounding Boxes and HUD Annotations
   */
  public drawAnnotations(
    ctx: CanvasRenderingContext2D,
    detections: BallDetection[],
    config: PipelineConfig
  ) {
    if (!config.showHUDOverlays) return;

    const GREEN = "#00FF66"; // High contrast neon green
    const CYAN = "#00FFFF";
    const DARK_BG = "#030712";

    if (detections.length === 0) {
      // Draw standard "No ball detected." notification badge
      ctx.save();
      const bannerText = "No ball detected.";
      ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
      const w = ctx.measureText(bannerText).width + 28;

      ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect((ctx.canvas.width - w) / 2, 16, w, 32, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#F87171";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bannerText, ctx.canvas.width / 2, 32);
      ctx.restore();
      return;
    }

    for (const det of detections) {
      const [x1, y1, x2, y2] = det.bbox;
      const [cx, cy] = det.center;
      const confPercent = (det.confidence * 100).toFixed(1);

      ctx.save();

      // 1. Draw Trajectory Motion Trail
      if (config.showTrajectoryTrails) {
        const track = this.trackedBalls.get(det.id);
        if (track && track.history.length > 1) {
          ctx.strokeStyle = GREEN;
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          for (let i = 0; i < track.history.length; i++) {
            const [hx, hy] = track.history[i];
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.stroke();
        }
      }

      // 2. Main Bounding Box (High Visibility Neon Green)
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.stroke();

      // 3. Corner Brackets (Tactical Computer Vision Style)
      const bLen = Math.min(18, Math.max(6, Math.round((x2 - x1) * 0.25)));
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 3.5;

      // Top Left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + bLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + bLen, y1);
      ctx.stroke();
      // Top Right
      ctx.beginPath();
      ctx.moveTo(x2 - bLen, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + bLen);
      ctx.stroke();
      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(x1, y2 - bLen); ctx.lineTo(x1, y2); ctx.lineTo(x1 + bLen, y2);
      ctx.stroke();
      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(x2 - bLen, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - bLen);
      ctx.stroke();

      // 4. Center Target Crosshair
      if (config.showCrosshairs) {
        ctx.fillStyle = CYAN;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(0, 255, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
        ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
        ctx.stroke();
      }

      // 5. High-Visibility Badge Header: "{ClassName} | {Conf}%"
      const labelText = `${det.className} | ${confPercent}%`;
      ctx.font = "bold 12px 'Plus Jakarta Sans', Arial, sans-serif";
      const metrics = ctx.measureText(labelText);
      const labelWidth = metrics.width + 16;
      const labelHeight = 22;
      const badgeY = Math.max(0, y1 - labelHeight - 2);

      ctx.fillStyle = GREEN;
      ctx.beginPath();
      ctx.roundRect(x1, badgeY, labelWidth, labelHeight, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = DARK_BG;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, x1 + 8, badgeY + labelHeight / 2 + 1);

      // Specular & Speed telemetry sub-badge
      if (det.speedPxPerSec && det.speedPxPerSec > 10) {
        const speedText = `${det.speedPxPerSec} px/s`;
        ctx.fillStyle = "rgba(3, 7, 18, 0.85)";
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x1, y2 + 4, 85, 18, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = GREEN;
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(speedText, x1 + 6, y2 + 13);
      }

      ctx.restore();
    }
  }

  private determineBallClass(h: number, s: number, l: number, radius: number): string {
    if (s < 0.2 && l > 0.65) return "Soccer Ball";
    if (h >= 12 && h <= 32) return "Basketball";
    if (h >= 40 && h <= 80) return "Tennis Ball";
    if (h <= 12 || h >= 340) return "Cricket Ball";
    if (radius < 12) return "Golf Ball";
    return "Sports Ball";
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return [h, s, l];
  }
}

export const ballDetectorPipeline = new BallDetectorPipeline();
