import { useEffect } from 'react';

const THEME_COLORS = {
  dark: '#070714',
  light: '#f4f1ea',
};

export function useTheme(theme) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[theme] ?? THEME_COLORS.dark);
  }, [theme]);
}
