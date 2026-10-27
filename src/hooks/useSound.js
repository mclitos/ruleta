import { useCallback, useEffect, useRef } from 'react';
import { createSynth } from '../lib/audio';

export function useSound({ enabled, volume }) {
  const synthRef = useRef(null);
  const configRef = useRef({ enabled, volume });
  const timersRef = useRef([]);

  useEffect(() => {
    configRef.current = { enabled, volume };
    if (synthRef.current) synthRef.current.setVolume(volume);
  }, [enabled, volume]);

  const getSynth = useCallback(() => {
    const current = configRef.current;
    if (!current.enabled) return null;
    if (!synthRef.current) synthRef.current = createSynth();
    synthRef.current.setVolume(current.volume);
    return synthRef.current;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const tick = useCallback(() => {
    getSynth()?.tick(1);
  }, [getSynth]);

  const click = useCallback(() => {
    getSynth()?.click();
  }, [getSynth]);

  const fanfare = useCallback(() => {
    getSynth()?.fanfare();
  }, [getSynth]);

  const startTicks = useCallback(
    (durationMs) => {
      clearTimers();
      const synth = getSynth();
      if (!synth) return;
      synth.whoosh();
      const startedAt = performance.now();
      const safeDuration = Math.max(durationMs, 400);

      const schedule = () => {
        if (!configRef.current.enabled) return;
        const progress = Math.min((performance.now() - startedAt) / safeDuration, 1);
        if (progress >= 0.995) return;
        synth.tick(1 - progress * 0.4);
        const delay = 26 + 300 * progress ** 3;
        timersRef.current.push(window.setTimeout(schedule, delay));
      };

      timersRef.current.push(window.setTimeout(schedule, 30));
    },
    [clearTimers, getSynth],
  );

  useEffect(() => clearTimers, [clearTimers]);

  return { tick, click, fanfare, startTicks, stopTicks: clearTimers };
}
