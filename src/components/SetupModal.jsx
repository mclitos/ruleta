import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DEFAULT_PARTICIPANTS,
  DEFAULT_SETTINGS,
  MAX_PALETTE_SIZE,
  PALETTE_PRESETS,
  SPIN_CEILING,
  SPIN_FLOOR,
  SPIN_STEP,
  SUGGESTED_COLORS,
  isAllowedLogoUrl,
} from '../lib/settings';
import { logoFromFile } from '../lib/logo';
import { cn, normalizeHex, parseParticipants } from '../lib/utils';
import {
  ArrowUpDown,
  Check,
  Eraser,
  ImageIcon,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Trash,
  Upload,
  Users,
  X,
} from './icons';
import { BrandMark } from './Logo';
import { GhostButton, Section, Switch } from './ui';

/** `3.5` -> `3,5` (es-AR decimals), `4` -> `4`. */
function formatSeconds(value) {
  return String(value).replace('.', ',');
}

function LogoPreview({ src }) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) return <BrandMark size={34} className="rounded-lg" />;

  return (
    <img src={src} alt="" className="size-full object-contain" onError={() => setBroken(true)} />
  );
}

function QuickAction({ children, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink-soft transition hover:border-ink-soft/40 hover:text-ink"
    >
      {icon}
      {children}
    </button>
  );
}

