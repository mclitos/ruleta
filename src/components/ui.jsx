import { cn } from '../lib/utils';

export function Section({ icon, title, hint, action, children, className }) {
  return (
    <section className={cn('space-y-3', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 grid size-7 place-items-center rounded-lg bg-accent/12 text-accent">
              {icon}
            </span>
          ) : null}
          <div>
            <h3 className="text-sm font-extrabold tracking-wide text-ink">{title}</h3>
            {hint ? <p className="mt-0.5 text-xs font-medium text-ink-soft">{hint}</p> : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Switch({ checked, onChange, label, description, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center justify-between gap-4 rounded-xl border border-line/70 bg-surface-2/60 px-3.5 py-3 text-left transition',
        'hover:border-line hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs font-medium leading-snug text-ink-soft">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200',
          checked ? 'border-transparent bg-accent' : 'border-line bg-surface',
        )}
      >
        <span
          className={cn(
            'absolute size-4 rounded-full shadow transition-all duration-200',
            checked ? 'left-[1.55rem] bg-accent-ink' : 'left-[0.22rem] bg-ink-soft',
          )}
        />
      </span>
    </button>
  );
}

export function GhostButton({ className, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2 text-sm font-bold text-ink transition',
        'hover:border-ink-soft/40 hover:bg-surface-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-10 place-items-center rounded-xl border border-line bg-surface-2/60 text-ink-soft transition',
        'hover:border-ink-soft/40 hover:text-ink active:translate-y-px',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
