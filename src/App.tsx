import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { SharedGameState, GridBoard, PlayerTurnResult, GameMode, GridSize, DifficultyLevel, TacticalTrap, LivePlayerStream } from './types/game';
import { Header } from './components/Header';
import { TimerDisplay } from './components/TimerDisplay';
import { WordGrid } from './components/WordGrid';
import { WordBank } from './components/WordBank';
import { PassTurnModal } from './components/PassTurnModal';
import { StatsDashboard } from './components/StatsDashboard';
import { CompetitionModal } from './components/CompetitionModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { VictoryModal } from './components/VictoryModal';
import { HistoryView } from './components/HistoryView';
import { ReplayModal } from './components/ReplayModal';
import { CloudMatchHub } from './components/CloudMatchHub';
import { TacticalHUD } from './components/TacticalHUD';
import { TacticalAmbushModal } from './components/TacticalAmbushModal';
import { LiveSpectatorModal } from './components/LiveSpectatorModal';
import { AdminTopicsDashboard } from './components/AdminTopicsDashboard';
import { generateGridBoard } from './utils/gridGenerator';
import {
  getGameFromUrl,
  getRoomCodeFromUrl,
  createNewGame,
  ensureUniqueTournamentRounds,
  clearUrlHash
} from './utils/stateEncoder';
import {
  getCurrentProfile,
  setCurrentProfile,
  recordGameCompletion,
  getCareerStats
} from './utils/statsStorage';
import { sounds, triggerHaptic } from './utils/sound';
import { Play, Share2, Trophy, Swords, Zap, Coffee, RotateCcw, LogOut, Flame, ChevronDown, X, Sparkles } from 'lucide-react';
import { formatMs } from './utils/formatters';
import { auth, loginWithGoogle, logoutUser, onAuthStateChanged, type User } from './services/firebase';
import { LiveLobbyModal } from './components/LiveLobbyModal';
import { ChampionsDashboard } from './components/ChampionsDashboard';
import { PsychOutModal } from './components/PsychOutModal';
import {
  subscribeToMatch,
  subscribeToUserMatches,
  submitCloudTurnResult,
  saveUserCloudStats,
  fetchUserCloudStats,
  fetchCloudMatch,
  createCloudMatch,
  createCloudMatchFromState,
  advanceCloudMatchRound,
  ensureParticipantInMatch,
  mergeIncomingTurnsIntoCloudMatch,
  deleteCloudMatch,
  archiveCloudMatch,
  streamLivePlayerProgress,
  armTacticalTrap,
  removeParticipantFromCloudMatch,
  type CloudMatchDocument
} from './services/matchService';
import {
  showTurnFinishedNotification,
  registerPushServiceWorker
} from './services/pushNotificationService';

