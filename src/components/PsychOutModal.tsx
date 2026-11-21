import React, { useEffect } from 'react';
import type { PlayerTurnResult } from '../types/game';
import { formatMs, formatSecondsShort } from '../utils/formatters';
import { sounds, triggerHaptic } from '../utils/sound';
import {
  Flame,
  Zap,
  Clock,
  Trophy,
  Play,
  Eye,
  Crown,
  X,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface PsychOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTurn: () => void;
  onWatchReplay?: (contender: PlayerTurnResult) => void;
  roundNumber: number;
  totalRounds: number;
  themeName: string;
  gridSize: number;
  opponentResults: PlayerTurnResult[];
  currentPlayer: string;
  roomCode?: string;
}

export const PsychOutModal: React.FC<PsychOutModalProps> = ({
  isOpen,
  onClose,
  onStartTurn,
  onWatchReplay,
  roundNumber,
  totalRounds,
  themeName,
  gridSize,
  opponentResults,
  currentPlayer,
  roomCode
}) => {
  // Play psych-out sound and haptic when opened
  useEffect(() => {
    if (isOpen && opponentResults.length > 0) {
      sounds.playPsychOut();
      triggerHaptic('medium');
    }
  }, [isOpen, opponentResults.length]);

  if (!isOpen || opponentResults.length === 0) return null;

  // Deduplicate and sort by fastest elapsed time
  const sortedOpponents = Object.values(
    opponentResults.reduce<Record<string, PlayerTurnResult>>((acc, res) => {
      const key = res.playerName.toLowerCase();
      if (!acc[key] || res.elapsedMs < acc[key].elapsedMs) {
        acc[key] = res;
      }
      return acc;
    }, {})
  ).sort((a, b) => a.elapsedMs - b.elapsedMs);

  const leader = sortedOpponents[0];
  if (!leader) return null;

  // Analyze leader's rapid burst & combo streak
  const bestBurstMs = leader.burstSpeedMs || 0;
  const bestBurstSec = bestBurstMs > 0 ? (bestBurstMs / 1000).toFixed(2) : null;
  const avgPaceSec = leader.avgTimePerWordMs > 0 ? (leader.avgTimePerWordMs / 1000).toFixed(2) : null;

  // Analyze word timestamps to find rapid combos (e.g. 3 words in X seconds)
  let maxRapidComboCount = 0;
  let maxRapidComboTimeMs = 0;
  const ts = leader.wordFindTimestamps || [];
  if (ts.length >= 3) {
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 2; j < Math.min(i + 5, ts.length); j++) {
        const timeWindow = ts[j] - ts[i];
        const count = j - i + 1;
        if (timeWindow < 6000 && count > maxRapidComboCount) {
          maxRapidComboCount = count;
          maxRapidComboTimeMs = timeWindow;
        }
      }
    }
  }

  // Generate dynamic psychological banter
  let threatTitle = 'Target Benchmark Set!';
  let threatBadge = 'High Pace';
  let psychQuote = `"${leader.playerName} clocked a clean ${formatMs(leader.elapsedMs)} run. Ready to test your speed?"`;

  if (bestBurstMs > 0 && bestBurstMs <= 1100) {
    threatTitle = 'Sub-Second Lightning Burst!';
    threatBadge = 'Inhuman Reflexes';
    psychQuote = `"${leader.playerName} snatched words just ${bestBurstSec}s apart! Think you can top that, ${currentPlayer}?"`;
  } else if (bestBurstMs > 0 && bestBurstMs <= 1900) {
    threatTitle = 'Rapid-Fire Word Flurry!';
    threatBadge = 'Rapid Fire';
    psychQuote = `"${leader.playerName} chained consecutive words in ${bestBurstSec}s flat. Can your fingers move faster, ${currentPlayer}?"`;
  } else if (leader.elapsedMs <= 38000) {
    threatTitle = 'Blistering Speed Run!';
    threatBadge = 'Speed Demon';
    psychQuote = `"${leader.playerName} torched the entire ${gridSize}x${gridSize} grid in ${formatMs(leader.elapsedMs)}. Bring the heat, ${currentPlayer}!"`;
  } else {
    psychQuote = `"${leader.playerName} set the opening bar with ${formatMs(leader.elapsedMs)}. The pressure is on you, ${currentPlayer}!"`;
  }

  const handleStart = () => {
    onClose();
    onStartTurn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-auto rounded-3xl bg-gradient-to-b from-dark-900 via-dark-950 to-dark-900 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/20 overflow-hidden text-slate-100">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="relative px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30 text-dark-950">
              <Flame className="w-5 h-5 fill-dark-950 text-dark-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <span>Psych-Out Alert</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  {threatBadge}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-100">
                {threatTitle}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-dark-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="Dismiss and study grid"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Round Context Banner */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-3 py-1.5 rounded-xl bg-dark-950/70 border border-slate-800/80">
            <span>
              {totalRounds > 1 ? `Round ${roundNumber} of ${totalRounds}` : 'Match Duel'} &bull; <b className="text-slate-200">{themeName}</b>
            </span>
            {roomCode && (
              <span className="font-mono text-amber-400 font-bold tracking-wider">
                Room: {roomCode}
              </span>
            )}
          </div>

          {/* Featured Opponent Banner Card */}
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-dark-900 to-rose-950/40 border border-amber-500/40 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-dark-950 shadow-md"
                  style={{ backgroundColor: leader.avatarColor || '#f59e0b' }}
                >
                  {leader.playerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm sm:text-base text-slate-100">
                      {leader.playerName}
                    </span>
                    <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="text-xs text-amber-300/90 font-medium">
                    Current Round Leader
                  </div>
                </div>
              </div>

              {leader.replayLog && leader.replayLog.length > 0 && onWatchReplay && (
                <button
                  onClick={() => onWatchReplay(leader)}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Watch their turn replay to see how they found words"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                  <span>Sneak Peek</span>
                </button>
              )}
            </div>

            {/* Core Stats Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Stat 1: Time to Beat */}
              <div className="p-3 rounded-xl bg-dark-950/80 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-slate-400 font-semibold mb-0.5">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>Time to Beat</span>
                </div>
                <div className="font-mono font-black text-lg sm:text-xl text-emerald-400">
                  {formatMs(leader.elapsedMs)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  100% Cleared
                </div>
              </div>

              {/* Stat 2: Fastest Rapid Burst Combo */}
              <div className="p-3 rounded-xl bg-dark-950/80 border border-amber-500/30 text-center relative overflow-hidden">
                <div className="flex items-center justify-center gap-1 text-xs text-amber-300 font-semibold mb-0.5">
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Fastest Combo</span>
                </div>
                <div className="font-mono font-black text-lg sm:text-xl text-amber-300">
                  {bestBurstSec ? `${bestBurstSec}s` : '--'}
                </div>
                <div className="text-xs text-amber-400/80 mt-0.5">
                  Between Words
                </div>
              </div>

              {/* Stat 3: Average Word Pace */}
              <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-dark-950/80 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-xs text-slate-400 font-semibold mb-0.5">
                  <TrendingUp className="w-3 h-3 text-cyan-400" />
                  <span>Word Pace</span>
                </div>
                <div className="font-mono font-black text-lg sm:text-xl text-cyan-300">
                  {avgPaceSec ? `${avgPaceSec}s` : '--'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Per Word Avg
                </div>
              </div>
            </div>

            {/* Extra High-Speed Flurry Callout */}
            {maxRapidComboCount >= 3 && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold">Hot Streak Alert:</span> Found{' '}
                  <span className="font-extrabold text-white">{maxRapidComboCount} words</span> in just{' '}
                  <span className="font-extrabold text-white">{(maxRapidComboTimeMs / 1000).toFixed(1)}s</span>!
                </div>
              </div>
            )}
          </div>

          {/* Psych Banter Quote */}
          <div className="p-3 rounded-2xl bg-dark-950/60 border border-slate-800/80 text-center">
            <p className="text-xs sm:text-sm italic text-slate-300 font-medium">
              {psychQuote}
            </p>
          </div>

          {/* Multiple Opponents Standings (if 2+ opponents have played) */}
          {sortedOpponents.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 px-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>All Opponent Times for Round {roundNumber}</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {sortedOpponents.map((opp, idx) => (
                  <div
                    key={`opp-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-dark-950/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-200">{opp.playerName}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-emerald-400 font-bold">{formatMs(opp.elapsedMs)}</span>
                      {opp.burstSpeedMs > 0 && (
                        <span className="text-xs text-amber-400 inline-flex items-center gap-0.5">
                          <Zap className="w-3 h-3 fill-amber-400" />
                          <span>{formatSecondsShort(opp.burstSpeedMs)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-dark-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>Study Board First</span>
          </button>

          <button
            onClick={handleStart}
            className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-dark-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:opacity-95 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-dark-950" />
            <span>I&apos;m Ready — Start Turn!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
