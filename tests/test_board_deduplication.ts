import { createNewGame, ensureUniqueTournamentRounds } from '../src/utils/stateEncoder';
import { generateGridBoard } from '../src/utils/gridGenerator';
import { generatePuzzleTheme, THEMES } from '../src/utils/wordList';
import type { SharedGameState } from '../src/types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('--- Running Board Deduplication & Unique Tournament Tests ---');

// Test 1: Chaos theme fallback test
{
  console.log('Test 1: generatePuzzleTheme with requestedThemeId = "chaos"');
  const t1 = generatePuzzleTheme(12345, false, 'chaos');
  assert(t1.themeId === 'chaos', `Expected themeId "chaos", got "${t1.themeId}"`);
  assert(t1.name === 'Total Chaos (Random Words)', `Expected Total Chaos name, got "${t1.name}"`);
  assert(t1.words.length === 30, `Expected 30 words, got ${t1.words.length}`);
  console.log('  PASS: themeId "chaos" always generates chaos theme even if boolean flag is false');
}

// Test 2: Multi-round Standard Series creates unique themes and unique seeds
{
  console.log('Test 2: Standard Series deduplication across 100 generated tournaments');
  for (let trial = 1; trial <= 100; trial++) {
    const tournament = createNewGame({
      mode: 'series',
      gridSize: 18,
      difficulty: 'pro',
      totalRounds: 5,
      isChaosMode: false,
      creatorName: 'TestHost'
    });

    assert(tournament.rounds.length === 5, 'Expected 5 rounds');

    const seeds = tournament.rounds.map(r => r.seed);
    const uniqueSeeds = new Set(seeds);
    assert(uniqueSeeds.size === 5, `Duplicate seed detected in trial ${trial}: ${seeds.join(', ')}`);

    const themeIds = tournament.rounds.map(r => r.themeId);
    const uniqueThemes = new Set(themeIds);
    assert(uniqueThemes.size === 5, `Duplicate themeId detected in trial ${trial}: ${themeIds.join(', ')}`);

    // Verify all generated boards have distinct word lists
    const boards = tournament.rounds.map(r =>
      generateGridBoard(r.gridSize, r.seed, false, r.difficulty, r.themeId)
    );
    for (let i = 0; i < boards.length; i++) {
      for (let j = i + 1; j < boards.length; j++) {
        const wordsA = boards[i].words.map(w => w.word).sort().join(',');
        const wordsB = boards[j].words.map(w => w.word).sort().join(',');
        assert(wordsA !== wordsB, `Rounds ${i + 1} and ${j + 1} produced identical words!`);
      }
    }
  }
  console.log('  PASS: 100 5-round standard tournaments verified 100% unique seeds, themes, and board layouts');
}

// Test 3: Multi-round Chaos Series creates unique boards across all rounds
{
  console.log('Test 3: Chaos Series deduplication across 50 generated tournaments');
  for (let trial = 1; trial <= 50; trial++) {
    const chaosTournament = createNewGame({
      mode: 'series',
      gridSize: 18,
      difficulty: 'pro',
      totalRounds: 3,
      isChaosMode: true,
      creatorName: 'ChaosHost'
    });

    assert(chaosTournament.isChaosMode === true, 'Tournament must have isChaosMode = true');
    assert(chaosTournament.title.includes('Chaos'), `Tournament title must contain Chaos: "${chaosTournament.title}"`);

    const seeds = chaosTournament.rounds.map(r => r.seed);
    const uniqueSeeds = new Set(seeds);
    assert(uniqueSeeds.size === 3, `Duplicate chaos seeds in trial ${trial}: ${seeds.join(', ')}`);

    for (const r of chaosTournament.rounds) {
      assert(r.isChaosMode === true, `Round ${r.roundNumber} must have isChaosMode = true`);
      assert(r.themeId === 'chaos', `Round ${r.roundNumber} must have themeId "chaos"`);
    }

    // Verify boards generated for all rounds are distinct
    const boards = chaosTournament.rounds.map(r =>
      generateGridBoard(r.gridSize, r.seed, true, r.difficulty, r.themeId)
    );
    for (let i = 0; i < boards.length; i++) {
      for (let j = i + 1; j < boards.length; j++) {
        const wordsA = boards[i].words.map(w => w.word).sort().join(',');
        const wordsB = boards[j].words.map(w => w.word).sort().join(',');
        assert(wordsA !== wordsB, `Chaos rounds ${i + 1} and ${j + 1} produced identical words!`);
      }
    }
  }
  console.log('  PASS: 50 3-round Chaos tournaments verified 100% unique seeds and board layouts');
}

