import {
  computeTournamentSummary,
  computeGlobalChampions,
  computeLiveTournamentRecords
} from '../src/utils/tournamentStats.ts';
import type { CloudMatchDocument } from '../src/services/matchService.ts';

console.log('--- TEST: Tournament Summary, Champions & Historic Records ---');

// Mock match 1: 3-round series between Alice and Bob
const match1: CloudMatchDocument = {
  id: 'ROOM01',
  roomCode: 'ROOM01',
  creatorUid: 'user_alice',
  creatorEmail: 'alice@test.com',
  participantUids: ['user_alice', 'user_bob'],
  status: 'completed',
  mode: 'series',
  title: 'Alice vs Bob Series',
  createdAt: 1700000000000,
  createdBy: 'Alice',
  gridSize: 18,
  difficulty: 'pro',
  totalRounds: 3,
  currentRoundIndex: 2,
  participants: ['Alice', 'Bob'],
  lastUpdated: 1700000500000,
  rounds: [
    {
      roundNumber: 1,
      theme: 'Deep Space',
      themeDescription: 'Space words',
      seed: 12345,
      gridSize: 18,
      targetWordCount: 18,
      difficulty: 'pro',
      results: {
        alice: {
          playerName: 'Alice',
          avatarColor: '#10b981',
          completedAt: 1700000100000,
          elapsedMs: 40000,
          burstSpeedMs: 1200,
          avgTimePerWordMs: 2222,
          wordFindTimestamps: [1000, 2200, 3400]
        },
        bob: {
          playerName: 'Bob',
          avatarColor: '#3b82f6',
          completedAt: 1700000120000,
          elapsedMs: 48000,
          burstSpeedMs: 1500,
          avgTimePerWordMs: 2666,
          wordFindTimestamps: [1000, 2500, 4000]
        }
      }
    },
    {
      roundNumber: 2,
      theme: 'Ocean Wonders',
      themeDescription: 'Ocean words',
      seed: 23456,
      gridSize: 18,
      targetWordCount: 18,
      difficulty: 'pro',
      results: {
        alice: {
          playerName: 'Alice',
          avatarColor: '#10b981',
          completedAt: 1700000300000,
          elapsedMs: 36000,
          burstSpeedMs: 800, // Very fast burst
          avgTimePerWordMs: 2000,
          wordFindTimestamps: [1000, 1800, 2600]
        },
        bob: {
          playerName: 'Bob',
          avatarColor: '#3b82f6',
          completedAt: 1700000290000,
          elapsedMs: 35000, // Bob wins round 2
          burstSpeedMs: 1100,
          avgTimePerWordMs: 1944,
          wordFindTimestamps: [1000, 2100, 3200]
        }
      }
    },
    {
      roundNumber: 3,
      theme: 'Ancient Myths',
      themeDescription: 'Mythology words',
      seed: 34567,
      gridSize: 18,
      targetWordCount: 18,
      difficulty: 'pro',
      results: {
        alice: {
          playerName: 'Alice',
          avatarColor: '#10b981',
          completedAt: 1700000450000,
          elapsedMs: 38000, // Alice wins round 3
          burstSpeedMs: 950,
          avgTimePerWordMs: 2111,
          wordFindTimestamps: [1000, 1950, 2900]
        },
        bob: {
          playerName: 'Bob',
          avatarColor: '#3b82f6',
          completedAt: 1700000470000,
          elapsedMs: 42000,
          burstSpeedMs: 1300,
          avgTimePerWordMs: 2333,
          wordFindTimestamps: [1000, 2300, 3600]
        }
      }
    }
  ]
};

