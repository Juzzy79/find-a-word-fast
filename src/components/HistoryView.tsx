import React from 'react';
import type { CareerStats } from '../types/game';
import { getCareerStats } from '../utils/statsStorage';
import { formatMs, formatSecondsShort, formatDate } from '../utils/formatters';
import { History, Trophy, CheckCircle, XCircle } from 'lucide-react';

interface HistoryViewProps {
  currentPlayer: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ currentPlayer }) => {
  const stats: CareerStats = getCareerStats(currentPlayer);
  const history = stats.recentHistory;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 select-none animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <History className="w-6 h-6 text-violet-400" />
            Match History
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Past runs and head-to-head outcomes for {currentPlayer}
          </p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-dark-900 px-2.5 py-1 rounded-lg border border-slate-800">
          {history.length} Record{history.length !== 1 ? 's' : ''}
        </span>
      </div>

      {history.length > 0 ? (
        <div className="space-y-3">
          {history.map((h, idx) => {
            return (
              <div
                key={`hist-${idx}`}
                className="glass-panel rounded-2xl p-4 border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm">{h.theme}</span>
                    <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/60">
                      {h.gridSize}&times;{h.gridSize}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">
                      {h.mode}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {formatDate(h.date)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono mb-2">
                  <div className="bg-dark-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Time</span>
                    <span className="text-emerald-400 font-bold text-sm">{formatMs(h.elapsedMs)}</span>
                  </div>
                  <div className="bg-dark-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Burst Combo</span>
                    <span className="text-amber-400 font-bold text-sm">
                      {h.burstSpeedMs > 0 ? formatSecondsShort(h.burstSpeedMs) : '—'}
                    </span>
                  </div>
                  <div className="bg-dark-900/80 p-2 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 text-[10px] block uppercase">Words Solved</span>
                    <span className="text-slate-200 font-bold text-sm">{h.wordCount} words</span>
                  </div>
                </div>

                {/* Opponents Comparison if any */}
                {h.opponentSummaries && h.opponentSummaries.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-1">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Opponents Faced:</div>
                    {h.opponentSummaries.map((opp, oIdx) => {
                      const delta = opp.elapsedMs - h.elapsedMs;
                      return (
                        <div
                          key={`opp-${oIdx}`}
                          className="flex items-center justify-between text-xs font-mono bg-dark-950/60 px-2.5 py-1 rounded-lg border border-slate-800/60"
                        >
                          <div className="flex items-center gap-1.5">
                            {opp.won ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            <span className="text-slate-300 font-sans font-medium">{opp.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{formatMs(opp.elapsedMs)}</span>
                            <span className={`text-[11px] font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              ({delta >= 0 ? `+${formatSecondsShort(delta)} faster` : `${formatSecondsShort(delta)} slower`})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400 glass-panel rounded-3xl p-8 border-slate-800 text-xs">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-40" />
          No match history yet. Start a game or competition to log your first solve!
        </div>
      )}
    </div>
  );
};
