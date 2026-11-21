import React, { useState } from 'react';
import type { CareerStats } from '../types/game';
import {
  getCareerStats,
  getNemesis,
  exportStatsToJson,
  importStatsFromJson,
  resetPlayerStats
} from '../utils/statsStorage';
import { formatMs, formatSecondsShort, getPlayerColor } from '../utils/formatters';
import {
  Trophy,
  Zap,
  Clock,
  CheckCircle,
  Skull,
  Swords,
  Grid,
  Download,
  RotateCcw,
  AlertTriangle,
  Upload,
  UserCheck,
  Coffee
} from 'lucide-react';

interface StatsDashboardProps {
  currentPlayer: string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ currentPlayer }) => {
  const [stats, setStats] = useState<CareerStats>(() => getCareerStats(currentPlayer));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  const refreshStats = () => {
    setStats(getCareerStats(currentPlayer));
  };

  const nemesis = getNemesis(stats);
  const rivalriesList = Object.values(stats.rivalries).sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  // Handle Export
  const handleExport = () => {
    const jsonStr = exportStatsToJson(currentPlayer);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordrush_stats_${currentPlayer.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  // Handle Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importStatsFromJson(content)) {
        refreshStats();
        alert('Stats successfully restored!');
      } else {
        alert('Failed to import stats: Invalid JSON format.');
      }
    };
    reader.readAsText(file);
  };

  // Handle Reset
  const handleReset = () => {
    resetPlayerStats(currentPlayer);
    setShowResetConfirm(false);
    refreshStats();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 select-none animate-fadeIn">
      {/* Dashboard Title & Player Profile Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Stats Dashboard
            </h1>
            <span className="text-xs font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              {currentPlayer}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Career performance, fastest combos, and multiplayer rivalries
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium transition-all"
            title="Download stats JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{copiedExport ? 'Exported!' : 'Export JSON'}</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-medium transition-all cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-violet-400" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900 border border-rose-900/50 text-rose-400 hover:bg-rose-950/40 text-xs font-medium transition-all"
            title="Reset career stats"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Overlay */}
      {showResetConfirm && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-xs sm:text-sm">
              Are you sure you want to reset all career stats for <b>{currentPlayer}</b>? This cannot be undone.
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              Confirm Reset
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hero Performance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Puzzles Completed */}
        <div className="glass-panel rounded-2xl p-4 border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Completed
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-100">
            {stats.puzzlesCompleted}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
            <span>{stats.totalWordsFound} words found</span>
            {(stats.gamesByMode.zen ?? 0) > 0 && (
              <span className="text-teal-400 font-mono text-[10px] bg-teal-500/15 px-1.5 py-0.5 rounded border border-teal-500/30 flex items-center gap-1">
                <Coffee className="w-3 h-3" />
                <span>{stats.gamesByMode.zen} Zen</span>
              </span>
            )}
          </div>
        </div>

        {/* Personal Best Time */}
        <div className="glass-panel rounded-2xl p-4 border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Personal Best
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-100">
            {stats.bestTimeMs ? formatMs(stats.bestTimeMs) : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.bestTimeMs ? 'Fastest board solve' : 'No games yet'}
          </div>
        </div>

        {/* Avg Time per Word */}
        <div className="glass-panel rounded-2xl p-4 border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Avg Pace / Word
            </span>
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-100">
            {stats.avgTimePerWordMs > 0 ? formatSecondsShort(stats.avgTimePerWordMs) : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Average time per word found
          </div>
        </div>

        {/* Shortest Time Between Words (Burst Speed) */}
        <div className="glass-panel rounded-2xl p-4 border-amber-500/30 bg-gradient-to-b from-dark-900 to-amber-950/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase text-amber-400 font-semibold tracking-wider">
              Record Burst
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-300">
            {stats.shortestBurstSpeedMs ? formatSecondsShort(stats.shortestBurstSpeedMs) : '—'}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">
            Shortest gap between words
          </div>
        </div>
      </div>

      {/* Nemesis Spotlight & Head-to-Head Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Nemesis Spotlight Card */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-4 sm:p-5 border-rose-900/60 bg-gradient-to-b from-dark-900 via-rose-950/10 to-dark-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <Skull className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono uppercase font-bold text-rose-400 tracking-wider">
                  Your Nemesis
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono text-slate-400">Toughest Rival</span>
            </div>

            {nemesis ? (
              <div>
                <div className="flex items-center gap-3 my-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-center font-mono font-bold text-xl">
                    {nemesis.opponentName[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{nemesis.opponentName}</div>
                    <div className="text-xs text-rose-300 font-medium">
                      Beaten you {nemesis.losses} time{nemesis.losses !== 1 ? 's' : ''} ({nemesis.gamesPlayed} games)
                    </div>
                  </div>
                </div>

                <div className="bg-dark-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Your Win Rate:</span>
                    <span className="text-rose-400 font-bold">{nemesis.winRatePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Time Differential:</span>
                    <span className={nemesis.avgTimeDeltaMs >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {nemesis.avgTimeDeltaMs >= 0
                        ? `+${formatSecondsShort(nemesis.avgTimeDeltaMs)} faster`
                        : `${formatSecondsShort(nemesis.avgTimeDeltaMs)} slower`}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Swords className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                No nemesis yet! Pass your turn to friends via message to log head-to-head match stats.
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-3 mt-3">
            {nemesis
              ? `Tip: Stay focused on long words to close the ${formatSecondsShort(Math.abs(nemesis.avgTimeDeltaMs))} gap against ${nemesis.opponentName}.`
              : 'Multiplayer turns automatically sync rivalries.'}
          </div>
        </div>

        {/* Head-to-Head Arena (Farkle Style Comparison Bars) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 sm:p-5 border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Swords className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Head-to-Head Arena</h3>
                  <p className="text-[11px] text-slate-400">Farkle-style rivalry matchup bars</p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {rivalriesList.length} Opponent{rivalriesList.length !== 1 ? 's' : ''}
              </span>
            </div>

            {rivalriesList.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {rivalriesList.map((r, idx) => {
                  const total = r.wins + r.losses + r.ties;
                  const winPct = total > 0 ? Math.round((r.wins / total) * 100) : 50;
                  const lossPct = 100 - winPct;
                  const oppAvatar = getPlayerColor(r.opponentName);
                  const isFaster = r.avgTimeDeltaMs >= 0;

                  return (
                    <div
                      key={`rival-${idx}`}
                      className="bg-dark-900/80 border border-slate-800 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{currentPlayer}</span>
                          <span className="text-emerald-400 font-mono font-bold">{r.wins}W</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">
                            {isFaster ? (
                              <span className="text-emerald-400 font-semibold">
                                +{formatSecondsShort(r.avgTimeDeltaMs)} faster
                              </span>
                            ) : (
                              <span className="text-rose-400 font-semibold">
                                {formatSecondsShort(r.avgTimeDeltaMs)} slower
                              </span>
                            )}
                          </span>
                          <span className="text-slate-500">&bull;</span>
                          <span className="font-mono text-slate-400">{r.gamesPlayed}g</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-rose-400 font-mono font-bold">{r.losses}W</span>
                          <span className="font-bold text-slate-200">{r.opponentName}</span>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${oppAvatar.bg}`}
                          >
                            {r.opponentName[0].toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Dual Directional Ratio Bar */}
                      <div className="h-2.5 bg-dark-950 rounded-full flex overflow-hidden border border-slate-800/80">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${winPct}%` }}
                          title={`${currentPlayer}: ${winPct}% win rate`}
                        />
                        <div
                          className="bg-rose-500 h-full transition-all duration-500 ml-auto"
                          style={{ width: `${lossPct}%` }}
                          title={`${r.opponentName}: ${lossPct}% win rate`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-xs">
                <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                No head-to-head matches registered yet.
                <br />
                Take your turn in a game and pass it along with the share link!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Size Breakdown */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border-slate-800 mb-6">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800/80">
          <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Performance by Grid Size</h3>
            <p className="text-[11px] text-slate-400">Pacing and records across board difficulties</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[16, 18, 20].map(sz => {
            const g = stats.gridStats[sz as 16 | 18 | 20];
            const label = sz === 16 ? 'Large (16×16)' : sz === 18 ? 'Extra Large (18×18)' : 'Titan (20×20)';
            return (
              <div
                key={`grid-card-${sz}`}
                className="bg-dark-900/80 border border-slate-800 rounded-xl p-3"
              >
                <div className="text-xs font-mono font-bold text-slate-200 mb-2 flex items-center justify-between">
                  <span>{label}</span>
                  <span className="text-slate-400 text-[11px]">{g.completed} solved</span>
                </div>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Best:</span>
                    <span className="text-emerald-400 font-bold">{g.bestTimeMs ? formatMs(g.bestTimeMs) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Average:</span>
                    <span className="text-slate-200">{g.avgTimeMs > 0 ? formatMs(g.avgTimeMs) : '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
