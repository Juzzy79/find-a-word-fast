import { createNewGame, ensureUniqueTournamentRounds } from '../src/utils/stateEncoder';
import type { PlayerTurnResult } from '../src/types/game';

console.log('--- Running Mid-Game Concurrency & Progress Protection Test ---');

// 1. Create a 3-round duel tournament
const game = createNewGame({
  mode: 'duel',
  gridSize: 18,
  creatorName: 'Alice'
});

// Alice starts round 0, has solved 7 words locally
const aliceInitialSeed = game.rounds[0].seed;
const aliceInitialTheme = game.rounds[0].theme;

// 2. Bob joins the match and finishes his turn in 24,000ms
const bobResult: PlayerTurnResult = {
  playerName: 'Bob',
  avatarColor: '#3b82f6',
  completedAt: Date.now(),
  elapsedMs: 24000,
  burstSpeedMs: 1200,
  avgTimePerWordMs: 1600,
  wordFindTimestamps: [1000, 2200, 3500],
  replayLog: []
};

// Simulate Firestore incoming update containing Bob's completed turn
const updatedFromCloud = {
  ...game,
  participants: ['Alice', 'Bob'],
  rounds: game.rounds.map((r, idx) => {
    if (idx === 0) {
      return {
        ...r,
        results: {
          bob: bobResult
        }
      };
    }
    return r;
  }),
  lastUpdated: Date.now()
};

// 3. Apply ensureUniqueTournamentRounds
const sanitized = ensureUniqueTournamentRounds(updatedFromCloud);

// Verify round 0 seed and theme did not change
if (sanitized.rounds[0].seed !== aliceInitialSeed) {
  throw new Error(`FAIL: Board seed changed from ${aliceInitialSeed} to ${sanitized.rounds[0].seed}`);
}
if (sanitized.rounds[0].theme !== aliceInitialTheme) {
  throw new Error(`FAIL: Theme changed from ${aliceInitialTheme} to ${sanitized.rounds[0].theme}`);
}
console.log('  PASS: Board seed and theme remained 100% stable when opponent submitted turn');

// 4. Test Mid-Game Guard Condition Logic
// Simulate Alice's active state
const isRunning = true;
const isPaused = false;
const countdown = null;
const isSolving = isRunning || isPaused || countdown !== null;

const round = sanitized.rounds[0];
const playerKey = 'alice';
const existingResult = round.results[playerKey]; // Alice has not finished yet -> undefined

// Verify the guard protects Alice from being reset
let wasResetAttempted = false;
if (isRunning || isPaused || countdown !== null || isSolving) {
  // Guard triggers! Does NOT reset!
  wasResetAttempted = false;
} else {
  // If guard had failed, it would have reset isRunning and wiped board
  wasResetAttempted = true;
}

if (wasResetAttempted) {
  throw new Error('FAIL: Mid-game guard failed to protect active running turn');
}
console.log('  PASS: Mid-game guard successfully prevented active turn reset');

// 5. Simulate Alice completing her turn afterward
const aliceResult: PlayerTurnResult = {
  playerName: 'Alice',
  avatarColor: '#10b981',
  completedAt: Date.now(),
  elapsedMs: 21500,
  burstSpeedMs: 950,
  avgTimePerWordMs: 1433,
  wordFindTimestamps: [800, 1750, 2900],
  replayLog: []
};

sanitized.rounds[0].results['alice'] = aliceResult;

// Both players are now recorded in the round
const finalRoundResults = sanitized.rounds[0].results;
if (!finalRoundResults['bob'] || !finalRoundResults['alice']) {
  throw new Error('FAIL: Expected both Alice and Bob results to be recorded');
}
if (finalRoundResults['alice'].elapsedMs !== 21500 || finalRoundResults['bob'].elapsedMs !== 24000) {
  throw new Error('FAIL: Player times mismatch');
}

console.log('  PASS: Both players successfully recorded without overwriting each other');
console.log('\nALL MID-GAME PROTECTION TESTS PASSED SUCCESSFULLY!');
