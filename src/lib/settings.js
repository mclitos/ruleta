import { LOGO_DATA_PATTERN, LOGO_INLINE_MAX_CHARS } from './logo.js';
import { clamp, normalizeHex, parseParticipants } from './utils.js';

export const STORAGE_KEY = 'ruleta-rifas:settings:v1';

export const DEFAULT_PALETTE = [
  '#8e1f3f',
  '#e11d2e',
  '#f97316',
  '#f5b800',
  '#17a34a',
  '#2563eb',
  '#7c3aed',
];

export const MAX_PALETTE_SIZE = 12;

export const PALETTE_PRESETS = [
  { id: 'clasica', name: 'Clásica', colors: DEFAULT_PALETTE },
  {
    id: 'fiesta',
    name: 'Fiesta',
    colors: ['#ff2d6f', '#ff7a00', '#ffc400', '#2bc46a', '#00c2d1', '#7b5cff'],
  },
  {
    id: 'joya',
    name: 'Joya',
    colors: ['#7f1d3d', '#b3261e', '#c2410c', '#a16207', '#15803d', '#1d4ed8', '#5b21b6'],
  },
  {
    id: 'neon',
    name: 'Neón',
    colors: ['#ff006e', '#fb5607', '#ffbe0b', '#22d3a7', '#00b4d8', '#8338ec'],
  },
  {
    id: 'oceano',
    name: 'Océano',
    colors: ['#0f766e', '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', '#0e7490'],
  },
];

export const SUGGESTED_COLORS = [
  '#ff2d6f',
  '#f97316',
  '#ffd400',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#84cc16',
  '#f43f5e',
  '#14b8a6',
  '#8b5cf6',
];

export const DEFAULT_PARTICIPANTS = [
  'Valentina Ríos',
  'Mateo Fernández',
  'Camila Torres',
  'Santiago Vega',
  'Lucía Herrera',
  'Joaquín Medina',
  'Isabella Cruz',
  'Emiliano Rojas',
  'Martina Silva',
  'Benjamín Castro',
  'Sofía Navarro',
  'Thiago Morales',
  'Renata Ortiz',
  'Alejandro Peña',
  'Mía Delgado',
  'Tomás Aguirre',
];

/** Default spin window, in seconds, and the widest range the sliders allow. */
export const DEFAULT_SPIN_MIN = 3;
export const DEFAULT_SPIN_MAX = 5;
export const SPIN_FLOOR = 1;
export const SPIN_CEILING = 15;
export const SPIN_STEP = 0.5;

/** Rounds to the slider step so stored values always sit on a legal tick. */
function snapSpin(value) {
  return Math.round(value / SPIN_STEP) * SPIN_STEP;
}

export function randomSpinDuration(min = DEFAULT_SPIN_MIN, max = DEFAULT_SPIN_MAX) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.random() * (high - low);
}

export const DEFAULT_SETTINGS = {
  version: 1,
  theme: 'dark',
  sounds: true,
  volume: 0.7,
  confetti: true,
  autoRemove: true,
  spinMin: DEFAULT_SPIN_MIN,
  spinMax: DEFAULT_SPIN_MAX,
  logoUrl: '',
  logoData: '',
  logoHidden: false,
  title: 'RULETA DE RIFAS',
  slogan: 'Un giro. Un ganador.',
  palette: DEFAULT_PALETTE,
  participants: DEFAULT_PARTICIPANTS,
};

/** Reads the saved settings without ever writing them back (read-only views). */
export function loadStoredSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function isAllowedLogoUrl(value) {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url) return true;
  if (/^https?:\/\//i.test(url)) return true;
  return /^\/(?!\/)/.test(url);
}

function sanitizeLogoUrl(value) {
  if (typeof value !== 'string') return '';
  const url = value.trim().slice(0, 2048);
  return isAllowedLogoUrl(url) ? url : '';
}

/**
 * Inline logo uploaded from a local file. Kept separate from `logoUrl` so the
 * URL field stays short and the image can be cleared without touching it.
 */
function sanitizeLogoData(value) {
  if (typeof value !== 'string') return '';
  const data = value.trim();
  if (data.length > LOGO_INLINE_MAX_CHARS) return '';
  return LOGO_DATA_PATTERN.test(data) ? data : '';
}

/** What the header and the stream should actually render. */
export function resolveLogoSrc(settings) {
  if (!settings || settings.logoHidden) return '';
  return settings.logoData || settings.logoUrl || '';
}

function sanitizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function sanitizeNumber(value, fallback, min, max) {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

export function sanitizePalette(input) {
  const source = Array.isArray(input) ? input : DEFAULT_PALETTE;
  const palette = [];
  for (const candidate of source) {
    const color = normalizeHex(candidate);
    if (color && !palette.includes(color)) palette.push(color);
    if (palette.length >= MAX_PALETTE_SIZE) break;
  }
  return palette.length > 0 ? palette : [...DEFAULT_PALETTE];
}

export function sanitizeSettings(input) {
  const source = input && typeof input === 'object' ? input : {};

  const rawParticipants = Array.isArray(source.participants)
    ? source.participants.filter((name) => typeof name === 'string').join('\n')
    : null;
  const participants =
    rawParticipants === null ? DEFAULT_SETTINGS.participants : parseParticipants(rawParticipants);

  const spinMin = snapSpin(
    sanitizeNumber(source.spinMin, DEFAULT_SETTINGS.spinMin, SPIN_FLOOR, SPIN_CEILING),
  );
  // A stored max below the min (hand-edited storage) pins both to the min.
  const spinMax = Math.max(
    spinMin,
    snapSpin(sanitizeNumber(source.spinMax, DEFAULT_SETTINGS.spinMax, SPIN_FLOOR, SPIN_CEILING)),
  );

  const rawTitle = typeof source.title === 'string' ? source.title.trim().slice(0, 80) : '';
  const rawSlogan = typeof source.slogan === 'string' ? source.slogan.trim().slice(0, 140) : '';

  return {
    version: 1,
    theme: source.theme === 'light' ? 'light' : 'dark',
    sounds: sanitizeBoolean(source.sounds, DEFAULT_SETTINGS.sounds),
    volume: sanitizeNumber(source.volume, DEFAULT_SETTINGS.volume, 0, 1),
    confetti: sanitizeBoolean(source.confetti, DEFAULT_SETTINGS.confetti),
    autoRemove: sanitizeBoolean(source.autoRemove, DEFAULT_SETTINGS.autoRemove),
    spinMin,
    spinMax,
    logoUrl: sanitizeLogoUrl(source.logoUrl),
    logoData: sanitizeLogoData(source.logoData),
    logoHidden: sanitizeBoolean(source.logoHidden, DEFAULT_SETTINGS.logoHidden),
    title: rawTitle || DEFAULT_SETTINGS.title,
    slogan: typeof source.slogan === 'string' ? rawSlogan : DEFAULT_SETTINGS.slogan,
    palette: sanitizePalette(source.palette),
    participants,
  };
}
