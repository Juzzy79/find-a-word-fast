import type { CareerStats, GridSize, GameMode, PlayerTurnResult } from '../types/game';

const STORAGE_KEY_PREFIX = 'wordrush_stats_v1_';
const PROFILE_KEY = 'wordrush_current_profile';

export function getCurrentProfile(): string {
  if (typeof localStorage === 'undefined') return 'Player 1';
  const saved = localStorage.getItem(PROFILE_KEY);
  return saved?.trim() || 'Player 1';
}

export function setCurrentProfile(name: string): void {
  if (typeof localStorage === 'undefined') return;
  const clean = name.trim() || 'Player 1';
  localStorage.setItem(PROFILE_KEY, clean);
  addSavedProfile(clean);
}

export function getCareerStats(playerName: string): CareerStats {
  const cleanName = (playerName || 'Player 1').trim();
  const key = STORAGE_KEY_PREFIX + cleanName.toLowerCase();

  const defaultStats: CareerStats = {
    playerName: cleanName,
    avatarColor: '#10b981',
    puzzlesCompleted: 0,
    totalWordsFound: 0,
    totalPlayTimeMs: 0,
    bestTimeMs: null,
    avgTimePerWordMs: 0,
    shortestBurstSpeedMs: null,
    gamesByMode: {
      duel: 0,
      series: 0,
      weekly: 0,
      practice: 0,
      zen: 0
    },
    gridStats: {
      16: { completed: 0, bestTimeMs: null, avgTimeMs: 0, totalTimeMs: 0 },
      18: { completed: 0, bestTimeMs: null, avgTimeMs: 0, totalTimeMs: 0 },
      20: { completed: 0, bestTimeMs: null, avgTimeMs: 0, totalTimeMs: 0 }
    },
    rivalries: {},
    recentHistory: []
  };

  if (typeof localStorage === 'undefined') return defaultStats;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);
    return { ...defaultStats, ...parsed };
  } catch (err) {
    console.error('Failed to parse career stats:', err);
    return defaultStats;
  }
}