// Mock match 2: 1-round duel with nail-biter finish (Charlie vs Dan)
const match2: CloudMatchDocument = {
  id: 'ROOM02',
  roomCode: 'ROOM02',
  creatorUid: 'user_charlie',
  creatorEmail: 'charlie@test.com',
  participantUids: ['user_charlie', 'user_dan'],
  status: 'completed',
  mode: 'duel',
  title: 'Charlie vs Dan Duel',
  createdAt: 1700001000000,
  createdBy: 'Charlie',
  gridSize: 16,
  difficulty: 'standard',
  totalRounds: 1,
  currentRoundIndex: 0,
  participants: ['Charlie', 'Dan'],
  lastUpdated: 1700001200000,
  rounds: [
    {
      roundNumber: 1,
      theme: 'Coffee Rush',
      themeDescription: 'Coffee terms',
      seed: 45678,
      gridSize: 16,
      targetWordCount: 15,
      difficulty: 'standard',
      results: {
        charlie: {
          playerName: 'Charlie',
          avatarColor: '#f59e0b',
          completedAt: 1700001150000,
          elapsedMs: 28450, // Charlie wins by 350ms!
          burstSpeedMs: 650, // All-time shortest burst
          avgTimePerWordMs: 1896,
          wordFindTimestamps: [1000, 1650, 2300]
        },
        dan: {
          playerName: 'Dan',
          avatarColor: '#ec4899',
          completedAt: 1700001150350,
          elapsedMs: 28800,
          burstSpeedMs: 900,
          avgTimePerWordMs: 1920,
          wordFindTimestamps: [1000, 1900, 2800]
        }
      }
    }
  ]
};

// 1. Test Tournament Summary
const summary1 = computeTournamentSummary(match1);
console.log('Match 1 Champion:', summary1.champion?.playerName);
console.log('Match 1 Standings:', summary1.standings.map(s => `${s.playerName}: ${s.roundsWon}W, ${s.totalTimeMs}ms`));
if (summary1.champion?.playerName !== 'Alice') {
  throw new Error(`Expected Alice to win Match 1, got ${summary1.champion?.playerName}`);
}
if (summary1.champion.roundsWon !== 2) {
  throw new Error(`Expected Alice to win 2 rounds, got ${summary1.champion.roundsWon}`);
}

const summary2 = computeTournamentSummary(match2);
console.log('Match 2 Champion:', summary2.champion?.playerName);
console.log('Match 2 Margin (ms):', summary2.timeMarginMs);
if (summary2.champion?.playerName !== 'Charlie') {
  throw new Error(`Expected Charlie to win Match 2`);
}
if (summary2.timeMarginMs !== 350) {
  throw new Error(`Expected 350ms margin, got ${summary2.timeMarginMs}`);
}

// 2. Test Global Champions Leaderboard
const globalChampions = computeGlobalChampions([match1, match2]);
console.log('Global Champions Count:', globalChampions.length);
console.log('Rank 1 Contender:', globalChampions[0].playerName, 'Titles:', globalChampions[0].tournamentsWon);
if (globalChampions.length !== 4) {
  throw new Error(`Expected 4 contenders, got ${globalChampions.length}`);
}

// 3. Test Live Tournament Records
const records = computeLiveTournamentRecords([match1, match2]);
console.log('Fastest Round Ever:', records.fastestRound?.playerName, records.fastestRound?.elapsedMs, 'ms');
console.log('Shortest Burst Record:', records.shortestBurst?.playerName, records.shortestBurst?.burstSpeedMs, 'ms');
console.log('Closest Nail-Biter:', records.closestFinish?.winner, 'vs', records.closestFinish?.runnerUp, records.closestFinish?.deltaMs, 'ms');

if (records.fastestRound?.playerName !== 'Charlie' || records.fastestRound.elapsedMs !== 28450) {
  throw new Error(`Expected Charlie to hold fastest round at 28450ms`);
}
if (records.shortestBurst?.burstSpeedMs !== 650) {
  throw new Error(`Expected 650ms shortest burst, got ${records.shortestBurst?.burstSpeedMs}`);
}
if (records.closestFinish?.deltaMs !== 350) {
  throw new Error(`Expected 350ms closest finish, got ${records.closestFinish?.deltaMs}`);
}

console.log('✅ ALL TOURNAMENT STATS & CHAMPIONS TESTS PASSED!');
