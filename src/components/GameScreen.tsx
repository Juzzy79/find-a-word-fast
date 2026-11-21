import React, { useState, lazy, Suspense } from 'react';
import type {
  SharedGameState,
  GridBoard,
  PlayerTurnResult,
  GameMode,
  GridSize,
  DifficultyLevel,
  TacticalTrap,
  LivePlayerStream
} from '../types/game';
import type { CloudMatchDocument } from '../services/matchService';
import { TimerDisplay } from './TimerDisplay';
import { WordGrid } from './WordGrid';
import { WordBank } from './WordBank';
import {
  Play,
  Share2,
  Trophy,
  Swords,
  Zap,
  Coffee,
  RotateCcw,
  LogOut,
  Flame,
  Calendar,
  ChevronDown,
  X,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { formatMs } from '../utils/formatters';
import { getModeLabel } from '../utils/modeLabels';

const CloudMatchHub = lazy(() =>
  import('./CloudMatchHub').then(m => ({ default: m.CloudMatchHub }))
);
const TacticalHUD = lazy(() =>
  import('./TacticalHUD').then(m => ({ default: m.TacticalHUD }))
);

interface GameScreenProps {
  game: SharedGameState;
  board: GridBoard;
  activeCloudMatch: CloudMatchDocument | null;
  currentPlayer: string;
  localRoundIndex: number;
  elapsedMs: number;
  startTimeRef: React.RefObject<number>;
  isRunning: boolean;
  isPaused: boolean;
  countdown: number | null;
  isCompletedThisRound: boolean;
  foundWordsCount: number;
  totalWords: number;
  lastBurstSpeedMs: number | null;
  bestTimeMs: number | null;
  opponentsList: PlayerTurnResult[];
  bestOpponentTime: number | null;
  activeTrap: TacticalTrap | null;
  activeTrapTimeRemainingSec: number | null;
  showEarnedAlert: boolean;
  dodgedTrapsCount: number;
  onSelectRound: (idx: number) => void;
  onStartTurn: () => void;
  onTogglePause: () => void;
  onWordFound: (word: string) => void;
  onNextRound: () => void;
  onLeaveCloudMatch: () => void;
  onDeleteCurrentMatch: () => void;
  onArchiveCurrentMatch: () => void;
  onViewChampions: () => void;
  onWatchReplay: (contender: PlayerTurnResult) => void;
  onOpenPsychOut: () => void;
  onWatchLive: (stream: LivePlayerStream) => void;
  onRemoveParticipant: (name: string) => void;
  onOpenCompetition: (initialMode?: GameMode) => void;
  onOpenPassTurn: () => void;
  onStartGame: (options: {
    mode: GameMode;
    gridSize: GridSize;
    difficulty?: DifficultyLevel;
    totalRounds?: number;
    isChaosMode?: boolean;
    isTacticsMode?: boolean;
    themeId?: string;
  }) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  game,
  board,
  activeCloudMatch,
  currentPlayer,
  localRoundIndex,
  elapsedMs,
  startTimeRef,
  isRunning,
  isPaused,
  countdown,
  isCompletedThisRound,
  foundWordsCount,
  totalWords,
  lastBurstSpeedMs,
  bestTimeMs,
  opponentsList,
  bestOpponentTime,
  activeTrap,
  activeTrapTimeRemainingSec,
  showEarnedAlert,
  dodgedTrapsCount,
  onSelectRound,
  onStartTurn,
  onTogglePause,
  onWordFound,
  onNextRound,
  onLeaveCloudMatch,
  onDeleteCurrentMatch,
  onArchiveCurrentMatch,
  onViewChampions,
  onWatchReplay,
  onOpenPsychOut,
  onWatchLive,
  onRemoveParticipant,
  onOpenCompetition,
  onOpenPassTurn,
  onStartGame
}) => {
  const [isMobileWordSheetOpen, setIsMobileWordSheetOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isRoundInProgress =
    !isCompletedThisRound &&
    (isRunning || isPaused || (game.mode === 'zen' && foundWordsCount > 0));

  const runWithConfirmIfActive = (action: () => void) => {
    if (isRoundInProgress) {
      setPendingAction(() => action);
    } else {
      action();
    }
  };

  const handleNewPuzzle = () => {
    runWithConfirmIfActive(() => {
      onStartGame({
        mode: game.mode === 'zen' ? 'zen' : 'duel',
        gridSize: game.gridSize || 18,
        difficulty: game.difficulty || 'pro',
        isChaosMode: false
      });
    });
  };

  const handleQuickModeSelect = (mode: GameMode) => {
    if (mode === 'series' || mode === 'weekly') {
      onOpenCompetition(mode);
      return;
    }
    if (game.mode === mode) return;
    runWithConfirmIfActive(() => {
      onStartGame({
        mode,
        gridSize: game.gridSize || 18,
        difficulty: mode === 'zen' ? 'expert' : (game.difficulty || 'pro'),
        isChaosMode: false
      });
    });
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Live Cloud Match Hub (Real-time Turn-based / Series Progression) */}
      {activeCloudMatch ? (
        <Suspense fallback={null}>
          <CloudMatchHub
            match={activeCloudMatch}
            currentPlayer={currentPlayer}
            currentRoundIndex={localRoundIndex}
            onSelectRound={onSelectRound}
            onStartTurn={onStartTurn}
            onNextRound={onNextRound}
            onLeaveMatch={onLeaveCloudMatch}
            onDeleteMatch={onDeleteCurrentMatch}
            onArchiveMatch={onArchiveCurrentMatch}
            onViewChampions={onViewChampions}
            onWatchReplay={onWatchReplay}
            onOpenPsychOut={onOpenPsychOut}
            onWatchLive={onWatchLive}
            onRemoveParticipant={onRemoveParticipant}
            isRunning={isRunning}
            isPaused={isPaused}
            isCompletedThisRound={isCompletedThisRound}
          />
        </Suspense>
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
              onClick={onOpenPsychOut}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="View opponent benchmark psych stats"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>Psych-Out Stats</span>
            </button>
            {opponentsList[0] && (
              <button
                onClick={() => onWatchReplay(opponentsList[0])}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1 transition-all cursor-pointer"
                title={`Watch high-speed replay of ${opponentsList[0].playerName}`}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                <span>Replay {opponentsList[0].playerName}</span>
              </button>
            )}
            {isCompletedThisRound ? (
              <button
                onClick={onOpenPassTurn}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Standings</span>
              </button>
            ) : (
              <span className="text-amber-400 font-bold">Your turn! Ready?</span>
            )}
          </div>
        </div>
      ) : (
        /* Quick Mode Select Strip (Gives Zen equal visibility alongside Duel, Series, Weekly) */
        <div
          className="w-full max-w-4xl mx-auto mb-2 flex items-center justify-center sm:justify-between gap-2 flex-wrap"
          role="group"
          aria-label="Game mode selector"
        >
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 hidden sm:inline">
            Mode
          </span>
          <div className="flex items-center gap-1 bg-dark-900/80 p-1 rounded-xl border border-slate-800/80 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => handleQuickModeSelect('duel')}
              aria-pressed={game.mode === 'duel'}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                game.mode === 'duel'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Swords className="w-3.5 h-3.5 shrink-0" />
              <span>Duel</span>
            </button>

            <button
              onClick={() => handleQuickModeSelect('series')}
              aria-pressed={game.mode === 'series'}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                game.mode === 'series'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>Series</span>
            </button>

            <button
              onClick={() => handleQuickModeSelect('weekly')}
              aria-pressed={game.mode === 'weekly'}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                game.mode === 'weekly'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Weekly</span>
            </button>

            <button
              onClick={() => handleQuickModeSelect('zen')}
              aria-pressed={game.mode === 'zen'}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-400 ${
                game.mode === 'zen'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
              title="Untimed relaxed mode"
            >
              <Coffee className="w-3.5 h-3.5 shrink-0" />
              <span>Zen</span>
            </button>
          </div>
        </div>
      )}

      {/* Stopwatch & Burst HUD (isolated 60fps ticking inside TimerDisplay) */}
      <TimerDisplay
        elapsedMs={elapsedMs}
        startTimeRef={startTimeRef}
        isRunning={isRunning}
        totalWords={totalWords}
        foundWordsCount={foundWordsCount}
        lastBurstSpeedMs={lastBurstSpeedMs}
        bestTimeMs={bestTimeMs}
        isUntimed={game.mode === 'zen'}
        isPaused={isPaused}
        onTogglePause={onTogglePause}
      />

      {/* Mobile Compact Word List Strip ("N left") */}
      <div className="lg:hidden w-full mb-2.5">
        <button
          onClick={() => setIsMobileWordSheetOpen(true)}
          aria-expanded={isMobileWordSheetOpen}
          aria-label={`View target word list, ${totalWords - foundWordsCount} words left`}
          className="w-full glass-panel border border-slate-800/90 rounded-2xl p-2.5 px-3 flex items-center justify-between text-left hover:border-slate-700 transition-all cursor-pointer active:scale-[0.99] shadow-sm focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 truncate">
                  {game.mode === 'zen'
                    ? board.theme
                    : isPaused || (!isRunning && !isCompletedThisRound)
                    ? 'Target Words'
                    : board.theme}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
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
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-fade-in lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Target words list"
        >
          <div className="fixed inset-0" onClick={() => setIsMobileWordSheetOpen(false)} />
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
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-400"
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
                isCovered={game.mode === 'zen' ? false : isPaused || (!isRunning && !isCompletedThisRound)}
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
            onClick={onStartTurn}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-sm inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
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
        <Suspense fallback={null}>
          <TacticalHUD
            activeTrap={activeTrap}
            activeTrapTimeRemainingSec={activeTrapTimeRemainingSec}
            earnedTrapAlert={showEarnedAlert}
            dodgedTrapsCount={dodgedTrapsCount}
          />
        </Suspense>
      )}

      {/* Main Game Arena: Left WordBank Sidebar + Large Board on Desktop */}
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-3 sm:gap-6 w-full">
        {/* Target Words Bank (Desktop sidebar: hidden on mobile, left sidebar on desktop) */}
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <WordBank
            words={board.words}
            theme={board.theme}
            themeDescription={board.themeDescription}
            isCovered={game.mode === 'zen' ? false : isPaused || (!isRunning && !isCompletedThisRound)}
            isGlitched={activeTrap?.type === 'wordlist_glitch'}
          />
        </div>

        {/* Interactive Grid Canvas (Takes full space) */}
        <div className="flex-1 flex justify-center w-full">
          <WordGrid
            board={board}
            onWordFound={onWordFound}
            disabled={game.mode === 'zen' ? isCompletedThisRound : !isRunning || isPaused || isCompletedThisRound}
            isCovered={game.mode === 'zen' ? false : !isRunning && !isPaused && !isCompletedThisRound}
            isPaused={isPaused}
            onStartTurn={onStartTurn}
            onResumeTurn={onTogglePause}
            activeCloakedLetter={activeTrap?.type === 'phantom_letter' ? activeTrap.letter : undefined}
            activeMistQuadrant={activeTrap?.type === 'dense_mist' ? activeTrap.quadrant : undefined}
          />
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full mx-auto mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenCompetition()}
            className="px-3 py-1.5 rounded-xl bg-dark-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Competition Setup</span>
          </button>

          {activeCloudMatch ? (
            <button
              onClick={onLeaveCloudMatch}
              className="px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-400"
              title="Leave this multiplayer room to play solo"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Exit Room to Solo</span>
            </button>
          ) : (
            <button
              onClick={handleNewPuzzle}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
              title="Generate a brand new random puzzle board"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Puzzle</span>
            </button>
          )}

          {isCompletedThisRound && (
            <button
              onClick={onOpenPassTurn}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Pass Turn</span>
            </button>
          )}
        </div>

        <div className="text-slate-400 font-mono text-xs flex items-center gap-1">
          {game.mode === 'zen' ? (
            <span className="text-teal-400 flex items-center gap-1 font-semibold">
              <Coffee className="w-3.5 h-3.5" />
              <span>{getModeLabel('zen')}</span>
            </span>
          ) : game.mode === 'series' ? (
            <span>
              {getModeLabel('series')} &bull; Round {localRoundIndex + 1} of {game.totalRounds}
            </span>
          ) : (
            <span>{getModeLabel(game.mode)}</span>
          )}
        </div>
      </div>

      {/* Confirm Before Discarding Mid-Round Board */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm new puzzle"
        >
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-amber-500/40 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-extrabold text-white mb-2">Start a new puzzle?</h3>
            <p className="text-sm text-slate-300 mb-6">
              Your current board will be lost.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-dark-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const fn = pendingAction;
                  setPendingAction(null);
                  fn();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-sm hover:brightness-110 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300"
              >
                New Puzzle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
