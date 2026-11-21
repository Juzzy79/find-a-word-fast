import { useEffect } from 'react';
import type { SharedGameState } from '../types/game';
import type { User } from '../services/firebase';
import {
  subscribeToMatch,
  subscribeToUserMatches,
  fetchCloudMatch,
  createCloudMatchFromState,
  ensureParticipantInMatch,
  mergeIncomingTurnsIntoCloudMatch,
  type CloudMatchDocument
} from '../services/matchService';
import {
  getGameFromUrl,
  getRoomCodeFromUrl,
  ensureUniqueTournamentRounds
} from '../utils/stateEncoder';
import { showTurnFinishedNotification } from '../services/pushNotificationService';

interface UseCloudMatchSyncOptions {
  activeCloudMatch: CloudMatchDocument | null;
  currentPlayer: string;
  currentUser: User | null;
  setActiveCloudMatch: (match: CloudMatchDocument | null) => void;
  setGame: (game: SharedGameState) => void;
  setLocalRoundIndex: (idx: number) => void;
  setActiveTab: (tab: 'game' | 'stats' | 'competitions' | 'history' | 'champions' | 'admin') => void;
}

export function useCloudMatchSync({
  activeCloudMatch,
  currentPlayer,
  currentUser,
  setActiveCloudMatch,
  setGame,
  setLocalRoundIndex,
  setActiveTab
}: UseCloudMatchSyncOptions) {
  // Real-time Firestore sync for active cloud match room with turn notification
  useEffect(() => {
    if (!activeCloudMatch?.id) return;
    const unsub = subscribeToMatch(activeCloudMatch.id, updated => {
      const sanitized = ensureUniqueTournamentRounds(updated);

      sanitized.rounds.forEach(r => {
        Object.entries(r.results || {}).forEach(([pName, res]) => {
          if (pName.toLowerCase() !== currentPlayer.toLowerCase() && res?.completedAt) {
            showTurnFinishedNotification({
              opponentName: res.playerName,
              roundNumber: r.roundNumber,
              elapsedMs: res.elapsedMs,
              roomCode: sanitized.roomCode,
              matchId: sanitized.id,
              burstSpeedMs: res.burstSpeedMs
            });
          }
        });
      });

      setActiveCloudMatch(sanitized);
      setGame(sanitized);
    });
    return () => unsub();
  }, [activeCloudMatch?.id, currentPlayer, setActiveCloudMatch, setGame]);

  // Background subscription to user matches to alert when opponents finish rounds
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToUserMatches(currentUser.uid, currentUser.email || '', matches => {
      matches.forEach(m => {
        m.rounds.forEach(r => {
          Object.entries(r.results || {}).forEach(([pName, res]) => {
            if (pName.toLowerCase() !== currentPlayer.toLowerCase() && res?.completedAt) {
              if (Date.now() - res.completedAt < 86400000) {
                showTurnFinishedNotification({
                  opponentName: res.playerName,
                  roundNumber: r.roundNumber,
                  elapsedMs: res.elapsedMs,
                  roomCode: m.roomCode,
                  matchId: m.id,
                  burstSpeedMs: res.burstSpeedMs
                });
              }
            }
          });
        });
      });
    });
    return () => unsub();
  }, [currentUser?.uid, currentUser?.email, currentPlayer]);

  // Auto-connect to cloud match from URL (#room=... or #game=...) or localStorage
  useEffect(() => {
    const attachCloudRoom = async () => {
      const urlCode = getRoomCodeFromUrl();
      const urlGame = getGameFromUrl();
      const candidateCode =
        urlCode || (urlGame?.id && /^[A-Z0-9]{4,10}$/i.test(urlGame.id) ? urlGame.id : null);

      let targetId = candidateCode;
      if (!targetId && typeof localStorage !== 'undefined') {
        targetId = localStorage.getItem('wordrush_active_match_id');
      }

      if (targetId) {
        try {
          let cloudDoc = await fetchCloudMatch(targetId);
          if (cloudDoc) {
            cloudDoc = ensureUniqueTournamentRounds(cloudDoc);
            if (urlGame) {
              cloudDoc = await mergeIncomingTurnsIntoCloudMatch(
                cloudDoc,
                ensureUniqueTournamentRounds(urlGame)
              );
            }
            setActiveCloudMatch(cloudDoc);
            setGame(cloudDoc);
            const firstUnplayed = cloudDoc.rounds.findIndex(
              r => !(r.results || {})[currentPlayer.toLowerCase()]
            );
            setLocalRoundIndex(firstUnplayed !== -1 ? firstUnplayed : cloudDoc.currentRoundIndex || 0);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('wordrush_active_match_id', cloudDoc.id);
            }
            if (currentPlayer && currentPlayer.toLowerCase() !== 'player 1') {
              await ensureParticipantInMatch(cloudDoc.id, currentPlayer, currentUser?.uid);
            }
          } else if (urlGame && Object.keys(urlGame.rounds[0]?.results || {}).length > 0) {
            const newCloud = await createCloudMatchFromState(
              ensureUniqueTournamentRounds(urlGame),
              currentUser
            );
            setActiveCloudMatch(newCloud);
            setGame(newCloud);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('wordrush_active_match_id', newCloud.id);
            }
          }
        } catch (err) {
          console.warn('Failed to auto-attach cloud match:', err);
        }
      } else if (urlGame && Object.keys(urlGame.rounds[0]?.results || {}).length > 0) {
        try {
          const newCloud = await createCloudMatchFromState(
            ensureUniqueTournamentRounds(urlGame),
            currentUser
          );
          setActiveCloudMatch(newCloud);
          setGame(newCloud);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('wordrush_active_match_id', newCloud.id);
          }
        } catch (err) {
          console.warn('Failed to promote challenge to cloud match:', err);
        }
      }
    };

    attachCloudRoom();
  }, [currentUser?.uid]);

  // Ensure current user is in participants of active match when name or login changes
  useEffect(() => {
    if (activeCloudMatch?.id && currentPlayer && currentPlayer.toLowerCase() !== 'player 1') {
      ensureParticipantInMatch(activeCloudMatch.id, currentPlayer, currentUser?.uid);
    }
  }, [activeCloudMatch?.id, currentPlayer, currentUser?.uid]);

  // Handle URL hash changes (when player opens a new share link)
  useEffect(() => {
    const handleHashChange = async () => {
      const urlCode = getRoomCodeFromUrl();
      const incoming = getGameFromUrl();
      const candidateCode =
        urlCode || (incoming?.id && /^[A-Z0-9]{4,10}$/i.test(incoming.id) ? incoming.id : null);

      if (candidateCode) {
        try {
          let cloudDoc = await fetchCloudMatch(candidateCode);
          if (cloudDoc) {
            cloudDoc = ensureUniqueTournamentRounds(cloudDoc);
            if (incoming) {
              cloudDoc = await mergeIncomingTurnsIntoCloudMatch(
                cloudDoc,
                ensureUniqueTournamentRounds(incoming)
              );
            }
            setActiveCloudMatch(cloudDoc);
            setGame(cloudDoc);
            const firstUnplayed = cloudDoc.rounds.findIndex(
              r => !(r.results || {})[currentPlayer.toLowerCase()]
            );
            setLocalRoundIndex(firstUnplayed !== -1 ? firstUnplayed : cloudDoc.currentRoundIndex || 0);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('wordrush_active_match_id', cloudDoc.id);
            }
            if (currentPlayer && currentPlayer.toLowerCase() !== 'player 1') {
              await ensureParticipantInMatch(cloudDoc.id, currentPlayer, currentUser?.uid);
            }
            setActiveTab('game');
            return;
          } else if (incoming && Object.keys(incoming.rounds[0]?.results || {}).length > 0) {
            const newCloud = await createCloudMatchFromState(
              ensureUniqueTournamentRounds(incoming),
              currentUser
            );
            setActiveCloudMatch(newCloud);
            setGame(newCloud);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('wordrush_active_match_id', newCloud.id);
            }
            setActiveTab('game');
            return;
          }
        } catch (err) {
          console.warn('Failed to attach cloud match on hash change:', err);
        }
      } else if (incoming && Object.keys(incoming.rounds[0]?.results || {}).length > 0) {
        try {
          const newCloud = await createCloudMatchFromState(
            ensureUniqueTournamentRounds(incoming),
            currentUser
          );
          setActiveCloudMatch(newCloud);
          setGame(newCloud);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('wordrush_active_match_id', newCloud.id);
          }
          setActiveTab('game');
          return;
        } catch (err) {
          console.warn('Failed to promote challenge to cloud match:', err);
        }
      }

      if (incoming) {
        setActiveCloudMatch(null);
        setGame(incoming);
        setActiveTab('game');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentPlayer, currentUser?.uid, setActiveCloudMatch, setGame, setLocalRoundIndex, setActiveTab]);
}
