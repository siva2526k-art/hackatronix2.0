# ⚽ BallVision & Face AI: Monocular 2D Ball & Face Telemetry Tracking System

[![Vite](https://img.shields.io/badge/Vite-6.2.3-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_3.6_Flash-AI_Vision-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

> **Live Demo**: [https://ballvision-telemetry-ai.vercel.app](https://ballvision-telemetry-ai.vercel.app) *(Replace with your deployed Vercel URL)*

---

## 🌟 System Overview

**BallVision & Face AI** is a unified, high-performance monocular 2D computer vision and real-time telemetry tracking application. Built with **React 19, TypeScript, Vite, Tailwind CSS**, and powered by **OpenCV canvas pipeline algorithms** and **Gemini 3.6 Flash AI**, the platform offers low-latency, high-precision detection and spatial analytics across live webcams, images, and high-speed sports videos.

---

## 🎯 Primary Feature Focus: Real-Time Ball Detection Pipeline

Ball Detection is the central feature track, engineered for zero-jitter, high-velocity sports ball tracking (Soccer, Basketball, Tennis, Cricket, Volleyball, Golf, and Football) under challenging ambient lighting conditions.

```
                  ┌────────────────────────────────────────┐
                  │          Input Video / Frame           │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    1. Primary YOLOv8 / Contour Blob    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │      2. NMS (IoU) Suppression          │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │  3. Secondary Plausibility Filter      │
                  │  - Circularity Ratio (4πA / P²)        │
                  │  - Specular Highlight Spot Check       │
                  │  - Radius Pixel Constraints            │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │  4. Post-Detection Color Filter (HSV)  │
                  │  - Preset Target Hues (Tennis, Orange) │
                  │  - Hue Tolerance Window (±Δ)           │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │  5. EMA Temporal Box Smoothing         │
                  │  - S_t = α · Y_t + (1 - α) · S_{t-1}   │
                  │  - Velocity Vector & Motion Trail      │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    High-Visibility Green HUD Overlay   │
                  └────────────────────────────────────────┘
```

### Key Ball Detection Pipeline Capabilities:
1. **Confidence & NMS IoU Thresholding**: Interactive real-time sliders to eliminate duplicate detections.
2. **Secondary Plausibility Filter**:
   - **Circularity Ratio**: Filters candidates based on mathematical roundness ($4\pi A / P^2 \ge \text{minCircularity}$).
   - **3D Specular Highlight Verification**: Spherical balls reflect point light sources creating bright specular reflections near the top-center quadrant. The pipeline verifies contrast gradients to confirm 3D spherical targets.
   - **Min / Max Radius Bounds**: Filters out noise and massive background objects.
3. **Post-Detection Color Filtering**:
   - HSV/HSL Color Targeting with presets: Tennis Yellow/Lime, Basketball Orange, Soccer White, Cricket Red, and Custom Hue picker ($0^\circ - 360^\circ$) with adjustable tolerance ($\pm \Delta$).
4. **Exponential Moving Average (EMA) Smoothing**:
   - $S_t = \alpha Y_t + (1 - \alpha) S_{t-1}$
   - Eliminates bounding box jitter and calculates instantaneous velocity vectors in $px/s$.
5. **F1 / FPS Tuning Engine**:
   - Interactive formula tuning: $\text{F1} = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$ with precision and recall multiplier weights.

---

## 👤 Face Detection & Spatial Telemetry Pipeline

The integrated Face Detection track provides:
- **Facial Bounding Boxes & 68-Point Mesh Landmarks**: Eyes, nose bridge, mouth, and jawline contour.
- **Head Pose & Eye Gaze Vector Estimation**: Pitch, Yaw, and Roll telemetry in degrees.
- **Combined Dual Telemetry**: Calculates real-time **Player-to-Ball Distance vectors**, spatial alignment ratings, and gaze attention angles.

---

## 🚀 Serverless Architecture & Vercel Deployment

Gemini AI Vision calls are proxied through a Vercel Serverless Function inside `/api/gemini.ts` to ensure that `GEMINI_API_KEY` is **never exposed on the client side**.

### Vercel Function Endpoint (`/api/gemini.ts`)
- Accepts frame base64 + bounding box telemetry.
- Calls `@google/genai` model `gemini-3.6-flash`.
- Returns structured tactical, biomechanical, and environment optimization advice.
- **Graceful Fallback**: Client-side canvas tracking operates 100% offline seamlessly even if network API calls fail.

---

## 📂 Architecture & Folder Structure

```
├── /api
│   └── gemini.ts                     # Vercel Serverless Function Gemini Proxy
├── /src
│   ├── /components
│   │   ├── AboutArchitecture.tsx     # Pipeline physics documentation
│   │   ├── AiAnalysisModal.tsx       # Gemini AI Vision Assistant modal
│   │   ├── LiveCameraStudio.tsx      # Real-time webcam viewfinder & overlay
│   │   ├── MediaUploadStudio.tsx     # Image/Video upload & frame inspection
│   │   ├── Navbar.tsx                # Navigation header & mode switcher
│   │   ├── PerformanceDashboard.tsx  # F1 score tuner & metric charts
│   │   └── PipelineControlsDrawer.tsx# Filter sliders & threshold controls
│   ├── /engine
│   │   ├── ballDetectorPipeline.ts   # Client-side Ball Detection Engine
│   │   ├── combinedTelemetryEngine.ts# Unified orchestrator & spatial correlation
│   │   └── faceDetectorPipeline.ts   # Client-side Face Detection & Mesh Engine
│   ├── App.tsx                       # Primary React application container
│   ├── main.tsx                      # Entry point
│   ├── types.ts                      # Global TypeScript interface definitions
│   └── index.css                     # Tailwind CSS styling
├── server.ts                         # Express Server for local dev & node production
├── vercel.json                       # Vercel deployment & rewrite configuration
├── package.json                      # Dependencies & build scripts
├── vite.config.ts                    # Vite build configuration
└── metadata.json                     # Application capabilities metadata
```

---

## 🛠️ Local Development & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ballvision-telemetry-ai.git
   cd ballvision-telemetry-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` or `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production / Vercel**:
   ```bash
   npm run build
   ```

---

## 📜 License

Distributed under the Apache-2.0 License. See `LICENSE` for more information.
