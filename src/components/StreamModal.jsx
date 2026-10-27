import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { streamBackgroundUrl } from '../lib/stream';
import { cn, copyText } from '../lib/utils';
import { Check, Copy, ExternalLink, Monitor, X } from './icons';
import { GhostButton } from './ui';

const BACKGROUND_OPTIONS = [
  { id: 'solid', label: 'Normal' },
  { id: 'transparent', label: 'Transparente' },
  { id: 'green', label: 'Croma verde' },
];

function StreamDialog({ url, live, onClose, onOpenWindow }) {
  const [copyState, setCopyState] = useState('idle');
  const [background, setBackground] = useState('solid');
  const finalUrl = streamBackgroundUrl(url, background);

  useEffect(() => {
    if (copyState === 'idle') return undefined;
    const timeout = window.setTimeout(() => setCopyState('idle'), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    const ok = await copyText(finalUrl);
    setCopyState(ok ? 'copied' : 'failed');
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div
        className="absolute inset-0 bg-[var(--veil)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stream-title"
        className="card relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none border-b-0 sm:rounded-3xl sm:border-b"
        initial={{ y: 48, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-accent">
              Transmisión
            </p>
            <h2 id="stream-title" className="font-display text-lg tracking-tight text-ink">
              Modo stream
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modo stream"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2/60 text-ink-soft transition hover:text-ink"
          >
            <X size={17} />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          <p className="text-sm font-medium leading-relaxed text-ink-soft">
            Abrí esta ventana en el segundo monitor y compartí solo ella: muestra la ruleta sin
            botones ni historial, sincronizada con esta pestaña.
          </p>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold',
                live
                  ? 'border-emerald-400/40 bg-emerald-400/12 text-emerald-300'
                  : 'border-line bg-surface-2/70 text-ink-soft',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  live ? 'bg-emerald-400' : 'bg-ink-soft/60',
                )}
              />
              {live ? 'Conectada' : 'Sin conexión'}
            </span>
            <span className="text-[11px] font-medium text-ink-soft">
              {live ? 'El segundo monitor va a girar con vos.' : 'Abrí la ventana para conectar.'}
            </span>
          </div>

          <label className="block">
            <span className="label">Enlace de la ventana</span>
            <input
              type="text"
              readOnly
              value={finalUrl}
              onFocus={(event) => event.target.select()}
              className="field font-mono text-[12px]"
            />
          </label>

          <div>
            <span className="label">Fondo de la ventana</span>
            <div
              role="group"
              aria-label="Fondo de la ventana"
              className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl border border-line/70 bg-surface-2/40 p-1"
            >
              {BACKGROUND_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={background === option.id}
                  onClick={() => setBackground(option.id)}
                  className={cn(
                    'rounded-lg px-2 py-1.5 text-xs font-bold transition',
                    background === option.id
                      ? 'bg-accent text-accent-ink shadow-sm'
                      : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={handleCopy} title="Copiar enlace de la ventana">
              {copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}
              {copyState === 'copied'
                ? 'Copiado'
                : copyState === 'failed'
                  ? 'Falló'
                  : 'Copiar enlace'}
            </GhostButton>
            <GhostButton
              onClick={() => onOpenWindow(background)}
              title="Abrir la ventana del modo stream"
            >
              <ExternalLink size={15} />
              Abrir en ventana
            </GhostButton>
          </div>

          <div className="rounded-xl border border-line/70 bg-surface-2/50 px-3.5 py-3">
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
              <Monitor size={14} />
              Para OBS o segunda pantalla
            </p>
            <ul className="mt-2 space-y-1.5 text-xs font-medium leading-relaxed text-ink-soft">
              <li>
                En OBS usá <strong className="text-ink">Captura de ventana</strong> sobre esta
                ventana: la fuente de navegador de OBS no comparte la sesión del navegador.
              </li>
              <li>
                También podés abrirla como app aparte:{' '}
                <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px] text-ink">
                  chrome --app=&quot;{finalUrl}&quot;
                </code>
              </li>
              <li>
                Elegí el fondo arriba y el enlace lo incluye. <strong className="text-ink">Croma verde</strong>{' '}
                usa <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px] text-ink">#00B140</code>;
                también podés usar fondo transparente.
              </li>
            </ul>
          </div>

          <p className="text-[11px] font-medium text-ink-soft">
            Sonidos y confetti se reproducen en la ventana del stream, no acá.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function StreamModal({ open, url, live, onClose, onOpenWindow }) {
  return (
    <AnimatePresence>
      {open ? (
        <StreamDialog
          key="stream"
          url={url}
          live={live}
          onClose={onClose}
          onOpenWindow={onOpenWindow}
        />
      ) : null}
    </AnimatePresence>
  );
}
