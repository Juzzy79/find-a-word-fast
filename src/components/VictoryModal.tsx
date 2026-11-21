import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Zap, Share2, ArrowRight, Award, Coffee, Sparkles } from 'lucide-react';
import { formatMs, formatSecondsShort } from '../utils/formatters';

interface VictoryModalProps {
  elapsedMs: number;
  burstSpeedMs: number;
  isNewBest: boolean;
  theme: string;
  gridSize: number;
  onPassTurn: () => void;
  onPlayAgain: () => void;
  onWatchReplay?: () => void;
  isUntimed?: boolean;
  hasNextRound?: boolean;
  nextRoundNumber?: number;
  onNextRound?: () => void;
  roomCode?: string;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  elapsedMs,
  burstSpeedMs,
  isNewBest,
  theme,
  gridSize,
  onPassTurn,
  onPlayAgain,
  onWatchReplay,
  isUntimed = false,
  hasNextRound = false,
  nextRoundNumber = 2,
  onNextRound,
  roomCode
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    } catch {
      // Confetti fallback
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={isUntimed ? 'Zen puzzle completed' : 'Board cleared'}
    >
      <div className="w-full max-w-md glass-panel-glow rounded-3xl p-6 text-slate-100 border-emerald-500/40 text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Title */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-3xl p-3 mb-3 shadow-xl ${
          isUntimed
            ? 'bg-gradient-to-tr from-teal-400 to-emerald-400 text-dark-950 shadow-teal-500/20'
            : 'bg-gradient-to-tr from-emerald-500 to-cyan-400 text-dark-950 shadow-emerald-500/20'
        }`}>
          {isUntimed ? <Coffee className="w-full h-full" /> : <Trophy className="w-full h-full" />}
        </div>

        <h2 className="text-3xl font-black tracking-tight mb-1 flex items-center justify-center gap-2">
          <span>{isUntimed ? 'Zen Puzzle Cleared!' : 'Board Cleared!'}</span>
          {isUntimed && <Sparkles className="w-6 h-6 text-teal-400 shrink-0" />}
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          {theme} &bull; {gridSize}&times;{gridSize} Grid
        </p>

        {/* Big Time Result or Calming Zen Badge */}
        {isUntimed ? (
          <div className="bg-dark-900/90 border border-teal-500/30 rounded-2xl p-5 mb-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono uppercase text-teal-400 font-bold mb-1">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Stress-Free Solve</span>
            </div>
            <p className="text-sm text-slate-200 font-medium">
              Every word discovered at your own peaceful pace. No clocks, no pressure!
            </p>
          </div>
        ) : (
          <div className="bg-dark-900/90 border border-slate-800 rounded-2xl p-4 mb-5">
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-1">
              Completion Time
            </div>
            <div className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 flex items-center justify-center gap-2">
              <span>{formatMs(elapsedMs)}</span>
              {isNewBest && (
                <span className="text-xs font-sans font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  PB!
                </span>
              )}
            </div>

            {burstSpeedMs > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-xs text-amber-300">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                <span>Fastest combo between words:</span>
                <span className="font-mono font-bold">{formatSecondsShort(burstSpeedMs)}</span>
              </div>
            )}
          </div>
        )}

        {/* Dominant Primary Action */}
        <div className="space-y-3">
          {hasNextRound && onNextRound ? (
            <button
              onClick={onNextRound}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
            >
              <span>Play Round {nextRoundNumber} Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onPlayAgain}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
            >
              <span>Play Again</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {/* Quieter Secondary Actions */}
          <div className={`grid gap-2 pt-1 ${onWatchReplay ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <button
              onClick={onPassTurn}
              className="py-2 px-3 rounded-xl bg-dark-900/70 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-400"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{roomCode ? `Share (${roomCode})` : 'Share / Challenge'}</span>
            </button>

            {onWatchReplay && (
              <button
                onClick={onWatchReplay}
                className="py-2 px-3 rounded-xl bg-dark-900/70 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-400"
              >
                <Zap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Watch Replay</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
