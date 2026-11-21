import React, { useState } from 'react';
import type { CloudMatchDocument } from '../services/matchService';
import type { PlayerTurnResult, LivePlayerStream } from '../types/game';
import { formatMs, formatSecondsShort, generateShareMessage } from '../utils/formatters';
import { getShareUrlForGame } from '../utils/stateEncoder';
import {
  Users,
  Copy,
  Check,
  Share2,
  Trophy,
  Play,
  ArrowRight,
  Zap,
  LogOut,
  Clock,
  Sparkles,
  Crown,
  Trash2,
  Archive,
  Flame,
  Eye,
  Bomb,
  UserMinus
} from 'lucide-react';

interface CloudMatchHubProps {
  match: CloudMatchDocument;
  currentPlayer: string;
  currentRoundIndex: number;
  onSelectRound?: (index: number) => void;
  onStartTurn: () => void;
  onNextRound: () => void;
  onLeaveMatch: () => void;
  onDeleteMatch?: () => void;
  onArchiveMatch?: () => void;
  onViewChampions?: () => void;
  onWatchReplay?: (contender: PlayerTurnResult) => void;
  onOpenPsychOut?: () => void;
  onWatchLive?: (stream: LivePlayerStream) => void;
  onRemoveParticipant?: (playerName: string) => void;
  isRunning: boolean;
  isPaused: boolean;
  isCompletedThisRound: boolean;
}

