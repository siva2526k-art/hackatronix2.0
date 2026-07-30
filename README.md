# ⚡ HackTronix 2.0 AI Qualifier — Computer Vision Subsystems Monorepo

This monorepo contains the computer vision subsystems for **HackTronix 2.0**:

## 📂 Subsystems

### 1. 🏀 [ball-detection](./ball-detection)
- **Task 1 Subsystem**: Real-time multi-target ball detection (tennis, basketball, ping pong, dodgeball, neon green).
- **Features**: Color segmentation, 8-radial direction boundary validation, temporal tracking, F1/FPS score calculation, and Vercel Serverless Gemini AI narration.

### 2. 👤 [face-detection](./face-detection)
- **Task 2 Subsystem**: Monocular face distance & horizontal angle estimation.
- **Features**: Pinhole camera depth calculation $Z = (f \cdot W) / w_{px}$, horizontal angle estimation $\theta = \arctan((x - c_x)/f)$, 1-point 50cm calibration, adaptive EMA smoothing, and persistent HUD debug overlay.

---

## 🚀 Quick Start

### Running Ball Detection
```bash
cd ball-detection
npm install
npm run dev
```

### Running Face Distance Estimation
```bash
cd face-detection
npm install
npm run dev
```