// Test 4: ensureUniqueTournamentRounds repairs duplicate seeds and duplicate themes
{
  console.log('Test 4: ensureUniqueTournamentRounds repairs legacy duplicate rounds');
  const malformedMatch: SharedGameState = {
    id: 'DUP123',
    mode: 'series',
    title: '3-Round Series',
    gridSize: 18,
    difficulty: 'pro',
    totalRounds: 3,
    currentRoundIndex: 0,
    createdBy: 'Alice',
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    participants: ['Alice', 'Bob'],
    rounds: [
      {
        roundNumber: 1,
        theme: 'Animals',
        themeDescription: 'Fauna',
        themeId: 'animals',
        seed: 4242,
        gridSize: 18,
        difficulty: 'pro',
        targetWordCount: 18,
        results: {
          alice: {
            playerName: 'Alice',
            avatarColor: '#10b981',
            completedAt: Date.now(),
            elapsedMs: 25000,
            burstSpeedMs: 1200,
            avgTimePerWordMs: 1388,
            wordFindTimestamps: []
          }
        }
      },
      {
        roundNumber: 2,
        theme: 'Space & Astronomy',
        themeDescription: 'Cosmos',
        themeId: 'space',
        seed: 9999,
        gridSize: 18,
        difficulty: 'pro',
        targetWordCount: 18,
        results: {
          alice: {
            playerName: 'Alice',
            avatarColor: '#10b981',
            completedAt: Date.now(),
            elapsedMs: 28000,
            burstSpeedMs: 1400,
            avgTimePerWordMs: 1555,
            wordFindTimestamps: []
          }
        }
      },
      // Round 3 is unplayed, but duplicated round 1's theme AND seed!
      {
        roundNumber: 3,
        theme: 'Animals',
        themeDescription: 'Fauna',
        themeId: 'animals',
        seed: 4242,
        gridSize: 18,
        difficulty: 'pro',
        targetWordCount: 18,
        results: {}
      }
    ]
  };

  const repaired = ensureUniqueTournamentRounds(malformedMatch);

  // Round 1 must be unchanged because it was already played
  assert(repaired.rounds[0].seed === 4242, 'Played round 1 seed must NOT change');
  assert(repaired.rounds[0].themeId === 'animals', 'Played round 1 theme must NOT change');

  // Round 2 must be unchanged
  assert(repaired.rounds[1].seed === 9999, 'Played round 2 seed must NOT change');
  assert(repaired.rounds[1].themeId === 'space', 'Played round 2 theme must NOT change');

  // Round 3 was unplayed and duplicated round 1: it MUST be repaired to a unique theme and seed!
  assert(repaired.rounds[2].seed !== 4242, 'Round 3 duplicate seed must be repaired');
  assert(repaired.rounds[2].seed !== 9999, 'Round 3 seed must not collide with round 2');
  assert(repaired.rounds[2].themeId !== 'animals', 'Round 3 duplicate theme must be repaired');
  assert(repaired.rounds[2].themeId !== 'space', 'Round 3 theme must not collide with round 2');
  assert(THEMES[repaired.rounds[2].themeId!] !== undefined, `Round 3 themeId "${repaired.rounds[2].themeId}" must be valid`);

  // Verify deterministic repair across two clients
  const repairedClient2 = ensureUniqueTournamentRounds(JSON.parse(JSON.stringify(malformedMatch)));
  assert(repairedClient2.rounds[2].seed === repaired.rounds[2].seed, 'Client 2 must produce the identical repaired seed');
  assert(repairedClient2.rounds[2].themeId === repaired.rounds[2].themeId, 'Client 2 must produce the identical repaired theme');

  console.log('  PASS: ensureUniqueTournamentRounds repaired duplicate theme & seed, preserved played rounds, and was 100% deterministic');
}

console.log('\nALL 4 BOARD DEDUPLICATION TESTS PASSED SUCCESSFULLY!');
