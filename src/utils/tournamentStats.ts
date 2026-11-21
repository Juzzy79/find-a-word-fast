import type { CloudMatchDocument } from '../services/matchService';

export interface TournamentPlayerScore {
  playerName: string;
  avatarColor: string;
  roundsWon: number;
  totalTimeMs: number;
  roundsPlayed: number;
  bestRoundTimeMs: number;
  bestBurstSpeedMs: number;
  totalWords: number;
  avgTimePerWordMs: number;
}

export interface TournamentSummary {
  match: CloudMatchDocument;
  champion: TournamentPlayerScore | null;
  standings: TournamentPlayerScore[];
  totalRounds: number;
  completedRoundsCount: number;
  isFullyCompleted: boolean;
  timeMarginMs: number | null;
  isSweep: boolean;
}

export interface GlobalChampionRecord {
  playerName: string;
  avatarColor: string;
  tournamentsWon: number;
  tournamentsPlayed: number;
  winRate: number;
  totalRoundsWon: number;
  bestTimeMs: number;
  bestBurstSpeedMs: number;
  totalWordsFound: number;
}

export interface LiveTournamentRecords {
  fastestRound: {
    playerName: string;
    avatarColor: string;
    elapsedMs: number;
    theme: string;
    gridSize: number;
    roomCode: string;
    date: number;
  } | null;
  shortestBurst: {
    playerName: string;
    avatarColor: string;
    burstSpeedMs: number;
    theme: string;
    roomCode: string;
    date: number;
  } | null;
  fastestAvgWordPace: {
    playerName: string;
    avatarColor: string;
    avgTimePerWordMs: number;
    theme: string;
    roomCode: string;
    date: number;
  } | null;
  closestFinish: {
    roomCode: string;
    theme: string;
    winner: string;
    runnerUp: string;
    deltaMs: number;
    date: number;
  } | null;
  mostDominantSweep: {
    playerName: string;
    avatarColor: string;
    roomCode: string;
    totalRounds: number;
    date: number;
  } | null;
  totalTournamentsArchived: number;
  totalRoundsPlayed: number;
  totalWordsFound: number;
  totalPlayTimeMs: number;
}

/**
 * Computes individual tournament summary and standings from a CloudMatchDocument
 */
export function computeTournamentSummary(match: CloudMatchDocument): TournamentSummary {
  // Collect all unique participant names
  const participantMap = new Map<string, string>(); // lowercase -> display name
  match.participants.forEach(p => {
    if (p) participantMap.set(p.toLowerCase(), p);
  });

  match.rounds.forEach(r => {
    Object.values(r.results || {}).forEach(res => {
      if (res.playerName) {
        participantMap.set(res.playerName.toLowerCase(), res.playerName);
      }
    });
  });

  const scores: Record<string, TournamentPlayerScore> = {};
  participantMap.forEach((displayName, key) => {
    scores[key] = {
      playerName: displayName,
      avatarColor: '#10b981',
      roundsWon: 0,
      totalTimeMs: 0,
      roundsPlayed: 0,
      bestRoundTimeMs: Infinity,
      bestBurstSpeedMs: Infinity,
      totalWords: 0,
      avgTimePerWordMs: 0
    };
  });

  let completedRoundsCount = 0;

  match.rounds.forEach(r => {
    const results = Object.values(r.results || {});
    if (results.length === 0) return;

    // Deduplicate results by lowercase player name
    const sortedRoundResults = [...results]
      .filter((res, idx, arr) => arr.findIndex(other => other.playerName.toLowerCase() === res.playerName.toLowerCase()) === idx)
      .sort((a, b) => a.elapsedMs - b.elapsedMs);

    if (sortedRoundResults.length > 0) {
      completedRoundsCount++;
      const roundWinner = sortedRoundResults[0];
      const winnerKey = roundWinner.playerName.toLowerCase();
      if (scores[winnerKey]) {
        scores[winnerKey].roundsWon += 1;
      }
    }

    sortedRoundResults.forEach(res => {
      const pKey = res.playerName.toLowerCase();
      if (!scores[pKey]) {
        scores[pKey] = {
          playerName: res.playerName,
          avatarColor: res.avatarColor || '#10b981',
          roundsWon: 0,
          totalTimeMs: 0,
          roundsPlayed: 0,
          bestRoundTimeMs: Infinity,
          bestBurstSpeedMs: Infinity,
          totalWords: 0,
          avgTimePerWordMs: 0
        };
      }

      const pScore = scores[pKey];
      pScore.totalTimeMs += res.elapsedMs;
      pScore.roundsPlayed += 1;
      pScore.avatarColor = res.avatarColor || pScore.avatarColor;

      if (res.elapsedMs < pScore.bestRoundTimeMs) {
        pScore.bestRoundTimeMs = res.elapsedMs;
      }

      if (res.burstSpeedMs > 0 && res.burstSpeedMs < pScore.bestBurstSpeedMs) {
        pScore.bestBurstSpeedMs = res.burstSpeedMs;
      }

      const wordsFound = res.wordFindTimestamps?.length || (res.replayLog?.length ?? 0);
      pScore.totalWords += wordsFound;
    });
  });

  // Calculate average time per word
  Object.values(scores).forEach(s => {
    if (s.totalWords > 0) {
      s.avgTimePerWordMs = Math.round(s.totalTimeMs / s.totalWords);
    }
  });

  // Standings sorted by:
  // 1. Rounds won (descending)
  // 2. Total time ms (ascending)
  // 3. Best round time ms (ascending)
  const standings = Object.values(scores)
    .filter(s => s.roundsPlayed > 0)
    .sort((a, b) => {
      if (b.roundsWon !== a.roundsWon) {
        return b.roundsWon - a.roundsWon;
      }
      return a.totalTimeMs - b.totalTimeMs;
    });

  const champion = standings.length > 0 ? standings[0] : null;
  const runnerUp = standings.length > 1 ? standings[1] : null;
  const timeMarginMs = (champion && runnerUp) ? Math.max(0, runnerUp.totalTimeMs - champion.totalTimeMs) : null;
  const isFullyCompleted = match.status === 'completed' || (completedRoundsCount >= match.totalRounds && standings.length >= 2);
  const isSweep = !!(champion && match.totalRounds > 1 && champion.roundsWon === match.totalRounds);

  return {
    match,
    champion,
    standings,
    totalRounds: match.totalRounds,
    completedRoundsCount,
    isFullyCompleted,
    timeMarginMs,
    isSweep
  };
}