export const CloudMatchHub: React.FC<CloudMatchHubProps> = ({
  match,
  currentPlayer,
  currentRoundIndex,
  onSelectRound,
  onStartTurn,
  onNextRound,
  onLeaveMatch,
  onDeleteMatch,
  onArchiveMatch,
  onViewChampions,
  onWatchReplay,
  onOpenPsychOut,
  onWatchLive,
  onRemoveParticipant,
  isRunning,
  isPaused,
  isCompletedThisRound
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const round = match.rounds[currentRoundIndex] || match.rounds[0];
  const roundResults = round?.results || {};

  // Deduplicate results by lowercase player name
  const deduplicatedResults = Object.values(roundResults).reduce<PlayerTurnResult[]>((acc, res) => {
    if (!acc.some(r => r.playerName.toLowerCase() === res.playerName.toLowerCase())) {
      acc.push(res);
    }
    return acc;
  }, []).sort((a, b) => a.elapsedMs - b.elapsedMs);

  // All known participants
  const participants = Array.from(new Set([
    ...match.participants,
    ...deduplicatedResults.map(r => r.playerName)
  ]));

  // Check turn completion for current player
  const myResult = roundResults[currentPlayer.toLowerCase()];
  const hasFinishedThisRound = !!myResult || isCompletedThisRound;

  // Check how many have completed
  const completedCount = participants.filter(p => !!roundResults[p.toLowerCase()]).length;
  const isRoundComplete = (participants.length >= 2 || (participants.length === 1 && completedCount === 1)) && completedCount >= participants.length;
  const isLastRound = currentRoundIndex >= match.totalRounds - 1;

  // Round winner
  const roundWinner = deduplicatedResults[0] || null;

  // Compute overall series stats if series mode
  const seriesScores: Record<string, { totalTimeMs: number; roundsWon: number }> = {};
  participants.forEach(p => {
    seriesScores[p.toLowerCase()] = { totalTimeMs: 0, roundsWon: 0 };
  });

  match.rounds.forEach(r => {
    const results = Object.values(r.results || {}).reduce<PlayerTurnResult[]>((acc, res) => {
      if (!acc.some(existing => existing.playerName.toLowerCase() === res.playerName.toLowerCase())) {
        acc.push(res);
      }
      return acc;
    }, []).sort((a, b) => a.elapsedMs - b.elapsedMs);

    if (results.length > 0) {
      const winner = results[0];
      if (seriesScores[winner.playerName.toLowerCase()]) {
        seriesScores[winner.playerName.toLowerCase()].roundsWon += 1;
      }
    }

    results.forEach(res => {
      if (seriesScores[res.playerName.toLowerCase()]) {
        seriesScores[res.playerName.toLowerCase()].totalTimeMs += res.elapsedMs;
      }
    });
  });

  // Series champion
  const seriesLeader = [...participants].sort((a, b) => {
    const scoreA = seriesScores[a.toLowerCase()] || { roundsWon: 0, totalTimeMs: Infinity };
    const scoreB = seriesScores[b.toLowerCase()] || { roundsWon: 0, totalTimeMs: Infinity };
    if (scoreB.roundsWon !== scoreA.roundsWon) {
      return scoreB.roundsWon - scoreA.roundsWon;
    }
    return scoreA.totalTimeMs - scoreB.totalTimeMs;
  })[0];

  const handleCopyLink = () => {
    const shareUrl = getShareUrlForGame(match);
    const msg = generateShareMessage(match, currentPlayer, myResult, shareUrl);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyCodeOnly = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(match.roomCode || match.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleShareNative = async () => {
    const shareUrl = getShareUrlForGame(match);
    const msg = generateShareMessage(match, currentPlayer, myResult, shareUrl);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'WordRush Challenge',
          text: msg,
          url: shareUrl
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopyLink();
  };

  return (
    <div className="w-full mx-auto mb-4 rounded-3xl bg-dark-900/90 border border-cyan-500/40 p-3 sm:p-4 shadow-xl shadow-cyan-950/20 backdrop-blur-md">
      {/* Top Bar: Room ID, Status, Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-500/10">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-300">Live Match Room:</span>
              <button
                onClick={handleCopyCodeOnly}
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 font-mono font-black text-amber-300 text-sm tracking-widest hover:bg-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                title="Click to copy room code"
              >
                <span>{match.roomCode || match.id}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
              </button>
              {match.status === 'completed' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Archive className="w-3 h-3 text-amber-400" />
                  Archived Tournament
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Cloud Sync
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {match.mode === 'series' ? `${match.totalRounds}-Round Series` : 'Word Duel'} &bull; {round.gridSize}&times;{round.gridSize} {round.difficulty || 'pro'} &bull; Theme: <b className="text-slate-200">{round.theme}</b>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onViewChampions && (
            <button
              onClick={onViewChampions}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="View Global Champions & Tournament Records"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Champions</span>
            </button>
          )}

          <button
            onClick={handleShareNative}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Share room invitation to opponent"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Link Copied!' : 'Share Room'}</span>
          </button>

          {match.status !== 'completed' && onArchiveMatch && (isRoundComplete || completedCount >= 1) && (
            <button
              onClick={onArchiveMatch}
              className="px-2.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Archive this room into the Champions Hall of Fame"
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Archive Room</span>
            </button>
          )}

          <button
            onClick={onLeaveMatch}
            className="px-2.5 py-1.5 rounded-xl bg-dark-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Leave this multiplayer room to play solo"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave Room</span>
          </button>

          {onDeleteMatch && (
            <button
              onClick={onDeleteMatch}
              className="px-2.5 py-1.5 rounded-xl bg-dark-950 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Delete this room permanently for all players"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Delete Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Series Rounds Progression Indicator */}
      {match.mode === 'series' && match.totalRounds > 1 && (
        <div className="pt-2.5 pb-2 border-b border-slate-800/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-slate-300">Series Progression</span>
            <span className="font-mono text-[11px]">Round {currentRoundIndex + 1} of {match.totalRounds}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {match.rounds.map((r, idx) => {
              const isActive = idx === currentRoundIndex;
              const rResults = Object.values(r.results || {});
              const hasWinner = rResults.length > 0;
              const rWinner = hasWinner ? [...rResults].sort((a, b) => a.elapsedMs - b.elapsedMs)[0] : null;
              const myPlayed = !!(r.results || {})[currentPlayer.toLowerCase()];

              return (
                <button
                  key={`round-indicator-${idx}`}
                  onClick={() => onSelectRound?.(idx)}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 border-cyan-500 shadow-md shadow-cyan-500/15 ring-1 ring-cyan-500/40 text-slate-100'
                      : myPlayed
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60 text-slate-300'
                      : 'bg-dark-950/60 border-slate-800/80 hover:border-slate-700 text-slate-400 opacity-80'
                  }`}
                  title={`View or switch to Round ${idx + 1}: ${r.theme}`}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
                    <span>Round {idx + 1}</span>
                    {myPlayed && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {rWinner ? (
                      <span className="text-amber-400 font-semibold truncate">{r.theme}</span>
                    ) : isActive ? (
                      <span className="text-cyan-300 font-semibold truncate">{r.theme}</span>
                    ) : (
                      <span className="truncate">{r.theme}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Standings & Player Turn Status Grid for Current Round */}
      <div className="py-2.5">
        {match.isTacticsMode && (
          <div className="mb-2 p-2 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="font-bold">Tactical Warfare Active</span>
              <span className="text-[10px] text-rose-300/80 hidden sm:inline">&bull; 5s combos award ambush curses!</span>
            </div>
            {round?.tacticalTraps && round.tacticalTraps.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Bomb className="w-3 h-3 text-amber-400" />
                <span>{round.tacticalTraps.length} Armed Ambush{round.tacticalTraps.length > 1 ? 'es' : ''}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Round {currentRoundIndex + 1} Player Status
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {completedCount} of {participants.length} finished
          </span>
        </div>

        {/* Helpful notice if an unplayed player or pre-login ghost player is holding up the round */}
        {completedCount < participants.length && participants.length > 1 && (
          <div className="mb-2 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 flex-wrap">
            <span>
              Waiting for <b>{participants.length - completedCount} player{participants.length - completedCount > 1 ? 's' : ''}</b> to finish.
            </span>
            <span className="text-slate-400 text-[10px]">
              Tap <UserMinus className="w-3 h-3 inline text-rose-400 mx-0.5" /> next to any inactive or duplicate player to remove them.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {participants.map((player, idx) => {
            const isMe = player.toLowerCase() === currentPlayer.toLowerCase();
            const res = roundResults[player.toLowerCase()];
            const hasPlayed = !!res;
            const liveStream = match.liveStreams?.[player.toLowerCase()] || match.liveStreams?.[player];
            const isLiveNow = !hasPlayed && !!liveStream?.isPlaying && liveStream.roundIndex === currentRoundIndex && (Date.now() - (liveStream.lastHeartbeat || 0) < 30000);

            return (
              <div
                key={`participant-${idx}`}
                className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                  hasPlayed
                    ? 'bg-dark-950/80 border-slate-700/80 text-slate-200'
                    : isLiveNow
                    ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 ring-1 ring-rose-500/30'
                    : isMe
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : 'bg-dark-950/50 border-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    hasPlayed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isLiveNow
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : isMe
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {player.charAt(0).toUpperCase()}
                  </div>

                  <div className="truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs truncate">{player}</span>
                      {isMe && (
                        <span className="text-[9px] uppercase font-mono font-bold bg-cyan-500/20 text-cyan-300 px-1 py-0.2 rounded border border-cyan-500/30 shrink-0">
                          You
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] mt-0.5">
                      {hasPlayed ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Finished in <b>{formatMs(res.elapsedMs)}</b></span>
                        </span>
                      ) : isLiveNow ? (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                          <span>Racing Live ({liveStream?.wordsFound?.length || 0} found)</span>
                        </span>
                      ) : isMe ? (
                        <span className="text-amber-400 font-semibold">Your turn &bull; Ready to race</span>
                      ) : (
                        <span className="text-slate-500 italic">Waiting for turn...</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isLiveNow && onWatchLive && !isMe && liveStream && (
                    <button
                      onClick={() => onWatchLive(liveStream)}
                      className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm shadow-rose-950/50"
                      title={`Watch ${player} play live`}
                    >
                      <Eye className="w-3 h-3 text-rose-400 animate-pulse" />
                      <span>Watch</span>
                    </button>
                  )}

                  {hasPlayed && (
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-sm text-slate-100">
                        {formatMs(res.elapsedMs)}
                      </div>
                      {res.burstSpeedMs > 0 && (
                        <div className="text-[9px] font-mono text-slate-400">
                          Best {formatSecondsShort(res.burstSpeedMs)}
                        </div>
                      )}
                    </div>
                  )}

                  {hasPlayed && onWatchReplay && (
                    <button
                      onClick={() => onWatchReplay(res)}
                      className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer"
                      title={`Watch ${player}'s turn replay`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                    </button>
                  )}

                  {!isMe && onRemoveParticipant && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Remove "${player}" from this room? This will clear them from this match so the round can complete.`)) {
                          onRemoveParticipant(player);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                      title={`Remove ${player} from this room`}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Action Callout Bar */}
      <div className="mt-2 pt-2.5 border-t border-slate-800/80">
        {/* CASE 1: Round is complete by all players, and there are more rounds in the series */}
        {isRoundComplete && !isLastRound ? (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-extrabold text-slate-100">
                  Round {currentRoundIndex + 1} Complete! Winner: <span className="text-amber-300">{roundWinner?.playerName}</span> ({roundWinner ? formatMs(roundWinner.elapsedMs) : ''})
                </div>
                <div className="text-[11px] text-slate-400">
                  Both players have finished! Ready to roll the puzzle for Round {currentRoundIndex + 2}?
                </div>
              </div>
            </div>

            <button
              onClick={onNextRound}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <span>Play Round {currentRoundIndex + 2} Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (match.status === 'completed' || (isRoundComplete && isLastRound)) ? (
          /* CASE 2: Tournament is completely finished / archived! */
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-dark-900 to-emerald-950/70 border border-amber-500/50 flex flex-wrap items-center justify-between gap-3 shadow-xl shadow-amber-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-md">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2 flex-wrap">
                  <span>Tournament Finished!</span>
                  <span className="text-slate-100 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                    👑 Champion: {seriesLeader}
                  </span>
                  {match.status === 'completed' && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Archive className="w-3 h-3" />
                      Archived in Hall of Fame
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  All {match.totalRounds} {match.totalRounds === 1 ? 'round' : 'rounds'} completed! Stats and historic records have been engraved.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {match.status !== 'completed' && onArchiveMatch && (
                <button
                  onClick={onArchiveMatch}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
                  title="Archive this room and publish to global records"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Tournament</span>
                </button>
              )}

              {onViewChampions && (
                <button
                  onClick={onViewChampions}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-dark-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 hover:bg-amber-300 transition-all cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>View Global Champions</span>
                </button>
              )}

              <button
                onClick={handleShareNative}
                className="px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Share Results</span>
              </button>
            </div>
          </div>
        ) : !hasFinishedThisRound && !isRunning && !isPaused ? (
          /* CASE 3: Current player hasn't played their turn yet! */
          <div className="p-3 rounded-2xl bg-dark-950/80 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200">
                It's your turn for Round {currentRoundIndex + 1}!
              </div>
              <div className="text-[11px] text-slate-400">
                {deduplicatedResults.length > 0
                  ? `Target time to beat: ${formatMs(deduplicatedResults[0].elapsedMs)} (${deduplicatedResults[0].playerName})`
                  : 'You will set the opening target time for this round!'}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {deduplicatedResults.length > 0 && onOpenPsychOut && (
                <button
                  onClick={onOpenPsychOut}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="View opponent rapid burst speeds & benchmark psych stats"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>Psych-Out Stats ({formatMs(deduplicatedResults[0].elapsedMs)})</span>
                </button>
              )}

              <button
                onClick={onStartTurn}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-dark-950" />
                <span>Start Round {currentRoundIndex + 1} Turn</span>
              </button>
            </div>
          </div>
        ) : hasFinishedThisRound ? (
          /* CASE 4: Current player finished, waiting for opponent */
          <div className="p-3 rounded-2xl bg-dark-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                Your Round {currentRoundIndex + 1} turn is recorded ({myResult ? formatMs(myResult.elapsedMs) : 'Finished'})! Waiting for opponent to take their turn.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isLastRound && (
                <button
                  onClick={onNextRound}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Play Round {currentRoundIndex + 2} Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleShareNative}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Room ({match.roomCode || match.id})</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