export function saveCareerStats(stats: CareerStats): void {
  if (typeof localStorage === 'undefined') return;
  const key = STORAGE_KEY_PREFIX + stats.playerName.trim().toLowerCase();
  try {
    localStorage.setItem(key, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save career stats:', err);
  }
}

export function recordGameCompletion(params: {
  playerName: string;
  avatarColor: string;
  gameId: string;
  theme: string;
  gridSize: GridSize;
  mode: GameMode;
  elapsedMs: number;
  wordCount: number;
  burstSpeedMs: number;
  opponents?: Record<string, PlayerTurnResult>;
}): CareerStats {
  const stats = getCareerStats(params.playerName);
  const { gridSize, mode, elapsedMs, wordCount, burstSpeedMs, opponents = {} } = params;

  // Update totals
  stats.puzzlesCompleted += 1;
  stats.totalWordsFound += wordCount;
  stats.totalPlayTimeMs += elapsedMs;

  // Personal Best Time (only for timed competitive modes)
  if (mode !== 'zen' && elapsedMs > 0) {
    if (stats.bestTimeMs === null || elapsedMs < stats.bestTimeMs) {
      stats.bestTimeMs = elapsedMs;
    }
  }

  // Career Average Time per Word
  if (stats.totalWordsFound > 0) {
    stats.avgTimePerWordMs = Math.round(stats.totalPlayTimeMs / stats.totalWordsFound);
  }

  // Shortest Burst Speed Record (only for timed competitive modes)
  if (mode !== 'zen' && burstSpeedMs > 0) {
    if (stats.shortestBurstSpeedMs === null || burstSpeedMs < stats.shortestBurstSpeedMs) {
      stats.shortestBurstSpeedMs = burstSpeedMs;
    }
  }

  // Game Mode tallies
  if (stats.gamesByMode[mode] !== undefined) {
    stats.gamesByMode[mode] += 1;
  }

  // Grid Stats
  const g = stats.gridStats[gridSize] || { completed: 0, bestTimeMs: null, avgTimeMs: 0, totalTimeMs: 0 };
  g.completed += 1;
  if (mode !== 'zen' && elapsedMs > 0) {
    g.totalTimeMs += elapsedMs;
    g.avgTimeMs = Math.round(g.totalTimeMs / g.completed);
    if (g.bestTimeMs === null || elapsedMs < g.bestTimeMs) {
      g.bestTimeMs = elapsedMs;
    }
  }
  stats.gridStats[gridSize] = g;

  // Rivalries & Head-to-Head calculations
  const opponentSummaries: { name: string; elapsedMs: number; won: boolean }[] = [];
  const myClean = params.playerName.toLowerCase();

  Object.entries(opponents).forEach(([oppKey, oppResult]) => {
    if (oppKey.toLowerCase() === myClean) return;
    const oppName = oppResult.playerName;

    if (!stats.rivalries[oppName]) {
      stats.rivalries[oppName] = {
        opponentName: oppName,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        totalTimeDeltaMs: 0,
        avgTimeDeltaMs: 0,
        lastPlayed: Date.now()
      };
    }

    const r = stats.rivalries[oppName];
    r.gamesPlayed += 1;
    r.lastPlayed = Date.now();

    const timeDelta = oppResult.elapsedMs - elapsedMs;
    r.totalTimeDeltaMs += timeDelta;
    r.avgTimeDeltaMs = Math.round(r.totalTimeDeltaMs / r.gamesPlayed);

    let won = false;
    if (elapsedMs < oppResult.elapsedMs) {
      r.wins += 1;
      won = true;
    } else if (elapsedMs > oppResult.elapsedMs) {
      r.losses += 1;
    } else {
      r.ties += 1;
    }

    opponentSummaries.push({
      name: oppName,
      elapsedMs: oppResult.elapsedMs,
      won
    });
  });

  // Recent game history
  stats.recentHistory.unshift({
    gameId: params.gameId,
    date: Date.now(),
    theme: params.theme,
    gridSize,
    mode,
    elapsedMs,
    burstSpeedMs,
    wordCount,
    opponentSummaries
  });

  // Keep history capped at 50 games
  if (stats.recentHistory.length > 50) {
    stats.recentHistory = stats.recentHistory.slice(0, 50);
  }

  saveCareerStats(stats);
  return stats;
}

export function getNemesis(stats: CareerStats): {
  opponentName: string;
  losses: number;
  wins: number;
  gamesPlayed: number;
  winRatePct: number;
  avgTimeDeltaMs: number;
} | null {
  const opponents = Object.values(stats.rivalries);
  if (opponents.length === 0) return null;

  const sorted = [...opponents].sort((a, b) => {
    if (b.losses !== a.losses) return b.losses - a.losses;
    const aWinRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
    const bWinRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
    if (aWinRate !== bWinRate) return aWinRate - bWinRate;
    return a.avgTimeDeltaMs - b.avgTimeDeltaMs;
  });

  const bestCandidate = sorted[0];
  if (!bestCandidate || (bestCandidate.gamesPlayed === 0)) return null;

  const winRatePct = Math.round((bestCandidate.wins / bestCandidate.gamesPlayed) * 100);

  return {
    opponentName: bestCandidate.opponentName,
    losses: bestCandidate.losses,
    wins: bestCandidate.wins,
    gamesPlayed: bestCandidate.gamesPlayed,
    winRatePct,
    avgTimeDeltaMs: bestCandidate.avgTimeDeltaMs
  };
}

export function exportStatsToJson(playerName: string): string {
  const stats = getCareerStats(playerName);
  return JSON.stringify(stats, null, 2);
}

export function importStatsFromJson(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr) as CareerStats;
    if (!parsed.playerName) return false;
    saveCareerStats(parsed);
    return true;
  } catch {
    return false;
  }
}

export function resetPlayerStats(playerName: string): void {
  const clean = playerName.trim().toLowerCase();
  const key = STORAGE_KEY_PREFIX + clean;
  localStorage.removeItem(key);

  // Also remove from saved profiles index
  const profiles = getSavedProfilesList().filter(p => p.toLowerCase() !== clean);
  try {
    localStorage.setItem('wordrush_saved_profiles_list', JSON.stringify(profiles));
  } catch {
    // Ignore
  }
}

export function getSavedProfilesList(): string[] {
  if (typeof localStorage === 'undefined') return ['Player 1'];
  try {
    const raw = localStorage.getItem('wordrush_saved_profiles_list');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fall through
  }

  // Scan localStorage for existing profiles
  const found = new Set<string>();
  found.add(getCurrentProfile());
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (data && data.playerName) found.add(data.playerName);
          } catch {
            // Ignore
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return Array.from(found);
}

export function addSavedProfile(name: string): void {
  const clean = name.trim();
  if (!clean || typeof localStorage === 'undefined') return;
  const list = getSavedProfilesList();
  if (!list.some(p => p.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
    try {
      localStorage.setItem('wordrush_saved_profiles_list', JSON.stringify(list));
    } catch {
      // Ignore
    }
  }
}