/**
 * Computes global champions leaderboard across all archived tournaments
 */
export function computeGlobalChampions(tournaments: CloudMatchDocument[]): GlobalChampionRecord[] {
  const championsMap = new Map<string, {
    playerName: string;
    avatarColor: string;
    tournamentsWon: number;
    tournamentsPlayed: number;
    totalRoundsWon: number;
    bestTimeMs: number;
    bestBurstSpeedMs: number;
    totalWordsFound: number;
  }>();

  tournaments.forEach(t => {
    const summary = computeTournamentSummary(t);
    const champ = summary.champion;

    // Track participation and stats for all contenders
    summary.standings.forEach(contender => {
      const key = contender.playerName.toLowerCase();
      if (!championsMap.has(key)) {
        championsMap.set(key, {
          playerName: contender.playerName,
          avatarColor: contender.avatarColor,
          tournamentsWon: 0,
          tournamentsPlayed: 0,
          totalRoundsWon: 0,
          bestTimeMs: Infinity,
          bestBurstSpeedMs: Infinity,
          totalWordsFound: 0
        });
      }

      const rec = championsMap.get(key)!;
      rec.tournamentsPlayed += 1;
      rec.totalRoundsWon += contender.roundsWon;
      rec.totalWordsFound += contender.totalWords;

      if (contender.bestRoundTimeMs < rec.bestTimeMs) {
        rec.bestTimeMs = contender.bestRoundTimeMs;
      }
      if (contender.bestBurstSpeedMs > 0 && contender.bestBurstSpeedMs < rec.bestBurstSpeedMs) {
        rec.bestBurstSpeedMs = contender.bestBurstSpeedMs;
      }
      if (contender.avatarColor) {
        rec.avatarColor = contender.avatarColor;
      }
    });

    // Crown champion if tournament had at least 1 round played
    if (champ && summary.completedRoundsCount > 0) {
      const champKey = champ.playerName.toLowerCase();
      if (championsMap.has(champKey)) {
        championsMap.get(champKey)!.tournamentsWon += 1;
      }
    }
  });

  return Array.from(championsMap.values())
    .map(c => ({
      ...c,
      bestTimeMs: c.bestTimeMs === Infinity ? 0 : c.bestTimeMs,
      bestBurstSpeedMs: c.bestBurstSpeedMs === Infinity ? 0 : c.bestBurstSpeedMs,
      winRate: c.tournamentsPlayed > 0 ? Math.round((c.tournamentsWon / c.tournamentsPlayed) * 100) : 0
    }))
    .sort((a, b) => {
      // Sort primarily by tournaments won
      if (b.tournamentsWon !== a.tournamentsWon) {
        return b.tournamentsWon - a.tournamentsWon;
      }
      // Then by win rate
      if (b.winRate !== a.winRate) {
        return b.winRate - a.winRate;
      }
      // Then by total rounds won
      if (b.totalRoundsWon !== a.totalRoundsWon) {
        return b.totalRoundsWon - a.totalRoundsWon;
      }
      // Then by best single round time
      if (a.bestTimeMs && b.bestTimeMs) {
        return a.bestTimeMs - b.bestTimeMs;
      }
      return 0;
    });
}

