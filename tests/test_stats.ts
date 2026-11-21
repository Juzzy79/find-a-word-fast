import {
  recordGameCompletion,
  getCareerStats,
  getNemesis,
  exportStatsToJson,
  importStatsFromJson,
  resetPlayerStats
} from '../src/utils/statsStorage.ts';

// Mock localStorage in Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: store.size
  };
}

console.log('--- TEST 3: Career Stats, Burst Speeds & Nemesis Tracking ---');
resetPlayerStats('Juzzy');

// Game 1: Juzzy plays against Luke. Juzzy wins (60s vs Luke 75s). Burst: 1200ms
recordGameCompletion({
  playerName: 'Juzzy',
  avatarColor: '#10b981',
  gameId: 'G1',
  theme: 'Deep Cosmos',
  gridSize: 18,
  mode: 'duel',
  elapsedMs: 60000,
  wordCount: 18,
  burstSpeedMs: 1200,
  opponents: {
    luke: {
      playerName: 'Luke',
      avatarColor: '#06b6d4',
      completedAt: Date.now(),
      elapsedMs: 75000,
      burstSpeedMs: 2500,
      avgTimePerWordMs: 4166,
      wordFindTimestamps: []
    }
  }
});

let stats = getCareerStats('Juzzy');
console.log('Puzzles completed:', stats.puzzlesCompleted);
console.log('Personal Best:', stats.bestTimeMs, 'ms');
console.log('Fastest Burst:', stats.shortestBurstSpeedMs, 'ms');
console.log('Rivalry Luke: wins =', stats.rivalries['Luke'].wins, 'losses =', stats.rivalries['Luke'].losses);
console.log('Luke Avg Time Delta (Juzzy is faster):', stats.rivalries['Luke'].avgTimeDeltaMs, 'ms');

// Game 2: Juzzy plays against Matt. Matt beats Juzzy twice!
recordGameCompletion({
  playerName: 'Juzzy',
  avatarColor: '#10b981',
  gameId: 'G2',
  theme: 'Cyberpunk Matrix',
  gridSize: 18,
  mode: 'duel',
  elapsedMs: 82000,
  wordCount: 18,
  burstSpeedMs: 750, // New faster burst combo!
  opponents: {
    matt: {
      playerName: 'Matt',
      avatarColor: '#f59e0b',
      completedAt: Date.now(),
      elapsedMs: 55000,
      burstSpeedMs: 900,
      avgTimePerWordMs: 3055,
      wordFindTimestamps: []
    }
  }
});

recordGameCompletion({
  playerName: 'Juzzy',
  avatarColor: '#10b981',
  gameId: 'G3',
  theme: 'Arcane Alchemy',
  gridSize: 18,
  mode: 'duel',
  elapsedMs: 78000,
  wordCount: 18,
  burstSpeedMs: 1400,
  opponents: {
    matt: {
      playerName: 'Matt',
      avatarColor: '#f59e0b',
      completedAt: Date.now(),
      elapsedMs: 62000,
      burstSpeedMs: 1100,
      avgTimePerWordMs: 3444,
      wordFindTimestamps: []
    }
  }
});

stats = getCareerStats('Juzzy');
console.log('\nUpdated Fastest Burst:', stats.shortestBurstSpeedMs, 'ms (should be 750ms)');
if (stats.shortestBurstSpeedMs !== 750) throw new Error('Burst speed not updated correctly!');

const nemesis = getNemesis(stats);
console.log('Detected Nemesis:', nemesis?.opponentName);
console.log('Nemesis Losses:', nemesis?.losses);
console.log('Nemesis Games:', nemesis?.gamesPlayed);
console.log('Nemesis Win Rate:', nemesis?.winRatePct, '%');
console.log('Nemesis Avg Time Delta:', nemesis?.avgTimeDeltaMs, 'ms');

if (nemesis?.opponentName !== 'Matt' || nemesis?.losses !== 2) {
  throw new Error('Nemesis calculation mismatch! Expected Matt with 2 losses.');
}

// Test JSON Export & Import
const exported = exportStatsToJson('Juzzy');
const importedSuccess = importStatsFromJson(exported);
console.log('Stats JSON Export / Import Success:', importedSuccess);
if (!importedSuccess) throw new Error('Failed to import exported JSON!');

console.log('\n✅ ALL STATS & RIVALRY TESTS PASSED!');
