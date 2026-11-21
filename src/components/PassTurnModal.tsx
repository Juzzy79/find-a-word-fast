import React, { useState } from 'react';
import type { SharedGameState, PlayerTurnResult } from '../types/game';
import { formatMs, formatSecondsShort, generateShareMessage } from '../utils/formatters';
import { getShareUrlForGame } from '../utils/stateEncoder';
import { Share2, Copy, Check, Trophy, Users, ArrowRight, MessageSquare, Play, Zap } from 'lucide-react';

interface PassTurnModalProps {
  game: SharedGameState;
  currentPlayer: string;
  currentTurnResult?: PlayerTurnResult;
  onClose: () => void;
  onNextRound?: () => void;
  onLocalPassTurn?: (nextPlayerName: string) => void;
  onWatchReplay?: (contender: PlayerTurnResult) => void;
}

export const PassTurnModal: React.FC<PassTurnModalProps> = ({
  game,
  currentPlayer,
  currentTurnResult,
  onClose,
  onNextRound,
  onLocalPassTurn,
  onWatchReplay
}) => {
  const [copied, setCopied] = useState(false);
  const [localNextName, setLocalNextName] = useState('');

  const currentRound = game.rounds[game.currentRoundIndex] || game.rounds[0];
  const shareUrl = getShareUrlForGame(game);
  const shareMessage = generateShareMessage(game, currentPlayer, currentTurnResult, shareUrl);

  // Collect and sort all completed turns for the current round
  const roundResults = Object.values(currentRound.results).sort(
    (a, b) => a.elapsedMs - b.elapsedMs
  );

  const bestRoundTime = roundResults.length > 0 ? roundResults[0].elapsedMs : 0;

  // Web Share API
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'WordRush Challenge',
          text: shareMessage,
          url: shareUrl
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isSeriesOver = game.mode === 'series' && game.currentRoundIndex >= game.totalRounds - 1;
  const canAdvanceSeries = game.mode === 'series' && !isSeriesOver;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-5 sm:p-6 my-auto text-slate-100 border-slate-700/80">
        {/* Header */}
        <div className="text-center mb-5">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 shadow-lg ${
            game.mode === 'zen'
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40 shadow-teal-500/20'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
          }`}>
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {game.mode === 'zen' ? 'Zen Board Solved! 🌸' : 'Turn Completed!'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {game.mode === 'zen' ? 'Relaxed Mode &bull; No Timers' : `Round ${currentRound.roundNumber}`} &bull; {currentRound.theme} ({currentRound.gridSize}&times;{currentRound.gridSize})
          </p>
        </div>

        {/* Current Player's Run Summary */}
        {currentTurnResult && (
          game.mode === 'zen' ? (
            <div className="bg-dark-900/90 border border-teal-500/30 rounded-xl p-3 text-center mb-5">
              <div className="text-xs font-mono uppercase text-teal-400 font-semibold mb-1">
                Completed in Zen Mode
              </div>
              <div className="text-sm text-slate-200">
                All words found peacefully without timer stress!
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="bg-dark-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Your Time</div>
                <div className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-400">
                  {formatMs(currentTurnResult.elapsedMs)}
                </div>
              </div>
              <div className="bg-dark-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Fastest Burst</div>
                <div className="font-mono text-xl sm:text-2xl font-extrabold text-amber-400">
                  {currentTurnResult.burstSpeedMs > 0 ? formatSecondsShort(currentTurnResult.burstSpeedMs) : '—'}
                </div>
              </div>
            </div>
          )
        )}

        {/* Round Leaderboard / Contenders */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400 mb-2 px-1">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Round Standings
            </span>
            <span>{roundResults.length} Contender{roundResults.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {roundResults.map((r, idx) => {
              const isCurrent = r.playerName.toLowerCase() === currentPlayer.toLowerCase();
              const deltaMs = r.elapsedMs - bestRoundTime;
              return (
                <div
                  key={`round-res-${idx}`}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-mono transition-all ${
                    isCurrent
                      ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300'
                      : 'bg-dark-900/70 border border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      idx === 0
                        ? 'bg-amber-400 text-dark-950 shadow-sm'
                        : idx === 1
                        ? 'bg-slate-300 text-dark-950'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-sans font-semibold">{r.playerName}</span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {idx > 0 && deltaMs > 0 && (
                      <span className="text-[11px] text-slate-500 font-sans hidden sm:inline">
                        +{formatSecondsShort(deltaMs)}
                      </span>
                    )}
                    <span className="font-extrabold text-sm">{formatMs(r.elapsedMs)}</span>

                    {onWatchReplay && (
                      <button
                        onClick={() => onWatchReplay(r)}
                        className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 transition-all ml-1"
                        title={`Watch high-speed replay of ${r.playerName}'s round`}
                      >
                        <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400" />
                        <span>Replay</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* The Live Room Invite / Pass Message Box */}
        <div className="bg-dark-900/90 border border-slate-800/90 rounded-2xl p-3 sm:p-4 mb-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>{roundResults.length >= 2 ? 'Room Results' : 'Invite Opponent to Live Room'}</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync Active
            </span>
          </div>

          <div className="text-xs text-slate-300 bg-dark-950/80 p-2.5 rounded-xl border border-slate-800/80 font-mono whitespace-pre-line select-all mb-3 max-h-24 overflow-y-auto">
            {shareMessage}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleNativeShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-98 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Room Link / Code</span>
            </button>

            <button
              onClick={handleCopy}
              className="py-2.5 px-3.5 rounded-xl bg-dark-850 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Copy message to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Local Pass & Play Option */}
        {onLocalPassTurn && (
          <div className="bg-dark-900/60 border border-slate-800/60 rounded-2xl p-3 mb-4">
            <div className="text-xs font-semibold text-slate-400 mb-2">Or Pass Device to Next Player:</div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Next player name (e.g. Luke)"
                value={localNextName}
                onChange={e => setLocalNextName(e.target.value)}
                className="flex-1 bg-dark-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                disabled={!localNextName.trim()}
                onClick={() => {
                  if (localNextName.trim()) {
                    onLocalPassTurn(localNextName.trim());
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold disabled:opacity-40 flex items-center gap-1 transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start</span>
              </button>
            </div>
          </div>
        )}

        {/* Series Advance or Close */}
        <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-800/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Back to Board
          </button>

          {canAdvanceSeries && onNextRound && (
            <button
              onClick={onNextRound}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <span>Next Round</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
