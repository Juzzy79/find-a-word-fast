import LZString from 'lz-string';
import type { SharedGameState, GameRound, GridSize, GameMode, DifficultyLevel } from '../types/game';
import { generateSeed } from './prng';
import { generatePuzzleTheme, getWordCountForGridSize, getWeeklyCompetitionSeed, getAllThemes } from './wordList';

export function encodeGameState(state: SharedGameState): string {
  try {
    const json = JSON.stringify(state);
    return LZString.compressToEncodedURIComponent(json);
  } catch (err) {
    console.error('Failed to compress game state:', err);
    return '';
  }
}

export function decodeGameState(encoded: string): SharedGameState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as SharedGameState;
    return ensureUniqueTournamentRounds(parsed);
  } catch (err) {
    console.error('Failed to decompress game state:', err);
    return null;
  }
}

// Deterministically derive an alternative unique seed if a duplicate is found
function deriveUniqueSeed(baseSeed: number, tournamentId: string, roundIndex: number, attempt: number): number {
  let hash = 0;
  const str = `${tournamentId}_rnd_${roundIndex}_att_${attempt}_${baseSeed}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || (baseSeed + (roundIndex + 1) * 10007 + attempt * 7919);
}

/**
 * Validates and repairs any tournament / multi-round game so that:
 * 1. No two rounds share the same board PRNG seed.
 * 2. In standard mode, no two rounds share the same theme.
 * 3. In chaos mode, every round is properly flagged and has distinct randomized seeds.
 * 4. Completed/played rounds are NEVER modified to preserve replay determinism.
 */
export function ensureUniqueTournamentRounds<T extends SharedGameState>(state: T): T {
  if (!state || !state.rounds || state.rounds.length === 0) {
    return state;
  }

  const isTournamentChaos = Boolean(
    state.isChaosMode ||
    state.title?.toLowerCase().includes('chaos') ||
    state.rounds.some(r => r.isChaosMode || r.themeId === 'chaos')
  );

  const usedSeeds = new Set<number>();
  const usedThemeKeys = new Set<string>();

  // Pass 1: Register played rounds to preserve their seed and theme
  state.rounds.forEach(round => {
    const hasResults = round.results && Object.keys(round.results).length > 0;
    if (hasResults) {
      usedSeeds.add(round.seed);
      if (round.themeId && round.themeId !== 'chaos') {
        usedThemeKeys.add(round.themeId);
      }
    }
  });

  // Pass 2: Repair any unplayed rounds with duplicates
  const updatedRounds: GameRound[] = state.rounds.map((round, idx) => {
    let seed = round.seed;
    let themeId = round.themeId;
    let themeName = round.theme;
    let themeDescription = round.themeDescription;
    const isRoundChaos = isTournamentChaos || Boolean(round.isChaosMode || round.themeId === 'chaos');
    const hasResults = round.results && Object.keys(round.results).length > 0;

    if (hasResults) {
      usedSeeds.add(seed);
      if (themeId && themeId !== 'chaos') {
        usedThemeKeys.add(themeId);
      }
      return {
        ...round,
        isChaosMode: isRoundChaos
      };
    }

    // Ensure seed is unique across the tournament
    let attempt = 1;
    while (usedSeeds.has(seed)) {
      seed = deriveUniqueSeed(seed, state.id || 'GAME', idx, attempt++);
    }
    usedSeeds.add(seed);

    if (isRoundChaos) {
      themeId = 'chaos';
      const chaosTheme = generatePuzzleTheme(seed, true, 'chaos');
      themeName = chaosTheme.name;
      themeDescription = chaosTheme.description;
    } else {
      const allThemes = getAllThemes();
      // Standard mode: check if theme was already used in an earlier round of this tournament
      const themeKey = themeId || Object.keys(allThemes).find(k => allThemes[k].name === themeName);
      if (!themeKey || usedThemeKeys.has(themeKey)) {
        const availableKeys = Object.keys(allThemes).filter(k => !usedThemeKeys.has(k));
        const pool = availableKeys.length > 0 ? availableKeys : Object.keys(allThemes);
        const pickIndex = Math.abs(seed) % pool.length;
        const newKey = pool[pickIndex];
        const newTheme = generatePuzzleTheme(seed, false, newKey, round.gridSize, round.customWords);
        themeId = newTheme.themeId;
        themeName = newTheme.name;
        themeDescription = newTheme.description;
      }
      if (themeId) {
        usedThemeKeys.add(themeId);
      }
    }

    return {
      ...round,
      seed,
      themeId,
      theme: themeName,
      themeDescription,
      isChaosMode: isRoundChaos,
      customWords: round.customWords
    };
  });

  let title = state.title;
  if (state.mode === 'series' && isTournamentChaos && !title.toLowerCase().includes('chaos')) {
    title = `${state.totalRounds || updatedRounds.length}-Round Chaos Series`;
  }

  return {
    ...state,
    title,
    isChaosMode: isTournamentChaos,
    isTacticsMode: state.isTacticsMode,
    rounds: updatedRounds
  };
}

export function getShareUrlForGame(state: SharedGameState): string {
  const baseUrl = window.location.origin + window.location.pathname;
  const roomCode = (state as any).roomCode || state.id;
  if (roomCode && /^[A-Z0-9]{4,10}$/i.test(roomCode)) {
    return `${baseUrl}#room=${roomCode.toUpperCase()}`;
  }
  const encoded = encodeGameState(state);
  return `${baseUrl}#game=${encoded}`;
}

