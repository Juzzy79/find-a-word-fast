export type GridSize = 16 | 18 | 20;

export type GameMode = 'duel' | 'series' | 'weekly' | 'practice' | 'zen';

export type DifficultyLevel = 'standard' | 'pro' | 'expert';

export interface WordPlacement {
  word: string;
  start: [number, number]; // [row, col]
  end: [number, number];   // [row, col]
  direction: [number, number]; // [dRow, dCol]
  found: boolean;
  foundAt?: number; // timestamp in ms from round start
  color: string;
}

export interface GridBoard {
  size: GridSize;
  matrix: string[][];
  words: WordPlacement[];
  theme: string;
  themeDescription: string;
  seed: number;
  difficulty: DifficultyLevel;
}

export interface PlayerTurnResult {
  playerName: string;
  avatarColor: string;
  completedAt: number; // Unix timestamp
  elapsedMs: number;
  burstSpeedMs: number; // Shortest time between consecutive words found
  avgTimePerWordMs: number;
  wordFindTimestamps: number[]; // Relative ms from round start when each word was found
  replayLog?: { word: string; atMs: number }[]; // Ordered list of words found with timestamps for high-speed replay
  userUid?: string;
  trapsDodged?: number;
  trapsTriggered?: number;
}

export type TacticalTrapType = 'phantom_letter' | 'wordlist_glitch' | 'dense_mist';

export interface TacticalTrap {
  id: string;
  createdBy: string;
  targetPlayer: string; // Opponent name or 'all'
  type: TacticalTrapType;
  triggerAtMs: number;  // e.g. 0 for start-of-round blindfold, or 15000-45000 for mid-game ambushes
  durationMs: number;   // e.g. 60000 for 1-min blindfold, or 30000 for phantom letter
  letter?: string;      // e.g. 'E' (for phantom_letter)
  quadrant?: number;    // 0, 1, 2, 3 (for dense_mist)
  createdAt: number;
}

export interface LivePlayerStream {
  playerName: string;
  roundIndex: number;
  isPlaying: boolean;
  elapsedMs: number;
  wordsFound: string[];
  totalWords?: number;
  lastWordFound?: { word: string; atMs: number };
  lastHeartbeat: number;
}

export interface GameRound {
  roundNumber: number;
  theme: string;
  themeDescription: string;
  themeId?: string;
  isChaosMode?: boolean;
  seed: number;
  gridSize: GridSize;
  targetWordCount: number;
  difficulty: DifficultyLevel;
  results: Record<string, PlayerTurnResult>; // Keyed by lowercase playerName
  tacticalTraps?: TacticalTrap[];
  customWords?: string[];
}

export interface SharedGameState {
  id: string;
  mode: GameMode;
  title: string;
  isChaosMode?: boolean;
  isTacticsMode?: boolean;
  createdAt: number;
  createdBy: string;
  gridSize: GridSize;
  difficulty: DifficultyLevel;
  totalRounds: number;
  currentRoundIndex: number;
  rounds: GameRound[];
  participants: string[]; // List of player names
  liveStreams?: Record<string, LivePlayerStream>;
  lastUpdated: number;
}

export interface OpponentMatchup {
  opponentName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  totalTimeDeltaMs: number; // Positive = faster than opponent, negative = slower
  avgTimeDeltaMs: number;
  lastPlayed: number;
}

export interface CareerStats {
  playerName: string;
  avatarColor: string;
  puzzlesCompleted: number;
  totalWordsFound: number;
  totalPlayTimeMs: number;
  bestTimeMs: number | null;
  avgTimePerWordMs: number;
  shortestBurstSpeedMs: number | null;
  gamesByMode: {
    duel: number;
    series: number;
    weekly: number;
    practice: number;
    zen?: number;
  };
  gridStats: {
    16: { completed: number; bestTimeMs: number | null; avgTimeMs: number; totalTimeMs: number };
    18: { completed: number; bestTimeMs: number | null; avgTimeMs: number; totalTimeMs: number };
    20: { completed: number; bestTimeMs: number | null; avgTimeMs: number; totalTimeMs: number };
  };
  rivalries: Record<string, OpponentMatchup>;
  recentHistory: {
    gameId: string;
    date: number;
    theme: string;
    gridSize: GridSize;
    mode: GameMode;
    elapsedMs: number;
    burstSpeedMs: number;
    wordCount: number;
    opponentSummaries: { name: string; elapsedMs: number; won: boolean }[];
  }[];
}

export interface Coordinate {
  row: number;
  col: number;
}
