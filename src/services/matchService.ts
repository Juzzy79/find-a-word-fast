import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  SharedGameState,
  PlayerTurnResult,
  CareerStats,
  GridSize,
  GameMode,
  DifficultyLevel,
  TacticalTrap,
  LivePlayerStream
} from '../types/game';
import { createNewGame } from '../utils/stateEncoder';

export interface CloudUserRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  avatarColor: string;
  careerStats: CareerStats;
  updatedAt: any;
}

export interface CloudMatchDocument extends SharedGameState {
  roomCode: string;
  creatorUid: string;
  creatorEmail: string;
  participantUids: string[];
  status: 'waiting' | 'active' | 'completed';
}

// Generate random 6-character room code (e.g. "RUSH42")
export function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// 1. Create a cloud-synced match
export async function createCloudMatch(params: {
  mode: GameMode;
  gridSize: GridSize;
  difficulty?: DifficultyLevel;
  totalRounds?: number;
  isChaosMode?: boolean;
  isTacticsMode?: boolean;
  themeId?: string;
  creatorName: string;
  creatorUid: string;
  creatorEmail: string;
}): Promise<CloudMatchDocument> {
  const roomCode = generateRoomCode();
  const baseGame = createNewGame({
    mode: params.mode,
    gridSize: params.gridSize,
    difficulty: params.difficulty,
    totalRounds: params.totalRounds,
    isChaosMode: params.isChaosMode,
    isTacticsMode: params.isTacticsMode,
    themeId: params.themeId,
    creatorName: params.creatorName
  });

  // Ensure document ID and roomCode are identical so players never have conflicting codes
  baseGame.id = roomCode;

  const matchDoc: CloudMatchDocument = {
    ...baseGame,
    id: roomCode,
    roomCode,
    creatorUid: params.creatorUid,
    creatorEmail: params.creatorEmail,
    participantUids: [params.creatorUid],
    status: 'active'
  };

  const matchRef = doc(db, 'matches', matchDoc.id);
  await setDoc(matchRef, matchDoc);

  return matchDoc;
}

// 1b. Promote an existing local or shared game state to a Cloud Match
export async function createCloudMatchFromState(
  state: SharedGameState,
  user?: { uid: string; displayName?: string | null; email?: string | null } | null
): Promise<CloudMatchDocument> {
  const roomCode = (state.id && /^[A-Z0-9]{4,8}$/i.test(state.id)) ? state.id.toUpperCase() : generateRoomCode();
  const creatorUid = user?.uid || 'guest_' + Math.random().toString(36).substring(2, 9);
  const creatorEmail = user?.email || '';

  const participants = Array.from(new Set([
    ...state.participants,
    ...state.rounds.flatMap(r => Object.values(r.results || {}).map(res => res.playerName))
  ]));

  const matchDoc: CloudMatchDocument = {
    ...state,
    id: roomCode,
    roomCode,
    creatorUid,
    creatorEmail,
    participantUids: user?.uid ? [user.uid] : [],
    participants: participants.length > 0 ? participants : [state.createdBy || 'Player'],
    status: 'active',
    lastUpdated: Date.now()
  };

  const matchRef = doc(db, 'matches', roomCode);
  await setDoc(matchRef, matchDoc);

  return matchDoc;
}

// 2. Join a match using Room Code or Match ID
export async function joinMatchByCode(
  roomCode: string,
  user: { uid: string; displayName: string; email: string }
): Promise<CloudMatchDocument | null> {
  const cleanCode = roomCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanCode) return null;

  let matchDoc: CloudMatchDocument | null = null;

  // Primary: Query by roomCode field
  const q = query(collection(db, 'matches'), where('roomCode', '==', cleanCode));
  const snap = await getDocs(q);

  if (!snap.empty) {
    matchDoc = snap.docs[0].data() as CloudMatchDocument;
  } else {
    // Fallback: Check if user entered the document ID (e.g. 8CTEVJ from existing production matches)
    try {
      const docRef = doc(db, 'matches', cleanCode);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        matchDoc = docSnap.data() as CloudMatchDocument;
      }
    } catch (err) {
      console.warn('Fallback doc fetch error:', err);
    }
  }

  if (!matchDoc) {
    return null;
  }

  const matchRef = doc(db, 'matches', matchDoc.id);

  const updatedParticipants = Array.from(new Set([...matchDoc.participants, user.displayName]));
  const updatedUids = Array.from(new Set([...(matchDoc.participantUids || []), user.uid]));

  await updateDoc(matchRef, {
    participants: updatedParticipants,
    participantUids: updatedUids,
    lastUpdated: Date.now()
  });

  return {
    ...matchDoc,
    participants: updatedParticipants,
    participantUids: updatedUids
  };
}

