import React, { useState } from 'react';

interface PedalsProps {
  onGasChange: (isPressed: boolean) => void;
  onBrakeChange: (isPressed: boolean) => void;
  onHandbrakeToggle: () => void;
  isHandbrakeEngaged: boolean;
}

export const Pedals: React.FC<PedalsProps> = ({
  onGasChange,
  onBrakeChange,
  onHandbrakeToggle,
  isHandbrakeEngaged,
}) => {
  const [gasPressed, setGasPressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);

  const handleGasDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setGasPressed(true);
    onGasChange(true);
  };

  const handleGasUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setGasPressed(false);
    onGasChange(false);
  };

  const handleBrakeDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setBrakePressed(true);
    onBrakeChange(true);
  };

  const handleBrakeUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setBrakePressed(false);
    onBrakeChange(false);
  };

  return (
    <div className="flex items-end gap-3 select-none touch-none">
      {/* Handbrake Button */}
      <button
        type="button"
        onClick={onHandbrakeToggle}
        className={`px-2.5 py-3 rounded-lg border text-xs font-bold tracking-wider transition-all shadow-lg flex flex-col items-center justify-center ${
          isHandbrakeEngaged
            ? 'bg-amber-600/90 border-amber-400 text-white shadow-amber-500/20'
            : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
        }`}
        title="Parking Brake (Space)"
      >
        <span className="text-[10px]">P-BRAKE</span>
        <span className="text-[8px] opacity-75">{isHandbrakeEngaged ? 'ENGAGED' : 'OFF'}</span>
      </button>

      {/* Brake Pedal (Wide Aluminum Plate) */}
      <div
        onPointerDown={handleBrakeDown}
        onPointerUp={handleBrakeUp}
        onPointerCancel={handleBrakeUp}
        className={`w-20 h-28 rounded-xl border-2 flex flex-col items-center justify-between p-2.5 cursor-pointer transition-all duration-75 shadow-xl select-none ${
          brakePressed
            ? 'bg-gradient-to-b from-rose-950 to-red-900 border-red-500 scale-95 shadow-red-900/50 translate-y-1'
            : 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-600 hover:border-slate-500'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Rubber Ribs */}
        <div className="w-full space-y-1.5 pt-1">
          <div className="h-1.5 w-full bg-slate-900/90 rounded-sm" />
          <div className="h-1.5 w-full bg-slate-900/90 rounded-sm" />
          <div className="h-1.5 w-full bg-slate-900/90 rounded-sm" />
          <div className="h-1.5 w-full bg-slate-900/90 rounded-sm" />
        </div>

        <div className="text-center">
          <div className="text-xs font-black tracking-widest text-red-400 uppercase">BRAKE</div>
          <div className="text-[8px] text-slate-400 font-mono">S / Space</div>
        </div>
      </div>

      {/* Accelerator / Gas Pedal (Tall Sport Aluminum Plate) */}
      <div
        onPointerDown={handleGasDown}
        onPointerUp={handleGasUp}
        onPointerCancel={handleGasUp}
        className={`w-16 h-36 rounded-xl border-2 flex flex-col items-center justify-between p-2.5 cursor-pointer transition-all duration-75 shadow-xl select-none ${
          gasPressed
            ? 'bg-gradient-to-b from-emerald-950 to-emerald-900 border-emerald-500 scale-95 shadow-emerald-900/50 translate-y-1.5'
            : 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-600 hover:border-slate-500'
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* Vertical Rubber Grip Strips */}
        <div className="flex gap-1.5 h-14 pt-1">
          <div className="w-1.5 h-full bg-slate-900/90 rounded-sm" />
          <div className="w-1.5 h-full bg-slate-900/90 rounded-sm" />
          <div className="w-1.5 h-full bg-slate-900/90 rounded-sm" />
        </div>

        <div className="text-center pb-1">
          <div className="text-xs font-black tracking-widest text-emerald-400 uppercase">GAS</div>
          <div className="text-[8px] text-slate-400 font-mono">W / Up</div>
        </div>
      </div>
    </div>
  );
};
