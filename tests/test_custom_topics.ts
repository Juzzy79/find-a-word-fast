import {
  saveCustomTheme,
  loadCustomThemes,
  deleteCustomTheme,
  exportCustomThemesAsJson,
  importCustomThemesFromJson,
  parseWordsFromInput,
  SAMPLE_PRESETS
} from '../src/utils/customThemes';
import { generateGridBoard } from '../src/utils/gridGenerator';
import { generatePuzzleTheme, getAvailableThemes, getWordCountForGridSize } from '../src/utils/wordList';
import { createNewGame, encodeGameState, decodeGameState } from '../src/utils/stateEncoder';

// Mock localStorage for Node test runner
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: storageMock
});

console.log('=== TEST SUITE: Custom Topics & 14, 18, 22 Word Lists ===');

// 1. Test word parsing & validation
const rawInput = ' kangaroo, koala \n platypus; dingo, ding0-invalid, tooooooooooolongwordforgrid, KANGAROO ';
const parsed = parseWordsFromInput(rawInput, 16);
console.log('Parsed words count:', parsed.words.length);
console.log('Parsed words:', parsed.words);
console.log('Duplicate words:', parsed.duplicates);
console.log('Invalid words count:', parsed.invalid.length);
if (!parsed.words.includes('KANGAROO') || !parsed.words.includes('KOALA') || parsed.words.includes('KANGAROO2')) {
  throw new Error('Word parser test failed!');
}

// 2. Test Custom Theme creation with 14, 18, and 22 word lists
const sample = SAMPLE_PRESETS[0];
const savedTheme = saveCustomTheme({
  name: 'Australian Adventure',
  description: 'Aussie wildlife and bush words',
  words14: sample.words14,
  words18: sample.words18,
  words22: sample.words22
});

console.log('Saved Custom Theme ID:', savedTheme.id);
console.log('words14 count:', savedTheme.words14.length);
console.log('words18 count:', savedTheme.words18.length);
console.log('words22 count:', savedTheme.words22.length);

if (savedTheme.words14.length !== 14 || savedTheme.words18.length !== 18 || savedTheme.words22.length !== 22) {
  throw new Error('Theme tier word counts mismatch!');
}

// 3. Verify getAvailableThemes includes custom theme
const availableThemes = getAvailableThemes();
const foundInAvailable = availableThemes.find(t => t.id === savedTheme.id);
if (!foundInAvailable || !foundInAvailable.isCustom) {
  throw new Error('Custom theme not surfaced in getAvailableThemes()!');
}
console.log('Found custom theme in available themes:', foundInAvailable.name);

// 4. Test board generation for all 3 grid sizes:
// Grid 16 (14 words)
const board16 = generateGridBoard(16, 12345, false, 'pro', savedTheme.id);
console.log(`Grid 16: Placed ${board16.words.length} words (target ${getWordCountForGridSize(16)})`);
if (board16.words.length !== 14) {
  throw new Error(`Expected 14 words on 16x16 grid, got ${board16.words.length}`);
}
// Check that placed words match words14
for (const pw of board16.words) {
  if (!savedTheme.words14.includes(pw.word)) {
    throw new Error(`Word ${pw.word} on 16x16 board was not in words14 list!`);
  }
}

// Grid 18 (18 words)
const board18 = generateGridBoard(18, 54321, false, 'pro', savedTheme.id);
console.log(`Grid 18: Placed ${board18.words.length} words (target ${getWordCountForGridSize(18)})`);
if (board18.words.length !== 18) {
  throw new Error(`Expected 18 words on 18x18 grid, got ${board18.words.length}`);
}
for (const pw of board18.words) {
  if (!savedTheme.words18.includes(pw.word)) {
    throw new Error(`Word ${pw.word} on 18x18 board was not in words18 list!`);
  }
}

// Grid 20 (22 words)
const board20 = generateGridBoard(20, 99999, false, 'pro', savedTheme.id);
console.log(`Grid 20: Placed ${board20.words.length} words (target ${getWordCountForGridSize(20)})`);
if (board20.words.length !== 22) {
  throw new Error(`Expected 22 words on 20x20 grid, got ${board20.words.length}`);
}
for (const pw of board20.words) {
  if (!savedTheme.words22.includes(pw.word)) {
    throw new Error(`Word ${pw.word} on 20x20 board was not in words22 list!`);
  }
}

// 5. Test createNewGame with custom theme and state encoding/decoding
const game = createNewGame({
  mode: 'duel',
  gridSize: 18,
  creatorName: 'Juzzy',
  themeId: savedTheme.id
});

console.log('Game created with theme:', game.rounds[0].theme);
console.log('Round has customWords:', Boolean(game.rounds[0].customWords));
if (!game.rounds[0].customWords || game.rounds[0].customWords.length !== 18) {
  throw new Error('Game round did not package customWords for 18x18 match!');
}

const encoded = encodeGameState(game);
const decoded = decodeGameState(encoded);
if (!decoded || !decoded.rounds[0].customWords) {
  throw new Error('Encoded state failed to preserve customWords through URL serialization!');
}
console.log('Decoded round customWords count:', decoded.rounds[0].customWords.length);

// 6. Test Export & Import JSON
const exportedJson = exportCustomThemesAsJson();
storageMock.clear();
const loadedEmpty = loadCustomThemes();
console.log('Themes after clear:', loadedEmpty.length);
if (loadedEmpty.length !== 0) throw new Error('Clear failed!');

const importResult = importCustomThemesFromJson(exportedJson);
console.log('Import result count:', importResult.importedCount);
const reloaded = loadCustomThemes();
if (reloaded.length !== 1 || reloaded[0].name !== 'Australian Adventure') {
  throw new Error('Imported custom theme verification failed!');
}

console.log('\n🎉 ALL CUSTOM TOPICS & 14, 18, 22 WORD LIST TESTS PASSED SUCCESSFULLY!');
