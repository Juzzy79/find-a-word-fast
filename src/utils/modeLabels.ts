import type { GameMode } from '../types/game';

export const MODE_LABELS: Record<GameMode, string> = {
  duel: 'Duel',
  series: 'Series',
  weekly: 'Weekly',
  zen: 'Zen',
  practice: 'Practice'
};

export function getModeLabel(mode: GameMode | string | undefined): string {
  if (!mode) return MODE_LABELS.duel;
  const key = mode.toLowerCase() as GameMode;
  return MODE_LABELS[key] ?? MODE_LABELS.duel;
}