// 3. Real-time subscription to active match
export function subscribeToMatch(
  matchId: string,
  onUpdate: (match: CloudMatchDocument) => void
): Unsubscribe {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(matchRef, snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data() as CloudMatchDocument;
      onUpdate(data);
    }
  });
}

// 4. Real-time subscription to active matches for the logged-in user
export function subscribeToUserMatches(
  userUid: string,
  _userEmail: string,
  onUpdate: (matches: CloudMatchDocument[]) => void
): Unsubscribe {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('participantUids', 'array-contains', userUid)
  );

  return onSnapshot(q, snapshot => {
    const list: CloudMatchDocument[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as CloudMatchDocument);
    });
    // Sort descending by last updated
    list.sort((a, b) => b.lastUpdated - a.lastUpdated);
    onUpdate(list);
  }, err => {
    console.warn('Error fetching user matches:', err);
  });
}

// 4b. Real-time subscription to all open active matches waiting for players in the lobby
export function subscribeToOpenMatches(
  onUpdate: (matches: CloudMatchDocument[]) => void
): Unsubscribe {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('status', 'in', ['waiting', 'active']),
    limit(25)
  );

  return onSnapshot(q, snapshot => {
    const list: CloudMatchDocument[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as CloudMatchDocument);
    });
    // Sort descending by last updated
    list.sort((a, b) => b.lastUpdated - a.lastUpdated);
    onUpdate(list);
  }, err => {
    console.warn('Error fetching open matches:', err);
  });
}

// 4c. Ensure current player is registered in the cloud match participants
export async function ensureParticipantInMatch(
  matchId: string,
  playerName: string,
  userUid?: string
): Promise<void> {
  const cleanId = matchId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanId || !playerName) return;

  try {
    const matchRef = doc(db, 'matches', cleanId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return;

    const matchDoc = snap.data() as CloudMatchDocument;
    const hasPlayer = matchDoc.participants.some(p => p.toLowerCase() === playerName.toLowerCase());
    const hasUid = userUid ? (matchDoc.participantUids || []).includes(userUid) : true;

    if (hasPlayer && hasUid) return;

    const updatedParticipants = hasPlayer ? matchDoc.participants : [...matchDoc.participants, playerName];
    const updatedUids = userUid && !hasUid
      ? [...(matchDoc.participantUids || []), userUid]
      : (matchDoc.participantUids || []);

    await updateDoc(matchRef, {
      participants: updatedParticipants,
      participantUids: updatedUids,
      lastUpdated: Date.now()
    });
  } catch (err) {
    console.warn('Error ensuring participant in match:', err);
  }
}

