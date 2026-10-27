import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

export function BrandMark({ size = 46, className }) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl',
        className,
      )}
      style={{
        width: size,
        height: size,
        background:
          'linear-gradient(140deg, #ffcf3f 0%, #e11d2e 52%, #7c3aed 100%)',
        boxShadow: '0 14px 30px -14px rgba(225, 29, 46, 0.75)',
      }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.55),transparent_55%)]" />
      <span className="relative flex flex-col items-center gap-[3px]">
        <span className="block h-[3px] w-3.5 rounded-full bg-white/60" />
        <span className="block h-[3px] w-5 rounded-full bg-white" />
        <span className="block h-[3px] w-3.5 rounded-full bg-white/45" />
      </span>
    </span>
  );
}

export function Logo({ title, slogan, logoUrl, hidden = false, size = 46 }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(logoUrl) && !broken;

  // A new source deserves a fresh chance even if the previous one failed.
  useEffect(() => {
    setBroken(false);
  }, [logoUrl]);

  return (
    <div className="flex min-w-0 items-center gap-3">
      {showImage ? (
        <img
          src={logoUrl}
          alt=""
          width={size}
          height={size}
          onError={() => setBroken(true)}
          className="shrink-0 rounded-2xl border border-line bg-surface-2 object-contain"
          style={{ width: size, height: size }}
        />
      ) : hidden ? null : (
        <BrandMark size={size} />
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-[0.95rem] leading-tight tracking-[0.06em] text-ink sm:text-base">
          {title}
        </p>
        {slogan ? (
          <p className="truncate text-xs font-medium text-ink-soft">{slogan}</p>
        ) : null}
      </div>
    </div>
  );
}
