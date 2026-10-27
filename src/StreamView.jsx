import { useCallback, useEffect, useRef, useState } from 'react';
import { loadStoredSettings, resolveLogoSrc, sanitizeSettings } from './lib/settings';
import {
  CHROMA_GREEN,
  STREAM_HEARTBEAT_MS,
  createChannel,
  readStreamParams,
} from './lib/stream';
import { celebrate } from './lib/celebrate';
import { cn } from './lib/utils';
import { useSound } from './hooks/useSound';
import { useTheme } from './hooks/useTheme';
import { Background } from './components/Background';
import { Logo } from './components/Logo';
import { Reel } from './components/Reel';

const FALLBACK_DURATION = 4;

/**
 * Minimal viewer for OBS or a second monitor: no header, no controls, no
 * navigation. It renders whatever round the control page broadcasts and
 * reports back when the reel stops so the winner is recorded exactly once.
 */
export default function StreamView() {
  // Seeded from the saved settings so a stream opened before (or without) the
  // control page already shows the right branding; the channel keeps it in sync.
  // Read-only on purpose: this window must never write settings back.
  const [settings, setSettings] = useState(loadStoredSettings);
  const [round, setRound] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [duration, setDuration] = useState(FALLBACK_DURATION);
  const [lastWinner, setLastWinner] = useState('');

  const { background } = readStreamParams();
  const chroma = background === 'green';
  const transparent = background === 'transparent';

  useTheme(settings.theme);

  const channelRef = useRef(null);
  const roundRef = useRef(null);
  const completedRef = useRef(0);
  const phaseRef = useRef('idle');

  const { fanfare, startTicks, stopTicks } = useSound({
    enabled: settings.sounds,
    volume: settings.volume,
  });

  useEffect(() => {
    document.title = 'Ruleta · Ventana de stream';
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const cls = transparent ? 'stream-transparent' : chroma ? 'stream-chroma' : '';
    if (!cls) return undefined;
    root.classList.add(cls);
    return () => root.classList.remove(cls);
  }, [transparent, chroma]);

  useEffect(() => {
    const channel = createChannel();
    if (!channel) return undefined;
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'state' && data.settings) {
        setSettings(sanitizeSettings(data.settings));
        return;
      }
      if (data.type === 'reset') {
        // The control page started a new raffle: back to the idle reel, without
        // touching the winner history it already recorded.
        stopTicks();
        roundRef.current = null;
        setRound(null);
        setLastWinner('');
        setPhase('idle');
        return;
      }
      if (data.type === 'result' && data.round && phaseRef.current !== 'spinning') {
        // Opened after the reveal: land on the winner that the control page is
        // already showing, without replaying the sound or the confetti.
        const landed = data.round;
        const name = data.winner || landed.winner;
        if (!name) return;
        completedRef.current = landed.id;
        roundRef.current = landed;
        setRound(landed);
        setDuration(0.4);
        setLastWinner(name);
        setPhase('revealed');
        return;
      }
      if (data.type === 'round' && data.round) {
        const nextDuration = Number.isFinite(data.duration) ? data.duration : FALLBACK_DURATION;
        roundRef.current = data.round;
        setRound(data.round);
        setDuration(nextDuration);
        setLastWinner('');
        setPhase('spinning');
        startTicks(nextDuration * 1000);
      }
    };

    channel.postMessage({ type: 'ready' });
    const heartbeat = window.setInterval(
      () => channel.postMessage({ type: 'heartbeat' }),
      STREAM_HEARTBEAT_MS,
    );

    return () => {
      window.clearInterval(heartbeat);
      channelRef.current = null;
      channel.close();
    };
  }, [startTicks]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const handleComplete = useCallback(() => {
    stopTicks();
    const current = roundRef.current;
    if (!current || completedRef.current === current.id) return;
    completedRef.current = current.id;

    setLastWinner(current.winner);
    setPhase('revealed');
    fanfare();
    if (settings.confetti) celebrate(settings.palette);
    channelRef.current?.postMessage({ type: 'round-complete', id: current.id });
  }, [fanfare, settings.confetti, settings.palette, stopTicks]);

  const revealed = phase === 'revealed' && Boolean(lastWinner);
  const spinning = phase === 'spinning';

  return (
    <div
      className={cn(
        'relative flex min-h-dvh flex-col overflow-hidden',
        transparent ? 'bg-transparent' : chroma ? '' : 'bg-bg',
      )}
      style={chroma ? { backgroundColor: CHROMA_GREEN } : undefined}
    >
      {background === 'solid' ? <Background /> : null}

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-5 px-6 py-6 sm:gap-6 sm:py-8">
        <Logo
          title={settings.title}
          slogan={settings.slogan}
          logoUrl={resolveLogoSrc(settings)}
          hidden={settings.logoHidden}
          size={54}
        />

        {/* Status lives above the reel and doubles as the winner heading, so the
            space is reserved once and never shifts between states. */}
        <div className="min-h-[5.5rem] text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-accent">
            {revealed ? 'Ganador' : spinning ? 'Sorteando' : 'Ruleta de rifas'}
          </p>
          {revealed ? (
            <h1 className="mt-2 text-balance font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
              {lastWinner}
            </h1>
          ) : (
            <p className="mt-2 text-balance font-display text-2xl leading-tight tracking-tight text-ink sm:text-3xl">
              {spinning ? 'Que gire la suerte' : 'Listo para sortear'}
            </p>
          )}
        </div>

        <div className="w-full max-w-xl">
          <Reel
            round={round}
            participants={settings.participants}
            palette={settings.palette}
            duration={duration}
            revealed={revealed}
            onComplete={handleComplete}
            rows={5}
            barHeight={62}
            barGap={9}
            compact
          />
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {revealed ? `Ganador: ${lastWinner}` : ''}
      </p>
    </div>
  );
}