export function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<'game' | 'stats' | 'competitions' | 'history' | 'champions' | 'admin'>('game');
  const [currentPlayer, setCurrentPlayer] = useState<string>(() => getCurrentProfile());

  // Modals state - Do NOT auto-open sign-in on first visit
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return !localStorage.getItem('wordrush_seen_how_to_play');
  });
  const [isMobileWordSheetOpen, setIsMobileWordSheetOpen] = useState<boolean>(false);
  const [showCompetitionModal, setShowCompetitionModal] = useState<boolean>(false);
  const [showPassTurnModal, setShowPassTurnModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [showLobbyModal, setShowLobbyModal] = useState<boolean>(false);
  const [showPsychOutModal, setShowPsychOutModal] = useState<boolean>(false);
  const [seenPsychOutKeys, setSeenPsychOutKeys] = useState<Set<string>>(() => new Set());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeCloudMatch, setActiveCloudMatch] = useState<CloudMatchDocument | null>(null);
  const [replayContender, setReplayContender] = useState<PlayerTurnResult | null>(null);

  // Listen for Google Auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'Player';
        setCurrentPlayer(displayName);
        setCurrentProfile(displayName);

        // Sync cloud stats if available
        try {
          const cloudStats = await fetchUserCloudStats(user.uid);
          if (cloudStats && typeof localStorage !== 'undefined') {
            localStorage.setItem(`wordrush_stats_v1_${displayName.toLowerCase()}`, JSON.stringify(cloudStats));
          }
        } catch (err) {
          console.warn('Failed to load cloud stats:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Register Service Worker on startup
  useEffect(() => {
    registerPushServiceWorker();
  }, []);

  // Real-time Firestore sync for active cloud match room with turn notification
  useEffect(() => {
    if (!activeCloudMatch?.id) return;
    const unsub = subscribeToMatch(activeCloudMatch.id, updated => {
      const sanitized = ensureUniqueTournamentRounds(updated);

      // Notify if opponent finished a round
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
  }, [activeCloudMatch?.id, currentPlayer]);

  // Background subscription to user matches to alert when opponents finish rounds
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = subscribeToUserMatches(currentUser.uid, currentUser.email || '', matches => {
      matches.forEach(m => {
        m.rounds.forEach(r => {
          Object.entries(r.results || {}).forEach(([pName, res]) => {
            if (pName.toLowerCase() !== currentPlayer.toLowerCase() && res?.completedAt) {
              // Only alert if completed in the last 24 hours
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
  }, [currentUser?.uid, currentPlayer]);

  // Active game state
  const [game, setGame] = useState<SharedGameState>(() => {
    const urlGame = getGameFromUrl();
    if (urlGame) return ensureUniqueTournamentRounds(urlGame);
    return createNewGame({
      mode: 'duel',
      gridSize: 18,
      creatorName: getCurrentProfile()
    });
  });

  // Local round index currently being viewed or played by this player
  const [localRoundIndex, setLocalRoundIndex] = useState<number>(() => {
    const urlGame = getGameFromUrl();
    return urlGame?.currentRoundIndex || 0;
  });

  // Current board state for active round
  const currentRound = game.rounds[localRoundIndex] || game.rounds[0];
  const [board, setBoard] = useState<GridBoard>(() => {
    const isChaos = Boolean(currentRound.isChaosMode || currentRound.themeId === 'chaos' || game.isChaosMode || game.title?.includes('Chaos'));
    return generateGridBoard(currentRound.gridSize, currentRound.seed, isChaos, currentRound.difficulty || 'pro', currentRound.themeId, currentRound.customWords);
  });

  // Timer & In-game tracking
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastBurstSpeedMs, setLastBurstSpeedMs] = useState<number | null>(null);
  const [wordFindTimestamps, setWordFindTimestamps] = useState<number[]>([]);
  const [isCompletedThisRound, setIsCompletedThisRound] = useState<boolean>(false);
  const [isNewBestTime, setIsNewBestTime] = useState<boolean>(false);

  // Tactical Warfare State
  const [earnedTrapsCount, setEarnedTrapsCount] = useState<number>(0);
  const [showEarnedAlert, setShowEarnedAlert] = useState<boolean>(false);
  const [activeTrap, setActiveTrap] = useState<TacticalTrap | null>(null);
  const [dodgedTraps, setDodgedTraps] = useState<TacticalTrap[]>([]);
  const [triggeredTraps, setTriggeredTraps] = useState<TacticalTrap[]>([]);
  const [showAmbushModal, setShowAmbushModal] = useState<boolean>(false);

  // Live Spectator State
  const [showLiveSpectatorModal, setShowLiveSpectatorModal] = useState<boolean>(false);
  const [spectatingStream, setSpectatingStream] = useState<LivePlayerStream | null>(null);

  // Timing references
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const lastFindTimeRef = useRef<number>(0);
  const replayLogRef = useRef<{ word: string; atMs: number }[]>([]);
  const earnedTrapsCountRef = useRef<number>(0);
  const activeRoundKeyRef = useRef<string>('');
  const isSolvingRef = useRef<boolean>(false);

  // Keep isSolvingRef synchronously in sync with live play state
  useEffect(() => {
    isSolvingRef.current = isRunning || isPaused || countdown !== null;
  }, [isRunning, isPaused, countdown]);

  // Check if player has already completed this round in loaded state
  useEffect(() => {
    const round = game.rounds[localRoundIndex] || game.rounds[0];
    const playerKey = currentPlayer.toLowerCase();
    const existingResult = round?.results?.[playerKey];
    const roundKey = `${game.id}_r${localRoundIndex}_${round?.seed}_${playerKey}`;

    // CRITICAL FIX: If player is actively in mid-game (solving, paused, or in countdown),
    // NEVER allow incoming match updates (such as an opponent finishing or live progress) to wipe or reset their board/turn!
    if (isRunning || isPaused || countdown !== null || isSolvingRef.current) {
      return;
    }

    // If this exact round is already loaded and marked completed, do not re-generate board on background updates
    if (activeRoundKeyRef.current === roundKey && isCompletedThisRound) {
      return;
    }

    activeRoundKeyRef.current = roundKey;
    setIsPaused(false);

    if (existingResult) {
      setIsCompletedThisRound(true);
      setElapsedMs(existingResult.elapsedMs);
      setLastBurstSpeedMs(existingResult.burstSpeedMs);
      setIsRunning(false);
    } else if (game.mode === 'zen') {
      // In Zen mode, the board is immediately playable without countdowns or timers
      setIsCompletedThisRound(false);
      setIsRunning(true);
      setElapsedMs(0);
      setLastBurstSpeedMs(null);
      setWordFindTimestamps([]);
      startTimeRef.current = Date.now();
      lastFindTimeRef.current = 0;
      replayLogRef.current = [];
    } else {
      setIsCompletedThisRound(false);
      setIsRunning(false);
      setElapsedMs(0);
      setLastBurstSpeedMs(null);
      setWordFindTimestamps([]);
    }

    // Generate board for current round
    const isChaos = Boolean(round?.isChaosMode || round?.themeId === 'chaos' || game.isChaosMode || game.title?.includes('Chaos'));
    const newBoard = generateGridBoard(round.gridSize, round.seed, isChaos, round.difficulty || 'pro', round.themeId, round?.customWords);
    if (existingResult) {
      newBoard.words = newBoard.words.map(w => ({ ...w, found: true }));
    }
    setBoard(newBoard);
  }, [localRoundIndex, game.id, currentPlayer, currentRound?.seed, currentRound?.themeId, currentRound?.customWords, game.title, game.mode, isRunning, isPaused, countdown, isCompletedThisRound]);

  // Auto-connect to cloud match from URL (#room=... or #game=...) or localStorage
  useEffect(() => {
    const attachCloudRoom = async () => {
      const urlCode = getRoomCodeFromUrl();
      const urlGame = getGameFromUrl();
      const candidateCode = urlCode || (urlGame?.id && /^[A-Z0-9]{4,10}$/i.test(urlGame.id) ? urlGame.id : null);

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
              cloudDoc = await mergeIncomingTurnsIntoCloudMatch(cloudDoc, ensureUniqueTournamentRounds(urlGame));
            }
            setActiveCloudMatch(cloudDoc);
            setGame(cloudDoc);
            const firstUnplayed = cloudDoc.rounds.findIndex(r => !(r.results || {})[currentPlayer.toLowerCase()]);
            setLocalRoundIndex(firstUnplayed !== -1 ? firstUnplayed : (cloudDoc.currentRoundIndex || 0));
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('wordrush_active_match_id', cloudDoc.id);
            }
            if (currentPlayer && currentPlayer.toLowerCase() !== 'player 1') {
              await ensureParticipantInMatch(cloudDoc.id, currentPlayer, currentUser?.uid);
            }
          } else if (urlGame && Object.keys(urlGame.rounds[0]?.results || {}).length > 0) {
            // Incoming challenge had player results not yet in Firestore -> auto-promote to live Cloud Match!
            const newCloud = await createCloudMatchFromState(ensureUniqueTournamentRounds(urlGame), currentUser);
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
        // Shared challenge link without pre-existing room -> promote to live Cloud Match!
        try {
          const newCloud = await createCloudMatchFromState(ensureUniqueTournamentRounds(urlGame), currentUser);
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
      const candidateCode = urlCode || (incoming?.id && /^[A-Z0-9]{4,10}$/i.test(incoming.id) ? incoming.id : null);

      if (candidateCode) {
        try {
          let cloudDoc = await fetchCloudMatch(candidateCode);
          if (cloudDoc) {
            cloudDoc = ensureUniqueTournamentRounds(cloudDoc);
            if (incoming) {
              cloudDoc = await mergeIncomingTurnsIntoCloudMatch(cloudDoc, ensureUniqueTournamentRounds(incoming));
            }
            setActiveCloudMatch(cloudDoc);
            setGame(cloudDoc);
            const firstUnplayed = cloudDoc.rounds.findIndex(r => !(r.results || {})[currentPlayer.toLowerCase()]);
            setLocalRoundIndex(firstUnplayed !== -1 ? firstUnplayed : (cloudDoc.currentRoundIndex || 0));
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('wordrush_active_match_id', cloudDoc.id);
            }
            if (currentPlayer && currentPlayer.toLowerCase() !== 'player 1') {
              await ensureParticipantInMatch(cloudDoc.id, currentPlayer, currentUser?.uid);
            }
            setActiveTab('game');
            return;
          } else if (incoming && Object.keys(incoming.rounds[0]?.results || {}).length > 0) {
            // Incoming challenge had player results not yet in Firestore -> auto-promote to live Cloud Match!
            const newCloud = await createCloudMatchFromState(ensureUniqueTournamentRounds(incoming), currentUser);
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
          const newCloud = await createCloudMatchFromState(ensureUniqueTournamentRounds(incoming), currentUser);
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
  }, [currentPlayer, currentUser?.uid]);

  // Timer ticking loop (disabled in Zen untimed mode)
  useEffect(() => {
    if (isRunning && game.mode !== 'zen') {
      startTimeRef.current = Date.now() - elapsedMs;
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 16);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, elapsedMs, game.mode]);

  // Countdown before starting round (3..2..1..GO)
  const startTurnWithCountdown = () => {
    setCountdown(3);
    sounds.playTileTick();
    replayLogRef.current = [];
    earnedTrapsCountRef.current = 0;
    setEarnedTrapsCount(0);
    setActiveTrap(null);
    setDodgedTraps([]);
    setTriggeredTraps([]);
    const interval = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          sounds.playWordFound();
          setIsRunning(true);
          startTimeRef.current = Date.now();
          lastFindTimeRef.current = 0;

          // Stream live race start
          const matchId = activeCloudMatch?.id || (game.id && /^[A-Z0-9]{4,10}$/i.test(game.id) ? game.id : (typeof localStorage !== 'undefined' ? localStorage.getItem('wordrush_active_match_id') : null));
          if (matchId) {
            streamLivePlayerProgress(matchId, {
              playerName: currentPlayer,
              roundIndex: localRoundIndex,
              isPlaying: true,
              elapsedMs: 0,
              wordsFound: [],
              totalWords: board.words.length,
              lastHeartbeat: Date.now()
            }).catch(() => {});
          }

          return null;
        }
        sounds.playTileTick();
        return prev - 1;
      });
    }, 800);
  };

  // Tactical Ambush Evaluation Loop: detonate armed curses at trigger timings
  useEffect(() => {
    if (!isRunning || !(game.isTacticsMode || activeCloudMatch?.isTacticsMode)) {
      if (activeTrap) setActiveTrap(null);
      return;
    }

    const armedTraps = currentRound?.tacticalTraps || [];
    const myTraps = armedTraps.filter(t =>
      t.createdBy.toLowerCase() !== currentPlayer.toLowerCase() &&
      (t.targetPlayer === 'all' || t.targetPlayer.toLowerCase() === currentPlayer.toLowerCase())
    );

    const detonating = myTraps.find(t =>
      elapsedMs >= t.triggerAtMs && elapsedMs < (t.triggerAtMs + t.durationMs)
    );

    if (detonating) {
      if (activeTrap?.id !== detonating.id) {
        setActiveTrap(detonating);
        sounds.playAmbushAlarm();
        setTriggeredTraps(prev => {
          if (!prev.some(t => t.id === detonating.id)) {
            return [...prev, detonating];
          }
          return prev;
        });
      }
    } else if (activeTrap) {
      setActiveTrap(null);
    }
  }, [isRunning, elapsedMs, game.isTacticsMode, activeCloudMatch?.isTacticsMode, currentRound?.tacticalTraps, currentPlayer, activeTrap]);

  // Toggle Pause / Resume for timed games
  const handleTogglePause = () => {
    if (game.mode === 'zen' || isCompletedThisRound) return;

    if (isRunning) {
      // Pause: stop running, record elapsed time accurately
      setIsRunning(false);
      setIsPaused(true);
      sounds.playTileTick();
    } else if (isPaused) {
      // Resume: start timer interval again from paused elapsedMs
      setIsPaused(false);
      setIsRunning(true);
      startTimeRef.current = Date.now() - elapsedMs;
      sounds.playWordFound();
    }
  };

  // Word Found Event Handler
  const handleWordFound = useCallback((wordStr: string) => {
    if (!isRunning || isCompletedThisRound) return;

    const nowRel = Date.now() - startTimeRef.current;
    sounds.playWordFound();
    triggerHaptic('success');

    const isTacticsActive = Boolean(game.isTacticsMode || activeCloudMatch?.isTacticsMode);

    // Calculate burst speed between consecutive words & check 5s combo for tactics
    if (lastFindTimeRef.current > 0) {
      const burst = nowRel - lastFindTimeRef.current;
      setLastBurstSpeedMs(burst);
      if (isTacticsActive && burst <= 5000) {
        earnedTrapsCountRef.current += 1;
        setEarnedTrapsCount(earnedTrapsCountRef.current);
        sounds.playTrapEarned();
        setShowEarnedAlert(true);
        setTimeout(() => setShowEarnedAlert(false), 2500);
      }
    }
    lastFindTimeRef.current = nowRel;

    setWordFindTimestamps(prev => [...prev, nowRel]);
    replayLogRef.current.push({ word: wordStr, atMs: nowRel });

    // Update board state
    setBoard(prevBoard => {
      const updatedWords = prevBoard.words.map(w => {
        if (w.word === wordStr && !w.found) {
          return { ...w, found: true, foundAt: nowRel };
        }
        return w;
      });

      const allFound = updatedWords.every(w => w.found);

      // Stream live race progress to cloud match
      const matchIdToSubmit = activeCloudMatch?.id || (game.id && /^[A-Z0-9]{4,10}$/i.test(game.id) ? game.id : (typeof localStorage !== 'undefined' ? localStorage.getItem('wordrush_active_match_id') : null));
      if (matchIdToSubmit) {
        const wordsFoundList = updatedWords.filter(w => w.found).map(w => w.word);
        streamLivePlayerProgress(matchIdToSubmit, {
          playerName: currentPlayer,
          roundIndex: localRoundIndex,
          isPlaying: !allFound,
          elapsedMs: nowRel,
          wordsFound: wordsFoundList,
          totalWords: updatedWords.length,
          lastWordFound: {
            word: wordStr,
            atMs: nowRel
          },
          lastHeartbeat: Date.now()
        }).catch(() => {});
      }

      if (allFound) {
        // Complete the board!
        setIsRunning(false);
        setIsCompletedThisRound(true);

        const totalElapsed = nowRel;
        const allTimestamps = [...wordFindTimestamps, nowRel];

        // Check dodged tactical traps (traps set for me whose trigger time wasn't reached!)
        const armedTraps = currentRound?.tacticalTraps || [];
        const myTraps = armedTraps.filter(t =>
          t.createdBy.toLowerCase() !== currentPlayer.toLowerCase() &&
          (t.targetPlayer === 'all' || t.targetPlayer.toLowerCase() === currentPlayer.toLowerCase())
        );
        const dodged = myTraps.filter(t => t.triggerAtMs > totalElapsed);
        if (dodged.length > 0) {
          sounds.playTrapDodge();
          setDodgedTraps(dodged);
        }

        // Compute shortest burst speed across all intervals
        let shortestBurst = 0;
        if (allTimestamps.length >= 2) {
          const gaps: number[] = [];
          for (let i = 1; i < allTimestamps.length; i++) {
            gaps.push(allTimestamps[i] - allTimestamps[i - 1]);
          }
          shortestBurst = Math.min(...gaps);
        }

        const avgPace = Math.round(totalElapsed / updatedWords.length);

        // Check if new personal best
        const career = getCareerStats(currentPlayer);
        const isNewPB = career.bestTimeMs === null || totalElapsed < career.bestTimeMs;
        setIsNewBestTime(isNewPB);

        // Record player turn result with high-speed replay log
        const turnResult: PlayerTurnResult = {
          playerName: currentPlayer,
          avatarColor: career.avatarColor || '#10b981',
          completedAt: Date.now(),
          elapsedMs: totalElapsed,
          burstSpeedMs: shortestBurst,
          avgTimePerWordMs: avgPace,
          wordFindTimestamps: allTimestamps,
          replayLog: [...replayLogRef.current],
          trapsDodged: dodged.length,
          trapsTriggered: triggeredTraps.length
        };

        // Update shared game state
        setGame(prevGame => {
          const updatedRounds = [...prevGame.rounds];
          const currRound = { ...updatedRounds[localRoundIndex] };
          currRound.results = {
            ...currRound.results,
            [currentPlayer.toLowerCase()]: turnResult
          };
          updatedRounds[localRoundIndex] = currRound;

          const participants = Array.from(
            new Set([...prevGame.participants, currentPlayer])
          );

          const newGameState: SharedGameState = {
            ...prevGame,
            rounds: updatedRounds,
            participants,
            lastUpdated: Date.now()
          };

          // Save to career stats & update rivalries
          recordGameCompletion({
            playerName: currentPlayer,
            avatarColor: turnResult.avatarColor,
            gameId: newGameState.id,
            theme: currRound.theme,
            gridSize: currRound.gridSize,
            mode: newGameState.mode,
            elapsedMs: totalElapsed,
            wordCount: updatedWords.length,
            burstSpeedMs: shortestBurst,
            opponents: currRound.results
          });

          return newGameState;
        });

        // Submit to Cloud Firestore if playing in an active cloud match
        if (matchIdToSubmit) {
          submitCloudTurnResult({
            matchId: matchIdToSubmit,
            roundIndex: localRoundIndex,
            result: turnResult,
            playerName: currentPlayer,
            userUid: currentUser?.uid
          }).catch(err => console.warn('Failed to submit cloud turn:', err));
        }

        // Sync career stats to Cloud for authenticated users
        if (currentUser) {
          const updatedStats = getCareerStats(currentPlayer);
          saveUserCloudStats(currentUser, updatedStats).catch(err => console.warn('Failed to save cloud stats:', err));
        }

        // Trigger celebratory fanfare & victory or ambush modal
        if (isTacticsActive && earnedTrapsCountRef.current > 0) {
          setShowAmbushModal(true);
        } else {
          sounds.playVictory();
          setTimeout(() => {
            setShowVictoryModal(true);
          }, 300);
        }
      }

      return { ...prevBoard, words: updatedWords };
    });
  }, [isRunning, isCompletedThisRound, currentPlayer, wordFindTimestamps, activeCloudMatch, currentUser, localRoundIndex, game.isTacticsMode, currentRound?.tacticalTraps, triggeredTraps.length]);

  // Profile save
  const handleSaveProfile = (newName: string) => {
    setCurrentProfile(newName);
    setCurrentPlayer(newName);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wordrush_has_signed_in', 'true');
    }
  };

  // Google Login / Logout handlers
  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
      const name = user.displayName || user.email?.split('@')[0] || 'Player';
      setCurrentPlayer(name);
      setCurrentProfile(name);
    } catch (err: any) {
      console.warn('Google sign-in cancelled or failed:', err);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (err: any) {
      console.warn('Google sign-out failed:', err);
    }
  };

  // Select a match from Cloud Lobby
  const handleSelectCloudMatch = async (match: CloudMatchDocument) => {
    clearUrlHash();
    const sanitized = ensureUniqueTournamentRounds(match);
    setActiveCloudMatch(sanitized);
    setGame(sanitized);
    const firstUnplayed = sanitized.rounds.findIndex(r => !(r.results || {})[currentPlayer.toLowerCase()]);
    setLocalRoundIndex(firstUnplayed !== -1 ? firstUnplayed : (sanitized.currentRoundIndex || 0));
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

  // Leave active cloud match to play solo
  const handleLeaveCloudMatch = () => {
    if (window.confirm('Leave this live multiplayer match to play solo? You can re-join anytime from the Match Lobby or with the Room Code.')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('wordrush_active_match_id');
      }
      clearUrlHash();
      setActiveCloudMatch(null);
      handleStartGame({
        mode: 'duel',
        gridSize: 18,
        difficulty: 'pro',
        isChaosMode: false
      });
    }
  };

  // Delete active cloud match permanently
  const handleDeleteCurrentMatch = async () => {
    if (!activeCloudMatch) return;
    if (window.confirm(`Permanently delete room "${activeCloudMatch.roomCode || activeCloudMatch.id}"? This will delete the match for all players.`)) {
      try {
        const ok = await deleteCloudMatch(activeCloudMatch.id);
        if (ok) {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('wordrush_active_match_id');
          }
          clearUrlHash();
          setActiveCloudMatch(null);
          handleStartGame({
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

  // Archive active cloud match to Champions Hall of Fame
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

  // Remove a participant from the active match (e.g. ghost players, duplicate profiles from before Google login)
  const handleRemoveParticipant = async (playerNameToRemove: string) => {
    try {
      if (activeCloudMatch?.id) {
        const updated = await removeParticipantFromCloudMatch(activeCloudMatch.id, playerNameToRemove);
        if (updated) {
          const sanitized = ensureUniqueTournamentRounds(updated);
          setActiveCloudMatch(sanitized);
          setGame(sanitized);
        }
      } else {
        // Offline / Local game state fallback
        setGame(prev => {
          const targetKey = playerNameToRemove.toLowerCase().trim();
          const updatedParticipants = prev.participants.filter(p => p.toLowerCase().trim() !== targetKey);
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

  // Launch a new local game or competition
  const handleStartGame = async (options: {
    mode: GameMode;
    gridSize: GridSize;
    difficulty?: DifficultyLevel;
    totalRounds?: number;
    isChaosMode?: boolean;
    themeId?: string;
    isCloudMatch?: boolean;
    isTacticsMode?: boolean;
  }) => {
    clearUrlHash();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('wordrush_active_match_id');
    }
    setActiveCloudMatch(null);
    setLocalRoundIndex(0);
    activeRoundKeyRef.current = '';
    earnedTrapsCountRef.current = 0;
    setEarnedTrapsCount(0);
    setActiveTrap(null);
    setDodgedTraps([]);
    setTriggeredTraps([]);
    setShowAmbushModal(false);

    const newGame = createNewGame({
      ...options,
      creatorName: currentPlayer
    });
    setGame(newGame);
    setIsRunning(false);
    setIsCompletedThisRound(false);
    setElapsedMs(0);
    setLastBurstSpeedMs(null);
    setWordFindTimestamps([]);
    setActiveTab('game');

    // Automatically create live Cloud Match Room for duel and series
    if (options.mode === 'duel' || options.mode === 'series') {
      try {
        const creatorUid = currentUser?.uid || 'guest_' + Math.random().toString(36).substring(2, 9);
        const match = await createCloudMatch({
          mode: options.mode,
          gridSize: options.gridSize,
          difficulty: options.difficulty,
          totalRounds: options.totalRounds,
          isChaosMode: options.isChaosMode,
          themeId: options.themeId,
          creatorName: currentPlayer,
          creatorUid,
          creatorEmail: currentUser?.email || '',
          isTacticsMode: options.isTacticsMode
        });
        setActiveCloudMatch(match);
        setGame(match);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('wordrush_active_match_id', match.id);
        }
      } catch (err) {
        console.warn('Could not auto-create cloud match (playing offline):', err);
      }
    }
  };

  // Advance to next round in a Series
  const handleNextRound = async () => {
    if (localRoundIndex < game.totalRounds - 1) {
      const nextIndex = localRoundIndex + 1;
      setLocalRoundIndex(nextIndex);
      if (activeCloudMatch) {
        try {
          await advanceCloudMatchRound(activeCloudMatch.id, nextIndex);
        } catch (err) {
          console.warn('Failed to advance cloud match round:', err);
        }
      }
      setGame(prev => ({
        ...prev,
        currentRoundIndex: nextIndex
      }));
      setShowPassTurnModal(false);
      setShowVictoryModal(false);
      setShowAmbushModal(false);
      activeRoundKeyRef.current = '';
      setIsRunning(false);
      setIsCompletedThisRound(false);
      setElapsedMs(0);
      setLastBurstSpeedMs(null);
      earnedTrapsCountRef.current = 0;
      setEarnedTrapsCount(0);
      setActiveTrap(null);
      setDodgedTraps([]);
      setTriggeredTraps([]);
    }
  };

  // Deploy an armed tactical trap against an opponent
  const handleDeployTrap = async (trap: TacticalTrap) => {
    const matchId = activeCloudMatch?.id || (game.id && /^[A-Z0-9]{4,10}$/i.test(game.id) ? game.id : (typeof localStorage !== 'undefined' ? localStorage.getItem('wordrush_active_match_id') : null));
    if (matchId) {
      try {
        await armTacticalTrap(matchId, localRoundIndex, trap);
      } catch (err) {
        console.warn('Failed to arm tactical trap in cloud match:', err);
      }
    }

    // Also update local round traps
    setGame(prev => {
      const updatedRounds = [...prev.rounds];
      const r = { ...updatedRounds[localRoundIndex] };
      r.tacticalTraps = [...(r.tacticalTraps || []), trap];
      updatedRounds[localRoundIndex] = r;
      return { ...prev, rounds: updatedRounds };
    });

    setShowAmbushModal(false);
    earnedTrapsCountRef.current = 0;
    setEarnedTrapsCount(0);
    sounds.playVictory();
    setTimeout(() => {
      setShowVictoryModal(true);
    }, 200);
  };

  // Memoized letters and opponents for tactical ambush selector
  const availableLetters = useMemo(() => {
    return Array.from(new Set(board.matrix.flat())).filter(Boolean).sort();
  }, [board.matrix]);

  const tournamentOpponents = useMemo(() => {
    const all = activeCloudMatch?.participants || game.participants || [];
    return all.filter(p => p.toLowerCase() !== currentPlayer.toLowerCase());
  }, [activeCloudMatch?.participants, game.participants, currentPlayer]);

  // Spectator board and live stream sync
  const spectatorBoard = useMemo(() => {
    if (!spectatingStream) return null;
    const rIdx = spectatingStream.roundIndex;
    const targetRound = (activeCloudMatch || game).rounds[rIdx] || (activeCloudMatch || game).rounds[0];
    if (!targetRound) return null;
    const isChaos = Boolean(targetRound.isChaosMode || targetRound.themeId === 'chaos' || game.isChaosMode || game.title?.includes('Chaos'));
    return generateGridBoard(targetRound.gridSize, targetRound.seed, isChaos, targetRound.difficulty || 'pro', targetRound.themeId, targetRound.customWords);
  }, [spectatingStream, activeCloudMatch, game]);

  const liveStreamData = useMemo(() => {
    if (!spectatingStream) return null;
    const key = spectatingStream.playerName.toLowerCase();
    const liveObj = activeCloudMatch?.liveStreams?.[key] || activeCloudMatch?.liveStreams?.[spectatingStream.playerName];
    return liveObj || spectatingStream;
  }, [spectatingStream, activeCloudMatch?.liveStreams]);

  const activeTrapTimeRemainingSec = activeTrap
    ? Math.max(0, Math.ceil((activeTrap.triggerAtMs + activeTrap.durationMs - elapsedMs) / 1000))
    : null;

  // Local Pass & Play on same device
  const handleLocalPassTurn = (nextPlayerName: string) => {
    setCurrentProfile(nextPlayerName);
    setCurrentPlayer(nextPlayerName);
    activeRoundKeyRef.current = '';
    setIsRunning(false);
    setIsCompletedThisRound(false);
    setElapsedMs(0);
    setLastBurstSpeedMs(null);
    setWordFindTimestamps([]);
    setBoard(prev => ({
      ...prev,
      words: prev.words.map(w => ({ ...w, found: false, foundAt: undefined }))
    }));
  };

  const foundWordsCount = board.words.filter(w => w.found).length;
  const totalWords = board.words.length;
  const currentTurnResult = currentRound.results[currentPlayer.toLowerCase()];
  const career = getCareerStats(currentPlayer);

  const handleDismissHowToPlay = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wordrush_seen_how_to_play', 'true');
    }
    setShowHowToPlay(false);
  };

  const deduplicatedRoundResults = Object.values(currentRound.results).reduce<PlayerTurnResult[]>((acc, res) => {
    if (!acc.some(r => r.playerName.toLowerCase() === res.playerName.toLowerCase())) {
      acc.push(res);
    }
    return acc;
  }, []).sort((a, b) => a.elapsedMs - b.elapsedMs);

  const opponentsList = deduplicatedRoundResults.filter(
    r => r.playerName.toLowerCase() !== currentPlayer.toLowerCase()
  );
  const bestOpponentTime = opponentsList.length > 0
    ? Math.min(...opponentsList.map(o => o.elapsedMs))
    : null;

  // Auto-pop Psych-Out modal when joining/viewing a round where opponents have set benchmarks
  useEffect(() => {
    if (isRunning || isCompletedThisRound || countdown !== null || activeTab !== 'game') {
      return;
    }

    if (!currentRound || !currentRound.results) return;

    const myResult = currentRound.results[currentPlayer.toLowerCase()];
    if (myResult) return; // Current player has already played this round

    if (opponentsList.length === 0) return; // No opponent has played this round yet

    // Key uniquely identifies this round and opponent benchmark state
    const leader = opponentsList[0];
    const psychKey = `${game.id}_r${localRoundIndex}_${leader.playerName}_${leader.elapsedMs}`;

    if (!seenPsychOutKeys.has(psychKey)) {
      setSeenPsychOutKeys(prev => new Set(prev).add(psychKey));
      setShowPsychOutModal(true);
    }
  }, [game.id, localRoundIndex, currentPlayer, currentRound, opponentsList, isRunning, isCompletedThisRound, countdown, activeTab, seenPsychOutKeys]);

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col">
      {/* Top Navigation & Profile Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentPlayer={currentPlayer}
        currentUser={currentUser}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenCompetition={() => setShowCompetitionModal(true)}
        onOpenLobby={() => setShowLobbyModal(true)}
        isZenMode={game.mode === 'zen'}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-1.5 sm:p-4 flex flex-col justify-start">
        {activeTab === 'stats' ? (
          <StatsDashboard currentPlayer={currentPlayer} />
        ) : activeTab === 'history' ? (
          <HistoryView currentPlayer={currentPlayer} />
        ) : activeTab === 'admin' ? (
          <AdminTopicsDashboard
            onPlayTopic={(themeId, gridSize) => {
              handleStartGame({
                mode: 'duel',
                gridSize,
                themeId
              });
              setActiveTab('game');
            }}
            onClose={() => setActiveTab('game')}
          />
        ) : activeTab === 'champions' ? (
          <ChampionsDashboard
            currentPlayer={currentPlayer}
            onOpenLobby={() => setShowLobbyModal(true)}
            onSelectMatchToPlay={match => {
              handleSelectCloudMatch(match);
              setActiveTab('game');
            }}
            onWatchReplay={(round, contender) => {
              const isChaos = Boolean(round.isChaosMode || round.themeId === 'chaos' || game.isChaosMode || game.title?.includes('Chaos'));
              const replayBoard = generateGridBoard(
                round.gridSize,
                round.seed,
                isChaos,
                round.difficulty || 'pro',
                round.themeId,
                round.customWords
              );
              setBoard(replayBoard);
              setReplayContender(contender);
            }}
          />
        ) : (
          /* GAME VIEW */
          <div className="flex flex-col flex-1">
            {/* Live Cloud Match Hub (Real-time Turn-based / Series Progression) */}
            {activeCloudMatch ? (
              <CloudMatchHub
                match={activeCloudMatch}
                currentPlayer={currentPlayer}
                currentRoundIndex={localRoundIndex}
                onSelectRound={idx => setLocalRoundIndex(idx)}
                onStartTurn={startTurnWithCountdown}
                onNextRound={handleNextRound}
                onLeaveMatch={handleLeaveCloudMatch}
                onDeleteMatch={handleDeleteCurrentMatch}
                onArchiveMatch={handleArchiveCurrentMatch}
                onViewChampions={() => setActiveTab('champions')}
                onWatchReplay={contender => setReplayContender(contender)}
                onOpenPsychOut={() => setShowPsychOutModal(true)}
                onWatchLive={stream => {
                  setSpectatingStream(stream);
                  setShowLiveSpectatorModal(true);
                }}
                onRemoveParticipant={handleRemoveParticipant}
                isRunning={isRunning}
                isPaused={isPaused}
                isCompletedThisRound={isCompletedThisRound}
              />
            ) : opponentsList.length > 0 && !isRunning ? (
              /* Local / Offline Share Link Challenge Banner */
              <div className="w-full mx-auto mb-3 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    <b>Multiplayer Match:</b> Competing against{' '}
                    <span className="text-cyan-300 font-semibold">
                      {opponentsList.map(o => o.playerName).join(', ')}
                    </span>
                    {bestOpponentTime && (
                      <span className="text-slate-400 ml-1">
                        (Target time to beat: <b>{formatMs(bestOpponentTime)}</b>)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPsychOutModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="View opponent benchmark psych stats"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>Psych-Out Stats</span>
                  </button>
                  {opponentsList[0] && (
                    <button
                      onClick={() => setReplayContender(opponentsList[0])}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1 transition-all"
                      title={`Watch high-speed replay of ${opponentsList[0].playerName}`}
                    >
                      <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                      <span>Replay {opponentsList[0].playerName}</span>
                    </button>
                  )}
                  {isCompletedThisRound ? (
                    <button
                      onClick={() => setShowPassTurnModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Standings</span>
                    </button>
                  ) : (
                    <span className="text-amber-400 font-bold">Your turn! Ready?</span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Stopwatch & Burst HUD */}
            <TimerDisplay
              elapsedMs={elapsedMs}
              isRunning={isRunning}
              totalWords={totalWords}
              foundWordsCount={foundWordsCount}
              lastBurstSpeedMs={lastBurstSpeedMs}
              bestTimeMs={career.bestTimeMs}
              isUntimed={game.mode === 'zen'}
              isPaused={isPaused}
              onTogglePause={handleTogglePause}
            />

            {/* Mobile Compact Word List Strip ("N left") */}
            <div className="lg:hidden w-full mb-2.5">
              <button
                onClick={() => setIsMobileWordSheetOpen(true)}
                className="w-full glass-panel border border-slate-800/90 rounded-2xl p-2.5 px-3 flex items-center justify-between text-left hover:border-slate-700 transition-all cursor-pointer active:scale-[0.99] shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {game.mode === 'zen' ? board.theme : (isPaused || (!isRunning && !isCompletedThisRound)) ? 'Target Words' : board.theme}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        {totalWords - foundWordsCount} left
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0 font-medium">
                  <span>View List</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* Mobile Collapsible Sheet for Word List */}
            {isMobileWordSheetOpen && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-fade-in lg:hidden">
                <div 
                  className="fixed inset-0" 
                  onClick={() => setIsMobileWordSheetOpen(false)}
                />
                <div className="relative z-10 glass-panel bg-dark-900 border-t border-slate-700/80 rounded-t-3xl p-4 max-h-[80vh] flex flex-col shadow-2xl animate-slide-up">
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-slate-100 truncate">{board.theme}</span>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold shrink-0">
                        {totalWords - foundWordsCount} left
                      </span>
                    </div>
                    <button
                      onClick={() => setIsMobileWordSheetOpen(false)}
                      className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      aria-label="Close word list sheet"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1 pb-4">
                    <WordBank
                      words={board.words}
                      theme={board.theme}
                      themeDescription={board.themeDescription}
                      isCovered={game.mode === 'zen' ? false : (isPaused || (!isRunning && !isCompletedThisRound))}
                      isGlitched={activeTrap?.type === 'wordlist_glitch'}
                      isSheet={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Start Turn Callout (only for timed competitive modes when not in active cloud match) */}
            {game.mode !== 'zen' && !isRunning && !isPaused && !isCompletedThisRound && !activeCloudMatch && (
              <div className="w-full mx-auto mb-3 p-4 rounded-2xl bg-dark-900 border border-emerald-500/40 text-center shadow-xl shadow-emerald-500/5">
                <div className="text-sm font-bold text-slate-200 mb-1">
                  Ready to race, {currentPlayer}?
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Find all {totalWords} words as fast as possible. The clock tracks every millisecond!
                </p>
                <button
                  onClick={startTurnWithCountdown}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-dark-950" />
                  <span>Start Turn (3.. 2.. 1..)</span>
                </button>
              </div>
            )}

            {/* Countdown Overlay (only for timed competitive modes) */}
            {countdown !== null && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
                <div className="text-center animate-bounce-subtle">
                  <div className="font-mono font-black text-7xl sm:text-9xl text-emerald-400 drop-shadow-2xl">
                    {countdown}
                  </div>
                  <div className="text-sm uppercase font-mono tracking-widest text-slate-300 mt-2">
                    Get Ready...
                  </div>
                </div>
              </div>
            )}

            {/* Tactical Warfare Ambush HUD */}
            {(game.isTacticsMode || activeCloudMatch?.isTacticsMode) && (
              <TacticalHUD
                activeTrap={activeTrap}
                activeTrapTimeRemainingSec={activeTrapTimeRemainingSec}
                earnedTrapAlert={showEarnedAlert}
                dodgedTrapsCount={dodgedTraps.length}
              />
            )}

            {/* Main Game Arena: Left WordBank Sidebar + Large Board on Desktop */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-3 sm:gap-6 w-full">
              {/* Target Words Bank (Desktop sidebar: hidden on mobile, left sidebar on desktop) */}
              <div className="hidden lg:block w-72 xl:w-80 shrink-0">
                <WordBank
                  words={board.words}
                  theme={board.theme}
                  themeDescription={board.themeDescription}
                  isCovered={game.mode === 'zen' ? false : (isPaused || (!isRunning && !isCompletedThisRound))}
                  isGlitched={activeTrap?.type === 'wordlist_glitch'}
                />
              </div>

              {/* Interactive Grid Canvas (Takes full space) */}
              <div className="flex-1 flex justify-center w-full">
                <WordGrid
                  board={board}
                  onWordFound={handleWordFound}
                  disabled={game.mode === 'zen' ? isCompletedThisRound : (!isRunning || isPaused || isCompletedThisRound)}
                  isCovered={game.mode === 'zen' ? false : (!isRunning && !isPaused && !isCompletedThisRound)}
                  isPaused={isPaused}
                  onStartTurn={startTurnWithCountdown}
                  onResumeTurn={handleTogglePause}
                  activeCloakedLetter={activeTrap?.type === 'phantom_letter' ? activeTrap.letter : undefined}
                  activeMistQuadrant={activeTrap?.type === 'dense_mist' ? activeTrap.quadrant : undefined}
                />
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="w-full mx-auto mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompetitionModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-dark-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Competition Setup</span>
                </button>

                {activeCloudMatch ? (
                  <button
                    onClick={handleLeaveCloudMatch}
                    className="px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Leave this multiplayer room to play solo"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>Exit Room to Solo</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartGame({
                      mode: game.mode === 'zen' ? 'zen' : 'duel',
                      gridSize: game.gridSize || 18,
                      difficulty: game.difficulty || 'pro',
                      isChaosMode: false
                    })}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Generate a brand new random puzzle board immediately"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Roll New Puzzle</span>
                  </button>
                )}

                {isCompletedThisRound && (
                  <button
                    onClick={() => setShowPassTurnModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Pass Turn (Farkle Style)</span>
                  </button>
                )}
              </div>

              <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                {game.mode === 'zen' ? (
                  <span className="text-teal-400 flex items-center gap-1 font-semibold">
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Zen Solitaire (Untimed)</span>
                  </span>
                ) : game.mode === 'series' ? (
                  <span>Series Round {localRoundIndex + 1} of {game.totalRounds}</span>
                ) : game.mode === 'weekly' ? (
                  <span>Weekly Competition</span>
                ) : (
                  <span>Quick Duel</span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pass Turn Modal (Farkle Style Sharing) */}
      {showPassTurnModal && (
        <PassTurnModal
          game={game}
          currentPlayer={currentPlayer}
          currentTurnResult={currentTurnResult}
          onClose={() => setShowPassTurnModal(false)}
          onNextRound={handleNextRound}
          onLocalPassTurn={handleLocalPassTurn}
          onWatchReplay={contender => setReplayContender(contender)}
        />
      )}

      {/* Victory Celebration Modal */}
      {showVictoryModal && (
        <VictoryModal
          elapsedMs={elapsedMs}
          burstSpeedMs={lastBurstSpeedMs || 0}
          isNewBest={isNewBestTime}
          theme={currentRound.theme}
          gridSize={currentRound.gridSize}
          hasNextRound={localRoundIndex < game.totalRounds - 1}
          nextRoundNumber={localRoundIndex + 2}
          onNextRound={handleNextRound}
          roomCode={activeCloudMatch?.roomCode || activeCloudMatch?.id}
          onPassTurn={() => {
            setShowVictoryModal(false);
            setShowPassTurnModal(true);
          }}
          onPlayAgain={() => {
            setShowVictoryModal(false);
            if (localRoundIndex < game.totalRounds - 1) {
              handleNextRound();
            } else if (!activeCloudMatch) {
              handleStartGame({
                mode: 'duel',
                gridSize: currentRound.gridSize,
                isChaosMode: false
              });
            }
          }}
          onWatchReplay={() => {
            if (currentTurnResult) {
              setReplayContender(currentTurnResult);
            }
          }}
          isUntimed={game.mode === 'zen'}
        />
      )}

      {/* High-Speed Round Replay Modal */}
      {replayContender && (
        <ReplayModal
          board={board}
          turnResult={replayContender}
          onClose={() => setReplayContender(null)}
        />
      )}

      {/* Competition & Series Setup Modal */}
      <CompetitionModal
        isOpen={showCompetitionModal}
        onClose={() => setShowCompetitionModal(false)}
        onStartGame={handleStartGame}
        onOpenAdmin={() => setActiveTab('admin')}
      />

      {/* Player Profile Switcher & Google Auth Modal */}
      <PlayerProfileModal
        isOpen={showProfileModal}
        currentPlayer={currentPlayer}
        currentUser={currentUser}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        onSaveProfile={handleSaveProfile}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Cloud Match Rooms & Live Lobby Modal */}
      <LiveLobbyModal
        isOpen={showLobbyModal}
        onClose={() => setShowLobbyModal(false)}
        currentUser={currentUser}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        onSelectMatch={handleSelectCloudMatch}
        onOpenChampions={() => setActiveTab('champions')}
      />

      {/* Opponent Psych-Out Benchmark Modal */}
      <PsychOutModal
        isOpen={showPsychOutModal}
        onClose={() => setShowPsychOutModal(false)}
        onStartTurn={() => {
          setShowPsychOutModal(false);
          startTurnWithCountdown();
        }}
        onWatchReplay={contender => {
          setShowPsychOutModal(false);
          setReplayContender(contender);
        }}
        roundNumber={localRoundIndex + 1}
        totalRounds={game.totalRounds}
        themeName={currentRound.theme}
        gridSize={currentRound.gridSize}
        opponentResults={opponentsList}
        currentPlayer={currentPlayer}
        roomCode={activeCloudMatch?.roomCode || activeCloudMatch?.id || (game.id && /^[A-Z0-9]{4,10}$/i.test(game.id) ? game.id : undefined)}
      />

      {/* Tactical Ambush Deployment Modal */}
      <TacticalAmbushModal
        isOpen={showAmbushModal}
        onClose={() => {
          setShowAmbushModal(false);
          sounds.playVictory();
          setShowVictoryModal(true);
        }}
        onDeployTrap={handleDeployTrap}
        availableLetters={availableLetters}
        opponents={tournamentOpponents}
        roundNumber={localRoundIndex + 1}
        earnedTrapsCount={earnedTrapsCount}
        currentPlayer={currentPlayer}
      />

      {/* Live Spectator Arena Modal */}
      {spectatingStream && spectatorBoard && (
        <LiveSpectatorModal
          isOpen={showLiveSpectatorModal}
          onClose={() => {
            setShowLiveSpectatorModal(false);
            setSpectatingStream(null);
          }}
          stream={liveStreamData || spectatingStream}
          board={spectatorBoard}
          themeName={currentRound.theme}
          themeDescription={currentRound.theme}
          roundNumber={(liveStreamData || spectatingStream).roundIndex + 1}
          totalRounds={activeCloudMatch?.totalRounds || game.totalRounds}
        />
      )}

      {/* First-Visit How-To-Play Card */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-emerald-500/40 shadow-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-4 flex items-center justify-center">
              <div className="w-full h-full bg-dark-900 rounded-[14px] flex items-center justify-center">
                <Swords className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mb-2">
              Welcome to WordRush!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 font-medium">
              Drag across letters to find the words. Fastest time wins.
            </p>
            <button
              onClick={handleDismissHowToPlay}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-base shadow-xl shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-dark-950" />
              <span>Play</span>
            </button>
            <p className="text-[11px] text-slate-400 mt-4">
              Sign-in is available anytime from the profile button in the top bar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
