import { GoogleGenAI } from "@google/genai";

export async function processGeminiTelemetryRequest(payload: {
  imageBase64?: string;
  telemetry?: any;
  prompt?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set on the server.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const parts: any[] = [];

  if (payload.imageBase64) {
    const cleanBase64 = payload.imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64,
      },
    });
  }

  const telemetryJson = payload.telemetry ? JSON.stringify(payload.telemetry, null, 2) : 'No telemetry data provided.';
  const userQuery = payload.prompt || "Analyze this multi-camera ball detection snapshot and kinematics telemetry data.";

  const promptText = `
You are BallVision AI Specialist — an elite computer vision & ball kinematics physics expert.
Analyze the provided camera frame snapshot and real-time telemetry metrics.

TELEMETRY DATA:
${telemetryJson}

USER PROMPT / TASK:
${userQuery}

Provide structured analysis containing:
1. Executive Summary & Ball Identification (Detect spatial position, lighting conditions, object circularity, glint rating).
2. Kinematics & Trajectory Physics (Estimated 3D velocity vector, spin/magnus effect tendencies, acceleration/deceleration curve).
3. Multi-Camera Triangulation Assessment (Camera elevation, parallax notes, occlusion risk, stereo alignment tips).
4. OpenCV Pipeline Optimization Recommendations (Specific adjustments for Hue range, NMS IoU threshold, Specular Glint score, and EMA smoothing factor).

Return your response formatted cleanly in rich Markdown. Keep recommendations technical, action-oriented, and precise.
`;

  parts.push({ text: promptText });

  const modelName = "gemini-2.5-flash";

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
    });

    return response.text || "No insights generated from model.";
  } catch (err: any) {
    // Fallback to gemini-3.6-flash if gemini-2.5-flash alias raises an endpoint error
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts },
      });
      return response.text || "No insights generated from model.";
    } catch (fallbackErr: any) {
      throw new Error(`Gemini AI Telemetry Error: ${err.message || fallbackErr.message || 'Unknown error'}`);
    }
  }
}

// Vercel Serverless Function Handler export
export default async function handler(req: any, res: any) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const resultText = await processGeminiTelemetryRequest(req.body);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ text: resultText, success: true });
  } catch (error: any) {
    console.error("Vercel Gemini Handler Error:", error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message || "Internal Server Error", success: false });
  }
}
