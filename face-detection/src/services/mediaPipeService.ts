import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarkerInstance: FaceLandmarker | null = null;
let isLoadingLandmarker = false;

/**
 * Initializes MediaPipe FaceLandmarker with GPU acceleration and CPU fallback
 */
export async function getFaceLandmarker(): Promise<FaceLandmarker | null> {
  if (landmarkerInstance) return landmarkerInstance;
  if (isLoadingLandmarker) {
    // Wait for ongoing load
    let attempts = 0;
    while (isLoadingLandmarker && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    return landmarkerInstance;
  }

  isLoadingLandmarker = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    const modelAssetPath =
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    try {
      // Try GPU WebGL Delegate first
      landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    } catch (gpuError) {
      console.warn('MediaPipe GPU Delegate initialization failed, falling back to CPU:', gpuError);
      landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'CPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    }
    return landmarkerInstance;
  } catch (error) {
    console.error('Failed to initialize MediaPipe FaceLandmarker:', error);
    return null;
  } finally {
    isLoadingLandmarker = false;
  }
}
