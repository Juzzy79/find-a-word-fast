import type { GridSize, GridBoard, WordPlacement, DifficultyLevel } from '../types/game';
import { PRNG } from './prng';
import { generatePuzzleTheme, getWordCountForGridSize } from './wordList';

// Direction vectors by difficulty
export function getDirectionsForDifficulty(difficulty: DifficultyLevel): [number, number][] {
  switch (difficulty) {
    case 'standard':
      return [
        [0, 1], // Horizontal L-to-R
        [1, 0]  // Vertical T-to-B
      ];
    case 'pro':
      return [
        [0, 1],  // Horizontal
        [1, 0],  // Vertical
        [1, 1],  // Diagonal Down-Right
        [1, -1]  // Diagonal Down-Left
      ];
    case 'expert':
    default:
      return [
        [0, 1],   // Left to Right
        [0, -1],  // Right to Left
        [1, 0],   // Top to Bottom
        [-1, 0],  // Bottom to Top
        [1, 1],   // Diagonal Down-Right
        [-1, -1], // Diagonal Up-Left
        [1, -1],  // Diagonal Down-Left
        [-1, 1]   // Diagonal Up-Right
      ];
  }
}

// Vibrant neon/editorial colors for found words
export const WORD_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#f97316', // Orange
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#e11d48', // Rose
  '#22c55e', // Green
  '#eab308', // Yellow
  '#0ea5e9', // Sky
  '#d946ef', // Fuchsia
  '#f43f5e', // Bright Red
  '#2dd4bf', // Light Teal
  '#fbbf24', // Warm Amber
  '#c084fc', // Soft Purple
  '#4ade80', // Mint
  '#38bdf8'  // Light Sky
];

// English letter frequency distribution for natural filler letters
const WEIGHTED_LETTERS = 'EEEEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNSSSSSSRRRRRRTTTTTTLLLLDDDDCCCCUUUUMMMMWWWFFFGGYYPPBBVKJXQZ';

export function generateGridBoard(
  size: GridSize,
  seed: number,
  isChaosMode: boolean = false,
  difficulty: DifficultyLevel = 'pro',
  themeId?: string,
  customWords?: string[]
): GridBoard {
  const prng = new PRNG(seed);
  const theme = generatePuzzleTheme(seed, isChaosMode, themeId, size, customWords);
  const targetCount = getWordCountForGridSize(size);
  const availableDirections = getDirectionsForDifficulty(difficulty);

  // Initialize empty matrix
  const matrix: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placedWords: WordPlacement[] = [];

  // Filter & clean candidate words
  const cleanedCandidates = theme.words
    .map(w => w.replace(/[^A-Za-z]/g, '').toUpperCase())
    .filter(w => w.length >= 3 && w.length <= size);
  // Deterministically shuffle with PRNG so words of same length aren't placed in identical sequence
  const shuffledCandidates = prng.shuffle(cleanedCandidates);

  // Sort by length descending to place longest words first (with randomized internal order)
  const candidateWords = [...shuffledCandidates].sort((a, b) => b.length - a.length);

  const horizontalDirs = availableDirections.filter(([r]) => r === 0);
  const verticalDirs = availableDirections.filter(([, c]) => c === 0);
  const diagonalDirs = availableDirections.filter(([r, c]) => r !== 0 && c !== 0);

  // Balanced cap on diagonals (approx 25-30% of placed words) so the board has a rich, fair mix
  const maxDiagonals = diagonalDirs.length > 0 ? Math.max(2, Math.round(targetCount * 0.28)) : 0;

  for (let wIdx = 0; wIdx < candidateWords.length; wIdx++) {
    if (placedWords.length >= targetCount) break;
    const word = candidateWords[wIdx];

    const currentDiagCount = placedWords.filter(p => p.direction[0] !== 0 && p.direction[1] !== 0).length;
    const currentHCount = placedWords.filter(p => p.direction[0] === 0).length;
    const currentVCount = placedWords.filter(p => p.direction[1] === 0).length;

    // Dynamically adjust candidate direction pool to ensure a healthy balance
    let pool = [...availableDirections];
    if (currentDiagCount >= maxDiagonals || diagonalDirs.length === 0) {
      pool = [...horizontalDirs, ...verticalDirs];
    } else if (currentHCount > currentVCount + 2) {
      pool = [...verticalDirs, ...diagonalDirs];
    } else if (currentVCount > currentHCount + 2) {
      pool = [...horizontalDirs, ...diagonalDirs];
    }

    const maxAttempts = 150;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const dir = prng.pick(pool.length > 0 ? pool : availableDirections);
      const [dRow, dCol] = dir;

      // Determine valid start coordinates
      const minRow = dRow < 0 ? word.length - 1 : 0;
      const maxRow = dRow > 0 ? size - word.length : size - 1;
      const minCol = dCol < 0 ? word.length - 1 : 0;
      const maxCol = dCol > 0 ? size - word.length : size - 1;

      if (minRow > maxRow || minCol > maxCol) continue;

      const startRow = prng.nextInt(minRow, maxRow);
      const startCol = prng.nextInt(minCol, maxCol);

      // Check if placement is valid
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + i * dRow;
        const c = startCol + i * dCol;
        const currentCell = matrix[r][c];
        if (currentCell !== '' && currentCell !== word[i]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        // Place word in matrix
        for (let i = 0; i < word.length; i++) {
          const r = startRow + i * dRow;
          const c = startCol + i * dCol;
          matrix[r][c] = word[i];
        }

        const endRow = startRow + (word.length - 1) * dRow;
        const endCol = startCol + (word.length - 1) * dCol;
        const color = WORD_COLORS[placedWords.length % WORD_COLORS.length];

        placedWords.push({
          word,
          start: [startRow, startCol],
          end: [endRow, endCol],
          direction: dir,
          found: false,
          color
        });

        break;
      }
    }
  }

  // Fill empty cells with weighted letters
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === '') {
        const letterIndex = prng.nextInt(0, WEIGHTED_LETTERS.length - 1);
        matrix[r][c] = WEIGHTED_LETTERS[letterIndex];
      }
    }
  }

  // Deterministically sort words alphabetically for the player's word bank
  const sortedWords = [...placedWords].sort((a, b) => a.word.localeCompare(b.word));

  return {
    size,
    matrix,
    words: sortedWords,
    theme: theme.name,
    themeDescription: theme.description,
    seed,
    difficulty
  };
}
