import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  hasSameParticipants,
  randomSpinDuration,
  sanitizeSettings,
} from './lib/settings';
import { celebrate } from './lib/celebrate';
import { STREAM_TIMEOUT_MS, createChannel, streamBackgroundUrl, streamUrl } from './lib/stream';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { useSound } from './hooks/useSound';
import { useRaffle } from './hooks/useRaffle';
import { Background } from './components/Background';
import { Header } from './components/Header';
import { Reel } from './components/Reel';
import { SpinControls } from './components/SpinControls';
import { WinnersPanel } from './components/WinnersPanel';
import { SetupModal } from './components/SetupModal';
import { StreamModal } from './components/StreamModal';

export default function App() {
  const [settings, setSettings] = useLocalStorage(
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    sanitizeSettings,
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [streamOpen, setStreamOpen] = useState(false);
  const [streamLive, setStreamLive] = useState(false);
  const [spinSeconds, setSpinSeconds] = useState(() =>
    randomSpinDuration(DEFAULT_SETTINGS.spinMin, DEFAULT_SETTINGS.spinMax),
  );
  const reduceMotion = useReducedMotion();

  const channelRef = useRef(null);
  const settingsRef = useRef(settings);
  const streamSeenRef = useRef(0);
  const streamLiveRef = useRef(false);
  const completeSpinRef = useRef(null);
  const liveRoundRef = useRef(null);
  const resultRef = useRef(null);

  useTheme(settings.theme);

  const { click, fanfare, startTicks, stopTicks } = useSound({
    enabled: settings.sounds,
    volume: settings.volume,
  });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    streamLiveRef.current = streamLive;
  }, [streamLive]);

  // The stream window plays the reveal feedback, so this tab stays quiet while
  // it is connected instead of doubling the sound and the confetti.
  const handleReveal = useCallback(() => {
    if (streamLiveRef.current) return;
    fanfare();
    if (settings.confetti) celebrate(settings.palette);
  }, [fanfare, settings.confetti, settings.palette]);

  const raffle = useRaffle({ settings, setSettings, onReveal: handleReveal });
  const { phase, round, winners, remaining, lastWinner, spin, completeSpin } = raffle;

  useEffect(() => {
    completeSpinRef.current = completeSpin;
  }, [completeSpin]);

  const durationSeconds = reduceMotion ? 1.4 : spinSeconds;

  useEffect(() => {
    const channel = createChannel();
    if (!channel) return undefined;
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'ready') {
        channel.postMessage({ type: 'state', settings: settingsRef.current });
        // A window opened mid-round (or after the reveal) still has to catch up
        // instead of sitting on an empty reel.
        if (liveRoundRef.current) {
          channel.postMessage({ type: 'round', ...liveRoundRef.current });
        } else if (resultRef.current) {
          channel.postMessage({ type: 'result', ...resultRef.current });
        }
        streamSeenRef.current = Date.now();
        setStreamLive(true);
        return;
      }
      if (data.type === 'heartbeat') {
        streamSeenRef.current = Date.now();
        setStreamLive(true);
        return;
      }
      if (data.type === 'round-complete') {
        // The reel animation in a hidden or minimized tab is paused, so the
        // stream window is allowed to close the round for us. It is idempotent.
        const current = liveRoundRef.current?.round;
        completeSpinRef.current?.();
        liveRoundRef.current = null;
        if (current) resultRef.current = { round: current, winner: current.winner };
      }
    };

    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, []);

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'state', settings });
  }, [settings]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStreamLive(Date.now() - streamSeenRef.current <= STREAM_TIMEOUT_MS);
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  const handleSpin = useCallback(() => {
    if (phase === 'spinning') return;
    click();
    const seconds = reduceMotion ? 1.4 : randomSpinDuration(settings.spinMin, settings.spinMax);
    setSpinSeconds(seconds);
    const started = spin();
    if (!started) return;
    startTicks(seconds * 1000);
    liveRoundRef.current = { round: started, duration: seconds };
    resultRef.current = null;
    channelRef.current?.postMessage({ type: 'round', round: started, duration: seconds });
  }, [click, phase, reduceMotion, settings.spinMax, settings.spinMin, spin, startTicks]);

  const handleComplete = useCallback(() => {
    stopTicks();
    const current = liveRoundRef.current?.round;
    completeSpin();
    liveRoundRef.current = null;
    if (current) resultRef.current = { round: current, winner: current.winner };
  }, [completeSpin, stopTicks]);

  const handleOpenStreamWindow = (background = 'solid') => {
    const target = streamBackgroundUrl(streamUrl(), background);
    if (window.open(target, 'ruleta-stream', 'popup,width=1280,height=720') === null) {
      window.open(target, '_blank');
    }
  };

  const handleToggleTheme = () => {
    setSettings((current) => ({
      ...current,
      theme: current.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const handleToggleSounds = () => {
    setSettings((current) => ({ ...current, sounds: !current.sounds }));
  };

  const handleSave = (next) => {
    const clean = sanitizeSettings(next);
    setSetupOpen(false);

    // A finished round belongs to the list that produced it: saving a different
    // list starts a new raffle, so the reveal must stop being the live result.
    if (!hasSameParticipants(settings.participants, clean.participants)) {
      raffle.resetRound();
      liveRoundRef.current = null;
      resultRef.current = null;
      channelRef.current?.postMessage({ type: 'reset' });
    }

    setSettings(clean);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code !== 'Space' || event.repeat) return;
      if (setupOpen) return;
      const target = event.target;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        tag === 'BUTTON' ||
        tag === 'A' ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      handleSpin();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSpin, setupOpen]);

  const isSpinning = phase === 'spinning';
  const hasWinner = phase === 'revealed' && Boolean(lastWinner);

  const eyebrow = isSpinning ? 'Sorteando' : hasWinner ? 'Ganador' : 'Sorteo en vivo';
  const headline = isSpinning
    ? 'Que gire la suerte'
    : hasWinner
      ? lastWinner.name
      : 'Listo para sortear';

  return (
    <div className="relative flex min-h-dvh flex-col">
      <Background />
      <a href="#sorteo" className="skip-link">
        Saltar al sorteo
      </a>

      <div className="relative z-10 flex min-h-dvh flex-col">
        <Header
          settings={settings}
          spinning={isSpinning}
          onOpenSetup={() => setSetupOpen(true)}
          onOpenStream={() => setStreamOpen(true)}
          onToggleTheme={handleToggleTheme}
          onToggleSounds={handleToggleSounds}
        />

        <main
          id="sorteo"
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <section className="card p-4 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-accent">
                    {eyebrow}
                  </p>
                  <h1 className="mt-0.5 text-balance font-display text-xl leading-tight tracking-tight text-ink sm:text-2xl">
                    {headline}
                  </h1>
                </div>
                <span className="hidden shrink-0 rounded-full border border-line bg-surface-2/70 px-2.5 py-1 text-[11px] font-extrabold tabular-nums text-ink-soft sm:inline">
                  Ronda {winners.length + (hasWinner ? 0 : 1)}
                </span>
              </div>

              <Reel
                round={round}
                participants={settings.participants}
                palette={settings.palette}
                duration={durationSeconds}
                revealed={hasWinner}
                onComplete={handleComplete}
              />

              <div className="mt-5">
                <SpinControls
                  phase={phase}
                  remaining={remaining}
                  onSpin={handleSpin}
                  onOpenSetup={() => setSetupOpen(true)}
                />
              </div>
            </section>

            <aside className="lg:sticky lg:top-[4.9rem]">
              <div className="max-h-[68dvh] lg:max-h-[calc(100dvh-6.5rem)]">
                <WinnersPanel
                  winners={winners}
                  remaining={remaining}
                  onClear={raffle.clearHistory}
                />
              </div>
            </aside>
          </div>

          <p className="text-center text-[11px] font-medium text-ink-soft">
            Tus ajustes y el historial de ganadores quedan guardados en este navegador.
          </p>
        </main>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {hasWinner ? `Ganador: ${lastWinner.name}` : ''}
      </p>

      <SetupModal
        open={setupOpen}
        settings={settings}
        onClose={() => setSetupOpen(false)}
        onSave={handleSave}
      />

      <StreamModal
        open={streamOpen}
        url={streamUrl()}
        live={streamLive}
        onClose={() => setStreamOpen(false)}
        onOpenWindow={handleOpenStreamWindow}
      />
    </div>
  );
}
