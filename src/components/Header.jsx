import { resolveLogoSrc } from '../lib/settings';
import { Monitor, Moon, Sliders, Sun, Volume2, VolumeX } from './icons';
import { Logo } from './Logo';
import { IconButton } from './ui';

export function Header({
  settings,
  spinning,
  onOpenSetup,
  onOpenStream,
  onToggleTheme,
  onToggleSounds,
}) {
  const isDark = settings.theme === 'dark';

  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo
          title={settings.title}
          slogan={settings.slogan}
          logoUrl={resolveLogoSrc(settings)}
          hidden={settings.logoHidden}
          size={42}
        />

        <div className="flex shrink-0 items-center gap-2">
          <IconButton
            label={settings.sounds ? 'Silenciar sonidos' : 'Activar sonidos'}
            onClick={onToggleSounds}
            aria-pressed={settings.sounds}
            className="hidden sm:grid"
          >
            {settings.sounds ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </IconButton>
          <IconButton
            label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            onClick={onToggleTheme}
            aria-pressed={isDark}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <IconButton label="Modo stream" onClick={onOpenStream}>
            <Monitor size={18} />
          </IconButton>
          <button
            type="button"
            onClick={onOpenSetup}
            disabled={spinning}
            className="hidden items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-extrabold text-accent-ink transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
          >
            <Sliders size={16} />
            Configurar
          </button>
        </div>
      </div>
    </header>
  );
}