// 5. Submit turn completion to Cloud Match
export async function submitCloudTurnResult(params: {
  matchId: string;
  roundIndex: number;
  result: PlayerTurnResult;
  playerName: string;
  userUid?: string;
}): Promise<void> {
  const matchRef = doc(db, 'matches', params.matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) return;

  const currentMatch = snap.data() as CloudMatchDocument;
  const updatedRounds = [...currentMatch.rounds];
  const round = { ...updatedRounds[params.roundIndex] };

  const playerKey = params.playerName.toLowerCase();
  const turnData: PlayerTurnResult = {
    playerName: params.playerName,
    avatarColor: params.result.avatarColor || '#10b981',
    completedAt: params.result.completedAt || Date.now(),
    elapsedMs: params.result.elapsedMs,
    burstSpeedMs: params.result.burstSpeedMs || 0,
    avgTimePerWordMs: params.result.avgTimePerWordMs || 0,
    wordFindTimestamps: params.result.wordFindTimestamps || [],
    replayLog: params.result.replayLog || []
  };
  if (params.userUid) {
    turnData.userUid = params.userUid;
  }

  round.results = {
    ...round.results,
    [playerKey]: turnData
  };
  updatedRounds[params.roundIndex] = round;

  const participants = Array.from(new Set([...currentMatch.participants, params.playerName]));
  const participantUids = params.userUid
    ? Array.from(new Set([...(currentMatch.participantUids || []), params.userUid]))
    : (currentMatch.participantUids || []);

  // Determine if match is fully completed across all rounds
  const isLastRound = params.roundIndex >= currentMatch.totalRounds - 1;
  const allFinishedCurrentRound = participants.length >= 2 && participants.every(p => !!round.results[p.toLowerCase()]);
  const newStatus = (isLastRound && allFinishedCurrentRound) ? 'completed' : currentMatch.status;

  await updateDoc(matchRef, {
    rounds: updatedRounds,
    participants,
    participantUids,
    status: newStatus,
    lastUpdated: Date.now()
  });
}

// 5a. Merge any turn results from a shared link into the active cloud match
export async function mergeIncomingTurnsIntoCloudMatch(
  cloudMatch: CloudMatchDocument,
  incoming: SharedGameState
): Promise<CloudMatchDocument> {
  const matchRef = doc(db, 'matches', cloudMatch.id);
  const updatedRounds = [...cloudMatch.rounds];
  let hasChanges = false;

  incoming.rounds.forEach((inRound, rIdx) => {
    if (!updatedRounds[rIdx]) return;
    const cloudRound = { ...updatedRounds[rIdx] };
    const cloudResults = { ...cloudRound.results };

    Object.entries(inRound.results || {}).forEach(([pKey, pRes]) => {
      if (!cloudResults[pKey]) {
        cloudResults[pKey] = pRes;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      cloudRound.results = cloudResults;
      updatedRounds[rIdx] = cloudRound;
    }
  });

  if (!hasChanges) return cloudMatch;

  const participants = Array.from(new Set([
    ...cloudMatch.participants,
    ...incoming.participants
  ]));

  await updateDoc(matchRef, {
    rounds: updatedRounds,
    participants,
    lastUpdated: Date.now()
  });

  return {
    ...cloudMatch,
    rounds: updatedRounds,
    participants,
    lastUpdated: Date.now()
  };
}

// 5b. Fetch a single cloud match directly by ID or Room Code
export async function fetchCloudMatch(matchIdOrCode: string): Promise<CloudMatchDocument | null> {
  const clean = matchIdOrCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return null;

  try {
    // 1. Direct doc lookup
    const docRef = doc(db, 'matches', clean);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as CloudMatchDocument;
    }

    // 2. Query by roomCode
    const q = query(collection(db, 'matches'), where('roomCode', '==', clean));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return querySnap.docs[0].data() as CloudMatchDocument;
    }
  } catch (err) {
    console.warn('Error fetching cloud match:', err);
  }
  return null;
}

// 5c. Advance a series match to the next round in Cloud Firestore
export async function advanceCloudMatchRound(matchId: string, nextRoundIndex: number): Promise<void> {
  const matchRef = doc(db, 'matches', matchId);
  await updateDoc(matchRef, {
    currentRoundIndex: nextRoundIndex,
    lastUpdated: Date.now()
  });
}

// 5d. Delete a cloud match permanently from Firestore
export async function deleteCloudMatch(matchId: string): Promise<boolean> {
  const clean = matchId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return false;
  try {
    const matchRef = doc(db, 'matches', clean);
    await deleteDoc(matchRef);
    return true;
  } catch (err) {
    console.error('Failed to delete cloud match:', err);
    return false;
  }
}

// 5e. Explicitly archive a completed cloud tournament / match
export async function archiveCloudMatch(matchId: string): Promise<boolean> {
  const clean = matchId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return false;
  try {
    const matchRef = doc(db, 'matches', clean);
    await updateDoc(matchRef, {
      status: 'completed',
      lastUpdated: Date.now()
    });
    return true;
  } catch (err) {
    console.error('Failed to archive cloud match:', err);
    return false;
  }
}

