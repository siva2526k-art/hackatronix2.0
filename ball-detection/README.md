<div align="center">

# ⚽ BallVision AI — Real-Time Multi-Camera Ball Detection & Telemetry System

**HackTronix 2.0 AI Qualifier — Computer Vision & Ball Kinematics Subsystem**

[![Live Deployment](https://img.shields.io/badge/Live%20Demo-https%3A%2F%2Fhackatronix2--0.vercel.app%2F-10B981?style=for-the-badge&logo=vercel&logoColor=white)](https://hackatronix2-0.vercel.app/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Gemini%202.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

</div>

---

## 🌐 Live Production Deployment

👉 **[https://hackatronix2-0.vercel.app/](https://hackatronix2-0.vercel.app/)**

---

## 📌 Subsystem Overview

**BallVision AI** is a monocular 2D computer vision platform built for high-FPS, high-F1 ball detection and trajectory telemetry. It features multi-camera grid streaming with isolated computer vision pipeline instances (`BallDetectorPipeline`) for each active camera feed to prevent target ID and motion tracking leakage across streams.

---

## ✨ Key Features

- 📹 **Multi-Camera Grid Studio**: Enumerate connected video input devices (`navigator.mediaDevices.enumerateDevices()`) and run independent detection loops concurrently.
- 🔒 **Per-Tile Pipeline Isolation**: Each camera tile instantiates its own `BallDetectorPipeline` instance so bounding boxes, candidate histories, and EMA temporal smoothing vectors remain strictly isolated per feed.
- 🎯 **Candidate Blob Extraction & NMS**: Regional color blob grid-sampling combined with Non-Maximum Suppression (NMS) IoU candidate filtering.
- 💡 **Specular Highlight Glint Check**: Verifies 3D spherical light reflection glints in top-center quadrant of candidate balls to suppress false positives.
- 🎨 **HSV Color Target Selector**: HSL/HSV color bounds targeting Tennis Lime, Basketball Orange, Cricket Red, Soccer White, or Custom Hue angles with configurable tolerance ($\pm\Delta$).
- 📈 **Performance & F1 Score Dashboard**: Fine-tune precision/recall weights using harmonic mean formulas and export raw telemetry JSON reports.
- 🤖 **Gemini 2.5 Flash AI Telemetry Specialist**: Serverless function proxy (`/api/gemini.ts`) for sports kinematics, velocity vector estimation, and trajectory curves.

---

## 📐 Mathematical Formulation

| Metric / Parameter | Formula / Definition | Purpose |
| :--- | :--- | :--- |
| **Circularity Ratio ($C$)** | $C = \frac{4\pi \cdot \text{Area}}{\text{Perimeter}^2}$ | Verified circular target shape ($0.60 \le C \le 1.0$) |
| **Harmonic F1 Score** | $F1 = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$ | Precision/Recall optimization benchmark |
| **EMA Box Smooth ($\alpha$)** | $B_t = \alpha \cdot \text{Bbox}_t + (1 - \alpha) \cdot B_{t-1}$ | Suppresses bounding box jitter across frames |
| **Velocity Vector ($v$)** | $v = \sqrt{v_x^2 + v_y^2}$ | Speed calculation in $px/s$ |

---

## 💻 Local Setup & Execution Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**

### 1. Install Dependencies
```powershell
cd ball-detection
npm install
```

### 2. Configure Environment Variables
Create `.env.local` inside `ball-detection/`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```powershell
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🚀 Vercel Deployment Instructions

1. Set Vercel project **Root Directory** to `ball-detection`.
2. Configure `GEMINI_API_KEY` under **Environment Variables**.
3. Deploy! Vercel will build the Vite client and deploy the `/api/gemini.ts` serverless proxy.
