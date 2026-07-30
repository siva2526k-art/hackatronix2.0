import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { image, detections, faceDetections, mode, promptCustom } = body;

    const ballInfo = detections && detections.length > 0
      ? detections.map((d: any) => `${d.class_name || 'Ball'} (${(d.confidence * 100).toFixed(1)}% conf at [${d.bbox.join(', ')}])`).join("; ")
      : "No balls detected";

    const faceInfo = faceDetections && faceDetections.length > 0
      ? faceDetections.map((f: any) => `Face (${(f.confidence * 100).toFixed(1)}% conf, Pitch: ${f.pose?.pitch || 0}°, Emotion: ${f.emotion || 'Neutral'})`).join("; ")
      : "No faces detected";

    const systemPrompt = `You are a Principal Computer Vision, Biomechanics, and Sports Analytics Specialist.
Analyze the provided telemetry frame data for Ball & Face Tracking.

Context Data:
- Operating Mode: ${mode || "Combined Telemetry"}
- Ball Detection Telemetry: ${ballInfo}
- Face & Pose Telemetry: ${faceInfo}
${promptCustom ? `- User Specific Question: ${promptCustom}` : ""}

Provide a concise, high-value technical & tactical breakdown formatted in clean markdown:
1. **Object Classification & Visual Geometry**: Identify specific ball/face dynamics, specular highlight patterns, and spatial alignments.
2. **Kinematics & Spatial Telemetry**: Estimate trajectory, velocity vectors, head-pose alignment, or eye-gaze targeting relative to the ball.
3. **Pipeline Optimization & Environment Tuning**: Recommendations for camera frame rate, lighting conditions, specular thresholding, or color filter tuning for maximum F1 accuracy.`;

    const contentsParts: any[] = [{ text: systemPrompt }];

    if (image && typeof image === "string" && image.includes("data:image")) {
      const base64Data = image.split(",")[1];
      const mimeType = image.split(";")[0].split(":")[1] || "image/jpeg";
      contentsParts.unshift({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts: contentsParts },
    });

    return res.status(200).json({
      success: true,
      analysis: response.text || "Telemetry analysis completed successfully.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Vercel Gemini Function Error:", err);
    return res.status(500).json({
      error: err.message || "Internal server error executing Gemini Vision analysis.",
    });
  }
}