// 5f. Real-time subscription to all archived / completed tournaments for Global Champions
export function subscribeToCompletedMatches(
  onUpdate: (matches: CloudMatchDocument[]) => void
): Unsubscribe {
  const matchesRef = collection(db, 'matches');
  const q = query(
    matchesRef,
    where('status', '==', 'completed'),
    limit(100)
  );

  return onSnapshot(q, snapshot => {
    const list: CloudMatchDocument[] = [];
    snapshot.forEach(docSnap => {
      list.push(docSnap.data() as CloudMatchDocument);
    });
    // Sort descending by last updated or createdAt
    list.sort((a, b) => (b.lastUpdated || b.createdAt || 0) - (a.lastUpdated || a.createdAt || 0));
    onUpdate(list);
  }, err => {
    console.warn('Error fetching completed tournament archives:', err);
  });
}

// 5g. One-off fetch of all completed tournaments
export async function fetchCompletedMatches(): Promise<CloudMatchDocument[]> {
  try {
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef,
      where('status', '==', 'completed'),
      limit(100)
    );
    const snap = await getDocs(q);
    const list: CloudMatchDocument[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as CloudMatchDocument);
    });
    list.sort((a, b) => (b.lastUpdated || b.createdAt || 0) - (a.lastUpdated || a.createdAt || 0));
    return list;
  } catch (err) {
    console.warn('Error fetching archived tournaments:', err);
    return [];
  }
}

// 6. Sync User Profile & Career Stats to Cloud
export async function saveUserCloudStats(
  user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null },
  stats: CareerStats
): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const data: Partial<CloudUserRecord> = {
    uid: user.uid,
    displayName: user.displayName || stats.playerName || 'Player',
    email: user.email || '',
    photoURL: user.photoURL || undefined,
    avatarColor: stats.avatarColor || '#10b981',
    careerStats: stats,
    updatedAt: serverTimestamp()
  };

  await setDoc(userRef, data, { merge: true });
}

export async function fetchUserCloudStats(userUid: string): Promise<CareerStats | null> {
  try {
    const userRef = doc(db, 'users', userUid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as CloudUserRecord;
      return data.careerStats || null;
    }
  } catch (err) {
    console.warn('Error fetching cloud stats:', err);
  }
  return null;
}

// 8. Stream live in-game word discoveries for real-time spectating
export async function streamLivePlayerProgress(
  matchIdOrParams: string | {
    matchId: string;
    playerName: string;
    roundIndex: number;
    isPlaying: boolean;
    elapsedMs: number;
    wordsFound: string[];
    lastWord?: { word: string; atMs: number };
    lastWordFound?: { word: string; atMs: number };
    totalWords?: number;
    lastHeartbeat?: number;
  },
  optionalStreamData?: Partial<LivePlayerStream>
): Promise<void> {
  const matchId = typeof matchIdOrParams === 'string' ? matchIdOrParams : matchIdOrParams.matchId;
  const cleanId = (matchId || '').trim().toUpperCase();
  if (!cleanId) return;

  const data: Partial<LivePlayerStream> = typeof matchIdOrParams === 'string'
    ? (optionalStreamData || {})
    : {
        playerName: matchIdOrParams.playerName,
        roundIndex: matchIdOrParams.roundIndex,
        isPlaying: matchIdOrParams.isPlaying,
        elapsedMs: matchIdOrParams.elapsedMs,
        wordsFound: matchIdOrParams.wordsFound,
        lastWordFound: matchIdOrParams.lastWordFound || matchIdOrParams.lastWord,
        totalWords: matchIdOrParams.totalWords,
        lastHeartbeat: matchIdOrParams.lastHeartbeat || Date.now()
      };

  const playerName = data.playerName || 'Player';
  const playerKey = playerName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const streamData: LivePlayerStream = {
    playerName,
    roundIndex: data.roundIndex ?? 0,
    isPlaying: data.isPlaying ?? true,
    elapsedMs: data.elapsedMs ?? 0,
    wordsFound: data.wordsFound || [],
    lastWordFound: data.lastWordFound,
    totalWords: data.totalWords,
    lastHeartbeat: data.lastHeartbeat || Date.now()
  };

  try {
    const matchRef = doc(db, 'matches', cleanId);
    await updateDoc(matchRef, {
      [`liveStreams.${playerKey}`]: streamData
    });
  } catch (err) {
    // Non-blocking for offline or transient network disconnect
    console.warn('Live stream update failed:', err);
  }
}

