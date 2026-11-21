import type { SharedGameState, PlayerTurnResult } from '../types/game';

export function formatMs(ms: number): string {
  if (ms < 0 || isNaN(ms)) return '00:00.00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  const csStr = String(centiseconds).padStart(2, '0');

  return `${mStr}:${sStr}.${csStr}`;
}

export function formatSecondsShort(ms: number): string {
  if (ms < 0 || isNaN(ms)) return '0.0s';
  const sec = (ms / 1000).toFixed(1);
  return `${sec}s`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Generates the Farkle-style pass-turn share message
export function generateShareMessage(
  game: SharedGameState,
  currentPlayer: string,
  turnResult?: PlayerTurnResult,
  shareUrl?: string
): string {
  const currentRound = game.rounds[game.currentRoundIndex] || game.rounds[0];
  const url = shareUrl || window.location.href;
  const timeStr = turnResult ? formatMs(turnResult.elapsedMs) : '';

  let header = `🧩 WordRush Challenge!`;
  if (game.mode === 'series') {
    header = `🏆 WordRush Series (Round ${currentRound.roundNumber}/${game.totalRounds})`;
  } else if (game.mode === 'weekly') {
    header = `⚡ WordRush Weekly Competition`;
  } else if (game.mode === 'zen') {
    header = `🌸 WordRush — Relaxed Zen Word Search`;
  }

  let body = '';
  if (turnResult) {
    if (game.mode === 'zen') {
      body = `✨ ${currentPlayer} completed the "${currentRound.theme}" (${currentRound.gridSize}×${currentRound.gridSize}) puzzle in Zen Mode!`;
    } else {
      body = `⏱️ ${currentPlayer} just clocked in at ${timeStr} on "${currentRound.theme}" (${currentRound.gridSize}×${currentRound.gridSize})!`;
      if (turnResult.burstSpeedMs > 0 && turnResult.burstSpeedMs < 3000) {
        body += ` (Fastest combo: ${formatSecondsShort(turnResult.burstSpeedMs)})`;
      }
    }
  } else {
    body = `🎯 You have been challenged to a ${currentRound.gridSize}×${currentRound.gridSize} Find-A-Word showdown!`;
  }

  const roomCode = ((game as any).roomCode || game.id || '').toUpperCase();
  const roomCodeLine = (roomCode && /^[A-Z0-9]{4,10}$/i.test(roomCode))
    ? `\n🔑 Room Code: ${roomCode}`
    : '';

  return `${header}
${body}${roomCodeLine}

👉 Tap to join the live room and play your turn:
${url}

(Your completion time will automatically update in the room!)`;
}

export const AVATAR_PALETTE = [
  { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', hex: '#10b981' },
  { bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', hex: '#06b6d4' },
  { bg: 'bg-violet-500/20 text-violet-400 border-violet-500/40', hex: '#8b5cf6' },
  { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', hex: '#f59e0b' },
  { bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', hex: '#f43f5e' },
  { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40', hex: '#3b82f6' },
  { bg: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40', hex: '#d946ef' },
  { bg: 'bg-teal-500/20 text-teal-400 border-teal-500/40', hex: '#14b8a6' },
];

export function getPlayerColor(name: string): { bg: string; hex: string } {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}
