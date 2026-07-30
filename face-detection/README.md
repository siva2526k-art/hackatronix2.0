<div align="center">

  # 👤 Monocular Face Distance & Angle Estimation Subsystem

  **HackTronix 2.0 AI Qualifier — Real-Time Spatial Telemetry & Pinhole Camera Engine**

  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
  [![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## 📌 Subsystem Overview

The **Monocular Face Distance & Angle Estimation Subsystem** is a browser-based computer vision telemetry engine built for HackTronix 2.0. It utilizes MediaPipe Face Mesh landmarks and pinhole camera optics to compute real-time spatial depth ($Z_{\text{cm}}$) and horizontal angle ($\theta_{\text{degrees}}$) relative to the camera's optical center.

---

## ✨ Key Features

* 📏 **Pinhole Distance Estimation ($Z$)**: Computes monocular depth from facial zygomatic arch landmark width ($w_{px}$).
* 📐 **Horizontal Angle Calculation ($\theta$)**: Estimates horizontal deviation angle in degrees from the optical center ($c_x, c_y$).
* 🎯 **1-Point 50cm Calibration**: Allows per-camera focal length ($f$) calibration with automatic `LocalStorage` persistence.
* ⚡ **Distance-Adaptive EMA Smoothing**: Applies dynamic temporal smoothing to eliminate depth jitter at distances up to 150 cm.
* 🖥️ **Cybernetic HUD & Debug Overlay**: Interactive canvas annotations, real-time vector tracking lines, and persistent HUD overlay.
* 🐛 **5x Underestimation Bug Audit**: Built-in diagnostic report analyzing resolution scaling and coordinate mismatches.

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

## 🚀 Quick Start (Run Locally)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### 1. Install Dependencies
```bash
npm install
