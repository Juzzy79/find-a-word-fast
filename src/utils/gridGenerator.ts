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

// High-contrast, hue-separated palette tuned for readability on dark grid (#0b0f19)
export const WORD_COLORS = [
  '#34d399', // Bright Emerald
  '#fb7185', // Coral Rose
  '#38bdf8', // Bright Sky
  '#fbbf24', // Warm Gold
  '#c084fc', // Lavender Violet
  '#fb923c', // Vivid Orange
  '#2dd4bf', // Crisp Teal
  '#f472b6', // Hot Pink
  '#a3e635', // Electric Lime
  '#60a5fa', // Clear Blue
  '#facc15', // Sun Yellow
  '#e879f9'  // Bright Orchid
];

function getWordCells(w: WordPlacement): [number, number][] {
  const cells: [number, number][] = [];
  const [startR, startC] = w.start;
  const [dRow, dCol] = w.direction;
  for (let i = 0; i < w.word.length; i++) {
    cells.push([startR + i * dRow, startC + i * dCol]);
  }
  return cells;
}

function areWordsAdjacent(cellsA: [number, number][], cellsB: [number, number][]): boolean {
  for (let i = 0; i < cellsA.length; i++) {
    const [rA, cA] = cellsA[i];
    for (let j = 0; j < cellsB.length; j++) {
      const [rB, cB] = cellsB[j];
      if (Math.abs(rA - rB) <= 1 && Math.abs(cA - cB) <= 1) {
        return true;
      }
    }
  }
  return false;
}

function assignDistinctWordColors(words: WordPlacement[]): void {
  const cellLists = words.map(getWordCells);
  const colorUsage = new Map<string, number>();
  WORD_COLORS.forEach(c => colorUsage.set(c, 0));

  for (let i = 0; i < words.length; i++) {
    const neighborColors = new Set<string>();
    for (let j = 0; j < i; j++) {
      if (areWordsAdjacent(cellLists[i], cellLists[j])) {
        neighborColors.add(words[j].color);
      }
    }

    // Pick the least-used color that is NOT used by any adjacent word
    let chosen = WORD_COLORS.find(c => !neighborColors.has(c));
    if (chosen) {
      const available = WORD_COLORS.filter(c => !neighborColors.has(c));
      available.sort((a, b) => (colorUsage.get(a) || 0) - (colorUsage.get(b) || 0));
      chosen = available[0];
    } else {
      chosen = WORD_COLORS[i % WORD_COLORS.length];
    }

    words[i].color = chosen;
    colorUsage.set(chosen, (colorUsage.get(chosen) || 0) + 1);
  }
}

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

  // Assign distinct high-contrast colors so adjacent/overlapping words never share a color
  assignDistinctWordColors(placedWords);

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
