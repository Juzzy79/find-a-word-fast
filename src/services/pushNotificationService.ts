import { formatMs } from '../utils/formatters';
import { sounds } from '../utils/sound';

export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const NOTIFIED_TURNS_KEY = 'wordrush_notified_turns_v1';

function getNotifiedTurnSet(): Set<string> {
  if (typeof sessionStorage === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(NOTIFIED_TURNS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markTurnAsNotified(key: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const set = getNotifiedTurnSet();
    set.add(key);
    sessionStorage.setItem(NOTIFIED_TURNS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): PushPermissionStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<PushPermissionStatus> {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerPushServiceWorker();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('wordrush_notifications_enabled', 'true');
      }
    }
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export interface TurnFinishedNotificationParams {
  opponentName: string;
  roundNumber: number;
  elapsedMs: number;
  roomCode?: string;
  matchId?: string;
  burstSpeedMs?: number;
}

export async function showTurnFinishedNotification(
  params: TurnFinishedNotificationParams
): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const dedupeKey = `${params.matchId || 'match'}_rnd_${params.roundNumber}_${params.opponentName.toLowerCase()}_${params.elapsedMs}`;
  const seenSet = getNotifiedTurnSet();
  if (seenSet.has(dedupeKey)) {
    return false;
  }
  markTurnAsNotified(dedupeKey);

  const formattedTime = formatMs(params.elapsedMs);
  const title = `⚡ ${params.opponentName} Finished Round ${params.roundNumber}!`;
  const body = `Record time: ${formattedTime} in Room ${params.roomCode || 'Match'}. It's your turn to beat it!`;
  const url = params.roomCode
    ? `${window.location.origin}/#room=${params.roomCode}`
    : window.location.href;

  // Play subtle sound alert
  try {
    sounds.playWordFound();
  } catch {
    // ignore
  }

  // Try displaying via Service Worker registration first (for rich system notifications)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: dedupeKey,
          data: { url }
        });
        return true;
      }
    }
  } catch (err) {
    console.warn('Service Worker showNotification failed, using fallback Notification:', err);
  }

  // Fallback to standard window Notification
  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: dedupeKey
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn('Notification display failed:', err);
    return false;
  }
}

export async function showTestPushNotification(playerName: string = 'Opponent'): Promise<boolean> {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  return showTurnFinishedNotification({
    opponentName: playerName,
    roundNumber: 1,
    elapsedMs: 42150,
    roomCode: 'TEST42',
    matchId: 'test_match'
  });
}
