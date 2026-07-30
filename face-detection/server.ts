import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper to initialize Gemini SDK safely
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Gemini AI Telemetry Diagnosis Endpoint
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const ai = getAiClient();
      const telemetry = req.body.telemetry || {};

      if (!ai) {
        return res.status(200).json({
          fallback: true,
          summary: "Local Computer Vision Telemetry Analysis (Gemini Key Pending)",
          opticalDiagnosis: `Live stream running at ${telemetry.width || 1280}x${telemetry.height || 720}. Measured face width ${telemetry.wPx ? telemetry.wPx.toFixed(1) : 0}px yields ${telemetry.zSmoothedCm ? telemetry.zSmoothedCm.toFixed(1) : 0}cm distance.`,
          ergonomicScore: telemetry.zSmoothedCm && (telemetry.zSmoothedCm < 40 || telemetry.zSmoothedCm > 85) ? 65 : 92,
          status: telemetry.zSmoothedCm < 40 ? "TOO_CLOSE" : telemetry.zSmoothedCm > 85 ? "TOO_FAR" : "OPTIMAL",
          recommendations: [
            "Maintain distance between 50cm and 75cm for screen ergonomics.",
            "Calibrate camera using 50cm reference distance button for sub-cm accuracy.",
            "Keep face centered to minimize lens edge distortion."
          ],
          focalLengthRecommendation: `Current focal length is ${telemetry.focalLengthPx ? Math.round(telemetry.focalLengthPx) : 0}px. Perform 50cm calibration if using an external webcam.`
        });
      }

      const prompt = `You are an expert Computer Vision and Human Biomechanics Engineer.
Analyze this live monocular face distance telemetry feed from a browser camera stream:
- Distance Z (smoothed): ${telemetry.zSmoothedCm ? telemetry.zSmoothedCm.toFixed(1) : 'N/A'} cm
- Distance Z (raw): ${telemetry.zRawCm ? telemetry.zRawCm.toFixed(1) : 'N/A'} cm
- Measured Face Width w_px: ${telemetry.wPx ? telemetry.wPx.toFixed(1) : 'N/A'} px (zygomatic landmarks #234-#454)
- Horizontal Angle Theta: ${telemetry.angleDeg ? telemetry.angleDeg.toFixed(1) : 'N/A'} deg
- Camera Focal Length f: ${telemetry.focalLengthPx ? telemetry.focalLengthPx.toFixed(0) : 'N/A'} px
- Stream Resolution: ${telemetry.width || 1280}x${telemetry.height || 720}
- Calibration State: ${telemetry.isCalibrated ? 'CALIBRATED_50CM_REFERENCE' : 'UNCALIBRATED_DEFAULT_FOV'}
- Real Zygomatic Width W: ${(telemetry.realFaceWidthM || 0.14) * 100} cm
- Depth Noise Propagation Delta Z: +/- ${telemetry.deltaZCm ? telemetry.deltaZCm.toFixed(2) : 'N/A'} cm
- Skin Centroid Fallback Active: ${telemetry.isSkinFallbackActive ? 'YES' : 'NO'}

Provide an concise diagnostic report in JSON format with these exact keys:
- summary: string (Short executive summary)
- opticalDiagnosis: string (Analysis of camera optics, focal length accuracy, quantization noise)
- ergonomicScore: number (0 to 100 based on screen distance and head angle)
- status: string ("OPTIMAL", "TOO_CLOSE", "TOO_FAR", "HIGH_ANGLE", "UNCALIBRATED")
- recommendations: array of strings (3 actionable advice points for calibration or posture)
- focalLengthRecommendation: string (Guidance on focal length adjustment or camera placement)
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      let parsed = {};
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = {
          summary: responseText,
          opticalDiagnosis: "Optical tracking operational.",
          ergonomicScore: 85,
          status: "OPTIMAL",
          recommendations: ["Maintain 50-70cm distance."]
        };
      }

      return res.json(parsed);
    } catch (error: any) {
      console.error("Gemini route error:", error);
      return res.status(200).json({
        fallback: true,
        summary: "Fallback telemetry check complete.",
        opticalDiagnosis: "System running pinhole camera geometric telemetry.",
        ergonomicScore: 80,
        status: "RUNNING_LOCAL",
        recommendations: [
          "Maintain ergonomic distance of 50cm-75cm.",
          "Use 50cm calibration to eliminate lens focal variance."
        ]
      });
    }
  });

  // Serve static files or Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
