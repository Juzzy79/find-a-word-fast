import { PRNG, generateSeed } from '../src/utils/prng.ts';
import { generateGridBoard } from '../src/utils/gridGenerator.ts';
import { encodeGameState, decodeGameState, createNewGame } from '../src/utils/stateEncoder.ts';

console.log('--- TEST 1: PRNG & Grid Determinism ---');
const testSeed = 987654321;
const board1 = generateGridBoard(18, testSeed, false);
const board2 = generateGridBoard(18, testSeed, false);

let matricesMatch = true;
for (let r = 0; r < 18; r++) {
  for (let c = 0; c < 18; c++) {
    if (board1.matrix[r][c] !== board2.matrix[r][c]) {
      matricesMatch = false;
      break;
    }
  }
}

console.log('Board 1 Theme:', board1.theme, 'Words:', board1.words.length);
console.log('Board 2 Theme:', board2.theme, 'Words:', board2.words.length);
console.log('Matrices identical:', matricesMatch);
if (!matricesMatch) throw new Error('Matrices do not match for identical seed!');

console.log('\n--- TEST 2: URL State Compression & Recovery ---');
const originalGame = createNewGame({
  mode: 'series',
  gridSize: 18,
  totalRounds: 3,
  creatorName: 'Juzzy'
});

// Add mock round result
originalGame.rounds[0].results['juzzy'] = {
  playerName: 'Juzzy',
  avatarColor: '#10b981',
  completedAt: Date.now(),
  elapsedMs: 74250,
  burstSpeedMs: 820,
  avgTimePerWordMs: 4125,
  wordFindTimestamps: [12000, 15000, 15820, 24000]
};

const encoded = encodeGameState(originalGame);
console.log('Encoded URL payload length:', encoded.length, 'chars');
const decoded = decodeGameState(encoded);

if (!decoded) throw new Error('Failed to decode game state!');
console.log('Decoded game ID:', decoded.id);
console.log('Decoded participants:', decoded.participants);
console.log('Decoded player result elapsedMs:', decoded.rounds[0].results['juzzy'].elapsedMs);

if (decoded.rounds[0].results['juzzy'].elapsedMs !== 74250) {
  throw new Error('Decoded player elapsed time mismatch!');
}

console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
