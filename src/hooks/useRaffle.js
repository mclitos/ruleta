import { useCallback, useEffect, useRef, useState } from 'react';
import { mod, secureRandomIndex } from '../lib/utils';
import { WINNERS_KEY, createWinnerId, prependWinner, sanitizeWinners } from '../lib/history';
import { useLocalStorage } from './useLocalStorage';

/**
 * Owns the raffle state machine: idle -> spinning -> revealed.
 * The reel animation decides when `completeSpin` runs, so the visual and the
 * data layer can never disagree about the winner.
 */
export function useRaffle({ settings, setSettings, onReveal }) {
  const [phase, setPhase] = useState('idle');
  const [round, setRound] = useState(null);
  // The history outlives the session: `autoRemove` already persists the list, so
  // losing who won would leave drawn names gone with no record of them.
  const [winners, setWinners] = useLocalStorage(WINNERS_KEY, [], sanitizeWinners);

  const roundRef = useRef(null);
  const counterRef = useRef(0);
  const completedRef = useRef(0);
  const lockedRef = useRef(false);
  const revealRef = useRef(onReveal);

  useEffect(() => {
    revealRef.current = onReveal;
  }, [onReveal]);

  /**
   * Starts a round and returns it (or `null` when it cannot spin) so callers can
   * mirror the exact same round to the stream window.
   */
  const spin = useCallback(() => {
    if (lockedRef.current) return null;
    const list = settings.participants;
    if (!list || list.length === 0) return null;

    lockedRef.current = true;
    const count = list.length;
    const winnerIndex = secureRandomIndex(count);

    // Build a contiguous cyclic window of names so the winning row always
    // lands a couple of rows before the end of the strip.
    const blocks = Math.min(60, Math.max(3, Math.ceil(60 / count)));
    const total = Math.min(140, Math.max(5, blocks * count + 2));
    const targetRow = total - 3;
    const base = mod(winnerIndex - targetRow, count);
    const rows = Array.from({ length: total }, (_, index) => {
      const participantIndex = mod(base + index, count);
      return { key: index, name: list[participantIndex], participantIndex };
    });

    counterRef.current += 1;
    const nextRound = {
      id: counterRef.current,
      rows,
      targetRow,
      winner: list[winnerIndex],
      winnerIndex,
    };

    roundRef.current = nextRound;
    setRound(nextRound);
    setPhase('spinning');
    return nextRound;
  }, [settings.participants]);

  const completeSpin = useCallback(() => {
    const current = roundRef.current;
    if (!current || !lockedRef.current) return;
    if (completedRef.current === current.id) return;

    completedRef.current = current.id;
    lockedRef.current = false;
    setPhase('revealed');

    const entry = { id: createWinnerId(current.id), name: current.winner, at: Date.now() };
    setWinners((previous) => prependWinner(previous, entry));

    if (typeof revealRef.current === 'function') {
      revealRef.current(current.winner);
    }

    if (settings.autoRemove) {
      setSettings((previous) => {
        if (current.winnerIndex >= previous.participants.length) return previous;
        const remaining = previous.participants.filter(
          (_, index) => index !== current.winnerIndex,
        );
        return { ...previous, participants: remaining };
      });
    }
  }, [settings.autoRemove, setSettings]);

  const clearHistory = useCallback(() => {
    setWinners([]);
  }, [setWinners]);

  /**
   * Cancels the live round without touching the history: the winner stays in the
   * record but stops being the live result. Changing the list owns the transition
   * and must win over an animation still in flight, so this also releases the lock
   * (a late `onComplete` finds no round and returns early). Skipping the reset
   * would leave the previous winner on screen and the tab unable to spin again.
   */
  const resetRound = useCallback(() => {
    roundRef.current = null;
    lockedRef.current = false;
    setRound(null);
    setPhase('idle');
  }, []);

  return {
    phase,
    round,
    winners,
    remaining: settings.participants.length,
    lastWinner: winners[0] ?? null,
    spin,
    completeSpin,
    clearHistory,
    resetRound,
  };
}
