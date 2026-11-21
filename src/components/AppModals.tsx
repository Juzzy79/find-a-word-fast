import React, { lazy, Suspense } from 'react';
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
import type { User } from '../services/firebase';
import { Play, Swords } from 'lucide-react';

const PassTurnModal = lazy(() =>
  import('./PassTurnModal').then(m => ({ default: m.PassTurnModal }))
);
const VictoryModal = lazy(() =>
  import('./VictoryModal').then(m => ({ default: m.VictoryModal }))
);
const ReplayModal = lazy(() =>
  import('./ReplayModal').then(m => ({ default: m.ReplayModal }))
);
const CompetitionModal = lazy(() =>
  import('./CompetitionModal').then(m => ({ default: m.CompetitionModal }))
);
const PlayerProfileModal = lazy(() =>
  import('./PlayerProfileModal').then(m => ({ default: m.PlayerProfileModal }))
);
const LiveLobbyModal = lazy(() =>
  import('./LiveLobbyModal').then(m => ({ default: m.LiveLobbyModal }))
);
const PsychOutModal = lazy(() =>
  import('./PsychOutModal').then(m => ({ default: m.PsychOutModal }))
);
const TacticalAmbushModal = lazy(() =>
  import('./TacticalAmbushModal').then(m => ({ default: m.TacticalAmbushModal }))
);
const LiveSpectatorModal = lazy(() =>
  import('./LiveSpectatorModal').then(m => ({ default: m.LiveSpectatorModal }))
);

