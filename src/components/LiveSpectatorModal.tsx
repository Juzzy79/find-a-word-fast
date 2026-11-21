import React, { useEffect, useState } from 'react';
import type { GridBoard, LivePlayerStream } from '../types/game';
import { formatMs } from '../utils/formatters';
import { sounds } from '../utils/sound';
import { Clock, Check, Sparkles, X } from 'lucide-react';

interface LiveSpectatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: LivePlayerStream;
  board: GridBoard;
  themeName: string;
  themeDescription: string;
  roundNumber: number;
  totalRounds: number;
  runnerAvatarColor?: string;
}

export const LiveSpectatorModal: React.FC<LiveSpectatorModalProps> = ({
  isOpen,
  onClose,
  stream,
  board,
  themeName,
  themeDescription,
  roundNumber,
  totalRounds,
  runnerAvatarColor = '#10b981'
}) => {
  const [previousFoundCount, setPreviousFoundCount] = useState<number>(stream.wordsFound.length);
  const [lastFlurryNotice, setLastFlurryNotice] = useState<string | null>(null);

  // Play audio chime when the runner finds a word live
  useEffect(() => {
    if (stream.wordsFound.length > previousFoundCount) {
      sounds.playWordFound();
      const newlyFound = stream.lastWordFound?.word || stream.wordsFound[stream.wordsFound.length - 1];
      if (newlyFound) {
        setLastFlurryNotice(`Found "${newlyFound}"!`);
        const timer = setTimeout(() => setLastFlurryNotice(null), 2500);
        return () => clearTimeout(timer);
      }
      setPreviousFoundCount(stream.wordsFound.length);
    }
  }, [stream.wordsFound.length, previousFoundCount, stream.lastWordFound]);

  if (!isOpen) return null;

  const totalWords = board.words.length;
  const foundSet = new Set(stream.wordsFound.map(w => w.toUpperCase()));
  const foundCount = foundSet.size;

  // Determine cell found metadata for spectator grid
  const isCellInFoundWord = (r: number, c: number) => {
    for (const w of board.words) {
      if (!foundSet.has(w.word.toUpperCase())) continue;
      const [dr, dc] = w.direction;
      const len = w.word.length;
      for (let i = 0; i < len; i++) {
        if (w.start[0] + i * dr === r && w.start[1] + i * dc === c) {
          return { isFound: true, color: w.color || runnerAvatarColor };
        }
      }
    }
    return { isFound: false, color: '' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl my-auto rounded-3xl bg-dark-900 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-950/40 text-slate-100 flex flex-col overflow-hidden">
        {/* Live Broadcast Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-dark-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base text-dark-950 shadow-lg"
                style={{ backgroundColor: runnerAvatarColor }}
              >
                {stream.playerName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-dark-950 animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>LIVE BROADCAST</span>
                </span>
                <span className="font-bold text-slate-100 text-sm sm:text-base">
                  Watching {stream.playerName}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Round {roundNumber} of {totalRounds} &bull; <b className="text-slate-200">{themeName}</b> {themeDescription && <span className="hidden sm:inline text-slate-400">({themeDescription})</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Timer */}
            <div className="text-right px-3 py-1.5 rounded-xl bg-dark-900 border border-slate-800">
              <div className="flex items-center gap-1 text-xs font-mono uppercase text-slate-400 font-bold justify-end">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Elapsed</span>
              </div>
              <div className="font-mono font-black text-base sm:text-lg text-emerald-400">
                {formatMs(stream.elapsedMs)}
              </div>
            </div>

            {/* Word Progress */}
            <div className="text-right px-3 py-1.5 rounded-xl bg-dark-900 border border-slate-800">
              <div className="text-xs font-mono uppercase text-slate-400 font-bold">
                Words Found
              </div>
              <div className="font-mono font-black text-base sm:text-lg text-cyan-300">
                {foundCount} / {totalWords}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Close Live Spectator View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Notification Toast Banner */}
        {lastFlurryNotice && (
          <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border-b border-emerald-500/40 text-center font-bold text-xs text-emerald-300 flex items-center justify-center gap-2 animate-bounce-subtle">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{stream.playerName} {lastFlurryNotice}</span>
          </div>
        )}

        {/* Live Arena Body: Board Grid + Live Word Bank */}
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 items-start max-h-[72vh] overflow-y-auto">
          {/* Main Spectator Grid (3 Cols) */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center bg-dark-950 p-3 sm:p-5 rounded-3xl border border-slate-800 shadow-inner">
            <div
              className="grid gap-1 select-none w-full max-w-xl aspect-square"
              style={{
                gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${board.size}, minmax(0, 1fr))`
              }}
            >
              {board.matrix.map((rowArr, r) =>
                rowArr.map((letter, c) => {
                  const meta = isCellInFoundWord(r, c);
                  return (
                    <div
                      key={`spectator-cell-${r}-${c}`}
                      className={`flex items-center justify-center font-mono font-black rounded text-xs sm:text-sm md:text-base transition-all duration-300 ${
                        meta.isFound
                          ? 'text-white scale-105 shadow-sm'
                          : 'text-slate-400/70 hover:text-slate-400'
                      }`}
                      style={{
                        backgroundColor: meta.isFound ? `${meta.color}40` : '#0f172a60',
                        border: meta.isFound ? `1px solid ${meta.color}80` : '1px solid #1e293b40',
                        textShadow: meta.isFound ? `0 0 8px ${meta.color}` : 'none'
                      }}
                    >
                      {letter}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Word Bank Sidebar (1 Col) */}
          <div className="lg:col-span-1 bg-dark-950/80 p-3.5 rounded-3xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Target Words</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {totalWords - foundCount} Left
              </span>
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {board.words.map((w, idx) => {
                const isFound = foundSet.has(w.word.toUpperCase());
                return (
                  <div
                    key={`spec-word-${idx}`}
                    className={`px-2.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center justify-between transition-all ${
                      isFound
                        ? 'line-through text-slate-400 bg-slate-900/40 border border-slate-800/40 opacity-60'
                        : 'bg-dark-900 text-slate-200 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isFound ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
                      )}
                      <span className="truncate">{w.word}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-normal">
                      {w.word.length}L
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-dark-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Watching live telemetry synchronized with cloud match</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
          >
            Exit Spectator Mode
          </button>
        </div>
      </div>
    </div>
  );
};
