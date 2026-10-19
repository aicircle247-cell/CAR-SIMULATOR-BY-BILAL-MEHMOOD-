import React, { useState } from 'react';
import { GameMode } from '../types';

interface TitleScreenProps {
  onStartGame: (mode: GameMode) => void;
  onOpenSettings: () => void;
  is3DReady: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenSettings,
  is3DReady,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('free_drive');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const modes: Array<{
    id: GameMode;
    title: string;
    badge: string;
    desc: string;
  }> = [
    {
      id: 'free_drive',
      title: 'Free Drive',
      badge: 'OPEN WORLD',
      desc: 'Drive freely across city boulevards and highway loops with complete freedom.',
    },
    {
      id: 'driving_school',
      title: 'Driving School',
      badge: 'TRAINING',
      desc: 'Step-by-step driving lessons: ignition, acceleration, emergency stop, and slalom.',
    },
    {
      id: 'parking_challenge',
      title: 'Parking Challenge',
      badge: 'PRECISION',
      desc: 'Maneuver into marked 90-degree and parallel parking bays with accuracy grading.',
    },
    {
      id: 'time_trial',
      title: 'Time Trial',
      badge: 'CIRCUIT',
      desc: 'Race through 11 city checkpoints and set the fastest circuit lap time.',
    },
    {
      id: 'traffic_practice',
      title: 'Traffic Practice',
      badge: 'CITY DRIVING',
      desc: 'Navigate active urban traffic and avoid collisions during busy rush hour.',
    },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-6 md:p-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-auto">
      {/* Top Header & Branding Lockup */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold tracking-widest uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Designed & Developed with Google AI Studio
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase drop-shadow-lg">
            CAR SIMULATOR
          </h1>
          <p className="text-cyan-400 font-mono font-semibold text-sm md:text-base mt-1">
            By Engr. Bilal Mehmood
          </p>
          <p className="text-slate-300 text-xs md:text-sm max-w-md mt-1">
            Learn to Drive. Experience the Road. Realistic physics, dynamic steering, pedals, and full transmission control.
          </p>
        </div>

        {/* Quick Nav / Help / Settings */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHowToPlay(true)}
            className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold tracking-wider transition-colors shadow-lg"
          >
            📖 HOW TO PLAY
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold tracking-wider transition-colors shadow-lg"
          >
            ⚙️ SETTINGS
          </button>
        </div>
      </div>

      {/* Mode Selection Cards */}
      <div className="my-auto py-6 max-w-5xl">
        <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">
          Select Driving Mode
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {modes.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-900/95 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/50">
                    {m.badge}
                  </span>
                  {isSelected && <span className="text-xs text-cyan-400 font-bold">✓</span>}
                </div>
                <h3 className="text-sm font-bold text-white">{m.title}</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Start Action & Controls Summary */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <span className="text-slate-300 font-bold">CONTROLS:</span>
          <span>W/S or Pedals: Gas/Brake</span>
          <span>A/D or Wheel: Steer</span>
          <span>E: Engine</span>
          <span>C: Camera</span>
          <span>R: Reset</span>
        </div>

        <button
          type="button"
          disabled={!is3DReady}
          onClick={() => onStartGame(selectedMode)}
          className={`px-8 py-3.5 rounded-xl font-bold font-mono tracking-wider text-sm transition-all shadow-xl flex items-center gap-3 ${
            is3DReady
              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25 active:scale-95 cursor-pointer ring-2 ring-cyan-400/50'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {is3DReady ? (
            <>
              <span>START ENGINE & DRIVE</span>
              <span className="text-base">➔</span>
            </>
          ) : (
            <span>INITIALIZING 3D VEHICLE...</span>
          )}
        </button>
      </div>

      {/* How to Play Modal Overlay */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">How To Play & Vehicle Guide</h3>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs text-slate-300">
              <div>
                <h4 className="font-bold text-cyan-400 font-mono uppercase mb-1">1. Starting & Driving</h4>
                <p>Press the <strong>Start Engine (E)</strong> button. Ensure transmission is in <strong>Drive (D)</strong> or <strong>Reverse (R)</strong>. The car will not move in Park (P) or Neutral (N).</p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400 font-mono uppercase mb-1">2. Pedals & Acceleration</h4>
                <p>Press and hold the <strong>Accelerator (Gas / W)</strong> pedal to accelerate. Release to coast. Press the <strong>Brake (S / Space)</strong> pedal to decelerate.</p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400 font-mono uppercase mb-1">3. Steering Wheel</h4>
                <p>On mobile/touch, drag the <strong>Steering Wheel</strong> left or right. It automatically returns toward center when released. On desktop, use <strong>A / D</strong> or Arrow keys.</p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400 font-mono uppercase mb-1">4. Camera Views</h4>
                <p>Press <strong>C</strong> or the Camera button to toggle between <strong>Cockpit View</strong> (interior driver seat), <strong>Third-Person Chase</strong>, and <strong>Overhead</strong> view.</p>
              </div>

              <div>
                <h4 className="font-bold text-cyan-400 font-mono uppercase mb-1">5. Transmission</h4>
                <p>Toggle between Automatic (PRND) and Manual (1 to 5, R) in the gear panel or settings.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition-colors"
            >
              GOT IT, LET'S DRIVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
