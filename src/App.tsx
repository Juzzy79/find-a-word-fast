import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import type { SharedGameState, GridBoard, PlayerTurnResult, GameMode, GridSize, DifficultyLevel, TacticalTrap, LivePlayerStream } from './types/game';
import { Header } from './components/Header';
import { GameScreen } from './components/GameScreen';
import { AppModals } from './components/AppModals';
import { useGameTimer } from './hooks/useGameTimer';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useCloudMatchSync } from './hooks/useCloudMatchSync';
import { useCloudMatchActions } from './hooks/useCloudMatchActions';
import { generateGridBoard } from './utils/gridGenerator';
import {
  getGameFromUrl,
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
import { WifiOff } from 'lucide-react';
import { auth, loginWithGoogle, logoutUser, onAuthStateChanged, type User } from './services/firebase';
import {
  submitCloudTurnResult,
  saveUserCloudStats,
  fetchUserCloudStats,
  createCloudMatch,
  advanceCloudMatchRound,
  streamLivePlayerProgress,
  armTacticalTrap,
  type CloudMatchDocument
} from './services/matchService';
import { registerPushServiceWorker } from './services/pushNotificationService';

const StatsDashboard = lazy(() =>
  import('./components/StatsDashboard').then(m => ({ default: m.StatsDashboard }))
);
const HistoryView = lazy(() =>
  import('./components/HistoryView').then(m => ({ default: m.HistoryView }))
);
const AdminTopicsDashboard = lazy(() =>
  import('./components/AdminTopicsDashboard').then(m => ({ default: m.AdminTopicsDashboard }))
);
const ChampionsDashboard = lazy(() =>
  import('./components/ChampionsDashboard').then(m => ({ default: m.ChampionsDashboard }))
);

export function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<'game' | 'stats' | 'competitions' | 'history' | 'champions' | 'admin'>('game');
  const [currentPlayer, setCurrentPlayer] = useState<string>(() => getCurrentProfile());

  const isOnline = useOnlineStatus();

  // Modals state - Do NOT auto-open sign-in on first visit
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return !localStorage.getItem('wordrush_seen_how_to_play');
  });
  const [showCompetitionModal, setShowCompetitionModal] = useState<boolean>(false);
  const [competitionInitialMode, setCompetitionInitialMode] = useState<GameMode | undefined>(undefined);
  const [showPassTurnModal, setShowPassTurnModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [showLobbyModal, setShowLobbyModal] = useState<boolean>(false);
  const [showPsychOutModal, setShowPsychOutModal] = useState<boolean>(false);
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

  // In-game tracking & isolated timer hook (no 60fps App re-renders)
  const [lastBurstSpeedMs, setLastBurstSpeedMs] = useState<number | null>(null);
  const [wordFindTimestamps, setWordFindTimestamps] = useState<number[]>([]);
  const [isCompletedThisRound, setIsCompletedThisRound] = useState<boolean>(false);
  const [isNewBestTime, setIsNewBestTime] = useState<boolean>(false);

  const {
    isRunning,
    setIsRunning,
    isPaused,
    setIsPaused,
    elapsedMs,
    setElapsedMs,
    countdown,
    setCountdown,
    startTimeRef,
    isSolvingRef,
    handleTogglePause
  } = useGameTimer({
    mode: game.mode,
    isCompletedThisRound
  });

  // Tactical Warfare State
  const [earnedTrapsCount, setEarnedTrapsCount] = useState<number>(0);
  const [showEarnedAlert, setShowEarnedAlert] = useState<boolean>(false);
  const [activeTrap, setActiveTrap] = useState<TacticalTrap | null>(null);
  const [activeTrapTimeRemainingSec, setActiveTrapTimeRemainingSec] = useState<number | null>(null);
  const [dodgedTraps, setDodgedTraps] = useState<TacticalTrap[]>([]);
  const [triggeredTraps, setTriggeredTraps] = useState<TacticalTrap[]>([]);
  const [showAmbushModal, setShowAmbushModal] = useState<boolean>(false);

  // Live Spectator State
  const [showLiveSpectatorModal, setShowLiveSpectatorModal] = useState<boolean>(false);
  const [spectatingStream, setSpectatingStream] = useState<LivePlayerStream | null>(null);

  // Timing & round references
  const lastFindTimeRef = useRef<number>(0);
  const replayLogRef = useRef<{ word: string; atMs: number }[]>([]);
  const earnedTrapsCountRef = useRef<number>(0);
  const activeRoundKeyRef = useRef<string>('');

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

  // Sync cloud matches, URL share links, and turn notifications
  useCloudMatchSync({
    activeCloudMatch,
    currentPlayer,
    currentUser,
    setActiveCloudMatch,
    setGame,
    setLocalRoundIndex,
    setActiveTab
  });

  // Countdown before starting round (3..2..1..GO)
  const startTurnWithCountdown = () => {
    setCountdown(3);
    sounds.playTileTick();
    replayLogRef.current = [];
    earnedTrapsCountRef.current = 0;
    setEarnedTrapsCount(0);
    setActiveTrap(null);
    setActiveTrapTimeRemainingSec(null);
    setDodgedTraps([]);
    setTriggeredTraps([]);
    const interval = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          sounds.playWordFound();
          startTimeRef.current = Date.now();
          lastFindTimeRef.current = 0;
          setElapsedMs(0);
          setIsRunning(true);

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

  // Tactical Ambush Evaluation Loop: polls every 250ms without 60fps App re-renders
  useEffect(() => {
    if (!isRunning || !(game.isTacticsMode || activeCloudMatch?.isTacticsMode)) {
      setActiveTrap(null);
      setActiveTrapTimeRemainingSec(null);
      return;
    }

    const armedTraps = currentRound?.tacticalTraps || [];
    const myTraps = armedTraps.filter(t =>
      t.createdBy.toLowerCase() !== currentPlayer.toLowerCase() &&
      (t.targetPlayer === 'all' || t.targetPlayer.toLowerCase() === currentPlayer.toLowerCase())
    );

    if (myTraps.length === 0) {
      setActiveTrap(null);
      setActiveTrapTimeRemainingSec(null);
      return;
    }

    const evaluate = () => {
      const nowRel = startTimeRef.current > 0 ? Math.max(0, Date.now() - startTimeRef.current) : 0;
      const detonating = myTraps.find(t =>
        nowRel >= t.triggerAtMs && nowRel < (t.triggerAtMs + t.durationMs)
      );

      if (detonating) {
        setActiveTrap(prev => {
          if (prev?.id !== detonating.id) {
            sounds.playAmbushAlarm();
            setTriggeredTraps(traps =>
              traps.some(t => t.id === detonating.id) ? traps : [...traps, detonating]
            );
            return detonating;
          }
          return prev;
        });
        const remainingSec = Math.max(0, Math.ceil((detonating.triggerAtMs + detonating.durationMs - nowRel) / 1000));
        setActiveTrapTimeRemainingSec(prev => (prev === remainingSec ? prev : remainingSec));
      } else {
        setActiveTrap(prev => (prev ? null : prev));
        setActiveTrapTimeRemainingSec(prev => (prev !== null ? null : prev));
      }
    };

    evaluate();
    const trapInterval = window.setInterval(evaluate, 250);
    return () => clearInterval(trapInterval);
  }, [isRunning, game.isTacticsMode, activeCloudMatch?.isTacticsMode, currentRound?.tacticalTraps, currentPlayer, startTimeRef]);

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
        const totalElapsed = nowRel;
        setElapsedMs(totalElapsed);
        setIsRunning(false);
        setIsCompletedThisRound(true);

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

  const {
    handleSelectCloudMatch,
    handleLeaveCloudMatch,
    handleDeleteCurrentMatch,
    handleArchiveCurrentMatch,
    handleRemoveParticipant
  } = useCloudMatchActions({
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
    onStartGame: handleStartGame
  });

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

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col">
      {/* Top Navigation & Profile Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentPlayer={currentPlayer}
        currentUser={currentUser}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenCompetition={() => {
          setCompetitionInitialMode(undefined);
          setShowCompetitionModal(true);
        }}
        onOpenLobby={() => setShowLobbyModal(true)}
        isZenMode={game.mode === 'zen'}
      />

      {/* Non-blocking Offline Indicator */}
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-3 py-1.5 text-xs font-medium flex items-center justify-center gap-2"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>You&apos;re offline â€” playing locally</span>
        </div>
      )}


      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-1.5 sm:p-4 flex flex-col justify-start">
        {activeTab === 'stats' ? (
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading stats...</div>}>
            <StatsDashboard currentPlayer={currentPlayer} />
          </Suspense>
        ) : activeTab === 'history' ? (
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading history...</div>}>
            <HistoryView currentPlayer={currentPlayer} />
          </Suspense>
        ) : activeTab === 'admin' ? (
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading topic studio...</div>}>
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
          </Suspense>
        ) : activeTab === 'champions' ? (
          <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading champions...</div>}>
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
          </Suspense>
        ) : (
          <GameScreen
            game={game}
            board={board}
            activeCloudMatch={activeCloudMatch}
            currentPlayer={currentPlayer}
            localRoundIndex={localRoundIndex}
            elapsedMs={elapsedMs}
            startTimeRef={startTimeRef}
            isRunning={isRunning}
            isPaused={isPaused}
            countdown={countdown}
            isCompletedThisRound={isCompletedThisRound}
            foundWordsCount={foundWordsCount}
            totalWords={totalWords}
            lastBurstSpeedMs={lastBurstSpeedMs}
            bestTimeMs={career.bestTimeMs}
            opponentsList={opponentsList}
            bestOpponentTime={bestOpponentTime}
            activeTrap={activeTrap}
            activeTrapTimeRemainingSec={activeTrapTimeRemainingSec}
            showEarnedAlert={showEarnedAlert}
            dodgedTrapsCount={dodgedTraps.length}
            onSelectRound={idx => setLocalRoundIndex(idx)}
            onStartTurn={startTurnWithCountdown}
            onTogglePause={handleTogglePause}
            onWordFound={handleWordFound}
            onNextRound={handleNextRound}
            onLeaveCloudMatch={handleLeaveCloudMatch}
            onDeleteCurrentMatch={handleDeleteCurrentMatch}
            onArchiveCurrentMatch={handleArchiveCurrentMatch}
            onViewChampions={() => setActiveTab('champions')}
            onWatchReplay={contender => setReplayContender(contender)}
            onOpenPsychOut={() => setShowPsychOutModal(true)}
            onWatchLive={stream => {
              setSpectatingStream(stream);
              setShowLiveSpectatorModal(true);
            }}
            onRemoveParticipant={handleRemoveParticipant}
            onOpenCompetition={initialMode => {
              setCompetitionInitialMode(initialMode);
              setShowCompetitionModal(true);
            }}
            onOpenPassTurn={() => setShowPassTurnModal(true)}
            onStartGame={handleStartGame}
          />
        )}
      </main>

      <AppModals
        game={game}
        board={board}
        currentRound={currentRound}
        localRoundIndex={localRoundIndex}
        activeCloudMatch={activeCloudMatch}
        currentPlayer={currentPlayer}
        currentUser={currentUser}
        elapsedMs={elapsedMs}
        lastBurstSpeedMs={lastBurstSpeedMs}
        isNewBestTime={isNewBestTime}
        currentTurnResult={currentTurnResult}
        opponentsList={opponentsList}
        availableLetters={availableLetters}
        tournamentOpponents={tournamentOpponents}
        earnedTrapsCount={earnedTrapsCount}
        spectatingStream={spectatingStream}
        spectatorBoard={spectatorBoard}
        liveStreamData={liveStreamData}
        replayContender={replayContender}
        showPassTurnModal={showPassTurnModal}
        showVictoryModal={showVictoryModal}
        showCompetitionModal={showCompetitionModal}
        competitionInitialMode={competitionInitialMode}
        showProfileModal={showProfileModal}
        showLobbyModal={showLobbyModal}
        showPsychOutModal={showPsychOutModal}
        showAmbushModal={showAmbushModal}
        showLiveSpectatorModal={showLiveSpectatorModal}
        showHowToPlay={showHowToPlay}
        onClosePassTurn={() => setShowPassTurnModal(false)}
        onCloseVictory={() => setShowVictoryModal(false)}
        onPassTurnFromVictory={() => {
          setShowVictoryModal(false);
          setShowPassTurnModal(true);
        }}
        onPlayAgainFromVictory={() => {
          setShowVictoryModal(false);
          if (localRoundIndex < game.totalRounds - 1) {
            handleNextRound();
          } else if (!activeCloudMatch) {
            handleStartGame({
              mode: game.mode === 'zen' ? 'zen' : 'duel',
              gridSize: currentRound.gridSize,
              isChaosMode: false
            });
          }
        }}
        onNextRoundFromVictory={() => {
          setShowVictoryModal(false);
          handleNextRound();
        }}
        onWatchReplay={contender => setReplayContender(contender)}
        onWatchMyReplayFromVictory={() => {
          if (currentTurnResult) {
            setReplayContender(currentTurnResult);
          }
        }}
        onCloseCompetition={() => setShowCompetitionModal(false)}
        onStartGame={handleStartGame}
        onOpenAdmin={() => setActiveTab('admin')}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        onSaveProfile={handleSaveProfile}
        onCloseProfile={() => setShowProfileModal(false)}
        onCloseLobby={() => setShowLobbyModal(false)}
        onSelectCloudMatch={handleSelectCloudMatch}
        onOpenChampions={() => setActiveTab('champions')}
        onClosePsychOut={() => setShowPsychOutModal(false)}
        onStartTurnFromPsychOut={() => {
          setShowPsychOutModal(false);
          startTurnWithCountdown();
        }}
        onWatchReplayFromPsychOut={contender => {
          setShowPsychOutModal(false);
          setReplayContender(contender);
        }}
        onCloseAmbush={() => {
          setShowAmbushModal(false);
          sounds.playVictory();
          setShowVictoryModal(true);
        }}
        onDeployTrap={handleDeployTrap}
        onCloseLiveSpectator={() => {
          setShowLiveSpectatorModal(false);
          setSpectatingStream(null);
        }}
        onNextRound={handleNextRound}
        onLocalPassTurn={handleLocalPassTurn}
        onDismissHowToPlay={handleDismissHowToPlay}
      />
    </div>
  );
}

export default App;
