import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { GridSize, DifficultyLevel, GameMode } from '../types/game';
import {
  createCloudMatch,
  joinMatchByCode,
  deleteCloudMatch,
  archiveCloudMatch,
  subscribeToUserMatches,
  subscribeToOpenMatches,
  type CloudMatchDocument
} from '../services/matchService';
import { formatMs } from '../utils/formatters';
import {
  Users,
  Swords,
  Plus,
  KeyRound,
  LogOut,
  X,
  Play,
  CheckCircle2,
  Sparkles,
  Trophy,
  RefreshCw,
  Compass,
  Trash2,
  Archive,
  ArrowRight,
  Crown
} from 'lucide-react';

interface LiveLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSelectMatch: (match: CloudMatchDocument) => void;
  onOpenChampions?: () => void;
}

export const LiveLobbyModal: React.FC<LiveLobbyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onGoogleLogin,
  onGoogleLogout,
  onSelectMatch,
  onOpenChampions
}) => {
  const [activeTab, setActiveTab] = useState<'matches' | 'create' | 'join'>('matches');
  const [matchSubFilter, setMatchSubFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [matches, setMatches] = useState<CloudMatchDocument[]>([]);
  const [openMatches, setOpenMatches] = useState<CloudMatchDocument[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create Room state
  const [selectedMode, setSelectedMode] = useState<GameMode>('duel');
  const [gridSize, setGridSize] = useState<GridSize>(18);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('pro');
  const [seriesRounds, setSeriesRounds] = useState<number>(3);
  const [isChaosMode, setIsChaosMode] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState(false);

  // Subscribe to live matches in Firestore (both open public matches and personal matches)
  useEffect(() => {
    if (!isOpen) return;

    // 1. Subscribe to all active matches waiting for players in the lobby
    const unsubOpen = subscribeToOpenMatches(list => {
      setOpenMatches(list);
    });

    // 2. Subscribe to user's personal matches if logged in
    let unsubUser = () => {};
    if (currentUser) {
      unsubUser = subscribeToUserMatches(
        currentUser.uid,
        currentUser.email || '',
        list => {
          setMatches(list);
        }
      );
    }

    return () => {
      unsubOpen();
      unsubUser();
    };
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    if (!currentUser) {
      onGoogleLogin();
      return;
    }
    setIsCreating(true);
    try {
      const match = await createCloudMatch({
        mode: selectedMode,
        gridSize,
        difficulty,
        totalRounds: selectedMode === 'series' ? seriesRounds : 1,
        isChaosMode,
        creatorName: currentUser.displayName || 'Player',
        creatorUid: currentUser.uid,
        creatorEmail: currentUser.email || ''
      });

      onSelectMatch(match);
      onClose();
    } catch (err: any) {
      console.error('Failed to create match:', err);
      alert('Could not create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinDirectly = async (matchToJoin: CloudMatchDocument) => {
    setIsJoining(true);
    try {
      const codeToUse = matchToJoin.roomCode || matchToJoin.id;
      const guestName = (typeof localStorage !== 'undefined' && localStorage.getItem('wordrush_current_profile')) || 'Player';
      const userPayload = currentUser ? {
        uid: currentUser.uid,
        displayName: currentUser.displayName || guestName,
        email: currentUser.email || ''
      } : {
        uid: 'guest_' + Math.random().toString(36).substring(2, 9),
        displayName: guestName,
        email: ''
      };

      const joined = await joinMatchByCode(codeToUse, userPayload);
      if (joined) {
        onSelectMatch(joined);
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to join match directly:', err);
      alert('Could not join match. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDeleteMatch = async (matchId: string, roomCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently delete room "${roomCode}"? This will remove the match for all players.`)) {
      return;
    }
    try {
      const ok = await deleteCloudMatch(matchId);
      if (ok) {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('wordrush_active_match_id') === matchId) {
          localStorage.removeItem('wordrush_active_match_id');
        }
      } else {
        alert('Could not delete match. Please try again.');
      }
    } catch (err) {
      console.error('Delete match error:', err);
      alert('Failed to delete room.');
    }
  };

  const handleArchiveMatch = async (matchId: string, roomCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Archive tournament room "${roomCode}" into the Champions Hall of Fame?`)) {
      return;
    }
    try {
      const ok = await archiveCloudMatch(matchId);
      if (!ok) {
        alert('Could not archive room. Please try again.');
      }
    } catch (err) {
      console.error('Archive match error:', err);
      alert('Failed to archive room.');
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      const guestName = (typeof localStorage !== 'undefined' && localStorage.getItem('wordrush_current_profile')) || 'Player';
      const userPayload = currentUser ? {
        uid: currentUser.uid,
        displayName: currentUser.displayName || guestName,
        email: currentUser.email || ''
      } : {
        uid: 'guest_' + Math.random().toString(36).substring(2, 9),
        displayName: guestName,
        email: ''
      };

      const match = await joinMatchByCode(joinCode, userPayload);

      if (!match) {
        setJoinError('No match found with that room code. Check the code and try again.');
      } else {
        onSelectMatch(match);
        onClose();
      }
    } catch (err: any) {
      setJoinError('Failed to join match. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="w-full max-w-xl glass-panel-glow rounded-3xl p-5 sm:p-6 my-auto text-slate-100 border-slate-700/80 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Cloud Multiplayer & Live Sync</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Live Matches with Family & Friends</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Play together seamlessly on the webpage without having to text links back and forth!
          </p>
        </div>

        {/* Global Champions & Archived Tournaments Callout Banner */}
        {onOpenChampions && (
          <div className="bg-gradient-to-r from-amber-950/70 via-dark-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold shrink-0">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                  <span>Global Champions & Records</span>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                    Hall of Fame
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  View crowned champions, fastest speeds, and archived tournament results!
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenChampions();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-sm shadow-amber-500/20"
            >
              <span>View Hall</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Google Authentication Status Banner */}
        {!currentUser ? (
          <div className="bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 rounded-2xl p-4 mb-4 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-sm text-slate-100 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Log in with Google to Connect</span>
            </div>
            <p className="text-xs text-slate-300 mb-3 max-w-md mx-auto">
              Logging in ensures your personal stats, best times, and match challenges are saved directly against your Google account.
            </p>
            <button
              onClick={onGoogleLogin}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-dark-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.97 0 12s.45 3.86 1.24 5.43l4.04-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>
          </div>
        ) : (
          <div className="bg-dark-900/90 border border-slate-800 rounded-2xl p-3 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-9 h-9 rounded-full border border-emerald-500/50 shadow"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-sm">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                  <span>{currentUser.displayName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Google Connected
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                  {currentUser.email}
                </div>
              </div>
            </div>
            <button
              onClick={onGoogleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-dark-950 border border-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1.5 bg-dark-950 p-1 rounded-2xl border border-slate-800 mb-4">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'matches'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Active Matches ({matches.length + openMatches.filter(om => !currentUser || !(om.participantUids || []).includes(currentUser.uid)).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-slate-800 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Room</span>
          </button>

          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'join'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>

        {/* TAB 1: ACTIVE MATCHES */}
        {activeTab === 'matches' && (() => {
          const availableOpenMatches = openMatches.filter(
            om => !currentUser || !(om.participantUids || []).includes(currentUser.uid)
          );

          if (matches.length === 0 && availableOpenMatches.length === 0) {
            return (
              <div className="text-center py-8 text-slate-400">
                <Swords className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <div className="text-xs font-bold text-slate-300 mb-1">No Active Cloud Matches</div>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-3">
                  Create a room to challenge anyone, or enter a room code if someone already created one!
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold inline-flex items-center gap-1 hover:bg-emerald-500/30 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Room</span>
                </button>
              </div>
            );
          }

          return (
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {/* Available Open Rooms to Join */}
              {availableOpenMatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open Games Waiting to Join ({availableOpenMatches.length})</span>
                  </div>
                  <div className="space-y-2">
                    {availableOpenMatches.map(m => {
                      const currentRound = m.rounds[m.currentRoundIndex] || m.rounds[0];
                      const hostName = m.createdBy || 'Host';

                      return (
                        <div
                          key={`open-${m.id}`}
                          className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-dark-900 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                                {m.roomCode}
                              </span>
                              <span className="font-bold text-xs text-slate-100">
                                {currentRound.theme}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({currentRound.gridSize}×{currentRound.gridSize})
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {m.mode === 'series' ? `${m.totalRounds}-Round Series` : 'Word Duel'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Host: <b className="text-slate-200">{hostName}</b> &bull; Players: <span className="text-slate-300 font-semibold">{m.participants.join(', ')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleJoinDirectly(m)}
                              disabled={isJoining}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-dark-950" />
                              <span>Join & Play Now</span>
                            </button>
                            <button
                              onClick={(e) => handleDeleteMatch(m.id, m.roomCode, e)}
                              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                              title="Delete room"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* My Joined Matches */}
              {currentUser && matches.length > 0 && (() => {
                const activeUserMatches = matches.filter(m => m.status !== 'completed');
                const archivedUserMatches = matches.filter(m => m.status === 'completed');
                const displayedUserMatches = matchSubFilter === 'active'
                  ? activeUserMatches
                  : matchSubFilter === 'archived'
                  ? archivedUserMatches
                  : matches;

                return (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>My Joined Matches ({matches.length})</span>
                      </div>

                      {/* Sub-Filter: All / Active / Archived */}
                      <div className="flex items-center gap-1 bg-dark-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                        <button
                          onClick={() => setMatchSubFilter('all')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                            matchSubFilter === 'all'
                              ? 'bg-slate-800 text-slate-100 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          All ({matches.length})
                        </button>
                        <button
                          onClick={() => setMatchSubFilter('active')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                            matchSubFilter === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Active ({activeUserMatches.length})
                        </button>
                        <button
                          onClick={() => setMatchSubFilter('archived')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                            matchSubFilter === 'archived'
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Archived ({archivedUserMatches.length})
                        </button>
                      </div>
                    </div>

                    {displayedUserMatches.length === 0 ? (
                      <div className="text-center py-4 bg-dark-900/50 rounded-2xl border border-slate-800 text-xs text-slate-400">
                        {matchSubFilter === 'archived' ? 'No archived tournaments yet.' : 'No active matches found.'}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {displayedUserMatches.map(m => {
                          const currentRound = m.rounds[m.currentRoundIndex] || m.rounds[0];
                          const myResult = currentRound.results[currentUser.uid] || currentRound.results[currentUser.displayName?.toLowerCase() || ''];
                          const opponentResults = Object.values(currentRound.results).filter(
                            r => r.playerName.toLowerCase() !== (currentUser.displayName || '').toLowerCase()
                          );
                          const isArchived = m.status === 'completed';

                          // Find champion if tournament is finished
                          let championName = '';
                          if (isArchived) {
                            const winCounts: Record<string, number> = {};
                            m.rounds.forEach(r => {
                              const rRes = Object.values(r.results || {}).sort((a, b) => a.elapsedMs - b.elapsedMs);
                              if (rRes.length > 0) {
                                const w = rRes[0].playerName;
                                winCounts[w] = (winCounts[w] || 0) + 1;
                              }
                            });
                            const sortedWinners = Object.entries(winCounts).sort((a, b) => b[1] - a[1]);
                            if (sortedWinners.length > 0) {
                              championName = sortedWinners[0][0];
                            }
                          }

                          return (
                            <div
                              key={`match-${m.id}`}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isArchived
                                  ? 'bg-dark-900/70 border-amber-500/30 hover:border-amber-500/60'
                                  : 'bg-dark-900 border-slate-800 hover:border-cyan-500/40'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                                    {m.roomCode}
                                  </span>
                                  <span className="font-bold text-xs text-slate-200">
                                    {currentRound.theme}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    ({currentRound.gridSize}×{currentRound.gridSize})
                                  </span>
                                  {isArchived ? (
                                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 font-bold">
                                      <Archive className="w-2.5 h-2.5" />
                                      Archived
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      Live Room
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {m.mode === 'series' ? `${m.totalRounds}-Round Series` : 'Quick Duel'}
                                </span>
                              </div>

                              {/* Champion indicator if archived */}
                              {isArchived && championName && (
                                <div className="mb-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Champion: <span className="text-white">{championName}</span></span>
                                  </div>
                                  {onOpenChampions && (
                                    <button
                                      onClick={() => {
                                        onClose();
                                        onOpenChampions();
                                      }}
                                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                                    >
                                      View in Hall
                                    </button>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-slate-400">Players:</span>
                                  <span className="text-slate-200 font-semibold">
                                    {m.participants.join(', ')}
                                  </span>
                                  {opponentResults.length > 0 && (
                                    <span className="text-emerald-400 text-[11px] font-mono font-bold">
                                      &bull; Best: {formatMs(Math.min(...opponentResults.map(o => o.elapsedMs)))}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => {
                                      onSelectMatch(m);
                                      onClose();
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                      isArchived
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                                        : myResult
                                        ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                        : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 shadow-md shadow-emerald-500/20 hover:opacity-95'
                                    }`}
                                  >
                                    {isArchived ? (
                                      <>
                                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                        <span>View Results</span>
                                      </>
                                    ) : myResult ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>View Board ({formatMs(myResult.elapsedMs)})</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3.5 h-3.5" />
                                        <span>Play Now</span>
                                      </>
                                    )}
                                  </button>

                                  {!isArchived && (
                                    <button
                                      onClick={(e) => handleArchiveMatch(m.id, m.roomCode, e)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 border border-slate-800 hover:border-teal-500/30 transition-all cursor-pointer"
                                      title="Archive room into Champions Hall of Fame"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    onClick={(e) => handleDeleteMatch(m.id, m.roomCode, e)}
                                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                                    title="Delete room"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* TAB 2: CREATE ROOM */}
        {activeTab === 'create' && (
          <div className="space-y-3.5">
            <div>
              <div className="text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Match Type:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'duel' as GameMode, title: 'Quick Duel', desc: '1-Round Showdown' },
                  { mode: 'series' as GameMode, title: 'Multi-Round Series', desc: '3 Rounds Aggregate' }
                ].map(opt => (
                  <button
                    key={`m-${opt.mode}`}
                    onClick={() => setSelectedMode(opt.mode)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedMode === opt.mode
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                        : 'bg-dark-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.title}</div>
                    <div className="text-[10px] text-slate-500">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selector */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Word Directions:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { lvl: 'standard' as DifficultyLevel, title: 'Standard', desc: 'H & V Only' },
                  { lvl: 'pro' as DifficultyLevel, title: 'Pro ✨', desc: '+ Diagonals' },
                  { lvl: 'expert' as DifficultyLevel, title: 'Expert ⚡', desc: '8-Way + Rev' }
                ].map(item => (
                  <button
                    key={`diff-${item.lvl}`}
                    onClick={() => setDifficulty(item.lvl)}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      difficulty === item.lvl
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-dark-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{item.title}</div>
                    <div className="text-[10px] text-slate-500">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {selectedMode === 'series' && (
              <div className="p-2.5 rounded-xl bg-dark-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-semibold">Series Rounds:</span>
                <div className="flex gap-1.5">
                  {[3, 5].map(r => (
                    <button
                      key={`series-round-${r}`}
                      onClick={() => setSeriesRounds(r)}
                      className={`px-3 py-1 rounded-lg font-mono font-bold transition-all ${
                        seriesRounds === r
                          ? 'bg-cyan-500 text-dark-950 shadow'
                          : 'bg-dark-950 border border-slate-800 text-slate-300'
                      }`}
                    >
                      {r} Rounds
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Grid Size:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sz: 16, label: '16×16', words: '14 words' },
                  { sz: 18, label: '18×18', words: '18 words' },
                  { sz: 20, label: '20×20', words: '22 words' }
                ].map(item => (
                  <button
                    key={`sz-${item.sz}`}
                    onClick={() => setGridSize(item.sz as GridSize)}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      gridSize === item.sz
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-dark-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{item.label}</div>
                    <div className="text-[9px] text-slate-500">{item.words}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Random Chaos Mode Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Total Chaos Mode</div>
                <div className="text-[10px] text-slate-400">Random words instead of a single theme</div>
              </div>
              <button
                type="button"
                onClick={() => setIsChaosMode(!isChaosMode)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isChaosMode ? 'bg-violet-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isChaosMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              disabled={isCreating || !currentUser}
              onClick={handleCreateRoom}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Room in Cloud...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Room & Generate Code</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 3: JOIN BY CODE */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinByCode} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Enter 6-Letter Room Code:
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 6NTYZW"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-dark-950 border border-slate-700 rounded-2xl py-3 px-4 font-mono font-black text-xl text-center tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                Ask your opponent for their 6-character room code.
              </p>
            </div>

            {joinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
                {joinError}
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || !joinCode.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-dark-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isJoining ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Joining Match...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Join & Start Match</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
