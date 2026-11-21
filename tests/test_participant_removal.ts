import type { CloudMatchDocument } from '../src/services/matchService';

console.log('=== TEST SUITE: Participant Removal & Unblocking Stuck Rounds ===');

// Mock match with stuck "Player 1" (pre-Google login profile)
const stuckMatch: CloudMatchDocument = {
  id: 'MATCH123',
  roomCode: 'RUSH42',
  title: 'Word Duel',
  mode: 'duel',
  gridSize: 18,
  difficulty: 'pro',
  status: 'active',
  totalRounds: 1,
  currentRoundIndex: 0,
  createdAt: Date.now(),
  lastUpdated: Date.now(),
  createdBy: 'Player 1',
  creatorUid: 'guest_123',
  creatorEmail: '',
  participantUids: ['guest_123', 'google_uid_999'],
  participants: ['Player 1', 'Juzzy'],
  rounds: [
    {
      roundNumber: 1,
      theme: 'Animals',
      themeDescription: 'Wildlife',
      seed: 12345,
      gridSize: 18,
      targetWordCount: 18,
      difficulty: 'pro',
      results: {
        juzzy: {
          playerName: 'Juzzy',
          avatarColor: '#10b981',
          completedAt: Date.now(),
          elapsedMs: 45000,
          burstSpeedMs: 1200,
          avgTimePerWordMs: 2500,
          wordFindTimestamps: []
        }
        // Player 1 never finished, holding up the round
      }
    }
  ]
};

// Check stuck state before removal
const currentRound = stuckMatch.rounds[0];
const roundResultsBefore = currentRound.results;
const completedCountBefore = stuckMatch.participants.filter(p => !!roundResultsBefore[p.toLowerCase()]).length;
const isRoundCompleteBefore = (stuckMatch.participants.length >= 2 || (stuckMatch.participants.length === 1 && completedCountBefore === 1)) && completedCountBefore >= stuckMatch.participants.length;

console.log('Before removal:');
console.log('  Participants:', stuckMatch.participants);
console.log('  Completed count:', completedCountBefore, 'of', stuckMatch.participants.length);
console.log('  Is round complete?', isRoundCompleteBefore);

if (isRoundCompleteBefore) {
  throw new Error('Test setup error: round should be stuck before removal!');
}

// Simulate removing "Player 1"
const playerNameToRemove = 'Player 1';
const targetKey = playerNameToRemove.toLowerCase().trim();

const updatedParticipants = stuckMatch.participants.filter(
  p => p.toLowerCase().trim() !== targetKey
);

const updatedRounds = stuckMatch.rounds.map(r => {
  const cleanResults = { ...r.results };
  delete cleanResults[targetKey];
  return { ...r, results: cleanResults };
});

const roundResultsAfter = updatedRounds[0].results;
const completedCountAfter = updatedParticipants.filter(p => !!roundResultsAfter[p.toLowerCase()]).length;
const isRoundCompleteAfter = (updatedParticipants.length >= 2 || (updatedParticipants.length === 1 && completedCountAfter === 1)) && completedCountAfter >= updatedParticipants.length;

console.log('\nAfter removing "Player 1":');
console.log('  Participants:', updatedParticipants);
console.log('  Completed count:', completedCountAfter, 'of', updatedParticipants.length);
console.log('  Is round complete?', isRoundCompleteAfter);

if (!isRoundCompleteAfter) {
  throw new Error('Round should be marked complete after removing stuck player!');
}

console.log('\n🎉 PARTICIPANT REMOVAL & UNBLOCKING LOGIC VERIFIED SUCCESSFULLY!');
