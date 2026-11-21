import React, { useState, useEffect, useRef } from 'react';
import type { GridBoard, PlayerTurnResult } from '../types/game';
import { formatMs, formatSecondsShort, getPlayerColor } from '../utils/formatters';
import { sounds } from '../utils/sound';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Zap,
  SkipForward,
  SkipBack,
  Sparkles
} from 'lucide-react';

interface ReplayModalProps {
  board: GridBoard;
  turnResult: PlayerTurnResult;
  onClose: () => void;
}

export const ReplayModal: React.FC<ReplayModalProps> = ({ board, turnResult, onClose }) => {
  const { matrix, size, words } = board;

  // Build replay sequence: fallback to alphabetical words if replayLog not stored in legacy games
  const replayLog = React.useMemo(() => {
    if (turnResult.replayLog && turnResult.replayLog.length > 0) {
      return turnResult.replayLog;
    }
    // Synthesize fallback from timestamps
    const times = turnResult.wordFindTimestamps || [];
    return words.map((w, idx) => ({
      word: w.word,
      atMs: times[idx] || Math.round((turnResult.elapsedMs / words.length) * (idx + 1))
    })).sort((a, b) => a.atMs - b.atMs);
  }, [turnResult, words]);

  const totalDuration = turnResult.elapsedMs || 60000;
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(4); // Default to 4x fast-forward

  const lastWordSoundIndexRef = useRef<number>(-1);
  const animFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Determine which words have been found up to currentTimeMs
  const foundWordsAtCurrentTime = replayLog.filter(item => item.atMs <= currentTimeMs);
  const activeWordItem = foundWordsAtCurrentTime[foundWordsAtCurrentTime.length - 1];

  // Play audio chime when a new word is revealed
  useEffect(() => {
    const currentIdx = foundWordsAtCurrentTime.length - 1;
    if (currentIdx >= 0 && currentIdx !== lastWordSoundIndexRef.current && isPlaying) {
      lastWordSoundIndexRef.current = currentIdx;
      sounds.playWordFound();
    }
  }, [foundWordsAtCurrentTime.length, isPlaying]);

  // Main replay ticker loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTickRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTickRef.current) * speedMultiplier;
      lastTickRef.current = now;

      setCurrentTimeMs(prev => {
        const next = prev + delta;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speedMultiplier, totalDuration]);

  // Jump to specific word index in replay
  const seekToWordIndex = (idx: number) => {
    if (idx < 0) {
      setCurrentTimeMs(0);
      lastWordSoundIndexRef.current = -1;
      return;
    }
    const targetIdx = Math.min(idx, replayLog.length - 1);
    const target = replayLog[targetIdx];
    setCurrentTimeMs(target.atMs);
    lastWordSoundIndexRef.current = targetIdx;
  };

  const handleRestart = () => {
    setCurrentTimeMs(0);
    lastWordSoundIndexRef.current = -1;
    setIsPlaying(true);
  };

  const handleStepBack = () => {
    const currentIdx = foundWordsAtCurrentTime.length - 1;
    seekToWordIndex(currentIdx - 1);
  };

  const handleStepForward = () => {
    const currentIdx = foundWordsAtCurrentTime.length - 1;
    seekToWordIndex(currentIdx + 1);
  };

  const avatar = getPlayerColor(turnResult.playerName);
  const foundWordStrings = new Set(foundWordsAtCurrentTime.map(w => w.word));

  // Determine cells that belong to found words at this timestamp
  const getCellFoundInfo = (r: number, c: number) => {
    for (const w of words) {
      if (!foundWordStrings.has(w.word)) continue;
      const [startR, startC] = w.start;
      const [dRow, dCol] = w.direction;
      for (let i = 0; i < w.word.length; i++) {
        if (startR + i * dRow === r && startC + i * dCol === c) {
          const isLatest = activeWordItem && activeWordItem.word === w.word;
          return { isFound: true, color: w.color, isLatest };
        }
      }
    }
    return { isFound: false };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto select-none">
      <div className="w-full max-w-4xl glass-panel-glow rounded-3xl p-4 sm:p-6 my-auto text-slate-100 border-cyan-500/40 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80 pr-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold font-mono text-base border-2 ${avatar.bg}`}>
              {turnResult.playerName[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  {turnResult.playerName}'s High-Speed Replay
                </h2>
                <span className="text-xs uppercase font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
                  {speedMultiplier}x Speed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {board.theme} &bull; Final Time: <b className="text-emerald-400 font-mono">{formatMs(turnResult.elapsedMs)}</b>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs uppercase font-mono tracking-wider text-slate-400">Replay Clock</div>
            <div className="font-mono text-2xl font-black text-cyan-400">
              {formatMs(currentTimeMs)}
            </div>
          </div>
        </div>

        {/* Replay Video Scrub Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>{formatMs(currentTimeMs)}</span>
            <span>{foundWordsAtCurrentTime.length} / {replayLog.length} Words Solved</span>
            <span>{formatMs(totalDuration)}</span>
          </div>
          <div className="relative w-full h-3 bg-dark-900 rounded-full overflow-hidden border border-slate-800 cursor-pointer">
            <input
              type="range"
              min={0}
              max={totalDuration}
              value={currentTimeMs}
              onChange={e => {
                const val = Number(e.target.value);
                setCurrentTimeMs(val);
                lastWordSoundIndexRef.current = -1;
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-violet-500 transition-all duration-75 rounded-full"
              style={{ width: `${(currentTimeMs / totalDuration) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Workspace: Board on Left, Solve Order Feed on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">
          {/* Grid Canvas */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center p-2 rounded-2xl bg-dark-950/70 border border-slate-800">
            <div
              className="relative grid gap-0.5 p-2 rounded-xl bg-dark-900 border border-slate-800 shadow-xl"
              style={{
                gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
                width: size >= 20 ? 'min(88vw, 420px)' : size >= 18 ? 'min(88vw, 390px)' : 'min(88vw, 360px)',
                height: size >= 20 ? 'min(88vw, 420px)' : size >= 18 ? 'min(88vw, 390px)' : 'min(88vw, 360px)',
              }}
            >
              {/* SVG Overlay for Found Word Capsules */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {words
                  .filter(w => foundWordStrings.has(w.word))
                  .map((w, idx) => {
                    const cellW = 100 / size;
                    const cellH = 100 / size;
                    const x1 = `${(w.start[1] + 0.5) * cellW}%`;
                    const y1 = `${(w.start[0] + 0.5) * cellH}%`;
                    const x2 = `${(w.end[1] + 0.5) * cellW}%`;
                    const y2 = `${(w.end[0] + 0.5) * cellH}%`;
                    const isLatest = activeWordItem && activeWordItem.word === w.word;

                    return (
                      <g key={`replay-line-${idx}`}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={w.color}
                          strokeWidth={size >= 20 ? '16' : '18'}
                          strokeLinecap="round"
                          strokeOpacity={isLatest ? '0.55' : '0.3'}
                        />
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={w.color}
                          strokeWidth={size >= 20 ? '3' : '4'}
                          strokeLinecap="round"
                          strokeOpacity={isLatest ? '1' : '0.75'}
                        />
                      </g>
                    );
                  })}
              </svg>

              {/* Grid Letters */}
              {matrix.map((rowArr, r) =>
                rowArr.map((letter, c) => {
                  const meta = getCellFoundInfo(r, c);
                  return (
                    <div
                      key={`replay-cell-${r}-${c}`}
                      className={`relative z-20 flex items-center justify-center font-mono font-bold select-none rounded text-xs transition-all ${
                        meta.isFound
                          ? meta.isLatest
                            ? 'text-white font-black scale-110'
                            : 'text-white font-extrabold'
                          : 'text-slate-600'
                      }`}
                      style={{
                        textShadow: meta.isFound
                          ? `0 0 8px ${meta.color}`
                          : 'none'
                      }}
                    >
                      {letter}
                    </div>
                  );
                })
              )}
            </div>

            {/* Active Word Announcement */}
            {activeWordItem && (
              <div className="mt-2 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 animate-fadeIn">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Found #{foundWordsAtCurrentTime.length}: <b>{activeWordItem.word}</b></span>
                <span className="text-slate-400 font-normal">at {formatMs(activeWordItem.atMs)}</span>
              </div>
            )}
          </div>

          {/* Sequence Feed Sidebar */}
          <div className="lg:col-span-1 bg-dark-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col h-[380px]">
            <div className="text-xs font-mono uppercase text-slate-400 font-bold mb-2 pb-1.5 border-b border-slate-800/80 flex items-center justify-between">
              <span>Solve Order</span>
              <span>Gap / Split</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {replayLog.map((item, idx) => {
                const isFound = item.atMs <= currentTimeMs;
                const isLatest = activeWordItem && activeWordItem.word === item.word;
                const prevMs = idx > 0 ? replayLog[idx - 1].atMs : 0;
                const gapMs = item.atMs - prevMs;
                const isFastCombo = gapMs > 0 && gapMs < 2500;

                return (
                  <div
                    key={`feed-item-${idx}`}
                    onClick={() => seekToWordIndex(idx)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono cursor-pointer transition-all ${
                      isLatest
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 shadow-md'
                        : isFound
                        ? 'bg-dark-950/80 border border-slate-800/80 text-slate-300 hover:border-slate-700'
                        : 'bg-dark-950/30 border border-slate-800/30 text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                        isFound ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`font-semibold truncate ${isFound ? 'text-slate-200' : 'text-slate-600'}`}>
                        {item.word}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs shrink-0">
                      {isFastCombo && (
                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      )}
                      <span className={isFastCombo ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                        +{formatSecondsShort(gapMs)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Playback Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-dark-900 border border-slate-800">
          {/* Play, Step, Restart Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRestart}
              className="p-2 rounded-xl bg-dark-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Restart Replay"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={handleStepBack}
              className="p-2 rounded-xl bg-dark-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Previous Word"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 font-black shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-dark-950" /> : <Play className="w-5 h-5 fill-dark-950" />}
            </button>

            <button
              onClick={handleStepForward}
              className="p-2 rounded-xl bg-dark-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Next Word"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-dark-950 border border-slate-800 rounded-xl p-1">
            <span className="text-xs font-mono text-slate-400 px-1.5 hidden sm:inline">SPEED:</span>
            {[1, 2, 4, 8, 16].map(mult => (
              <button
                key={`speed-${mult}`}
                onClick={() => setSpeedMultiplier(mult)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  speedMultiplier === mult
                    ? 'bg-cyan-500 text-dark-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
