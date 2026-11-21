import React from 'react';
import type { TacticalTrap } from '../types/game';
import { Ghost, EyeOff, CloudFog, ShieldCheck, Zap } from 'lucide-react';

interface TacticalHUDProps {
  activeTrap: TacticalTrap | null;
  activeTrapTimeRemainingSec: number | null;
  earnedTrapAlert: boolean;
  dodgedTrapsCount?: number;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  activeTrap,
  activeTrapTimeRemainingSec,
  earnedTrapAlert,
  dodgedTrapsCount = 0
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-2 space-y-1.5 pointer-events-none select-none">
      {/* 1. Earned Trap Toast Alert */}
      {earnedTrapAlert && (
        <div className="flex items-center justify-center animate-bounce-subtle">
          <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-dark-950 font-black text-xs shadow-lg shadow-amber-500/30 flex items-center gap-1.5 border border-amber-300">
            <Zap className="w-4 h-4 fill-dark-950" />
            <span>TACTICAL TRAP TOKEN EARNED! (Combo &lt;5s)</span>
          </div>
        </div>
      )}

      {/* 2. Active Ambush Detonation Alert */}
      {activeTrap && activeTrapTimeRemainingSec !== null && activeTrapTimeRemainingSec > 0 && (
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-dark-900/90 to-rose-950/90 border-2 border-rose-500/70 shadow-xl shadow-rose-950/40 text-rose-200 flex items-center justify-between gap-3 animate-fade-in backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
              {activeTrap.type === 'phantom_letter' ? (
                <Ghost className="w-4 h-4 text-violet-400 animate-pulse" />
              ) : activeTrap.type === 'wordlist_glitch' ? (
                <EyeOff className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <CloudFog className="w-4 h-4 text-cyan-400 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <span>Ambush Triggered</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                </span>
                <span className="text-xs text-slate-400">
                  By {activeTrap.createdBy}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-white truncate">
                {activeTrap.type === 'phantom_letter' ? (
                  <span>
                    Letter <b className="text-violet-300 px-1.5 py-0.2 rounded bg-violet-900/60 border border-violet-500/40 font-mono">[{activeTrap.letter}]</b> Cloaked on Board!
                  </span>
                ) : activeTrap.type === 'wordlist_glitch' ? (
                  <span>Blindfold Active! Word List Scrambled into Static!</span>
                ) : (
                  <span>Dense Mist Obscuring Board Quadrant!</span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs uppercase font-mono text-rose-300/80 font-bold">
              Remaining
            </div>
            <div className="font-mono font-black text-sm sm:text-base text-rose-300">
              {activeTrapTimeRemainingSec}s
            </div>
          </div>
        </div>
      )}

      {/* 3. Dodged Trap Notification */}
      {dodgedTrapsCount > 0 && !activeTrap && (
        <div className="flex items-center justify-center">
          <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Outran {dodgedTrapsCount} Opponent Ambush{dodgedTrapsCount > 1 ? 'es' : ''}!</span>
          </div>
        </div>
      )}
    </div>
  );
};
