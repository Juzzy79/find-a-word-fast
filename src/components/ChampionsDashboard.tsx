import React, { useState, useEffect } from 'react';
import type { CloudMatchDocument } from '../services/matchService';
import type { GameRound, PlayerTurnResult } from '../types/game';
import {
  subscribeToCompletedMatches,
  fetchCompletedMatches,
  deleteCloudMatch
} from '../services/matchService';
import {
  computeTournamentSummary,
  computeGlobalChampions,
  computeLiveTournamentRecords,
  type TournamentSummary,
  type GlobalChampionRecord,
  type LiveTournamentRecords
} from '../utils/tournamentStats';
import { formatMs, formatSecondsShort, formatDate } from '../utils/formatters';
import {
  Trophy,
  Crown,
  Zap,
  Clock,
  Swords,
  Sparkles,
  Archive,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  Play,
  Trash2,
  Medal,
  Flame
} from 'lucide-react';

interface ChampionsDashboardProps {
  currentPlayer: string;
  onOpenLobby: () => void;
  onWatchReplay?: (round: GameRound, turnResult: PlayerTurnResult) => void;
  onSelectMatchToPlay?: (match: CloudMatchDocument) => void;
}

export const ChampionsDashboard: React.FC<ChampionsDashboardProps> = ({
  currentPlayer,
  onOpenLobby,
  onWatchReplay,
  onSelectMatchToPlay
}) => {
  const [completedMatches, setCompletedMatches] = useState<CloudMatchDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'records' | 'archive'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'series' | 'duel'>('all');
  const [gridFilter, setGridFilter] = useState<'all' | 16 | 18 | 20>('all');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Subscribe to completed matches in real-time
  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToCompletedMatches(matches => {
      setCompletedMatches(matches);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    const matches = await fetchCompletedMatches();
    setCompletedMatches(matches);
    setIsLoading(false);
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleDeleteArchivedMatch = async (matchId: string, roomCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently remove archived tournament "${roomCode}"?`)) {
      return;
    }
    const ok = await deleteCloudMatch(matchId);
    if (ok) {
      setCompletedMatches(prev => prev.filter(m => m.id !== matchId));
    } else {
      alert('Could not delete archived room.');
    }
  };

  // Compute stats across all archived tournaments
  const globalChampions: GlobalChampionRecord[] = computeGlobalChampions(completedMatches);
  const historicRecords: LiveTournamentRecords = computeLiveTournamentRecords(completedMatches);
  const tournamentSummaries: TournamentSummary[] = completedMatches.map(m => computeTournamentSummary(m));

  // Filtered summaries for the Archive tab
  const filteredSummaries = tournamentSummaries.filter(s => {
    const m = s.match;
    // Search query matches room code, champion name, or any participant
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = (m.roomCode || m.id).toLowerCase();
      const champMatch = s.champion?.playerName.toLowerCase().includes(q);
      const participantMatch = m.participants.some(p => p.toLowerCase().includes(q));
      const themeMatch = m.rounds.some(r => r.theme.toLowerCase().includes(q));
      if (!matchCode.includes(q) && !champMatch && !participantMatch && !themeMatch) {
        return false;
      }
    }

    // Mode filter
    if (modeFilter === 'series' && m.mode !== 'series') return false;
    if (modeFilter === 'duel' && m.mode === 'series') return false;

    // Grid size filter
    if (gridFilter !== 'all' && m.gridSize !== gridFilter) return false;

    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-6 select-none animate-fadeIn">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/80 via-dark-900 to-emerald-950/80 border border-amber-500/40 p-5 sm:p-7 mb-6 shadow-2xl shadow-amber-950/20 backdrop-blur-md">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-black uppercase tracking-wider mb-1.5">
              <Trophy className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Live Room Hall of Fame</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
              <span>Tournament Champions</span>
              <Crown className="w-7 h-7 text-amber-400 fill-amber-400 hidden sm:inline" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Archived multiplayer showdowns, crowned series champions, and historic speed records from the live rooms.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-dark-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Refresh tournament data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={onOpenLobby}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-dark-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Swords className="w-4 h-4 fill-dark-950" />
              <span>Host / Join Live Room</span>
            </button>
          </div>
        </div>

        {/* Global Key Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-dark-950/70 p-3 rounded-2xl border border-amber-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-slate-400 mb-0.5">
              <Archive className="w-3.5 h-3.5 text-amber-400" />
              <span>Tournaments</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300">
              {historicRecords.totalTournamentsArchived}
            </div>
          </div>

          <div className="bg-dark-950/70 p-3 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-slate-400 mb-0.5">
              <Crown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Champions</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
              {globalChampions.filter(c => c.tournamentsWon > 0).length}
            </div>
          </div>

          <div className="bg-dark-950/70 p-3 rounded-2xl border border-cyan-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-slate-400 mb-0.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Record Round</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 truncate">
              {historicRecords.fastestRound ? formatMs(historicRecords.fastestRound.elapsedMs) : '—'}
            </div>
          </div>

          <div className="bg-dark-950/70 p-3 rounded-2xl border border-violet-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-slate-400 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Rounds Played</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-violet-300">
              {historicRecords.totalRoundsPlayed}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex gap-2 bg-dark-900 p-1.5 rounded-2xl border border-slate-800 mb-6">
        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'leaderboard'
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-dark-950 shadow-md shadow-amber-500/20 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Global Champions ({globalChampions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('records')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'records'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-dark-950 shadow-md shadow-cyan-500/20 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Historic Records & Stats</span>
        </button>

        <button
          onClick={() => setActiveSubTab('archive')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'archive'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-md shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Archived Rooms ({completedMatches.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: GLOBAL CHAMPIONS LEADERBOARD */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-6">
          {globalChampions.length === 0 ? (
            <div className="text-center py-16 bg-dark-900/60 rounded-3xl border border-slate-800 text-slate-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <h3 className="text-base font-bold text-slate-200 mb-1">No Tournament Champions Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Play and finish a tournament series or duel in the Live Rooms, and once archived, the champion will be engraved here!
              </p>
              <button
                onClick={onOpenLobby}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-dark-950 font-bold text-xs inline-flex items-center gap-2 shadow-md cursor-pointer hover:bg-amber-300"
              >
                <Play className="w-4 h-4 fill-dark-950" />
                <span>Start a Live Room Tournament</span>
              </button>
            </div>
          ) : (
            <>
              {/* Podium for Top 3 Champions */}
              {globalChampions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Rank 2 (Silver) */}
                  {globalChampions[1] && (
                    <div className="p-4 rounded-3xl bg-dark-900/80 border border-slate-700/80 flex flex-col justify-between order-2 md:order-1 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-black text-slate-300 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-600 flex items-center gap-1">
                          <Medal className="w-3.5 h-3.5 text-slate-300" />
                          <span>2nd Place</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {globalChampions[1].winRate}% Win Rate
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base text-dark-950 shadow-md shrink-0"
                          style={{ backgroundColor: globalChampions[1].avatarColor || '#94a3b8' }}
                        >
                          {globalChampions[1].playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-base font-extrabold text-slate-100 truncate">
                            {globalChampions[1].playerName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            👑 <b>{globalChampions[1].tournamentsWon}</b> title{globalChampions[1].tournamentsWon !== 1 ? 's' : ''} &bull; {globalChampions[1].totalRoundsWon} rounds won
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>Best Round:</span>
                        <span className="text-emerald-400 font-bold">
                          {globalChampions[1].bestTimeMs ? formatMs(globalChampions[1].bestTimeMs) : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rank 1 (Gold / Champion) */}
                  {globalChampions[0] && (
                    <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-950/70 to-dark-900 border-2 border-amber-500/60 shadow-xl shadow-amber-500/10 flex flex-col justify-between order-1 md:order-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/25 px-2.5 py-0.5 rounded-lg border border-amber-500/50 flex items-center gap-1.5 shadow-sm">
                          <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                          <span>#1 Grand Champion</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {globalChampions[0].winRate}% Win Rate
                        </span>
                      </div>
                      <div className="flex items-center gap-3.5 mb-3">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-dark-950 shadow-lg ring-2 ring-amber-400/50 shrink-0"
                          style={{ backgroundColor: globalChampions[0].avatarColor || '#fbbf24' }}
                        >
                          {globalChampions[0].playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-lg font-black text-amber-200 truncate flex items-center gap-1.5">
                            <span>{globalChampions[0].playerName}</span>
                            {globalChampions[0].playerName.toLowerCase() === currentPlayer.toLowerCase() && (
                              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-amber-400/90 font-mono font-semibold">
                            🏆 <b>{globalChampions[0].tournamentsWon}</b> Tournament Titles &bull; {globalChampions[0].totalRoundsWon} Rounds Won
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">All-Time Best Round:</span>
                        <span className="text-amber-300 font-black text-sm">
                          {globalChampions[0].bestTimeMs ? formatMs(globalChampions[0].bestTimeMs) : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 (Bronze) */}
                  {globalChampions[2] && (
                    <div className="p-4 rounded-3xl bg-dark-900/80 border border-amber-900/40 flex flex-col justify-between order-3 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono font-black text-amber-500 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800 flex items-center gap-1">
                          <Medal className="w-3.5 h-3.5 text-amber-600" />
                          <span>3rd Place</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {globalChampions[2].winRate}% Win Rate
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base text-dark-950 shadow-md shrink-0"
                          style={{ backgroundColor: globalChampions[2].avatarColor || '#d97706' }}
                        >
                          {globalChampions[2].playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-base font-extrabold text-slate-100 truncate">
                            {globalChampions[2].playerName}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            👑 <b>{globalChampions[2].tournamentsWon}</b> title{globalChampions[2].tournamentsWon !== 1 ? 's' : ''} &bull; {globalChampions[2].totalRoundsWon} rounds won
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>Best Round:</span>
                        <span className="text-emerald-400 font-bold">
                          {globalChampions[2].bestTimeMs ? formatMs(globalChampions[2].bestTimeMs) : '—'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Comprehensive Leaderboard Table */}
              <div className="bg-dark-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-lg">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-slate-100">Live Room Champions Ranking</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {globalChampions.length} Contender{globalChampions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-dark-950/60 font-mono text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Contender</th>
                        <th className="py-3 px-4 text-center">Titles Won</th>
                        <th className="py-3 px-4 text-center">Played</th>
                        <th className="py-3 px-4 text-center">Win Rate</th>
                        <th className="py-3 px-4 text-center">Rounds Won</th>
                        <th className="py-3 px-4 text-right">Best Round Time</th>
                        <th className="py-3 px-4 text-right">Best Burst</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {globalChampions.map((c, idx) => {
                        const isMe = c.playerName.toLowerCase() === currentPlayer.toLowerCase();
                        return (
                          <tr
                            key={`champ-row-${idx}`}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isMe ? 'bg-cyan-500/10' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold">
                              {idx === 0 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
                                  1
                                </span>
                              ) : idx === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-700 text-slate-200 font-black">
                                  2
                                </span>
                              ) : idx === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-900/60 text-amber-500 font-black">
                                  3
                                </span>
                              ) : (
                                <span className="text-slate-500 ml-1.5">{idx + 1}</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-dark-950 shrink-0 shadow-sm"
                                  style={{ backgroundColor: c.avatarColor || '#10b981' }}
                                >
                                  {c.playerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                    <span>{c.playerName}</span>
                                    {isMe && (
                                      <span className="text-[9px] uppercase font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-center font-mono font-extrabold text-amber-400">
                              {c.tournamentsWon > 0 ? `👑 ${c.tournamentsWon}` : '0'}
                            </td>

                            <td className="py-3 px-4 text-center font-mono text-slate-300">
                              {c.tournamentsPlayed}
                            </td>

                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                              {c.winRate}%
                            </td>

                            <td className="py-3 px-4 text-center font-mono text-slate-300">
                              {c.totalRoundsWon}
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                              {c.bestTimeMs ? formatMs(c.bestTimeMs) : '—'}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-amber-300">
                              {c.bestBurstSpeedMs ? formatSecondsShort(c.bestBurstSpeedMs) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBTAB 2: HISTORIC RECORDS & STATS */}
      {activeSubTab === 'records' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Record 1: All-Time Fastest Round */}
            <div className="p-4 rounded-3xl bg-dark-900/90 border border-emerald-500/40 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  Fastest Round Ever
                </span>
                {historicRecords.fastestRound && (
                  <span className="text-[10px] font-mono text-slate-400 bg-dark-950 px-2 py-0.5 rounded-lg border border-slate-800">
                    Room {historicRecords.fastestRound.roomCode}
                  </span>
                )}
              </div>

              {historicRecords.fastestRound ? (
                <div>
                  <div className="font-mono text-3xl font-black text-emerald-400 mb-2">
                    {formatMs(historicRecords.fastestRound.elapsedMs)}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-dark-950 shrink-0"
                      style={{ backgroundColor: historicRecords.fastestRound.avatarColor }}
                    >
                      {historicRecords.fastestRound.playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-100 text-sm">
                      {historicRecords.fastestRound.playerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    Theme: <b className="text-slate-200">{historicRecords.fastestRound.theme}</b> ({historicRecords.fastestRound.gridSize}&times;{historicRecords.fastestRound.gridSize}) &bull; {formatDate(historicRecords.fastestRound.date)}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-4">No records recorded yet.</div>
              )}
            </div>

            {/* Record 2: Shortest Burst Combo */}
            <div className="p-4 rounded-3xl bg-dark-900/90 border border-amber-500/40 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                  Shortest Word Burst
                </span>
                {historicRecords.shortestBurst && (
                  <span className="text-[10px] font-mono text-slate-400 bg-dark-950 px-2 py-0.5 rounded-lg border border-slate-800">
                    Room {historicRecords.shortestBurst.roomCode}
                  </span>
                )}
              </div>

              {historicRecords.shortestBurst ? (
                <div>
                  <div className="font-mono text-3xl font-black text-amber-400 mb-2">
                    {formatSecondsShort(historicRecords.shortestBurst.burstSpeedMs)}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-dark-950 shrink-0"
                      style={{ backgroundColor: historicRecords.shortestBurst.avatarColor }}
                    >
                      {historicRecords.shortestBurst.playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-100 text-sm">
                      {historicRecords.shortestBurst.playerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    Consecutive word find in theme <b className="text-slate-200">{historicRecords.shortestBurst.theme}</b> &bull; {formatDate(historicRecords.shortestBurst.date)}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-4">No records recorded yet.</div>
              )}
            </div>

            {/* Record 3: Closest Finish (Nail-Biter) */}
            <div className="p-4 rounded-3xl bg-dark-900/90 border border-rose-500/40 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-rose-400" />
                  Closest Finish (Nail-Biter)
                </span>
                {historicRecords.closestFinish && (
                  <span className="text-[10px] font-mono text-slate-400 bg-dark-950 px-2 py-0.5 rounded-lg border border-slate-800">
                    Room {historicRecords.closestFinish.roomCode}
                  </span>
                )}
              </div>

              {historicRecords.closestFinish ? (
                <div>
                  <div className="font-mono text-3xl font-black text-rose-400 mb-2">
                    &plusmn;{formatSecondsShort(historicRecords.closestFinish.deltaMs)}
                  </div>
                  <div className="text-xs text-slate-200 font-medium mb-2">
                    Winner: <b className="text-emerald-400">{historicRecords.closestFinish.winner}</b> edged out <b className="text-slate-300">{historicRecords.closestFinish.runnerUp}</b>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    Separated by just {historicRecords.closestFinish.deltaMs}ms! &bull; {formatDate(historicRecords.closestFinish.date)}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-4">Requires at least one 2+ player finished tournament.</div>
              )}
            </div>

            {/* Record 4: Highest Word Velocity */}
            <div className="p-4 rounded-3xl bg-dark-900/90 border border-cyan-500/40 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Fastest Word Find Pace
                </span>
                {historicRecords.fastestAvgWordPace && (
                  <span className="text-[10px] font-mono text-slate-400 bg-dark-950 px-2 py-0.5 rounded-lg border border-slate-800">
                    Room {historicRecords.fastestAvgWordPace.roomCode}
                  </span>
                )}
              </div>

              {historicRecords.fastestAvgWordPace ? (
                <div>
                  <div className="font-mono text-3xl font-black text-cyan-400 mb-2">
                    {formatSecondsShort(historicRecords.fastestAvgWordPace.avgTimePerWordMs)}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ word</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-dark-950 shrink-0"
                      style={{ backgroundColor: historicRecords.fastestAvgWordPace.avatarColor }}
                    >
                      {historicRecords.fastestAvgWordPace.playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-100 text-sm">
                      {historicRecords.fastestAvgWordPace.playerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    Average seconds to uncover each word &bull; {formatDate(historicRecords.fastestAvgWordPace.date)}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-4">No records recorded yet.</div>
              )}
            </div>

            {/* Record 5: Undefeated Series Sweep */}
            <div className="p-4 rounded-3xl bg-dark-900/90 border border-violet-500/40 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-violet-400" />
                  Clean Sweep Champion
                </span>
                {historicRecords.mostDominantSweep && (
                  <span className="text-[10px] font-mono text-slate-400 bg-dark-950 px-2 py-0.5 rounded-lg border border-slate-800">
                    Room {historicRecords.mostDominantSweep.roomCode}
                  </span>
                )}
              </div>

              {historicRecords.mostDominantSweep ? (
                <div>
                  <div className="font-mono text-2xl font-black text-violet-300 mb-2">
                    {historicRecords.mostDominantSweep.totalRounds}-0 Sweep!
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs text-dark-950 shrink-0"
                      style={{ backgroundColor: historicRecords.mostDominantSweep.avatarColor }}
                    >
                      {historicRecords.mostDominantSweep.playerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-100 text-sm">
                      {historicRecords.mostDominantSweep.playerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    Won every single round in the series! &bull; {formatDate(historicRecords.mostDominantSweep.date)}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-4">Play a multi-round series to claim a clean sweep!</div>
              )}
            </div>

            {/* Community Totals Summary */}
            <div className="p-4 rounded-3xl bg-dark-900/90 border border-slate-800 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Tournament Totals
                </span>
              </div>

              <div className="space-y-2 mt-3 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Total Words Solved:</span>
                  <span className="font-bold text-slate-100">{historicRecords.totalWordsFound.toLocaleString()} words</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Total Competition Time:</span>
                  <span className="font-bold text-emerald-400">{formatMs(historicRecords.totalPlayTimeMs)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Archived Tournaments:</span>
                  <span className="font-bold text-amber-300">{historicRecords.totalTournamentsArchived}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ARCHIVED TOURNAMENTS EXPLORER */}
      {activeSubTab === 'archive' && (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-dark-900 p-3 rounded-2xl border border-slate-800">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search player, code, or theme..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-dark-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end text-xs">
              {/* Mode filter */}
              <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setModeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    modeFilter === 'all' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setModeFilter('series')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    modeFilter === 'series' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Series
                </button>
                <button
                  onClick={() => setModeFilter('duel')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    modeFilter === 'duel' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Duels
                </button>
              </div>

              {/* Grid size filter */}
              <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setGridFilter('all')}
                  className={`px-2 py-1 rounded-lg font-medium transition-all ${
                    gridFilter === 'all' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Grids
                </button>
                <button
                  onClick={() => setGridFilter(16)}
                  className={`px-2 py-1 rounded-lg font-medium transition-all ${
                    gridFilter === 16 ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  16&times;16
                </button>
                <button
                  onClick={() => setGridFilter(18)}
                  className={`px-2 py-1 rounded-lg font-medium transition-all ${
                    gridFilter === 18 ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  18&times;18
                </button>
                <button
                  onClick={() => setGridFilter(20)}
                  className={`px-2 py-1 rounded-lg font-medium transition-all ${
                    gridFilter === 20 ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  20&times;20
                </button>
              </div>
            </div>
          </div>

          {/* Archived Tournament Cards List */}
          {filteredSummaries.length === 0 ? (
            <div className="text-center py-12 bg-dark-900/60 rounded-3xl border border-slate-800 text-slate-400">
              <Archive className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <div className="text-sm font-bold text-slate-200 mb-1">No Archived Tournaments Match Filter</div>
              <p className="text-xs text-slate-500">
                Try clearing your search query or setting the filter to "All".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSummaries.map(s => {
                const m = s.match;
                const isExpanded = expandedMatchId === m.id;
                const roomCode = m.roomCode || m.id;
                const date = m.lastUpdated || m.createdAt || Date.now();
                const champ = s.champion;

                return (
                  <div
                    key={`archived-room-${m.id}`}
                    className="bg-dark-900/90 rounded-3xl border border-slate-800 hover:border-slate-700 transition-all shadow-md overflow-hidden"
                  >
                    {/* Header bar of Tournament Card */}
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          onClick={() => handleCopyCode(roomCode)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 font-mono font-black text-amber-300 text-xs tracking-wider flex items-center gap-1.5 hover:bg-amber-500/30 transition-all cursor-pointer"
                          title="Copy room code"
                        >
                          <span>{roomCode}</span>
                          {copiedCode === roomCode ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-amber-400" />
                          )}
                        </button>

                        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          {m.mode === 'series' ? `${m.totalRounds}-Round Series` : 'Word Duel'}
                        </span>

                        <span className="text-xs font-mono text-slate-400">
                          {m.gridSize}&times;{m.gridSize} {m.difficulty || 'pro'}
                        </span>

                        <span className="text-xs text-slate-500 font-mono">
                          {formatDate(date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {onSelectMatchToPlay && (
                          <button
                            onClick={() => onSelectMatchToPlay(m)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Open tournament room board"
                          >
                            <span>Open Room</span>
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                          className="px-3 py-1.5 rounded-xl bg-dark-950 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>Round Details</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={(e) => handleDeleteArchivedMatch(m.id, roomCode, e)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 transition-all cursor-pointer"
                          title="Delete archived record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Champion & Podium Summary */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                      {/* Champion Showcase Banner */}
                      {champ ? (
                        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-dark-950 border border-amber-500/40 flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base text-dark-950 shadow-md shrink-0 ring-1 ring-amber-400/50"
                            style={{ backgroundColor: champ.avatarColor }}
                          >
                            {champ.playerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-xs text-amber-400 font-mono font-bold uppercase flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>Tournament Champion</span>
                            </div>
                            <div className="text-sm font-extrabold text-slate-100 truncate">
                              {champ.playerName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Total Time: <b className="text-emerald-400">{formatMs(champ.totalTimeMs)}</b> &bull; Won {champ.roundsWon} of {m.totalRounds} round{m.totalRounds !== 1 ? 's' : ''}
                              {s.timeMarginMs !== null && (
                                <span className="text-amber-300 ml-1">
                                  (+{formatSecondsShort(s.timeMarginMs)} margin)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-xs italic">No champion determined yet.</div>
                      )}

                      {/* Standings List */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                          Final Tournament Standings ({s.standings.length} Contenders):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {s.standings.map((st, sIdx) => {
                            const isWinner = sIdx === 0;
                            return (
                              <div
                                key={`standing-${sIdx}`}
                                className={`p-2 rounded-xl border flex items-center justify-between text-xs font-mono ${
                                  isWinner
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                    : 'bg-dark-950/60 border-slate-800 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-bold text-[10px] text-slate-400">#{sIdx + 1}</span>
                                  <span className="font-sans font-bold truncate text-slate-200">{st.playerName}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-bold">{formatMs(st.totalTimeMs)}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">({st.roundsWon}W)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Round-by-Round Breakdown */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800/80 bg-dark-950/80 space-y-3">
                        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Round-by-Round Breakdown & Replays</span>
                        </div>

                        <div className="space-y-2">
                          {m.rounds.map((round, rIdx) => {
                            const rResults = Object.values(round.results || {}).sort((a, b) => a.elapsedMs - b.elapsedMs);
                            const rWinner = rResults[0] || null;

                            return (
                              <div
                                key={`round-breakdown-${rIdx}`}
                                className="p-3 rounded-2xl bg-dark-900 border border-slate-800"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-lg border border-cyan-800">
                                      Round {rIdx + 1}
                                    </span>
                                    <span className="font-bold text-xs text-slate-200">
                                      {round.theme}
                                    </span>
                                  </div>

                                  {rWinner && (
                                    <div className="text-xs font-mono text-amber-400 flex items-center gap-1">
                                      <Crown className="w-3 h-3 text-amber-400" />
                                      <span>Round Winner: <b>{rWinner.playerName}</b> ({formatMs(rWinner.elapsedMs)})</span>
                                    </div>
                                  )}
                                </div>

                                {/* Contenders turn times & replay trigger */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {rResults.map((res, pIdx) => {
                                    return (
                                      <div
                                        key={`res-${pIdx}`}
                                        className="p-2 rounded-xl bg-dark-950 border border-slate-800/80 flex items-center justify-between gap-2"
                                      >
                                        <div className="flex items-center gap-2 truncate">
                                          <div
                                            className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] text-dark-950 shrink-0"
                                            style={{ backgroundColor: res.avatarColor }}
                                          >
                                            {res.playerName.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="text-xs font-medium text-slate-200 truncate">
                                            {res.playerName}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-xs font-mono font-bold text-emerald-400">
                                            {formatMs(res.elapsedMs)}
                                          </span>

                                          {onWatchReplay && (
                                            <button
                                              onClick={() => onWatchReplay(round, res)}
                                              className="p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                              title={`Watch ${res.playerName}'s high-speed replay for this round`}
                                            >
                                              <Zap className="w-3 h-3 fill-cyan-400" />
                                              <span>Replay</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
