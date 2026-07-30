import React from 'react';
import { Camera, FlipHorizontal, Sliders, Info } from 'lucide-react';
import { CameraDeviceInfo } from '../types';

interface SubHeaderProps {
  devices: CameraDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  isMirrored: boolean;
  onToggleMirror: () => void;
  resolutionWidth: number;
  resolutionHeight: number;
  realFaceWidthM: number;
  onChangeRealFaceWidth: (val: number) => void;
  isDebugOverlayOpen: boolean;
  onToggleDebugOverlay: () => void;
}

export const SubHeader: React.FC<SubHeaderProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  isMirrored,
  onToggleMirror,
  resolutionWidth,
  resolutionHeight,
  realFaceWidthM,
  onChangeRealFaceWidth,
  isDebugOverlayOpen,
  onToggleDebugOverlay,
}) => {
  return (
    <div className="bg-[#141414] border-b border-[#333] px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono select-none">
      {/* Left: Subsystem & Camera Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-gray-400 font-mono">
          SUBSYSTEM: <span className="text-white font-bold">Monocular Face Distance Z &amp; Angle θ</span>
        </span>

        {/* Camera Device Selector */}
        <div className="flex items-center gap-1.5">
          <label className="text-gray-500">DEVICE:</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="bg-black border border-[#333] px-2 py-0.5 outline-none text-[#38bdf8] text-[11px] font-mono cursor-pointer max-w-[220px] sm:max-w-[280px] truncate"
          >
            {devices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId} className="bg-black text-[#38bdf8]">
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Mirror Checkbox / Toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
          <input
            type="checkbox"
            checked={isMirrored}
            onChange={onToggleMirror}
            className="accent-[#38bdf8] cursor-pointer"
          />
          <span>MIRROR_FEED</span>
        </label>

        {/* Debug HUD Toggle Button */}
        <button
          onClick={onToggleDebugOverlay}
          className={`px-2 py-0.5 border text-[10px] font-mono cursor-pointer transition-colors ${
            isDebugOverlayOpen
              ? 'bg-[#1e1e1e] border-[#38bdf8] text-[#38bdf8]'
              : 'bg-black border-[#333] text-gray-400 hover:text-white'
          }`}
        >
          HUD_DEBUG
        </button>
      </div>

      {/* Right: Resolution & Real Face Width Slider */}
      <div className="flex flex-wrap items-center gap-4 text-gray-400">
        <div>
          TRACK_RES: <span className="text-[#38bdf8] font-bold">{resolutionWidth}x{resolutionHeight}</span>
        </div>

        <div className="flex items-center gap-2 bg-black border border-[#333] px-2 py-0.5">
          <span className="text-gray-500">W_REF:</span>
          <span className="text-white font-bold w-11">{(realFaceWidthM * 100).toFixed(1)}cm</span>
          <input
            type="range"
            min="0.12"
            max="0.17"
            step="0.005"
            value={realFaceWidthM}
            onChange={(e) => onChangeRealFaceWidth(parseFloat(e.target.value))}
            className="w-16 accent-[#38bdf8] cursor-pointer"
            title="Standard adult zygomatic bone distance is 14cm (0.14m)"
          />
        </div>
      </div>
    </div>
  );
};

