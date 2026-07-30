import { CalibrationProfile } from '../types';
import { getDefaultFocalLength } from './cvMath';

/**
 * Key format: hacktronix_cv_calibration_v2_{deviceId}_{width}x{height}
 */
export function buildCalibrationKey(deviceId: string, width: number, height: number): string {
  const cleanDeviceId = deviceId ? deviceId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default_cam';
  return `hacktronix_cv_calibration_v2_${cleanDeviceId}_${width}x${height}`;
}

/**
 * Saves calibration profile to LocalStorage
 */
export function saveCalibrationProfile(profile: CalibrationProfile): string {
  const key = buildCalibrationKey(profile.deviceId, profile.resolutionWidth, profile.resolutionHeight);
  try {
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to save calibration profile to LocalStorage:', err);
  }
  return key;
}

/**
 * Loads calibration profile from LocalStorage for current device and resolution.
 * If exact resolution match isn't found, checks for saved profile on same device and scales linearly:
 * f_scaled = f_saved * (newWidth / oldWidth)
 */
export function loadCalibrationProfile(
  deviceId: string,
  currentWidth: number,
  currentHeight: number
): { profile: CalibrationProfile | null; isScaled: boolean } {
  const exactKey = buildCalibrationKey(deviceId, currentWidth, currentHeight);
  try {
    const raw = localStorage.getItem(exactKey);
    if (raw) {
      const profile = JSON.parse(raw) as CalibrationProfile;
      return { profile, isScaled: false };
    }

    // Search for any calibration for same device
    const prefix = `hacktronix_cv_calibration_v2_${deviceId ? deviceId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default_cam'}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const item = localStorage.getItem(k);
        if (item) {
          const oldProfile = JSON.parse(item) as CalibrationProfile;
          if (oldProfile.resolutionWidth > 0 && oldProfile.focalLengthPx > 0) {
            // Linear focal length scaling: f_scaled = f_saved * (newWidth / oldWidth)
            const scale = currentWidth / oldProfile.resolutionWidth;
            const scaledProfile: CalibrationProfile = {
              ...oldProfile,
              resolutionWidth: currentWidth,
              resolutionHeight: currentHeight,
              focalLengthPx: oldProfile.focalLengthPx * scale,
            };
            return { profile: scaledProfile, isScaled: true };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error loading calibration profile:', err);
  }

  return { profile: null, isScaled: false };
}

/**
 * Gets focal length either from saved profile or computes uncalibrated default:
 * f_default = round(width * 0.85)
 */
export function getActiveFocalLength(
  deviceId: string,
  width: number,
  height: number
): { focalLengthPx: number; isCalibrated: boolean; keyUsed?: string } {
  const { profile, isScaled } = loadCalibrationProfile(deviceId, width, height);
  if (profile && profile.focalLengthPx > 0) {
    return {
      focalLengthPx: profile.focalLengthPx,
      isCalibrated: true,
      keyUsed: buildCalibrationKey(deviceId, width, height) + (isScaled ? ' (scaled)' : ''),
    };
  }
  return {
    focalLengthPx: getDefaultFocalLength(width),
    isCalibrated: false,
  };
}