// 9. Arm a tactical ambush trap against an opponent for a specific round
export async function armTacticalTrap(
  matchIdOrParams: string | {
    matchId: string;
    roundIndex: number;
    trap: TacticalTrap;
  },
  optionalRoundIndex?: number,
  optionalTrap?: TacticalTrap
): Promise<void> {
  const matchId = typeof matchIdOrParams === 'string' ? matchIdOrParams : matchIdOrParams.matchId;
  const roundIndex = typeof matchIdOrParams === 'string' ? (optionalRoundIndex ?? 0) : matchIdOrParams.roundIndex;
  const trap = typeof matchIdOrParams === 'string' ? optionalTrap : matchIdOrParams.trap;

  const cleanId = (matchId || '').trim().toUpperCase();
  if (!cleanId || !trap) return;

  try {
    const matchRef = doc(db, 'matches', cleanId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return;

    const match = snap.data() as CloudMatchDocument;
    const updatedRounds = [...match.rounds];
    const targetRound = { ...updatedRounds[roundIndex] };

    const existingTraps = targetRound.tacticalTraps || [];
    targetRound.tacticalTraps = [...existingTraps, trap];
    updatedRounds[roundIndex] = targetRound;

    await updateDoc(matchRef, {
      rounds: updatedRounds,
      lastUpdated: Date.now()
    });
  } catch (err) {
    console.warn('Arm tactical trap failed:', err);
  }
}

// 10. Remove a participant from a cloud match (e.g. ghost players, duplicate accounts before login)
export async function removeParticipantFromCloudMatch(
  matchId: string,
  playerNameToRemove: string
): Promise<CloudMatchDocument | null> {
  const cleanId = (matchId || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleanId || !playerNameToRemove) return null;

  try {
    const matchRef = doc(db, 'matches', cleanId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return null;

    const currentMatch = snap.data() as CloudMatchDocument;
    const targetKey = playerNameToRemove.toLowerCase().trim();

    // 1. Remove from participants array
    const updatedParticipants = currentMatch.participants.filter(
      p => p.toLowerCase().trim() !== targetKey
    );

    // 2. Remove results from all rounds for this player
    const updatedRounds = currentMatch.rounds.map(r => {
      const cleanResults = { ...r.results };
      delete cleanResults[targetKey];
      Object.keys(cleanResults).forEach(k => {
        if (k.toLowerCase().trim() === targetKey) {
          delete cleanResults[k];
        }
      });
      return {
        ...r,
        results: cleanResults
      };
    });

    // 3. Remove from liveStreams if present
    const updatedLiveStreams = { ...(currentMatch.liveStreams || {}) };
    delete updatedLiveStreams[targetKey];
    delete updatedLiveStreams[playerNameToRemove];

    // 4. Check if all rounds are now complete
    let isAllComplete = true;
    for (const r of updatedRounds) {
      const finished = updatedParticipants.filter(p => !!r.results[p.toLowerCase().trim()]).length;
      if (updatedParticipants.length === 0 || finished < updatedParticipants.length) {
        isAllComplete = false;
        break;
      }
    }

    const nextStatus = isAllComplete ? 'completed' : currentMatch.status;

    await updateDoc(matchRef, {
      participants: updatedParticipants,
      rounds: updatedRounds,
      liveStreams: updatedLiveStreams,
      status: nextStatus,
      lastUpdated: Date.now()
    });

    return {
      ...currentMatch,
      participants: updatedParticipants,
      rounds: updatedRounds,
      liveStreams: updatedLiveStreams,
      status: nextStatus,
      lastUpdated: Date.now()
    };
  } catch (err) {
    console.error('Failed to remove participant from cloud match:', err);
    throw err;
  }
}