interface AppModalsProps {
  game: SharedGameState;
  board: GridBoard;
  currentRound: SharedGameState['rounds'][number];
  localRoundIndex: number;
  activeCloudMatch: CloudMatchDocument | null;
  currentPlayer: string;
  currentUser: User | null;
  elapsedMs: number;
  lastBurstSpeedMs: number | null;
  isNewBestTime: boolean;
  currentTurnResult?: PlayerTurnResult;
  opponentsList: PlayerTurnResult[];
  availableLetters: string[];
  tournamentOpponents: string[];
  earnedTrapsCount: number;
  spectatingStream: LivePlayerStream | null;
  spectatorBoard: GridBoard | null;
  liveStreamData: LivePlayerStream | null;
  replayContender: PlayerTurnResult | null;
  showPassTurnModal: boolean;
  showVictoryModal: boolean;
  showCompetitionModal: boolean;
  competitionInitialMode?: GameMode;
  showProfileModal: boolean;
  showLobbyModal: boolean;
  showPsychOutModal: boolean;
  showAmbushModal: boolean;
  showLiveSpectatorModal: boolean;
  showHowToPlay: boolean;
  onClosePassTurn: () => void;
  onCloseVictory: () => void;
  onPassTurnFromVictory: () => void;
  onPlayAgainFromVictory: () => void;
  onNextRoundFromVictory: () => void;
  onWatchReplay: (contender: PlayerTurnResult | null) => void;
  onWatchMyReplayFromVictory: () => void;
  onCloseCompetition: () => void;
  onStartGame: (options: {
    mode: GameMode;
    gridSize: GridSize;
    difficulty?: DifficultyLevel;
    totalRounds?: number;
    isChaosMode?: boolean;
    isTacticsMode?: boolean;
    themeId?: string;
  }) => void;
  onOpenAdmin: () => void;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSaveProfile: (name: string) => void;
  onCloseProfile: () => void;
  onCloseLobby: () => void;
  onSelectCloudMatch: (match: CloudMatchDocument) => void;
  onOpenChampions: () => void;
  onClosePsychOut: () => void;
  onStartTurnFromPsychOut: () => void;
  onWatchReplayFromPsychOut: (contender: PlayerTurnResult) => void;
  onCloseAmbush: () => void;
  onDeployTrap: (trap: TacticalTrap) => void;
  onCloseLiveSpectator: () => void;
  onNextRound: () => void;
  onLocalPassTurn: (nextPlayerName: string) => void;
  onDismissHowToPlay: () => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  game,
  board,
  currentRound,
  localRoundIndex,
  activeCloudMatch,
  currentPlayer,
  currentUser,
  elapsedMs,
  lastBurstSpeedMs,
  isNewBestTime,
  currentTurnResult,
  opponentsList,
  availableLetters,
  tournamentOpponents,
  earnedTrapsCount,
  spectatingStream,
  spectatorBoard,
  liveStreamData,
  replayContender,
  showPassTurnModal,
  showVictoryModal,
  showCompetitionModal,
  competitionInitialMode,
  showProfileModal,
  showLobbyModal,
  showPsychOutModal,
  showAmbushModal,
  showLiveSpectatorModal,
  showHowToPlay,
  onClosePassTurn,
  onPassTurnFromVictory,
  onPlayAgainFromVictory,
  onNextRoundFromVictory,
  onWatchReplay,
  onWatchMyReplayFromVictory,
  onCloseCompetition,
  onStartGame,
  onOpenAdmin,
  onGoogleLogin,
  onGoogleLogout,
  onSaveProfile,
  onCloseProfile,
  onCloseLobby,
  onSelectCloudMatch,
  onOpenChampions,
  onClosePsychOut,
  onStartTurnFromPsychOut,
  onWatchReplayFromPsychOut,
  onCloseAmbush,
  onDeployTrap,
  onCloseLiveSpectator,
  onNextRound,
  onLocalPassTurn,
  onDismissHowToPlay
}) => {
  const roomCode =
    activeCloudMatch?.roomCode ||
    activeCloudMatch?.id ||
    (game.id && /^[A-Z0-9]{4,10}$/i.test(game.id) ? game.id : undefined);

  return (
    <>
      <Suspense fallback={null}>
        {showPassTurnModal && (
          <PassTurnModal
            game={game}
            currentPlayer={currentPlayer}
            currentTurnResult={currentTurnResult}
            onClose={onClosePassTurn}
            onNextRound={onNextRound}
            onLocalPassTurn={onLocalPassTurn}
            onWatchReplay={contender => onWatchReplay(contender)}
          />
        )}

        {showVictoryModal && (
          <VictoryModal
            elapsedMs={elapsedMs}
            burstSpeedMs={lastBurstSpeedMs || 0}
            isNewBest={isNewBestTime}
            theme={board.theme}
            gridSize={board.size}
            isUntimed={game.mode === 'zen'}
            hasNextRound={localRoundIndex + 1 < (activeCloudMatch?.totalRounds || game.totalRounds)}
            nextRoundNumber={localRoundIndex + 2}
            roomCode={roomCode}
            onNextRound={onNextRoundFromVictory}
            onPassTurn={onPassTurnFromVictory}
            onPlayAgain={onPlayAgainFromVictory}
            onWatchReplay={
              currentTurnResult
                ? onWatchMyReplayFromVictory
                : undefined
            }
          />
        )}

        {replayContender && (
          <ReplayModal
            board={board}
            turnResult={replayContender}
            onClose={() => onWatchReplay(null)}
          />
        )}

        {showCompetitionModal && (
          <CompetitionModal
            isOpen={showCompetitionModal}
            initialMode={competitionInitialMode}
            onClose={onCloseCompetition}
            onStartGame={onStartGame}
            onOpenAdmin={onOpenAdmin}
          />
        )}

        {showProfileModal && (
          <PlayerProfileModal
            isOpen={showProfileModal}
            currentPlayer={currentPlayer}
            currentUser={currentUser}
            onGoogleLogin={onGoogleLogin}
            onGoogleLogout={onGoogleLogout}
            onSaveProfile={onSaveProfile}
            onClose={onCloseProfile}
          />
        )}

        {showLobbyModal && (
          <LiveLobbyModal
            isOpen={showLobbyModal}
            onClose={onCloseLobby}
            currentUser={currentUser}
            onGoogleLogin={onGoogleLogin}
            onGoogleLogout={onGoogleLogout}
            onSelectMatch={onSelectCloudMatch}
            onOpenChampions={onOpenChampions}
          />
        )}

        {showPsychOutModal && (
          <PsychOutModal
            isOpen={showPsychOutModal}
            onClose={onClosePsychOut}
            onStartTurn={onStartTurnFromPsychOut}
            onWatchReplay={onWatchReplayFromPsychOut}
            roundNumber={localRoundIndex + 1}
            totalRounds={game.totalRounds}
            themeName={currentRound.theme}
            gridSize={currentRound.gridSize}
            opponentResults={opponentsList}
            currentPlayer={currentPlayer}
            roomCode={roomCode}
          />
        )}

        {showAmbushModal && (
          <TacticalAmbushModal
            isOpen={showAmbushModal}
            onClose={onCloseAmbush}
            onDeployTrap={onDeployTrap}
            availableLetters={availableLetters}
            opponents={tournamentOpponents}
            roundNumber={localRoundIndex + 1}
            earnedTrapsCount={earnedTrapsCount}
            currentPlayer={currentPlayer}
          />
        )}

        {showLiveSpectatorModal && spectatingStream && spectatorBoard && (
          <LiveSpectatorModal
            isOpen={showLiveSpectatorModal}
            onClose={onCloseLiveSpectator}
            stream={liveStreamData || spectatingStream}
            board={spectatorBoard}
            themeName={currentRound.theme}
            themeDescription={currentRound.theme}
            roundNumber={(liveStreamData || spectatingStream).roundIndex + 1}
            totalRounds={activeCloudMatch?.totalRounds || game.totalRounds}
          />
        )}
      </Suspense>

      {/* First-Visit How-To-Play Card */}
      {showHowToPlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="How to play WordRush"
        >
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
              onClick={onDismissHowToPlay}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-base shadow-xl shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-emerald-300 focus-visible:outline-offset-2"
            >
              <Play className="w-5 h-5 fill-dark-950" />
              <span>Play</span>
            </button>
            <p className="text-xs text-slate-400 mt-4">
              Sign-in is available anytime from the profile button in the top bar.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
