import React, { useState } from 'react';
import type { GameMode, GridSize, DifficultyLevel } from '../types/game';
import { Trophy, Swords, Calendar, Flame, Shuffle, ArrowRight, X, Compass, Coffee, Sparkles } from 'lucide-react';
import { getWeeklyCompetitionSeed, getAvailableThemes } from '../utils/wordList';

interface CompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (options: {
    mode: GameMode;
    gridSize: GridSize;
    difficulty?: DifficultyLevel;
    totalRounds?: number;
    isChaosMode?: boolean;
    isTacticsMode?: boolean;
    themeId?: string;
  }) => void;
  onOpenAdmin?: () => void;
}

export const CompetitionModal: React.FC<CompetitionModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  onOpenAdmin
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('duel');
  const [gridSize, setGridSize] = useState<GridSize>(18);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('pro');
  const [seriesRounds, setSeriesRounds] = useState<number>(3);
  const [isChaosMode, setIsChaosMode] = useState<boolean>(false);
  const [isTacticsMode, setIsTacticsMode] = useState<boolean>(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');

  if (!isOpen) return null;

  const { weekLabel } = getWeeklyCompetitionSeed();
  const themes = getAvailableThemes();

  const handleCreate = () => {
    onStartGame({
      mode: selectedMode,
      gridSize,
      difficulty,
      totalRounds: selectedMode === 'series' ? seriesRounds : 1,
      isChaosMode,
      isTacticsMode,
      themeId: !isChaosMode && selectedThemeId ? selectedThemeId : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-5 sm:p-6 my-auto text-slate-100 border-slate-700/80 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" />
            <span>Select Competition Mode</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">New Match / Series</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Choose how you want to challenge other players
          </p>
        </div>

        {/* Game Mode Cards */}
        <div className="space-y-2.5 mb-5">
          {/* Quick Duel */}
          <div
            onClick={() => setSelectedMode('duel')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedMode === 'duel'
                ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'bg-dark-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Swords className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">Quick Duel (1-Round Showdown)</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      New Board
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Generates a fresh, random theme & puzzle board every single time</div>
                </div>
              </div>
              <input
                type="radio"
                checked={selectedMode === 'duel'}
                onChange={() => setSelectedMode('duel')}
                className="accent-emerald-500"
              />
            </div>
          </div>

          {/* Multi-Round Series */}
          <div
            onClick={() => setSelectedMode('series')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedMode === 'series'
                ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : 'bg-dark-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-100">Multi-Round Series</div>
                  <div className="text-xs text-slate-400">Play across multiple boards with aggregate leaderboard</div>
                </div>
              </div>
              <input
                type="radio"
                checked={selectedMode === 'series'}
                onChange={() => setSelectedMode('series')}
                className="accent-cyan-500"
              />
            </div>

            {selectedMode === 'series' && (
              <div className="mt-3 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs">
                <span className="text-cyan-300 font-medium">Series Length:</span>
                <div className="flex gap-1.5">
                  {[3, 5].map(r => (
                    <button
                      key={`series-r-${r}`}
                      onClick={e => {
                        e.stopPropagation();
                        setSeriesRounds(r);
                      }}
                      className={`px-3 py-1 rounded-lg font-mono font-bold transition-all ${
                        seriesRounds === r
                          ? 'bg-cyan-500 text-dark-950 shadow'
                          : 'bg-dark-950 border border-slate-800 text-slate-300'
                      }`}
                    >
                      {r} Rounds
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Weekly Competition */}
          <div
            onClick={() => setSelectedMode('weekly')}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedMode === 'weekly'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                : 'bg-dark-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">Weekly Championship ({weekLabel})</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      Fixed All Week
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Same board all week so all players worldwide can compete for #1 on the leaderboard</div>
                </div>
              </div>
              <input
                type="radio"
                checked={selectedMode === 'weekly'}
                onChange={() => setSelectedMode('weekly')}
                className="accent-amber-500"
              />
            </div>
          </div>

          {/* Zen Untimed Mode */}
          <div
            onClick={() => {
              setSelectedMode('zen');
              setDifficulty('expert');
            }}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedMode === 'zen'
                ? 'bg-teal-500/15 border-teal-500/50 shadow-md shadow-teal-500/10'
                : 'bg-dark-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">Zen Mode (No Timers / Relaxed)</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                      All Directions
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Zero timers, no clock pressure, board includes all 8 directions & diagonals</div>
                </div>
              </div>
              <input
                type="radio"
                checked={selectedMode === 'zen'}
                onChange={() => {
                  setSelectedMode('zen');
                  setDifficulty('expert');
                }}
                className="accent-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Options: Skill Level, Grid Size & Chaos Mode */}
        {selectedMode !== 'weekly' && (
          <div className="bg-dark-900/90 border border-slate-800 rounded-2xl p-4 mb-5 space-y-3.5">
            {/* Skill / Direction Level */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Skill Level & Word Directions:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    lvl: 'standard' as DifficultyLevel,
                    title: 'Standard',
                    desc: 'H & V Only',
                    sub: 'No diagonals',
                    activeColor: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  },
                  {
                    lvl: 'pro' as DifficultyLevel,
                    title: 'Pro ✨',
                    desc: '+ Diagonals',
                    sub: 'Forward diagonals',
                    activeColor: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                  },
                  {
                    lvl: 'expert' as DifficultyLevel,
                    title: 'Expert ⚡',
                    desc: '8-Way + Rev',
                    sub: 'Reverse & diag',
                    activeColor: 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                  }
                ].map(item => (
                  <button
                    key={`diff-${item.lvl}`}
                    onClick={() => setDifficulty(item.lvl)}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      difficulty === item.lvl
                        ? item.activeColor
                        : 'bg-dark-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{item.title}</div>
                    <div className="text-[11px] font-semibold">{item.desc}</div>
                    <div className="text-[9px] text-slate-500">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Size */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-xs font-mono uppercase text-slate-400 mb-1.5 font-semibold">
                Grid Size & Complexity:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sz: 16, label: 'Large (16×16)', words: '14 words' },
                  { sz: 18, label: 'XL (18×18)', words: '18 words' },
                  { sz: 20, label: 'Titan (20×20)', words: '22 words' },
                ].map(item => (
                  <button
                    key={`size-${item.sz}`}
                    onClick={() => setGridSize(item.sz as GridSize)}
                    className={`p-2 rounded-xl text-center border transition-all ${
                      gridSize === item.sz
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-dark-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{item.sz}×{item.sz}</div>
                    <div className="text-[10px] text-slate-500">{item.words}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic / Theme Selection (hidden in Chaos Mode) */}
            {!isChaosMode && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Puzzle Topic / Theme:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAdmin();
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>+ Custom Topics</span>
                      </button>
                    )}
                    {selectedThemeId && (
                      <button
                        type="button"
                        onClick={() => setSelectedThemeId('')}
                        className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Reset to Random
                      </button>
                    )}
                  </div>
                </div>
                <select
                  value={selectedThemeId}
                  onChange={e => setSelectedThemeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500/60 cursor-pointer"
                >
                  <option value="">🎲 Random Theme (Surprise Me)</option>
                  {themes.some(t => t.isCustom) && (
                    <optgroup label="✨ Custom Created Topics">
                      {themes.filter(t => t.isCustom).map(t => (
                        <option key={t.id} value={t.id}>
                          ✨ {t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Built-in Classic Themes">
                    {themes.filter(t => !t.isCustom).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {selectedThemeId && (
                  <div className="text-[10px] text-slate-400 mt-1 pl-1">
                    {themes.find(t => t.id === selectedThemeId)?.description}
                  </div>
                )}
              </div>
            )}

            {/* Random Chaos Mode Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-violet-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Total Chaos Mode</div>
                  <div className="text-[10px] text-slate-400">Completely random words instead of a single theme</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChaosMode(!isChaosMode)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isChaosMode ? 'bg-violet-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isChaosMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tactical Warfare & Traps Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200">Tactical Warfare</span>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      Curses & Traps
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">Earn ambush traps by landing 5s combos; curse opponents with cloaked letters!</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTacticsMode(!isTacticsMode)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  isTacticsMode ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isTacticsMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Start Game Action */}
        <button
          onClick={handleCreate}
          className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
            selectedMode === 'zen'
              ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-dark-950 shadow-teal-500/20 hover:opacity-95'
              : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-dark-950 shadow-emerald-500/20 hover:opacity-95 active:scale-98'
          }`}
        >
          {selectedMode === 'zen' ? (
            <>
              <Coffee className="w-4 h-4" />
              <span>Start Relaxed Zen Puzzle</span>
            </>
          ) : (
            <>
              <span>Start Competition</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
