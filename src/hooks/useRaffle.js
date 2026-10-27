import { useCallback, useEffect, useRef, useState } from 'react';
import { mod, secureRandomIndex } from '../lib/utils';

/**
 * Owns the raffle state machine: idle -> spinning -> revealed.
 * The reel animation decides when `completeSpin` runs, so the visual and the
 * data layer can never disagree about the winner.
 */
export function useRaffle({ settings, setSettings, onReveal }) {
  const [phase, setPhase] = useState('idle');
  const [round, setRound] = useState(null);
  const [winners, setWinners] = useState([]);

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

    const entry = { id: current.id, name: current.winner, at: Date.now() };
    setWinners((previous) => [entry, ...previous]);

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
  }, []);

  const resetSession = useCallback(() => {
    lockedRef.current = false;
    roundRef.current = null;
    setRound(null);
    setWinners([]);
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
    resetSession,
  };
}
