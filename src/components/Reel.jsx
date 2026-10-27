import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { cn, initials, inkFor, mixHex, shadeHex } from '../lib/utils';

export const BAR_HEIGHT = 90;
export const BAR_GAP = 14;
export const ROWS = 3;
export const STEP = BAR_HEIGHT + BAR_GAP;
export const VIEWPORT_HEIGHT = STEP * ROWS;

/**
 * Bar geometry for a given number of visible rows. The viewport is exactly
 * `rows` steps tall and the strip is pulled up so the centered row sits dead
 * center, which leaves `GAP / 2` of breathing room above and below.
 */
export function reelGeometry({ rows = ROWS, barHeight = BAR_HEIGHT, barGap = BAR_GAP } = {}) {
  const step = barHeight + barGap;
  return { rows, barHeight, barGap, step, viewport: step * rows, stripTop: (step * rows - barHeight) / 2 };
}

function ReelBar({
  name,
  participantIndex,
  palette,
  isWinner = false,
  winnerVisible = false,
  height = BAR_HEIGHT,
  gap = BAR_GAP,
  compact = false,
}) {
  const color = palette[participantIndex % palette.length] ?? palette[0] ?? '#8e1f3f';
  const ink = inkFor(color);
  const showWinner = isWinner && winnerVisible;
  const background = showWinner
    ? `linear-gradient(100deg, ${mixHex(color, '#ffffff', 0.18)} 0%, ${color} 46%, ${shadeHex(color, 0.24)} 100%)`
    : `linear-gradient(100deg, ${color} 0%, ${shadeHex(color, 0.16)} 100%)`;

  return (
    <div
      className={cn(
        'relative flex items-center overflow-hidden rounded-2xl',
        compact ? 'gap-2.5 px-3' : 'gap-3 px-3.5 sm:px-4',
      )}
      style={{
        height,
        marginBottom: gap,
        background,
        color: ink,
        boxShadow: showWinner
          ? '0 0 0 2px var(--accent), inset 0 1px 0 rgba(255,255,255,0.35), 0 22px 40px -20px rgba(0,0,0,0.55)'
          : 'inset 0 1px 0 rgba(255,255,255,0.22)',
      }}
    >
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-xl font-display',
          compact ? 'size-9 text-[0.78rem]' : 'size-10 text-[0.85rem] sm:size-11 sm:text-[0.95rem]',
        )}
        style={{ background: 'rgba(255,255,255,0.24)' }}
      >
        {initials(name)}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate font-display leading-none tracking-tight',
          compact ? 'text-[clamp(1.05rem,2.4vw,1.5rem)]' : 'text-[clamp(1.25rem,3.3vw,1.9rem)]',
        )}
      >
        {name}
      </span>
      {showWinner ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="shrink-0 rounded-full bg-black/25 px-2.5 py-1 text-[0.58rem] font-extrabold uppercase tracking-[0.16em] sm:text-[0.62rem]"
        >
          Ganador
        </motion.span>
      ) : null}
    </div>
  );
}

function AnimatedStrip({
  round,
  duration,
  palette,
  revealed,
  onComplete,
  step,
  stripTop,
  barHeight,
  barGap,
  compact,
}) {
  const y = useMotionValue(0);
  const velocity = useVelocity(y);
  const blurAmount = useTransform(velocity, [-6000, -1500, 0, 1500, 6000], [3, 0.8, 0, 0.8, 3], {
    clamp: true,
  });
  const filter = useMotionTemplate`blur(${blurAmount}px)`;
  const onCompleteRef = useRef(onComplete);

  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    y.set(0);
  }, [y]);

  useEffect(() => {
    const controls = animate(y, -round.targetRow * step, {
      duration,
      ease: [0.09, 0.72, 0.05, 1],
      onComplete: () => onCompleteRef.current?.(),
    });
    return () => controls.stop();
  }, [duration, round.targetRow, step, y]);

  return (
    <motion.div
      className="absolute left-2.5 right-2.5 sm:left-3 sm:right-3"
      style={{ top: stripTop, y, filter, willChange: 'transform, filter' }}
    >
      {round.rows.map((row) => (
        <ReelBar
          key={row.key}
          name={row.name}
          participantIndex={row.participantIndex}
          palette={palette}
          isWinner={row.key === round.targetRow}
          winnerVisible={revealed}
          height={barHeight}
          gap={barGap}
          compact={compact}
        />
      ))}
    </motion.div>
  );
}

function IdleStrip({ participants, palette, rows, step, stripTop, barHeight, barGap, compact }) {
  if (participants.length === 0) {
    return (
      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div>
          <p className="font-display text-base text-ink">Todavía no hay participantes</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">
            Abrí la configuración y pegá tu lista para empezar.
          </p>
        </div>
      </div>
    );
  }

  const offset = Math.floor((rows - 1) / 2);

  return (
    <div
      className="absolute left-2.5 right-2.5 sm:left-3 sm:right-3"
      style={{ top: stripTop - offset * step }}
    >
      {Array.from({ length: rows }, (_, slot) => {
        const participantIndex = slot % participants.length;
        return (
          <ReelBar
            key={slot}
            name={participants[participantIndex]}
            participantIndex={participantIndex}
            palette={palette}
            height={barHeight}
            gap={barGap}
            compact={compact}
          />
        );
      })}
    </div>
  );
}

export function Reel({
  round,
  participants,
  palette,
  duration,
  revealed = false,
  onComplete,
  rows = ROWS,
  barHeight = BAR_HEIGHT,
  barGap = BAR_GAP,
  compact = false,
}) {
  const geometry = reelGeometry({ rows, barHeight, barGap });

  return (
    <div className="relative">
      <div
        className="reel-window relative overflow-hidden rounded-[1.5rem] border border-line"
        style={{ height: geometry.viewport }}
        aria-hidden="true"
      >
        <div className="absolute inset-0">
          {round ? (
            <AnimatedStrip
              key={round.id}
              round={round}
              duration={duration}
              palette={palette}
              revealed={revealed}
              onComplete={onComplete}
              step={geometry.step}
              stripTop={geometry.stripTop}
              barHeight={geometry.barHeight}
              barGap={geometry.barGap}
              compact={compact}
            />
          ) : (
            <IdleStrip
              participants={participants}
              palette={palette}
              rows={geometry.rows}
              step={geometry.step}
              stripTop={geometry.stripTop}
              barHeight={geometry.barHeight}
              barGap={geometry.barGap}
              compact={compact}
            />
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            boxShadow:
              'inset 0 46px 48px -30px var(--reel-shade), inset 0 -46px 48px -30px var(--reel-shade)',
          }}
        />

        <div
          className="pointer-events-none absolute inset-x-1.5 z-30 rounded-2xl border border-accent/55 sm:inset-x-2"
          style={{ top: geometry.stripTop - 4, height: geometry.barHeight + 8 }}
        >
          <span className="absolute -left-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
          <span className="absolute -right-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-6 -bottom-3 h-10 rounded-full bg-[radial-gradient(ellipse_at_center,var(--glow-c),transparent_70%)] blur-md" />
    </div>
  );
}

export { ReelBar };
