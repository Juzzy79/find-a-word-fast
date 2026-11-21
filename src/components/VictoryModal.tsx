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
    // Launch celebratory confetti burst
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
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

        <h2 className="text-3xl font-black tracking-tight mb-1">
          {isUntimed ? 'Zen Puzzle Completed! 🌸' : 'Board Cleared!'}
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          {theme} &bull; {gridSize}&times;{gridSize} Grid
        </p>

        {/* Big Time Result or Calming Zen Badge */}
        {isUntimed ? (
          <div className="bg-dark-900/90 border border-teal-500/30 rounded-2xl p-5 mb-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono uppercase text-teal-400 font-bold mb-1">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Stress-Free Solve</span>
            </div>
            <p className="text-sm text-slate-200 font-medium">
              Every word discovered at your own peaceful pace. No clocks, no pressure!
            </p>
          </div>
        ) : (
          <div className="bg-dark-900/90 border border-slate-800 rounded-2xl p-4 mb-4">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
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

        {/* Primary Pass Turn Action & Replay */}
        <div className="space-y-2.5">
          {hasNextRound && onNextRound ? (
            <button
              onClick={onNextRound}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:opacity-95 active:scale-98 transition-all cursor-pointer"
            >
              <span>Play Round {nextRoundNumber} Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onPlayAgain}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:opacity-95 active:scale-98 transition-all cursor-pointer"
            >
              <span>Play Next Puzzle</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onPassTurn}
            className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              hasNextRound
                ? 'bg-dark-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/40 text-cyan-300'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>{roomCode ? `Share Room (${roomCode}) / Tell Opponent` : 'Share Room & Challenge Opponent'}</span>
          </button>

          {onWatchReplay && (
            <button
              onClick={onWatchReplay}
              className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <span>Watch High-Speed Replay</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
