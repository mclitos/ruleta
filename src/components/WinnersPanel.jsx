import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Copy, Trash, Trophy } from './icons';
import { copyText, formatTime } from '../lib/utils';

function winnersToText(winners) {
  const lines = winners
    .slice()
    .reverse()
    .map((winner, index) => `${index + 1}. ${winner.name} — ${formatTime(winner.at)}`);
  return [`Lista de Ganadores (${winners.length})`, ...lines].join('\n');
}

/**
 * The stored history can reach 500 entries; rendering that many animated rows
 * makes every insert recompute the layout of all of them. Showing the newest
 * slice keeps the panel cheap while Copiar still exports the whole history.
 */
const VISIBLE_LIMIT = 80;

export function WinnersPanel({ winners, remaining, onClear }) {
  const [copyState, setCopyState] = useState('idle');
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = async () => {
    if (winners.length === 0) return;
    const ok = await copyText(winnersToText(winners));
    setCopyState(ok ? 'copied' : 'failed');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState('idle'), 1800);
  };

  const copyLabel = copyState === 'copied' ? 'Copiado' : copyState === 'failed' ? 'Falló' : 'Copiar';
  const isEmpty = winners.length === 0;
  const visible = winners.slice(0, VISIBLE_LIMIT);
  const hidden = winners.length - visible.length;

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent/12 text-accent">
            <Trophy size={18} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold tracking-wide text-ink">Ganadores</h2>
            <p className="text-xs font-medium text-ink-soft">
              {winners.length === 0
                ? 'Sin sorteos todavía'
                : `${winners.length} ${winners.length === 1 ? 'guardado' : 'guardados'}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            disabled={isEmpty}
            aria-label="Lista de Ganadores"
            title="Lista de Ganadores"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-ink-soft transition hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            <span aria-hidden="true">{copyLabel}</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={isEmpty}
            aria-label="Limpiar lista de ganadores"
            title="Limpiar lista de ganadores"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-ink-soft transition hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash size={14} />
            <span aria-hidden="true">Limpiar</span>
          </button>
        </div>
        <p role="status" aria-live="polite" className="sr-only">
          {copyState === 'copied'
            ? 'Lista de Ganadores copiada al portapapeles'
            : copyState === 'failed'
              ? 'No se pudo copiar'
              : ''}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 border-b border-line/70 px-5 py-3">
        <div className="rounded-xl bg-surface-2/60 px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
            En juego
          </p>
          <p className="font-display text-xl leading-tight text-ink">{remaining}</p>
        </div>
        <div className="rounded-xl bg-surface-2/60 px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">
            Sorteados
          </p>
          <p className="font-display text-xl leading-tight text-ink">{winners.length}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 no-scrollbar">
        {winners.length === 0 ? (
          <div className="grid h-full min-h-40 place-items-center px-6 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-line bg-surface-2/60 text-ink-soft">
                <Clock size={20} />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">El historial está vacío</p>
              <p className="mt-1 text-xs font-medium leading-snug text-ink-soft">
                Cada ganador aparece acá con la hora exacta del sorteo.
              </p>
            </div>
          </div>
        ) : (
          <>
            <ol className="space-y-1.5">
              <AnimatePresence initial={false}>
                {visible.map((winner, index) => (
                  <motion.li
                    key={winner.id}
                    layout
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="flex items-center gap-3 overflow-hidden rounded-xl border border-line/60 bg-surface-2/40 px-3 py-2.5"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-[0.65rem] font-extrabold text-accent">
                      {winners.length - index}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                      {winner.name}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink-soft">
                      {formatTime(winner.at)}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
            {hidden > 0 && (
              <p className="px-2 pt-2 text-center text-[11px] font-medium text-ink-soft">
                Mostrando los últimos {VISIBLE_LIMIT} de {winners.length}. Copiar incluye todo.
              </p>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-line/70 px-5 py-3">
        <p className="text-[11px] font-medium leading-snug text-ink-soft">
          El historial queda guardado en este navegador. Limpiar lo borra para siempre.
        </p>
      </footer>
    </div>
  );
}
