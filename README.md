<div align="center">

# ⚡ Hackatronix 2.0 AI Computer Vision Monorepo
### Real-Time Monocular Ball Detection & Face Distance Estimation Subsystems

[![BallVision AI Live](https://img.shields.io/badge/Task%201-BallVision%20AI%20Live%20Demo-10B981?style=for-the-badge&logo=vercel&logoColor=white)](https://hackatronix2-0.vercel.app/)
[![Face AI Live](https://img.shields.io/badge/Task%202-Face%20AI%20Live%20Demo-06B6D4?style=for-the-badge&logo=vercel&logoColor=white)](https://hackatronix2-0-nl62.vercel.app/)

[![GitHub Repo](https://img.shields.io/badge/GitHub-hackatronix2.0-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/siva2526k-art/hackatronix2.0.git)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Gemini%202.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

</div>

---

## 🌐 Live Production Deployments

| Task Subsystem | Application Name | Live Deployment URL | Primary Tech Stack |
| :--- | :--- | :--- | :--- |
| **Task 1** | ⚽ **BallVision AI** — Multi-Camera Real-Time Ball Detection | 🔗 **[https://hackatronix2-0.vercel.app/](https://hackatronix2-0.vercel.app/)** | OpenCV Canvas, Multi-Camera Grid, Gemini 2.5 Flash |
| **Task 2** | 👤 **Hackatronix Face AI** — Face Distance & Biomechanics | 🔗 **[https://hackatronix2-0-nl62.vercel.app/](https://hackatronix2-0-nl62.vercel.app/)** | MediaPipe Face Mesh, Pinhole Optics, Gemini 2.5 Flash |

---

## 📂 Monorepo Architecture & Directory Layout

```text
hackatronix-monorepo/
├── ball-detection/             # Task 1: BallVision AI Subsystem (Multi-Camera Stream Grid)
│   ├── api/                    # Vercel Serverless Function Proxy (/api/gemini.ts)
│   ├── src/                    # React 19, OpenCV Canvas Engine, Candidate Extraction & NMS
│   ├── vercel.json             # Vercel Vite routing configuration
│   └── package.json
│
├── face-detection/             # Task 2: Standalone Face Distance & Biomechanics Subsystem
│   ├── src/                    # MediaPipe 68-Point Mesh, Pinhole Camera Optics Engine
│   ├── vercel.json             # Vercel Vite routing configuration
│   └── package.json
│
└── README.md                   # Monorepo Master Documentation
```

---

## ⚽ Task 1 Subsystem: BallVision AI (`/ball-detection`)
**Live App URL**: 🔗 **[https://hackatronix2-0.vercel.app/](https://hackatronix2-0.vercel.app/)**

A monocular 2D real-time ball detection & kinematics telemetry platform built with OpenCV canvas processing, non-maximum suppression (NMS) IoU candidate filtering, and specular highlight checks. Features multi-camera grid streaming with isolated computer vision pipeline instances per camera tile to prevent target ID leakage across camera feeds.

### Key Capabilities:
- 📹 **Multi-Camera Live Viewfinder**: Enumerate connected video inputs (`navigator.mediaDevices.enumerateDevices()`) and run isolated `BallDetectorPipeline` instances per camera tile.
- 🎯 **Candidate Generation & NMS**: Grid-sampling color blob extraction combined with Non-Maximum Suppression (NMS) IoU bounding box pruning.
- 💡 **Specular Highlight Glint Filter**: 3D spherical light reflection verification in top-center quadrant.
- 🎨 **HSV Color Target Selector**: HSL/HSV color bounds targeting Tennis Lime, Basketball Orange, Cricket Red, Soccer White, or Custom Hue angles.
- 📈 **Performance & F1 Benchmark Dashboard**: Fine-tune precision vs recall harmonic mean weights and export raw JSON reports.
- 🤖 **Gemini 2.5 Flash AI Telemetry Specialist**: Serverless AI Vision proxy for sports kinematics, velocity vector estimation, and trajectory curves.

---

## 👤 Task 2 Subsystem: Hackatronix Face AI (`/face-detection`)
**Live App URL**: 🔗 **[https://hackatronix2-0-nl62.vercel.app/](https://hackatronix2-0-nl62.vercel.app/)**

A high-precision real-time monocular depth ($Z_{\text{cm}}$) and horizontal angle ($\theta_{\text{deg}}$) estimation engine utilizing MediaPipe 68-point facial landmark meshes and pinhole camera optics formulas.

### Key Capabilities:
- 📏 **Pinhole Depth Estimation ($Z$)**: Calculates monocular depth using facial zygomatic arch landmark width ($w_{px}$) via $Z = \frac{f \cdot W}{w_{px}}$.
- 📐 **Horizontal Angle Calculation ($\theta$)**: Computes angular deviation from camera optical center via $\theta = \arctan\left(\frac{x - c_x}{f}\right) \times \frac{180}{\pi}$.
- 🎯 **1-Point 50cm Calibration**: Per-camera focal length calibration with automatic `LocalStorage` persistence.
- ⚡ **Distance-Adaptive EMA Smoothing**: Dynamic temporal filtering eliminating depth jitter up to 150 cm.
- 🤖 **Gemini AI Biomechanics Specialist**: AI landmark telemetry analysis.

---

## 💻 Local Setup & Execution Guide

### Task 1: Ball Detection Subsystem
```powershell
# Navigate to ball-detection folder
cd ball-detection

# Install Node.js dependencies
npm install

# Run local development server
npm run dev
# Open http://localhost:3000 in your browser
```

### Task 2: Face Detection Subsystem
```powershell
# Navigate to face-detection folder
cd face-detection

# Install Node.js dependencies
npm install

# Run local development server
npm run dev
# Open http://localhost:5173 in your browser
```

---

## 🚀 Vercel Deployment Instructions

1. Push your repository to GitHub (`https://github.com/siva2526k-art/hackatronix2.0.git`).
2. In Vercel Project Settings:
   - For **Task 1 (BallVision AI)**: Set **Root Directory** to `ball-detection`.
   - For **Task 2 (Face AI)**: Set **Root Directory** to `face-detection`.
3. Add `GEMINI_API_KEY` under Environment Variables.
4. Deploy! Vercel will automatically build the Vite client and serverless API endpoints.