export function getRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash) return null;

  // Match #room=CODE or &room=CODE or #code=CODE
  const match = hash.match(/[#&](?:room|code)=([A-Za-z0-9]+)/i);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }

  // Also support direct hash like #9GLP8V
  const directMatch = hash.match(/^#([A-Za-z0-9]{6})$/i);
  if (directMatch && directMatch[1]) {
    return directMatch[1].toUpperCase();
  }

  return null;
}

export function getGameFromUrl(): SharedGameState | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash) return null;

  const match = hash.match(/[#&]game=([^&]+)/);
  if (match && match[1]) {
    return decodeGameState(match[1]);
  }
  return null;
}

export function clearUrlHash() {
  if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export function createNewGame(options: {
  mode: GameMode;
  gridSize: GridSize;
  difficulty?: DifficultyLevel;
  totalRounds?: number;
  isChaosMode?: boolean;
  isTacticsMode?: boolean;
  themeId?: string;
  creatorName: string;
}): SharedGameState {
  const defaultDiff: DifficultyLevel = options.mode === 'zen' ? 'expert' : 'pro';
  const { mode, gridSize, difficulty = defaultDiff, totalRounds = 1, isChaosMode = false, isTacticsMode = false, themeId, creatorName } = options;
  const id = Math.random().toString(36).substring(2, 8).toUpperCase();
  const now = Date.now();

  const rounds: GameRound[] = [];

  if (mode === 'weekly') {
    const { seed, weekLabel } = getWeeklyCompetitionSeed();
    const theme = generatePuzzleTheme(seed, false);
    rounds.push({
      roundNumber: 1,
      theme: `${weekLabel}: ${theme.name}`,
      themeDescription: theme.description,
      seed,
      gridSize: 18,
      difficulty: 'pro',
      targetWordCount: getWordCountForGridSize(18),
      results: {}
    });
  } else {
    const usedThemeKeys = new Set<string>();
    const usedSeeds = new Set<number>();

    for (let r = 1; r <= totalRounds; r++) {
      let seed = generateSeed();
      let attempt = 1;
      while (usedSeeds.has(seed)) {
        seed = deriveUniqueSeed(seed, id, r - 1, attempt++);
      }
      usedSeeds.add(seed);

      const allThemes = getAllThemes();
      let roundThemeId = (r === 1 && themeId) ? themeId : undefined;
      if (!roundThemeId && !isChaosMode) {
        const availableThemeKeys = Object.keys(allThemes).filter(k => !usedThemeKeys.has(k));
        const pool = availableThemeKeys.length > 0 ? availableThemeKeys : Object.keys(allThemes);
        const pickIndex = Math.abs(seed) % pool.length;
        roundThemeId = pool[pickIndex];
      }

      const theme = generatePuzzleTheme(seed, isChaosMode, roundThemeId, gridSize);
      if (theme.themeId !== 'chaos') {
        usedThemeKeys.add(theme.themeId);
      }

      rounds.push({
        roundNumber: r,
        theme: theme.name,
        themeDescription: theme.description,
        themeId: theme.themeId,
        isChaosMode,
        seed,
        gridSize,
        difficulty,
        targetWordCount: getWordCountForGridSize(gridSize),
        results: {},
        customWords: (theme.themeId && allThemes[theme.themeId]?.isCustom) ? theme.words : undefined
      });
    }
  }

  const title = mode === 'series'
    ? `${totalRounds}-Round ${isChaosMode ? 'Chaos ' : ''}Series${isTacticsMode ? ' (Tactical)' : ''}`
    : mode === 'weekly'
    ? 'Weekly Championship'
    : mode === 'zen'
    ? 'Zen Solitaire (Untimed)'
    : isChaosMode
    ? `Chaos Duel${isTacticsMode ? ' (Tactical)' : ''}`
    : `Word Duel${isTacticsMode ? ' (Tactical)' : ''}`;

  const baseState: SharedGameState = {
    id,
    mode,
    title,
    isChaosMode,
    isTacticsMode,
    createdAt: now,
    createdBy: creatorName,
    gridSize,
    difficulty,
    totalRounds: rounds.length,
    currentRoundIndex: 0,
    rounds,
    participants: [creatorName],
    lastUpdated: now
  };

  return ensureUniqueTournamentRounds(baseState);
}
