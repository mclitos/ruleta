import { motion } from 'framer-motion';
import { Sliders, Sparkles } from './icons';
import { GhostButton } from './ui';

export function SpinControls({ phase, remaining, onSpin, onOpenSetup }) {
  const isSpinning = phase === 'spinning';
  const isEmpty = remaining === 0;

  const label = isSpinning ? 'Girando…' : phase === 'revealed' ? 'Girar de nuevo' : 'Girar ruleta';

  return (
    <div className="space-y-3">
      <motion.button
        type="button"
        onClick={onSpin}
        disabled={isSpinning || isEmpty}
        whileTap={isSpinning || isEmpty ? undefined : { scale: 0.985 }}
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-accent px-6 py-4 font-display text-base tracking-wide text-accent-ink transition disabled:cursor-not-allowed disabled:opacity-55 sm:text-lg"
        style={{ boxShadow: '0 22px 48px -24px var(--accent)' }}
      >
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/40 blur-md shine-sweep opacity-40" />
        <span className="relative z-10 flex items-center justify-center gap-2.5">
          {isSpinning ? (
            <span className="size-4 animate-spin rounded-full border-2 border-accent-ink/25 border-t-accent-ink" />
          ) : (
            <Sparkles size={19} />
          )}
          {label}
        </span>
      </motion.button>

      <GhostButton onClick={onOpenSetup} disabled={isSpinning} className="w-full py-2.5">
        <Sliders size={16} />
        Configurar sorteo
      </GhostButton>

      <p className="text-center text-[11px] font-medium text-ink-soft">
        {isEmpty
          ? 'Agregá participantes en la configuración para poder girar.'
          : `Tip: presioná Espacio para girar · ${remaining} ${
              remaining === 1 ? 'participante en juego' : 'participantes en juego'
            }`}
      </p>
    </div>
  );
}
