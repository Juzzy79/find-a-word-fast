import type { SharedGameState, GameMode, GridSize, DifficultyLevel } from '../types/game';
import type { User } from '../services/firebase';
import {
  ensureParticipantInMatch,
  deleteCloudMatch,
  archiveCloudMatch,
  removeParticipantFromCloudMatch,
  type CloudMatchDocument
} from '../services/matchService';
import { clearUrlHash, ensureUniqueTournamentRounds } from '../utils/stateEncoder';
import { sounds } from '../utils/sound';

interface UseCloudMatchActionsOptions {
  activeCloudMatch: CloudMatchDocument | null;
  currentPlayer: string;
  currentUser: User | null;
  activeRoundKeyRef: React.MutableRefObject<string>;
  setActiveCloudMatch: (match: CloudMatchDocument | null) => void;
  setGame: React.Dispatch<React.SetStateAction<SharedGameState>>;
  setLocalRoundIndex: (idx: number) => void;
  setIsRunning: (v: boolean) => void;
  setIsCompletedThisRound: (v: boolean) => void;
  setElapsedMs: (v: number) => void;
  setLastBurstSpeedMs: (v: number | null) => void;
  setWordFindTimestamps: (v: number[]) => void;
  setActiveTab: (tab: 'game' | 'stats' | 'competitions' | 'history' | 'champions' | 'admin') => void;
  onStartGame: (options: {
    mode: GameMode;
    gridSize: GridSize;
    difficulty?: DifficultyLevel;
    totalRounds?: number;
    isChaosMode?: boolean;
    themeId?: string;
    isCloudMatch?: boolean;
    isTacticsMode?: boolean;
  }) => Promise<void>;
}

export function useCloudMatchActions({
  activeCloudMatch,
  currentPlayer,
  currentUser,
  activeRoundKeyRef,
  setActiveCloudMatch,
  setGame,
  setLocalRoundIndex,
  setIsRunning,
  setIsCompletedThisRound,
  setElapsedMs,
  setLastBurstSpeedMs,
  setWordFindTimestamps,
  setActiveTab,
  onStartGame
}: UseCloudMatchActionsOptions) {
  const handleSelectCloudMatch = async (match: CloudMatchDocument) => {
    clearUrlHash();
    const sanitized = ensureUniqueTournamentRounds(match);
    setActiveCloudMatch(sanitized);
    setGame(sanitized);
    const firstUnplayed = sanitized.rounds.findIndex(
      r => !(r.results || {})[currentPlayer.toLowerCase()]
    );
    setLocalRoundIndex(firstUnplayed !== -1 ? firstUnplayed : sanitized.currentRoundIndex || 0);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wordrush_active_match_id', match.id);
    }
    if (currentPlayer && currentPlayer.toLowerCase() !== 'player 1') {
      await ensureParticipantInMatch(match.id, currentPlayer, currentUser?.uid);
    }
    activeRoundKeyRef.current = '';
    setIsRunning(false);
    setIsCompletedThisRound(false);
    setElapsedMs(0);
    setLastBurstSpeedMs(null);
    setWordFindTimestamps([]);
    setActiveTab('game');
  };

  const handleLeaveCloudMatch = () => {
    if (
      window.confirm(
        'Leave this live multiplayer match to play solo? You can re-join anytime from the Match Lobby or with the Room Code.'
      )
    ) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('wordrush_active_match_id');
      }
      clearUrlHash();
      setActiveCloudMatch(null);
      onStartGame({
        mode: 'duel',
        gridSize: 18,
        difficulty: 'pro',
        isChaosMode: false
      });
    }
  };

  const handleDeleteCurrentMatch = async () => {
    if (!activeCloudMatch) return;
    if (
      window.confirm(
        `Permanently delete room "${activeCloudMatch.roomCode || activeCloudMatch.id}"? This will delete the match for all players.`
      )
    ) {
      try {
        const ok = await deleteCloudMatch(activeCloudMatch.id);
        if (ok) {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('wordrush_active_match_id');
          }
          clearUrlHash();
          setActiveCloudMatch(null);
          onStartGame({
            mode: 'duel',
            gridSize: 18,
            difficulty: 'pro',
            isChaosMode: false
          });
        } else {
          alert('Could not delete match. Please try again.');
        }
      } catch (err) {
        console.error('Delete match error:', err);
        alert('Failed to delete room.');
      }
    }
  };

  const handleArchiveCurrentMatch = async () => {
    if (!activeCloudMatch) return;
    try {
      const ok = await archiveCloudMatch(activeCloudMatch.id);
      if (ok) {
        sounds.playVictory();
      } else {
        alert('Could not archive room. Please try again.');
      }
    } catch (err) {
      console.error('Archive match error:', err);
      alert('Failed to archive room.');
    }
  };

  const handleRemoveParticipant = async (playerNameToRemove: string) => {
    try {
      if (activeCloudMatch?.id) {
        const updated = await removeParticipantFromCloudMatch(
          activeCloudMatch.id,
          playerNameToRemove
        );
        if (updated) {
          const sanitized = ensureUniqueTournamentRounds(updated);
          setActiveCloudMatch(sanitized);
          setGame(sanitized);
        }
      } else {
        setGame(prev => {
          const targetKey = playerNameToRemove.toLowerCase().trim();
          const updatedParticipants = prev.participants.filter(
            p => p.toLowerCase().trim() !== targetKey
          );
          const updatedRounds = prev.rounds.map(r => {
            const cleanResults = { ...r.results };
            delete cleanResults[targetKey];
            return { ...r, results: cleanResults };
          });
          return {
            ...prev,
            participants: updatedParticipants,
            rounds: updatedRounds,
            lastUpdated: Date.now()
          };
        });
      }
    } catch (err) {
      console.warn('Failed to remove participant:', err);
      alert(`Could not remove ${playerNameToRemove}. Please try again.`);
    }
  };

  return {
    handleSelectCloudMatch,
    handleLeaveCloudMatch,
    handleDeleteCurrentMatch,
    handleArchiveCurrentMatch,
    handleRemoveParticipant
  };
}
