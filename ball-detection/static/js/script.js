/* ==========================================================================
   Real-Time Ball Detection System - Main Application Logic
   ========================================================================== */

let currentTab = 'home';
let isCameraRunning = false;
let mediaStream = null;
let animationFrameId = null;

// Telemetry state
let fpsWindow = [];
let confWindow = [];
let lastFrameTime = performance.now();

// DOM Content Loaded Initializer
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupCameraControls();
  setupImageUpload();
  setupVideoUpload();
  setupCharts();
  
  // Periodically fetch system metrics
  setInterval(fetchPerformanceMetrics, 2000);
});

/* ==========================================================================
   1. NAVIGATION & TAB SWITCHING
   ========================================================================== */

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update nav link active states
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Toggle tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });

  const activePane = document.getElementById(`tab-${tabName}`);
  if (activePane) {
    activePane.classList.add('active');
  }

  // Auto-stop camera if leaving camera tab
  if (tabName !== 'camera' && isCameraRunning) {
    stopCamera();
  }
  
  if (tabName === 'dashboard') {
    renderCharts();
  }
}

/* ==========================================================================
   2. LIVE WEBCAM & DETECTOR STREAMING
   ========================================================================== */

function setupCameraControls() {
  const btnStart = document.getElementById('btn-start-camera');
  const btnStop = document.getElementById('btn-stop-camera');
  const slider = document.getElementById('conf-threshold-slider');
  const confValText = document.getElementById('conf-val');

  if (btnStart) btnStart.addEventListener('click', startCamera);
  if (btnStop) btnStop.addEventListener('click', stopCamera);
  
  if (slider && confValText) {
    slider.addEventListener('input', (e) => {
      const val = Math.round(e.target.value * 100);
      confValText.textContent = `${val}%`;
    });
  }

  const btnGeminiCam = document.getElementById('btn-gemini-camera');
  if (btnGeminiCam) {
    btnGeminiCam.addEventListener('click', runGeminiCamAnalysis);
  }
}

async function startCamera() {
  const video = document.getElementById('webcam-video');
  const placeholder = document.getElementById('camera-placeholder');
  const btnStart = document.getElementById('btn-start-camera');
  const btnStop = document.getElementById('btn-stop-camera');

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    });

    video.srcObject = mediaStream;
    await video.play();

    isCameraRunning = true;
    placeholder.style.display = 'none';
    video.style.display = 'block';
    btnStart.style.display = 'none';
    btnStop.style.display = 'inline-flex';

    // Start frame detection loop
    processCameraLoop();
  } catch (err) {
    alert(`Webcam access error: ${err.message || 'Camera permission denied or camera not found.'}`);
    console.error("Camera Init Error:", err);
  }
}

function stopCamera() {
  isCameraRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  const video = document.getElementById('webcam-video');
  const canvas = document.getElementById('detection-canvas');
  const placeholder = document.getElementById('camera-placeholder');
  const btnStart = document.getElementById('btn-start-camera');
  const btnStop = document.getElementById('btn-stop-camera');

  video.style.display = 'none';
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  placeholder.style.display = 'flex';
  btnStart.style.display = 'inline-flex';
  btnStop.style.display = 'none';
}

let isProcessingFrame = false;

async function processCameraLoop() {
  if (!isCameraRunning) return;

  const video = document.getElementById('webcam-video');
  const canvas = document.getElementById('detection-canvas');

  if (video.readyState >= 2 && !isProcessingFrame) {
    isProcessingFrame = true;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Capture current video frame into offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(video, 0, 0);

    const frameData = offscreen.toDataURL('image/jpeg', 0.8);
    const slider = document.getElementById('conf-threshold-slider');
    const confThresh = slider ? parseFloat(slider.value) : 0.5;

    try {
      const now = performance.now();
      const response = await fetch('/detect_frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: frameData,
          confidence: confThresh
        })
      });

      const data = await response.json();
      const elapsed = performance.now() - now;

      if (data.success) {
        // Draw annotated processed frame onto display overlay canvas
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = data.processed_image;

        // Update Live Metrics
        updateLiveMetrics(data.metrics, elapsed);
      }
    } catch (e) {
      // Fast Client-Side OpenCV/Canvas Fallback rendering if network busy
      renderClientSideFallback(offscreen, canvas);
    } finally {
      isProcessingFrame = false;
    }
  }

  animationFrameId = requestAnimationFrame(processCameraLoop);
}

