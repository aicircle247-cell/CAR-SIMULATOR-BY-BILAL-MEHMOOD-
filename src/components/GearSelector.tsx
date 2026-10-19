import React from 'react';
import { AutomaticGear, TransmissionMode } from '../types';

interface GearSelectorProps {
  transmission: TransmissionMode;
  autoGear: AutomaticGear;
  manualGear: number;
  currentSpeedKmh: number;
  onSelectAutoGear: (gear: AutomaticGear) => void;
  onShiftUp: () => void;
  onShiftDown: () => void;
  onToggleTransmission: () => void;
}

export const GearSelector: React.FC<GearSelectorProps> = ({
  transmission,
  autoGear,
  manualGear,
  currentSpeedKmh,
  onSelectAutoGear,
  onShiftUp,
  onShiftDown,
  onToggleTransmission,
}) => {
  const isMoving = currentSpeedKmh > 5;

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 shadow-2xl backdrop-blur-none flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between px-1">
        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">GEAR</span>
        <button
          type="button"
          onClick={onToggleTransmission}
          className="text-[9px] text-cyan-400 hover:text-cyan-300 font-mono tracking-wider bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700"
          title="Switch Automatic / Manual"
        >
          {transmission === 'automatic' ? 'AUTO' : 'MANUAL'}
        </button>
      </div>

      {transmission === 'automatic' ? (
        <div className="flex flex-col gap-1.5">
          {(['P', 'R', 'N', 'D'] as AutomaticGear[]).map((gear) => {
            const isSelected = autoGear === gear;
            const isLocked = isMoving && (gear === 'P' || gear === 'R');

            let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
            if (isSelected) {
              if (gear === 'P') colorClasses = 'bg-red-700 text-white border-red-500 shadow-md shadow-red-900/40';
              else if (gear === 'R') colorClasses = 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/40';
              else if (gear === 'N') colorClasses = 'bg-slate-600 text-white border-slate-400';
              else colorClasses = 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40';
            }

            return (
              <button
                key={gear}
                type="button"
                disabled={isLocked}
                onClick={() => onSelectAutoGear(gear)}
                className={`w-9 h-8 rounded-lg border font-mono font-bold text-sm flex items-center justify-center transition-all ${colorClasses} ${
                  isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95'
                }`}
                title={
                  gear === 'P'
                    ? 'Park'
                    : gear === 'R'
                    ? 'Reverse'
                    : gear === 'N'
                    ? 'Neutral'
                    : 'Drive'
                }
              >
                {gear}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {/* Current Manual Gear Display */}
          <div className="w-9 h-9 rounded-lg bg-emerald-600/90 border border-emerald-400 text-white font-mono font-bold text-lg flex items-center justify-center shadow-lg">
            {manualGear === -1 ? 'R' : manualGear === 0 ? 'N' : manualGear}
          </div>

          {/* Sequential Shift Paddles */}
          <div className="flex gap-1 w-full">
            <button
              type="button"
              onClick={onShiftDown}
              className="flex-1 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold font-mono text-slate-300 active:scale-95 flex items-center justify-center"
              title="Shift Down (Ctrl)"
            >
              -
            </button>
            <button
              type="button"
              onClick={onShiftUp}
              className="flex-1 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold font-mono text-slate-300 active:scale-95 flex items-center justify-center"
              title="Shift Up (Shift)"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
