import React, { useRef, useState, useEffect } from 'react';

interface SteeringWheelProps {
  currentAngleDeg: number;
  onSteerChange: (normalized: number, angleDeg: number) => void;
  onSteerRelease: () => void;
  onHorn: () => void;
  scale?: number;
}

export const SteeringWheel: React.FC<SteeringWheelProps> = ({
  currentAngleDeg,
  onSteerChange,
  onSteerRelease,
  onHorn,
  scale = 1.0,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const startPointerAngleRef = useRef(0);
  const startWheelAngleRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!wheelRef.current) return;
    wheelRef.current.setPointerCapture(e.pointerId);

    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    dragCenterRef.current = { cx, cy };

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    startPointerAngleRef.current = Math.atan2(dy, dx);
    startWheelAngleRef.current = currentAngleDeg;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const { cx, cy } = dragCenterRef.current;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    const currentPointerAngle = Math.atan2(dy, dx);
    let deltaAngle = currentPointerAngle - startPointerAngleRef.current;

    // Normalize wrap around [-PI, PI]
    while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    const deltaDeg = (deltaAngle * 180) / Math.PI;
    let newAngle = startWheelAngleRef.current + deltaDeg;

    // Clamp between -180 and +180 degrees
    newAngle = Math.max(-180, Math.min(180, newAngle));
    const normalized = newAngle / 180;

    onSteerChange(normalized, newAngle);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging && wheelRef.current) {
      try {
        wheelRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setIsDragging(false);
      onSteerRelease();
    }
  };

  return (
    <div
      className="relative flex items-center justify-center select-none touch-none"
      style={{
        width: `${190 * scale}px`,
        height: `${190 * scale}px`,
      }}
    >
      <div
        ref={wheelRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-full relative cursor-grab active:cursor-grabbing rounded-full shadow-2xl transition-transform duration-75"
        style={{
          transform: `rotate(${currentAngleDeg}deg)`,
          touchAction: 'none',
        }}
      >
        {/* Outer Wheel Rim */}
        <div className="absolute inset-0 rounded-full border-12 border-slate-900 bg-gradient-to-b from-slate-800 to-slate-950 shadow-[inset_0_2px_8px_rgba(255,255,255,0.2),0_10px_25px_rgba(0,0,0,0.8)]">
          {/* Top 12 o'clock Racing Stripe */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-600 rounded-b-sm shadow-md" />

          {/* Left Thumb Rest */}
          <div className="absolute top-1/3 left-1 w-2.5 h-6 bg-slate-700 rounded-r-md opacity-80" />
          {/* Right Thumb Rest */}
          <div className="absolute top-1/3 right-1 w-2.5 h-6 bg-slate-700 rounded-l-md opacity-80" />
        </div>

        {/* 3 Metallic Spokes */}
        {/* Left Spoke */}
        <div className="absolute top-1/2 left-2.5 right-1/2 h-4 -translate-y-1/2 bg-gradient-to-b from-slate-600 via-slate-400 to-slate-700 shadow-md rounded-l" />
        {/* Right Spoke */}
        <div className="absolute top-1/2 left-1/2 right-2.5 h-4 -translate-y-1/2 bg-gradient-to-b from-slate-600 via-slate-400 to-slate-700 shadow-md rounded-r" />
        {/* Bottom Spoke */}
        <div className="absolute top-1/2 bottom-2.5 left-1/2 w-4 -translate-x-1/2 bg-gradient-to-r from-slate-600 via-slate-400 to-slate-700 shadow-md rounded-b" />

        {/* Center Hub & Horn Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHorn();
          }}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-black border-2 border-slate-700 flex flex-col items-center justify-center text-center shadow-lg active:scale-95 transition-transform"
          title="Press for Horn"
        >
          <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase">CAR SIM</span>
          <span className="text-[7px] text-slate-400 font-mono">HORN</span>
        </button>
      </div>
    </div>
  );
};