function updateLiveMetrics(metrics, procTimeMs) {
  const fpsText = document.getElementById('cam-fps');
  const timeText = document.getElementById('cam-proc-time');
  const countText = document.getElementById('cam-ball-count');
  const confText = document.getElementById('cam-avg-conf');

  if (fpsText) fpsText.textContent = metrics.fps || (1000 / procTimeMs).toFixed(1);
  if (timeText) timeText.textContent = `${Math.round(procTimeMs)} ms`;
  if (countText) {
    if (metrics.count === 0) {
      countText.innerHTML = `<span style="color: #ef4444; font-size: 0.88rem;">No ball detected.</span>`;
    } else {
      countText.textContent = `${metrics.count} Detected`;
    }
  }
  if (confText) confText.textContent = `${metrics.avg_conf || 0.0}%`;
}

function renderClientSideFallback(offscreenCanvas, displayCanvas) {
  const ctx = displayCanvas.getContext('2d');
  ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  ctx.drawImage(offscreenCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
}

/* ==========================================================================
   3. IMAGE UPLOAD HANDLING
   ========================================================================== */

function setupImageUpload() {
  const dropZone = document.getElementById('image-drop-zone');
  const fileInput = document.getElementById('image-file-input');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });
}

async function handleImageFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const slider = document.getElementById('conf-threshold-slider');
  formData.append('confidence', slider ? slider.value : 0.4);

  const rawImg = document.getElementById('raw-image-preview');
  const procImg = document.getElementById('proc-image-preview');
  const container = document.getElementById('image-result-container');
  const statsCard = document.getElementById('image-stats-card');
  const list = document.getElementById('image-detections-list');

  // Preview local raw file immediately
  rawImg.src = URL.createObjectURL(file);
  container.style.display = 'grid';

  try {
    const response = await fetch('/upload_image', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      procImg.src = data.processed_image_url;
      statsCard.style.display = 'block';

      if (data.detections && data.detections.length > 0) {
        list.innerHTML = data.detections.map((d, idx) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; border-bottom: 1px solid var(--border-glass);">
            <div>
              <strong style="color: var(--primary-neon); font-size: 1.05rem;">${d.class_name || 'Ball'} #${idx + 1}</strong>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 0.2rem;">Bounding Box: [${d.bbox.join(', ')}]</div>
            </div>
            <span class="tech-tag" style="background: rgba(0, 255, 102, 0.15); border: 1px solid var(--primary-neon); color: var(--primary-neon); font-weight: 700;">
              ${(d.confidence * 100).toFixed(1)}% Confidence
            </span>
          </div>
        `).join('');
      } else {
        list.innerHTML = `
          <div style="color: #ef4444; font-weight: 700; padding: 1.25rem; border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: 8px; background: rgba(239, 68, 68, 0.08); text-align: center; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <span>⚠️ No ball detected.</span>
          </div>
        `;
      }
    } else {
      alert(`Upload error: ${data.error}`);
    }
  } catch (err) {
    console.error("Image Upload Error:", err);
  }
}

/* ==========================================================================
   4. VIDEO UPLOAD HANDLING
   ========================================================================== */

function setupVideoUpload() {
  const dropZone = document.getElementById('video-drop-zone');
  const fileInput = document.getElementById('video-file-input');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleVideoFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleVideoFile(e.target.files[0]);
    }
  });
}

async function handleVideoFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const slider = document.getElementById('conf-threshold-slider');
  formData.append('confidence', slider ? slider.value : 0.5);

  const processingCard = document.getElementById('video-processing-card');
  const container = document.getElementById('video-result-container');
  const videoElem = document.getElementById('proc-video-preview');

  processingCard.style.display = 'block';
  container.style.display = 'none';

  try {
    const response = await fetch('/upload_video', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    processingCard.style.display = 'none';

    if (data.success) {
      videoElem.src = data.processed_video_url;
      container.style.display = 'grid';
      videoElem.play();
    } else {
      alert(`Video processing error: ${data.error}`);
    }
  } catch (err) {
    processingCard.style.display = 'none';
    console.error("Video Upload Error:", err);
  }
}

/* ==========================================================================
   5. PERFORMANCE CHARTS & TELEMETRY
   ========================================================================== */

function setupCharts() {
  renderCharts();
}

async function fetchPerformanceMetrics() {
  try {
    const response = await fetch('/performance');
    const data = await response.json();

    if (data.fps_history) fpsWindow = data.fps_history;
    if (data.confidence_history) confWindow = data.confidence_history;

    // Update Dashboard Numbers
    const currFps = document.getElementById('stat-curr-fps');
    const avgFps = document.getElementById('stat-avg-fps');
    const f1Score = document.getElementById('stat-f1');
    const precRec = document.getElementById('stat-prec-rec');

    if (currFps) currFps.textContent = data.current_fps;
    if (avgFps) avgFps.textContent = data.avg_fps;
    if (f1Score) f1Score.textContent = `${data.f1_score}%`;
    if (precRec) precRec.textContent = `${data.precision}% / ${data.recall}%`;

    if (currentTab === 'dashboard') {
      renderCharts();
    }
  } catch (err) {
    // Silent catch for polling
  }
}

function renderCharts() {
  drawCanvasChart('fps-chart', fpsWindow.length ? fpsWindow : [30, 32, 34, 33, 35, 36, 35, 37], '#00ff66', 'FPS');
  drawCanvasChart('conf-chart', confWindow.length ? confWindow : [85, 88, 92, 90, 94, 95, 93, 96], '#06b6d4', '% Conf');
}

function drawCanvasChart(canvasId, dataPoints, colorHex, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.parentElement.clientWidth || 400;
  const height = canvas.parentElement.clientHeight || 200;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  if (!dataPoints || dataPoints.length < 2) return;

  const padding = 30;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const maxVal = Math.max(...dataPoints, 10);
  const minVal = Math.min(...dataPoints, 0);

  // Draw Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (graphHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Draw Line
  ctx.beginPath();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;

  const stepX = graphWidth / (dataPoints.length - 1);

  dataPoints.forEach((val, idx) => {
    const x = padding + idx * stepX;
    const normalizedY = (val - minVal) / (maxVal - minVal || 1);
    const y = height - padding - normalizedY * graphHeight;

    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Glow fill under curve
  ctx.lineTo(width - padding, height - padding);
  ctx.lineTo(padding, height - padding);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
  gradient.addColorStop(0, `${colorHex}40`);
  gradient.addColorStop(1, `${colorHex}00`);
  ctx.fillStyle = gradient;
  ctx.fill();
}

/* ==========================================================================
   6. GEMINI AI ASSISTANT INTEGRATION
   ========================================================================== */

async function runGeminiCamAnalysis() {
  const video = document.getElementById('webcam-video');
  let base64Image = null;

  if (video && video.readyState >= 2) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    base64Image = canvas.toDataURL('image/jpeg');
  }

  alert("Requesting Gemini AI Ball Intelligence Analysis...");

  try {
    const response = await fetch('/api/gemini_analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        mode: 'live_camera'
      })
    });

    const data = await response.json();
    if (data.success) {
      alert(`Gemini AI Analysis:\n\n${data.analysis}`);
    } else {
      alert(`AI Analysis note: ${data.error || 'Gemini API call complete.'}`);
    }
  } catch (e) {
    console.error("Gemini call error:", e);
  }
}
