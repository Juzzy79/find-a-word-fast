import { generateGridBoard } from '../src/utils/gridGenerator.ts';

const r1 = generateGridBoard(20, 69726312, false, 'pro', 'chaos');
const r2 = generateGridBoard(20, 931906341, false, 'pro', 'chaos');
const r3 = generateGridBoard(20, 131702217, false, 'pro', 'chaos');

console.log('R1 theme:', r1.theme, 'words:', r1.words.slice(0, 5).map(w => w.word));
console.log('R2 theme:', r2.theme, 'words:', r2.words.slice(0, 5).map(w => w.word));
console.log('R3 theme:', r3.theme, 'words:', r3.words.slice(0, 5).map(w => w.word));

console.log('R2 vs R3 theme identical?:', r2.theme === r3.theme);
