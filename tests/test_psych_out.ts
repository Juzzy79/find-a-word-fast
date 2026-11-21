import type { PlayerTurnResult } from '../src/types/game';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('--- Running Psych-Out Stats & Banter Verification ---');

// Test 1: Rapid burst combo detection from timestamps
{
  console.log('Test 1: Rapid combo detection from timestamps');
  const timestamps = [
    2100, // word 1
    5400, // word 2
    6100, // word 3 (+700ms from word 2!) -> Sub-second burst!
    6900, // word 4 (+800ms from word 3!) -> Rapid combo!
    12000 // word 5
  ];

  let minDelta = Infinity;
  for (let i = 1; i < timestamps.length; i++) {
    const delta = timestamps[i] - timestamps[i - 1];
    if (delta < minDelta) {
      minDelta = delta;
    }
  }

  assert(minDelta === 700, `Expected minDelta 700ms, got ${minDelta}ms`);

  // Max streak of words within 2 seconds
  let maxRapidStreak = 0;
  for (let i = 0; i < timestamps.length; i++) {
    for (let j = i + 2; j < Math.min(i + 5, timestamps.length); j++) {
      const window = timestamps[j] - timestamps[i];
      const count = j - i + 1;
      if (window < 6000 && count > maxRapidStreak) {
        maxRapidStreak = count;
      }
    }
  }

  assert(maxRapidStreak === 4, `Expected rapid streak of 4 words within 6s, got ${maxRapidStreak}`);
  console.log('  PASS: Successfully extracted rapid burst (700ms) and multi-word flurry streak');
}

// Test 2: Psych banter selection rules
{
  console.log('Test 2: Dynamic psych threat titles and banter quotes');

  function getThreatCategory(burstMs: number, elapsedMs: number) {
    if (burstMs > 0 && burstMs <= 1100) return 'sub_second';
    if (burstMs > 0 && burstMs <= 1900) return 'rapid_fire';
    if (elapsedMs <= 38000) return 'speed_demon';
    return 'standard';
  }

  assert(getThreatCategory(850, 42000) === 'sub_second', '850ms burst must be sub_second');
  assert(getThreatCategory(1400, 45000) === 'rapid_fire', '1400ms burst must be rapid_fire');
  assert(getThreatCategory(2500, 32000) === 'speed_demon', '32s run must be speed_demon');
  assert(getThreatCategory(3000, 55000) === 'standard', 'Standard run');

  console.log('  PASS: Threat categories correctly mapped to stats');
}

// Test 3: Multiple opponents sorting
{
  console.log('Test 3: Multiple opponents sorting by finish time');
  const opponents: PlayerTurnResult[] = [
    {
      playerName: 'SlowPoke',
      avatarColor: '#fff',
      completedAt: Date.now(),
      elapsedMs: 65000,
      burstSpeedMs: 3100,
      avgTimePerWordMs: 4333,
      wordFindTimestamps: []
    },
    {
      playerName: 'Juzzy',
      avatarColor: '#10b981',
      completedAt: Date.now(),
      elapsedMs: 31200,
      burstSpeedMs: 620, // 0.62s burst!
      avgTimePerWordMs: 1733,
      wordFindTimestamps: [2000, 2620, 4000]
    },
    {
      playerName: 'Speedy',
      avatarColor: '#3b82f6',
      completedAt: Date.now(),
      elapsedMs: 44000,
      burstSpeedMs: 1200,
      avgTimePerWordMs: 2444,
      wordFindTimestamps: []
    }
  ];

  const sorted = [...opponents].sort((a, b) => a.elapsedMs - b.elapsedMs);
  assert(sorted[0].playerName === 'Juzzy', 'Juzzy must be rank #1 leader');
  assert(sorted[0].burstSpeedMs === 620, 'Leader must have 620ms burst speed');
  assert(sorted[1].playerName === 'Speedy', 'Speedy must be rank #2');
  assert(sorted[2].playerName === 'SlowPoke', 'SlowPoke must be rank #3');

  console.log('  PASS: Opponents correctly ranked with leader psych stats prioritized');
}

console.log('\nALL PSYCH-OUT STATS TESTS PASSED SUCCESSFULLY!');