function SetupDialog({ settings, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({
    ...settings,
    participantsText: settings.participants.join('\n'),
  }));
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoFileError, setLogoFileError] = useState('');
  const firstFieldRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 120);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const parsed = useMemo(() => parseParticipants(draft.participantsText), [draft.participantsText]);
  const uniqueCount = useMemo(() => new Set(parsed.map((name) => name.toLowerCase())).size, [parsed]);
  const logoError = draft.logoUrl.trim() !== '' && !isAllowedLogoUrl(draft.logoUrl.trim());
  const canSave = parsed.length > 0 && !logoError;
  const logoSource = draft.logoData || (logoError ? '' : draft.logoUrl.trim());

  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0];
    // Let the same file be picked again after a failed attempt.
    event.target.value = '';
    if (!file) return;

    setLogoBusy(true);
    setLogoFileError('');
    try {
      const data = await logoFromFile(file);
      update({ logoData: data, logoHidden: false });
    } catch (error) {
      setLogoFileError(
        error instanceof Error ? error.message : 'No pudimos cargar esa imagen.',
      );
    } finally {
      setLogoBusy(false);
    }
  };

  const setPalette = (palette) => update({ palette });

  const addColor = (color) => {
    if (draft.palette.length >= MAX_PALETTE_SIZE) return;
    if (draft.palette.includes(color)) return;
    setPalette([...draft.palette, color]);
  };

  const removeColor = (index) => {
    if (draft.palette.length <= 1) return;
    setPalette(draft.palette.filter((_, position) => position !== index));
  };

  const updateColor = (index, value) => {
    const color = normalizeHex(value);
    if (!color) return;
    setPalette(draft.palette.map((item, position) => (position === index ? color : item)));
  };

  const sortParticipants = () => {
    const sorted = [...parsed].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    update({ participantsText: sorted.join('\n') });
  };

  const dedupeParticipants = () => {
    const seen = new Set();
    const unique = parsed.filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    update({ participantsText: unique.join('\n') });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    const { participantsText, ...rest } = draft;
    onSave({
      ...rest,
      title: rest.title.trim() || DEFAULT_SETTINGS.title,
      slogan: rest.slogan.trim(),
      logoUrl: rest.logoUrl.trim(),
      palette: rest.palette.length > 0 ? rest.palette : DEFAULT_SETTINGS.palette,
      participants: parsed,
    });
  };

  const resetAll = () => {
    setDraft({
      ...DEFAULT_SETTINGS,
      participantsText: DEFAULT_PARTICIPANTS.join('\n'),
    });
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
        aria-labelledby="setup-title"
        className="card relative flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-b-none border-b-0 sm:max-h-[90dvh] sm:rounded-3xl sm:border-b"
        initial={{ y: 48, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-accent">
              Configuración
            </p>
            <h2 id="setup-title" className="font-display text-lg tracking-tight text-ink">
              Tu sorteo, a tu manera
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar configuración"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2/60 text-ink-soft transition hover:text-ink"
          >
            <X size={17} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-7">
            <Section icon={<Sparkles size={15} />} title="Identidad" hint="Se muestra arriba de la ruleta.">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                <label className="block">
                  <span className="label">Título</span>
                  <input
                    ref={firstFieldRef}
                    type="text"
                    className="field"
                    maxLength={80}
                    value={draft.title}
                    onChange={(event) => update({ title: event.target.value })}
                    placeholder="RULETA DE RIFAS"
                  />
                </label>
                <label className="block">
                  <span className="label">Frase</span>
                  <input
                    type="text"
                    className="field"
                    maxLength={140}
                    value={draft.slogan}
                    onChange={(event) => update({ slogan: event.target.value })}
                    placeholder="Un giro. Un ganador."
                  />
                </label>
              </div>

              <div className="flex items-end gap-3">
                <label className="block min-w-0 flex-1">
                  <span className="label">
                    <ImageIcon size={12} className="mr-1 inline align-[-1px]" />
                    Logo (URL)
                  </span>
                  <input
                    type="text"
                    inputMode="url"
                    className={cn('field', logoError && 'border-danger ring-2 ring-danger/20')}
                    value={draft.logoUrl}
                    onChange={(event) => update({ logoUrl: event.target.value, logoData: '' })}
                    placeholder="https://… o /logo.png"
                    spellCheck={false}
                  />
                </label>
                <div className="mb-0.5 grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2">
                  <LogoPreview src={logoSource} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <GhostButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoBusy}
                >
                  <Upload size={14} />
                  {logoBusy ? 'Procesando…' : 'Subir archivo'}
                </GhostButton>
                {draft.logoData ? (
                  <GhostButton type="button" onClick={() => update({ logoData: '' })}>
                    <Trash size={14} />
                    Quitar archivo
                  </GhostButton>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoFile}
                />
              </div>

              <Switch
                checked={draft.logoHidden}
                onChange={(value) => update({ logoHidden: value })}
                label="Ocultar logo"
                description="Mostramos sólo el título y la frase."
              />

              {logoError ? (
                <p className="text-[11px] font-bold text-danger">
                  Usá una URL https o una ruta interna que empiece con /.
                </p>
              ) : logoFileError ? (
                <p className="text-[11px] font-bold text-danger">{logoFileError}</p>
              ) : (
                <p className="text-[11px] font-medium text-ink-soft">
                  {draft.logoData
                    ? 'Usamos el archivo que subiste. Si escribís una URL, la reemplaza.'
                    : 'Subí una imagen o pegá una URL. Si está vacío usamos el logo de la ruleta.'}
                </p>
              )}
            </Section>

            <Section
              icon={<Users size={15} />}
              title="Participantes"
              hint="Un nombre por línea. Hasta 5000."
              action={
                <span className="rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-extrabold tabular-nums text-ink">
                  {parsed.length}
                </span>
              }
            >
              <textarea
                className="field min-h-44 resize-y leading-relaxed"
                value={draft.participantsText}
                onChange={(event) => update({ participantsText: event.target.value })}
                placeholder={'Valentina Ríos\nMateo Fernández\nCamila Torres'}
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <QuickAction onClick={sortParticipants} icon={<ArrowUpDown size={12} />}>
                  Ordenar A–Z
                </QuickAction>
                <QuickAction onClick={dedupeParticipants} icon={<Check size={12} />}>
                  Quitar duplicados
                </QuickAction>
                <QuickAction
                  onClick={() => update({ participantsText: DEFAULT_PARTICIPANTS.join('\n') })}
                  icon={<RotateCcw size={12} />}
                >
                  Lista demo
                </QuickAction>
                <QuickAction
                  onClick={() => update({ participantsText: '' })}
                  icon={<Eraser size={12} />}
                >
                  Vaciar
                </QuickAction>
                {uniqueCount !== parsed.length ? (
                  <span className="ml-auto text-[11px] font-bold text-ink-soft">
                    {uniqueCount} únicos
                  </span>
                ) : null}
              </div>
            </Section>

            <Section
              icon={<Palette size={15} />}
              title="Paleta"
              hint="Los colores se reparten entre los participantes."
              action={
                <span className="text-[11px] font-bold tabular-nums text-ink-soft">
                  {draft.palette.length}/{MAX_PALETTE_SIZE}
                </span>
              }
            >
              <div className="flex flex-wrap gap-2">
                {PALETTE_PRESETS.map((preset) => {
                  const active = preset.colors.join() === draft.palette.join();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPalette([...preset.colors])}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition',
                        active
                          ? 'border-accent bg-accent/10 text-ink'
                          : 'border-line bg-surface text-ink-soft hover:text-ink',
                      )}
                    >
                      <span className="flex gap-0.5">
                        {preset.colors.slice(0, 4).map((color) => (
                          <span
                            key={color}
                            className="size-2.5 rounded-full"
                            style={{ background: color }}
                          />
                        ))}
                      </span>
                      {preset.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {draft.palette.map((color, index) => (
                  <div key={`${color}-${index}`} className="group relative">
                    <input
                      type="color"
                      className="swatch"
                      value={color}
                      onChange={(event) => updateColor(index, event.target.value)}
                      aria-label={`Color ${index + 1}`}
                    />
                    {draft.palette.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeColor(index)}
                        aria-label={`Quitar color ${color}`}
                        className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-line bg-surface text-ink-soft opacity-0 transition hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X size={11} />
                      </button>
                    ) : null}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addColor(SUGGESTED_COLORS[draft.palette.length % SUGGESTED_COLORS.length])}
                  disabled={draft.palette.length >= MAX_PALETTE_SIZE}
                  aria-label="Agregar color"
                  className="grid size-[2.4rem] place-items-center rounded-[0.7rem] border border-dashed border-line text-ink-soft transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => addColor(color)}
                    aria-label={`Agregar ${color}`}
                    className="size-6 rounded-lg border border-line/60 transition hover:scale-110"
                    style={{ background: color }}
                  />
                ))}
              </div>
            </Section>

            <Section icon={<Sliders size={15} />} title="Ambiente" hint="Todo se guarda en este navegador.">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dark', label: 'Oscuro', icon: <Moon size={15} /> },
                  { id: 'light', label: 'Claro', icon: <Sun size={15} /> },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => update({ theme: option.id })}
                    aria-pressed={draft.theme === option.id}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition',
                      draft.theme === option.id
                        ? 'border-accent bg-accent/10 text-ink'
                        : 'border-line bg-surface-2/60 text-ink-soft hover:text-ink',
                    )}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>

              <Switch
                label="Sonidos"
                description="Ticks, whoosh y fanfarria sintetizados."
                checked={draft.sounds}
                onChange={(value) => update({ sounds: value })}
              />

              <div className={cn('rounded-xl border border-line/70 bg-surface-2/60 px-3.5 py-3', !draft.sounds && 'opacity-50')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Volumen</span>
                  <span className="text-xs font-extrabold tabular-nums text-ink-soft">
                    {Math.round(draft.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={draft.volume}
                  disabled={!draft.sounds}
                  onChange={(event) => update({ volume: Number(event.target.value) })}
                  aria-label="Volumen de sonidos"
                  className="mt-2"
                />
              </div>

              <Switch
                label="Confeti"
                description="Explosión de papelitos al revelar al ganador."
                checked={draft.confetti}
                onChange={(value) => update({ confetti: value })}
              />

              <Switch
                label="Quitar ganador de la lista"
                description="El nombre sorteado no vuelve a participar."
                checked={draft.autoRemove}
                onChange={(value) => update({ autoRemove: value })}
              />

              <div className="rounded-xl border border-line/70 bg-surface-2/60 px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-ink">Duración del giro</span>
                  <span className="text-xs font-extrabold tabular-nums text-ink-soft">
                    {formatSeconds(draft.spinMin)}–{formatSeconds(draft.spinMax)} s
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-ink-soft">
                  Cada giro elige un tiempo aleatorio entre el mínimo y el máximo.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                      Mínimo
                      <span className="normal-case tabular-nums text-ink">{formatSeconds(draft.spinMin)} s</span>
                    </span>
                    <input
                      type="range"
                      min={SPIN_FLOOR}
                      max={SPIN_CEILING}
                      step={SPIN_STEP}
                      value={draft.spinMin}
                      onChange={(event) => {
                        const spinMin = Number(event.target.value);
                        update({ spinMin, spinMax: Math.max(spinMin, draft.spinMax) });
                      }}
                      aria-label="Duración mínima del giro en segundos"
                      className="mt-1.5"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                      Máximo
                      <span className="normal-case tabular-nums text-ink">{formatSeconds(draft.spinMax)} s</span>
                    </span>
                    <input
                      type="range"
                      min={SPIN_FLOOR}
                      max={SPIN_CEILING}
                      step={SPIN_STEP}
                      value={draft.spinMax}
                      onChange={(event) => {
                        const spinMax = Number(event.target.value);
                        update({ spinMax, spinMin: Math.min(spinMax, draft.spinMin) });
                      }}
                      aria-label="Duración máxima del giro en segundos"
                      className="mt-1.5"
                    />
                  </label>
                </div>
              </div>
            </Section>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 bg-surface/80 px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-soft transition hover:text-danger"
            >
              <Trash size={13} />
              Restablecer todo
            </button>
            <div className="flex flex-1 justify-end gap-2">
              <GhostButton onClick={onClose} className="px-4">
                Cancelar
              </GhostButton>
              <button
                type="submit"
                disabled={!canSave}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-extrabold text-accent-ink transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={16} />
                Guardar
              </button>
            </div>
          </footer>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function SetupModal({ open, settings, onClose, onSave }) {
  return (
    <AnimatePresence>
      {open ? (
        <SetupDialog key="setup" settings={settings} onClose={onClose} onSave={onSave} />
      ) : null}
    </AnimatePresence>
  );
}
