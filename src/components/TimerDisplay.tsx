import React from 'react';
import { Timer, Zap, CheckCircle2, Coffee, Sparkles, Pause, Play } from 'lucide-react';
import { formatMs, formatSecondsShort } from '../utils/formatters';

interface TimerDisplayProps {
  elapsedMs: number;
  isRunning: boolean;
  totalWords: number;
  foundWordsCount: number;
  lastBurstSpeedMs: number | null;
  bestTimeMs?: number | null;
  isUntimed?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  elapsedMs,
  isRunning,
  totalWords,
  foundWordsCount,
  lastBurstSpeedMs,
  bestTimeMs,
  isUntimed = false,
  isPaused = false,
  onTogglePause
}) => {
  const percentDone = totalWords > 0 ? Math.round((foundWordsCount / totalWords) * 100) : 0;
  const isComplete = foundWordsCount >= totalWords && totalWords > 0;

  return (
    <div className="w-full max-w-4xl mx-auto mb-1.5 sm:mb-3">
      <div className={`glass-panel rounded-2xl p-2 sm:p-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-3 transition-all ${
        isUntimed
          ? 'border-teal-500/30 bg-gradient-to-r from-dark-900 via-teal-950/20 to-dark-900 shadow-lg shadow-teal-500/5'
          : isRunning
          ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'border-slate-800'
      }`}>
        {/* Left Side: Zen Status or Stopwatch HUD */}
        {isUntimed ? (
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isComplete
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-teal-500/20 text-teal-400 border-teal-500/40'
            }`}>
              {isComplete ? <Sparkles className="w-5 h-5 text-emerald-400" /> : <Coffee className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-teal-400 font-semibold flex items-center gap-1">
                <span>Zen Mode &bull; Untimed</span>
              </div>
              <div className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <span>{isComplete ? 'Puzzle Cleared! 🌸' : 'Relax & Enjoy'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isComplete
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : isRunning
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 animate-pulse'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}>
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                {isComplete ? 'Final Time' : isRunning ? 'Elapsed Time' : 'Time'}
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 flex items-baseline gap-1.5">
                <span>{formatMs(elapsedMs)}</span>
                {bestTimeMs && elapsedMs < bestTimeMs && isComplete && (
                  <span className="text-[11px] font-sans font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    NEW PB!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Burst Speed Combo Alert (only in timed mode) */}
        {!isUntimed && lastBurstSpeedMs !== null && lastBurstSpeedMs < 4000 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 animate-bounce-subtle">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <div className="text-xs">
              <span className="font-bold">FAST COMBO:</span>{' '}
              <span className="font-mono font-extrabold">{formatSecondsShort(lastBurstSpeedMs)}</span>
            </div>
          </div>
        )}

        {/* Right Controls: Pause Button & Word Progress Tracker */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Pause Button (available for timed games while round is active) */}
          {!isUntimed && !isComplete && onTogglePause && (
            <button
              onClick={onTogglePause}
              disabled={!isRunning && !isPaused}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPaused
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse hover:bg-emerald-500/30'
                  : isRunning
                  ? 'bg-dark-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
                  : 'bg-dark-900/50 border-slate-800/50 text-slate-600 cursor-not-allowed'
              }`}
              title={isPaused ? 'Resume Round' : 'Pause Round'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-emerald-300" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-slate-300" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>
          )}

          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Words Found</div>
            <div className="text-lg sm:text-xl font-mono font-bold text-slate-100 flex items-center justify-end gap-1.5">
              <span>{foundWordsCount}</span>
              <span className="text-slate-500 text-sm">/ {totalWords}</span>
              {isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
            </div>
          </div>

          <div className="w-14 sm:w-20 bg-dark-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isComplete ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
              }`}
              style={{ width: `${percentDone}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
