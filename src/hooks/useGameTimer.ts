import { useState, useRef, useEffect, useCallback } from 'react';
import { sounds } from '../utils/sound';
import type { GameMode } from '../types/game';

interface UseGameTimerOptions {
  mode: GameMode;
  isCompletedThisRound: boolean;
}

export function useGameTimer({ mode, isCompletedThisRound }: UseGameTimerOptions) {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  // Frozen / paused / final elapsed ms (live 16ms ticking is isolated inside TimerDisplay)
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startTimeRef = useRef<number>(0);
  const isSolvingRef = useRef<boolean>(false);

  // Keep isSolvingRef synchronously in sync with live play state
  useEffect(() => {
    isSolvingRef.current = isRunning || isPaused || countdown !== null;
  }, [isRunning, isPaused, countdown]);

  const getLiveElapsedMs = useCallback((): number => {
    if (isRunning && startTimeRef.current > 0) {
      return Math.max(0, Date.now() - startTimeRef.current);
    }
    return elapsedMs;
  }, [isRunning, elapsedMs]);

  const handleTogglePause = useCallback(() => {
    if (mode === 'zen' || isCompletedThisRound) return;

    if (isRunning) {
      const frozen = startTimeRef.current > 0 ? Math.max(0, Date.now() - startTimeRef.current) : elapsedMs;
      setElapsedMs(frozen);
      setIsRunning(false);
      setIsPaused(true);
      sounds.playTileTick();
    } else if (isPaused) {
      startTimeRef.current = Date.now() - elapsedMs;
      setIsPaused(false);
      setIsRunning(true);
      sounds.playWordFound();
    }
  }, [mode, isCompletedThisRound, isRunning, isPaused, elapsedMs]);

  const resetTimer = useCallback((initialElapsed: number = 0) => {
    setIsRunning(false);
    setIsPaused(false);
    setCountdown(null);
    setElapsedMs(initialElapsed);
    startTimeRef.current = 0;
  }, []);

  return {
    isRunning,
    setIsRunning,
    isPaused,
    setIsPaused,
    elapsedMs,
    setElapsedMs,
    countdown,
    setCountdown,
    startTimeRef,
    isSolvingRef,
    getLiveElapsedMs,
    handleTogglePause,
    resetTimer
  };
}
