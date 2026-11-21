import React, { useState } from 'react';
import type { WordPlacement } from '../types/game';
import { Check, Sparkles, ArrowDownAZ, SortAsc, Lock, AlertTriangle } from 'lucide-react';

interface WordBankProps {
  words: WordPlacement[];
  theme: string;
  themeDescription: string;
  isCovered?: boolean;
  isGlitched?: boolean;
  isSheet?: boolean;
}

export const WordBank: React.FC<WordBankProps> = ({
  words,
  theme,
  themeDescription,
  isCovered = false,
  isGlitched = false,
  isSheet = false
}) => {
  const [sortByLength, setSortByLength] = useState(false);

  const foundCount = words.filter(w => w.found).length;
  const remainingCount = words.length - foundCount;

  // Sorting
  const displayWords = [...words].sort((a, b) => {
    if (a.found !== b.found) return a.found ? 1 : -1; // Unfound first
    if (sortByLength) {
      return b.word.length - a.word.length || a.word.localeCompare(b.word);
    }
    return a.word.localeCompare(b.word);
  });

  return (
    <div className="w-full" role="region" aria-label={`Target words list, ${remainingCount} remaining`}>
      <div className="glass-panel rounded-2xl p-2.5 sm:p-4 border-slate-800 shadow-xl flex flex-col lg:max-h-[min(76vh,880px)]">
        {/* Header: Theme title & Sort buttons */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Target Words</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({remainingCount} left)
              </span>
              {isCovered && (
                <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                  <Lock className="w-3 h-3" />
                  Hidden
                </span>
              )}
              {isGlitched && !isCovered && (
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 animate-pulse">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Blindfold Glitch</span>
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-200 truncate">
              {isCovered ? 'Theme Concealed' : isGlitched ? 'Blind Word Hunt (List Glitched!)' : theme}
            </div>
            {!isCovered && themeDescription && (
              <div className="text-xs text-slate-400 hidden sm:block truncate">
                {themeDescription}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-dark-900 border border-slate-800 rounded-lg p-0.5 shrink-0" role="group" aria-label="Sort target words">
            <button
              onClick={() => setSortByLength(false)}
              aria-pressed={!sortByLength}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                !sortByLength ? 'bg-slate-800 text-emerald-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sort alphabetically (A–Z)"
            >
              <ArrowDownAZ className="w-3.5 h-3.5 shrink-0" />
              <span>A–Z</span>
            </button>
            <button
              onClick={() => setSortByLength(true)}
              aria-pressed={sortByLength}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                sortByLength ? 'bg-slate-800 text-cyan-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Sort by word length"
            >
              <SortAsc className="w-3.5 h-3.5 shrink-0" />
              <span>Length</span>
            </button>
          </div>
        </div>

        {/* Word Chips: Grid layout in sheet mode, compact horizontal swipe on standalone mobile, clean vertical scrolling list on desktop sidebar */}
        <div
          role="list"
          aria-label="Words to find"
          className={
            isSheet
              ? 'grid grid-cols-2 sm:grid-cols-3 gap-1.5 overflow-y-auto max-h-[50vh] p-0.5'
              : 'flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto pb-1 lg:pb-0 scrollbar-none items-stretch'
          }
        >
          {displayWords.map((w, idx) => {
            return (
              <div
                key={`bank-word-${idx}`}
                role="listitem"
                className={`px-2.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-between gap-1.5 shrink-0 whitespace-nowrap ${
                  w.found
                    ? 'line-through text-slate-400 bg-slate-900/40 border border-slate-800/40 opacity-55'
                    : 'bg-dark-850 text-slate-100 border border-slate-700/70 shadow-sm hover:border-slate-500'
                }`}
                style={{
                  borderColor: w.found ? `${w.color}30` : undefined,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {w.found ? (
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: w.color }} aria-hidden="true" />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isCovered ? '#64748b' : w.color }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="truncate">
                    {isCovered
                      ? '•'.repeat(w.word.length)
                      : isGlitched && !w.found
                      ? w.word.split('').map(() => '?').join(' ')
                      : w.word}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-normal shrink-0">
                  {isGlitched && !w.found ? '?L' : `${w.word.length}L`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