/**
 * Computes all-time historic live tournament records and interesting stats
 */
export function computeLiveTournamentRecords(tournaments: CloudMatchDocument[]): LiveTournamentRecords {
  let fastestRound: LiveTournamentRecords['fastestRound'] = null;
  let shortestBurst: LiveTournamentRecords['shortestBurst'] = null;
  let fastestAvgWordPace: LiveTournamentRecords['fastestAvgWordPace'] = null;
  let closestFinish: LiveTournamentRecords['closestFinish'] = null;
  let mostDominantSweep: LiveTournamentRecords['mostDominantSweep'] = null;

  let totalRoundsPlayed = 0;
  let totalWordsFound = 0;
  let totalPlayTimeMs = 0;

  tournaments.forEach(t => {
    const summary = computeTournamentSummary(t);
    const date = t.lastUpdated || t.createdAt || Date.now();

    // Check closest finish
    if (summary.standings.length >= 2 && summary.timeMarginMs !== null && summary.timeMarginMs > 0) {
      if (!closestFinish || summary.timeMarginMs < closestFinish.deltaMs) {
        closestFinish = {
          roomCode: t.roomCode || t.id,
          theme: t.rounds[0]?.theme || 'Duel',
          winner: summary.standings[0].playerName,
          runnerUp: summary.standings[1].playerName,
          deltaMs: summary.timeMarginMs,
          date
        };
      }
    }

    // Check sweeps
    if (summary.isSweep && summary.champion) {
      if (!mostDominantSweep || summary.totalRounds > mostDominantSweep.totalRounds) {
        mostDominantSweep = {
          playerName: summary.champion.playerName,
          avatarColor: summary.champion.avatarColor,
          roomCode: t.roomCode || t.id,
          totalRounds: summary.totalRounds,
          date
        };
      }
    }

    t.rounds.forEach(r => {
      const results = Object.values(r.results || {});
      if (results.length > 0) {
        totalRoundsPlayed++;
      }

      results.forEach(res => {
        totalPlayTimeMs += res.elapsedMs || 0;
        const words = res.wordFindTimestamps?.length || (res.replayLog?.length ?? 0);
        totalWordsFound += words;

        // Fastest single round
        if (res.elapsedMs > 0 && (!fastestRound || res.elapsedMs < fastestRound.elapsedMs)) {
          fastestRound = {
            playerName: res.playerName,
            avatarColor: res.avatarColor || '#10b981',
            elapsedMs: res.elapsedMs,
            theme: r.theme,
            gridSize: r.gridSize,
            roomCode: t.roomCode || t.id,
            date: res.completedAt || date
          };
        }

        // Shortest burst speed
        if (res.burstSpeedMs > 0 && (!shortestBurst || res.burstSpeedMs < shortestBurst.burstSpeedMs)) {
          shortestBurst = {
            playerName: res.playerName,
            avatarColor: res.avatarColor || '#10b981',
            burstSpeedMs: res.burstSpeedMs,
            theme: r.theme,
            roomCode: t.roomCode || t.id,
            date: res.completedAt || date
          };
        }

        // Fastest average pace per word
        if (res.avgTimePerWordMs > 0 && (!fastestAvgWordPace || res.avgTimePerWordMs < fastestAvgWordPace.avgTimePerWordMs)) {
          fastestAvgWordPace = {
            playerName: res.playerName,
            avatarColor: res.avatarColor || '#10b981',
            avgTimePerWordMs: res.avgTimePerWordMs,
            theme: r.theme,
            roomCode: t.roomCode || t.id,
            date: res.completedAt || date
          };
        }
      });
    });
  });

  return {
    fastestRound,
    shortestBurst,
    fastestAvgWordPace,
    closestFinish,
    mostDominantSweep,
    totalTournamentsArchived: tournaments.length,
    totalRoundsPlayed,
    totalWordsFound,
    totalPlayTimeMs
  };
}
