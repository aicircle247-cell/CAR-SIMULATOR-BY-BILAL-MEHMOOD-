import React from 'react';
import { GameModeState } from '../gameModes';
import { GameMode } from '../types';

interface ChallengeHUDProps {
  modeState: GameModeState;
  onNextLesson?: () => void;
  onRestartMode?: () => void;
  onSwitchMode?: (mode: GameMode) => void;
  lastCollisionTime: number;
}

export const ChallengeHUD: React.FC<ChallengeHUDProps> = ({
  modeState,
  onNextLesson,
  onRestartMode,
  onSwitchMode,
  lastCollisionTime,
}) => {
  const isRecentCollision = performance.now() - lastCollisionTime < 600;

  return (
    <>
      {/* Collision Red Flash Overlay */}
      {isRecentCollision && (
        <div className="fixed inset-0 pointer-events-none z-30 border-4 border-red-500/80 bg-red-950/20 transition-opacity duration-300 animate-pulse" />
      )}

      {/* Mode Objective Banner (Top of Screen below Dashboard) */}
      <div className="w-full flex justify-center pointer-events-none select-none mt-2 px-4">
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2 shadow-xl flex flex-col items-center max-w-lg text-center pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
              {modeState.objectiveText}
            </span>
            {modeState.mode === 'time_trial' && (
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-xs font-bold tabular-nums">
                ⏱ {modeState.timeElapsed.toFixed(1)}s
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 font-medium mt-0.5">{modeState.hintText}</p>
        </div>
      </div>

      {/* Completion Modal when Mission is finished */}
      {modeState.isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
          <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-2xl text-emerald-400">
              🏆
            </div>

            <h3 className="text-xl font-black text-white font-mono uppercase tracking-wider">
              {modeState.mode === 'driving_school'
                ? `Lesson ${modeState.drivingSchoolLesson} Complete!`
                : modeState.mode === 'parking_challenge'
                ? `Parking Challenge Completed!`
                : modeState.mode === 'time_trial'
                ? `Time Trial Lap Finished!`
                : `Challenge Passed!`}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {modeState.hintText}
            </p>

            {modeState.score !== undefined && (
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Precision Score: </span>
                <span className="text-xl font-bold font-mono text-emerald-400">{modeState.score}%</span>
              </div>
            )}

            {modeState.bestLapTime !== undefined && modeState.mode === 'time_trial' && (
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Best Record: </span>
                <span className="text-base font-bold font-mono text-cyan-400">
                  {modeState.bestLapTime.toFixed(2)}s
                </span>
              </div>
            )}

            <div className="w-full space-y-2 pt-2">
              {modeState.mode === 'driving_school' && modeState.drivingSchoolLesson < 4 && (
                <button
                  type="button"
                  onClick={onNextLesson}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs tracking-wider transition-all shadow-lg cursor-pointer"
                >
                  NEXT LESSON ({modeState.drivingSchoolLesson + 1}) ➔
                </button>
              )}

              <button
                type="button"
                onClick={onRestartMode}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold font-mono text-xs tracking-wider transition-all cursor-pointer"
              >
                REPLAY THIS MODE
              </button>

              <button
                type="button"
                onClick={() => onSwitchMode?.('free_drive')}
                className="w-full py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 font-bold font-mono text-xs tracking-wider transition-all cursor-pointer"
              >
                SWITCH TO FREE DRIVE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
