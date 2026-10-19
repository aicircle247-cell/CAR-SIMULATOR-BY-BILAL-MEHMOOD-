import React from 'react';
import { GameSettings } from '../types';
import { soundEngine } from '../audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base">⚙️</span>
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider">
              Simulator Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-mono text-sm"
          >
            ✕
          </button>
        </div>

        {/* Options Form */}
        <div className="space-y-4 text-xs">
          {/* Unit System */}
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Speedometer Units</span>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onUpdateSettings({ units: 'kmh' })}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  settings.units === 'kmh' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                KM/H
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ units: 'mph' })}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  settings.units === 'mph' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                MPH
              </button>
            </div>
          </div>

          {/* Transmission */}
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Transmission Mode</span>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => onUpdateSettings({ transmission: 'automatic' })}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  settings.transmission === 'automatic' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                AUTOMATIC
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ transmission: 'manual' })}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-colors ${
                  settings.transmission === 'manual' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                MANUAL
              </button>
            </div>
          </div>

          {/* Time of Day */}
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium">Environment Lighting</span>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['day', 'sunset', 'night'] as const).map((tod) => (
                <button
                  key={tod}
                  type="button"
                  onClick={() => onUpdateSettings({ timeOfDay: tod })}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase transition-colors ${
                    settings.timeOfDay === tod ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tod}
                </button>
              ))}
            </div>
          </div>

          {/* Steering Sensitivity Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Steering Sensitivity</span>
              <span className="font-mono text-cyan-400">{settings.steeringSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.steeringSensitivity}
              onChange={(e) => onUpdateSettings({ steeringSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Steering Return Strength Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Steering Wheel Centering Spring</span>
              <span className="font-mono text-cyan-400">{settings.steeringReturnStrength.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.steeringReturnStrength}
              onChange={(e) => onUpdateSettings({ steeringReturnStrength: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Sound Volume Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300">
              <span>Sound Volume</span>
              <span className="font-mono text-cyan-400">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                onUpdateSettings({ soundVolume: vol });
                soundEngine.setVolume(vol);
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Driving Assistance Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-slate-300 font-medium">Driving Assist (ABS + ESP)</div>
              <div className="text-[10px] text-slate-400">Prevents severe wheel lock and vehicle spinning</div>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ drivingAssistance: !settings.drivingAssistance })}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                settings.drivingAssistance ? 'bg-cyan-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.drivingAssistance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-colors mt-2"
        >
          SAVE & CLOSE
        </button>
      </div>
    </div>
  );
};
