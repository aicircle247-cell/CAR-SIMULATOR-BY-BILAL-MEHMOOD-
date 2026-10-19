import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl text-cyan-400">
          ⏸
        </div>

        <div>
          <h2 className="text-xl font-black text-white font-mono uppercase tracking-wider">
            SIMULATION PAUSED
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Engine idling. Take a breath and resume whenever you're ready.
          </p>
        </div>

        <div className="w-full space-y-2 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs tracking-wider transition-all shadow-lg active:scale-95"
          >
            RESUME DRIVING
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold font-mono text-xs tracking-wider transition-all"
          >
            RESET VEHICLE TO START
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold font-mono text-xs tracking-wider transition-all"
          >
            SETTINGS
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-bold font-mono text-xs tracking-wider transition-all"
          >
            EXIT TO TITLE SCREEN
          </button>
        </div>
      </div>
    </div>
  );
};
