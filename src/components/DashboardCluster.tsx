import React from 'react';
import { CameraMode, TransmissionMode, UnitSystem, VehicleState } from '../types';

interface DashboardClusterProps {
  vehicleState: VehicleState;
  units: UnitSystem;
  transmission: TransmissionMode;
  cameraMode: CameraMode;
  onCameraCycle: () => void;
  onEngineToggle: () => void;
  onHeadlightsToggle: () => void;
  onResetVehicle: () => void;
  onPauseToggle: () => void;
  onOpenSettings: () => void;
}

export const DashboardCluster: React.FC<DashboardClusterProps> = ({
  vehicleState,
  units,
  transmission,
  cameraMode,
  onCameraCycle,
  onEngineToggle,
  onHeadlightsToggle,
  onResetVehicle,
  onPauseToggle,
  onOpenSettings,
}) => {
  const displaySpeed = Math.round(units === 'kmh' ? vehicleState.speedKmh : vehicleState.speedMph);
  const speedUnitLabel = units === 'kmh' ? 'KM/H' : 'MPH';

  // RPM Calculations: 0 to 8000
  const normalizedRpm = Math.min(1, Math.max(0, vehicleState.rpm / 7500));
  const isRedline = vehicleState.rpm > 6400;

  return (
    <div className="w-full flex flex-col items-center pointer-events-none select-none">
      {/* Top Status & Quick Action Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between px-4 py-2 pointer-events-auto">
        {/* Creator Brand Badge */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-wider text-white uppercase">CAR SIMULATOR</span>
            <span className="text-[8px] text-slate-400 font-medium">By Engr. Bilal Mehmood</span>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1 shadow-md">
          {/* Engine indicator */}
          <button
            type="button"
            onClick={onEngineToggle}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-wider transition-colors ${
              vehicleState.isEngineOn
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/40'
                : 'bg-red-950/80 text-red-400 border border-red-600/40'
            }`}
            title="Toggle Engine (E)"
          >
            <span className="text-[11px]">⚡</span>
            <span>{vehicleState.isEngineOn ? 'ENGINE ON' : 'START (E)'}</span>
          </button>

          {/* Headlights button */}
          <button
            type="button"
            onClick={onHeadlightsToggle}
            className={`p-1.5 rounded text-[11px] border transition-colors ${
              vehicleState.headlightsOn
                ? 'bg-blue-900/80 text-blue-300 border-blue-500'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Headlights (L)"
          >
            💡
          </button>

          {/* Camera View button */}
          <button
            type="button"
            onClick={onCameraCycle}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:text-white text-[10px] font-bold tracking-wider"
            title="Change Camera View (C)"
          >
            <span>📷</span>
            <span className="uppercase">{cameraMode}</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={onResetVehicle}
            className="px-2 py-1 rounded bg-slate-900 text-amber-400 border border-slate-700 hover:text-amber-300 text-[10px] font-bold tracking-wider"
            title="Reset Vehicle to start (R)"
          >
            RESET (R)
          </button>

          {/* Pause / Settings */}
          <button
            type="button"
            onClick={onPauseToggle}
            className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:text-white text-[10px] font-bold"
            title="Pause Simulation (P/Esc)"
          >
            ⏸
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700 hover:text-white text-[10px] font-bold"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Main Digital Instrument Cluster (Top Center HUD) */}
      <div className="bg-slate-950/85 border border-slate-800/90 rounded-2xl p-3 shadow-2xl backdrop-blur-none flex items-center gap-6 mt-1 pointer-events-auto">
        {/* Tachometer / RPM Dial */}
        <div className="flex flex-col items-center w-28">
          <div className="flex items-baseline justify-between w-full px-1">
            <span className="text-[9px] uppercase font-mono text-slate-400">RPM x1000</span>
            <span className={`text-[11px] font-mono font-bold ${isRedline ? 'text-red-500' : 'text-cyan-400'}`}>
              {(vehicleState.rpm / 1000).toFixed(1)}
            </span>
          </div>

          {/* RPM Arc Bar */}
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 p-0.5 mt-1">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isRedline
                  ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
              }`}
              style={{ width: `${normalizedRpm * 100}%` }}
            />
          </div>

          <div className="flex justify-between w-full text-[8px] font-mono text-slate-400 mt-0.5 px-0.5">
            <span>0</span>
            <span>2</span>
            <span>4</span>
            <span>6</span>
            <span className="text-red-400 font-bold">8</span>
          </div>
        </div>

        {/* Center Digital Speedometer & Gear */}
        <div className="flex flex-col items-center px-4 border-x border-slate-800">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl md:text-5xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow">
              {displaySpeed}
            </span>
            <span className="text-[10px] font-bold font-mono tracking-wider text-cyan-400">
              {speedUnitLabel}
            </span>
          </div>

          {/* Current Gear Badge */}
          <div className="flex items-center gap-2 mt-0.5">
            <div className="px-2.5 py-0.5 rounded bg-blue-950 border border-blue-600/50 text-blue-300 font-mono font-black text-xs">
              GEAR {vehicleState.gear}
            </div>
            {vehicleState.isBraking && (
              <span className="text-[9px] font-black text-red-500 tracking-wider">BRAKING</span>
            )}
            {vehicleState.isReversing && (
              <span className="text-[9px] font-black text-amber-500 tracking-wider">REVERSE</span>
            )}
          </div>
        </div>

        {/* Telemetry: Fuel, Distance & Input Meters */}
        <div className="flex flex-col gap-1.5 w-32">
          {/* Fuel Level */}
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-slate-400">FUEL</span>
            <span className={`font-bold ${vehicleState.fuelPercent < 20 ? 'text-red-400' : 'text-slate-200'}`}>
              {Math.round(vehicleState.fuelPercent)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full rounded-full transition-all ${
                vehicleState.fuelPercent < 20 ? 'bg-red-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${vehicleState.fuelPercent}%` }}
            />
          </div>

          {/* Live Throttle / Brake Bars */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[8px] font-mono">
            <div>
              <span className="text-emerald-400">GAS {Math.round(vehicleState.throttlePercent)}%</span>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${vehicleState.throttlePercent}%` }}
                />
              </div>
            </div>
            <div>
              <span className="text-red-400">BRK {Math.round(vehicleState.brakePercent)}%</span>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-red-400 transition-all"
                  style={{ width: `${vehicleState.brakePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Odometer */}
          <div className="flex justify-between text-[8px] font-mono text-slate-400 pt-0.5">
            <span>ODO:</span>
            <span>{vehicleState.distanceTraveledKm.toFixed(2)} km</span>
          </div>
        </div>
      </div>
    </div>
  );
};
