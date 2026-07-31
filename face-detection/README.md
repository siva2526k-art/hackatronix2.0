<div align="center">

# 👤 Monocular Face Distance & Angle Estimation Subsystem

**HackTronix 2.0 AI Qualifier — Real-Time Spatial Telemetry & Pinhole Camera Engine**

[![Live Deployment](https://img.shields.io/badge/Live%20Demo-https%3A%2F%2Fhackatronix2--0--nl62.vercel.app%2F-06B6D4?style=for-the-badge&logo=vercel&logoColor=white)](https://hackatronix2-0-nl62.vercel.app/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Gemini%202.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

</div>

---

## 🌐 Live Production Deployment

👉 **[https://hackatronix2-0-nl62.vercel.app/](https://hackatronix2-0-nl62.vercel.app/)**

---

## 📌 Subsystem Overview

The **Monocular Face Distance & Angle Estimation Subsystem** is a browser-based computer vision telemetry engine built for HackTronix 2.0. It utilizes MediaPipe 68-point Face Mesh landmarks and pinhole camera optics to compute real-time spatial depth ($Z_{\text{cm}}$) and horizontal angle ($\theta_{\text{degrees}}$) relative to the camera's optical center.

---

## ✨ Key Features

- 📏 **Pinhole Distance Estimation ($Z$)**: Computes monocular depth from facial zygomatic arch landmark width ($w_{px}$) via $Z = \frac{f \cdot W}{w_{px}}$.
- 📐 **Horizontal Angle Calculation ($\theta$)**: Estimates horizontal deviation angle in degrees from optical center ($c_x, c_y$).
- 🎯 **1-Point 50cm Calibration**: Allows per-camera focal length ($f$) calibration with automatic `LocalStorage` persistence.
- ⚡ **Distance-Adaptive EMA Smoothing**: Applies dynamic temporal smoothing to eliminate depth jitter at distances up to 150 cm.
- 🖥️ **Cybernetic HUD & Debug Overlay**: Interactive canvas annotations, real-time vector tracking lines, and persistent HUD overlay.
- 🤖 **Gemini AI Biomechanics Specialist**: AI landmark telemetry analysis.

---

## 📐 Mathematical Formulation

| Parameter | Formula / Definition | Unit |
| :--- | :--- | :--- |
| **Optical Center ($c_x, c_y$)** | $c_x = \frac{\text{width}}{2}, \quad c_y = \frac{\text{height}}{2}$ | pixels |
| **Monocular Depth ($Z$)** | $Z = \frac{f \cdot W}{w_{px}}$ | meters / cm |
| **Horizontal Angle ($\theta$)** | $\theta = \arctan\left(\frac{x - c_x}{f}\right) \times \frac{180}{\pi}$ | degrees |
| **Focal Length Calibration ($f$)** | $f = \frac{w_{px} \cdot 0.5}{W}$ | pixels |
| **Quantization Noise ($\Delta Z$)** | $\Delta Z = \left(\frac{Z}{w_{px}}\right) \cdot 1.0\text{px}$ | cm |

---

## 💻 Local Setup & Execution Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**

### 1. Install Dependencies
```bash
cd face-detection
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🚀 Vercel Deployment Instructions
1. Set Vercel project **Root Directory** to `face-detection`.
2. Configure `GEMINI_API_KEY` under Environment Variables.
3. Deploy! Vercel will build the Vite client.
