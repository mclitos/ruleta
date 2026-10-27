export function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

const MAX_PARTICIPANTS = 5000;
const MAX_NAME_LENGTH = 120;

export function parseParticipants(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, MAX_PARTICIPANTS)
    .map((name) => name.slice(0, MAX_NAME_LENGTH));
}

export function initials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase();
  return null;
}

function hexToRgb(hex) {
  const value = normalizeHex(hex);
  if (!value) return null;
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function toHexChannel(value) {
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, '0');
}

export function mixHex(a, b, amount) {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  if (!from || !to) return a;
  const t = clamp(amount, 0, 1);
  return `#${toHexChannel(from[0] + (to[0] - from[0]) * t)}${toHexChannel(
    from[1] + (to[1] - from[1]) * t,
  )}${toHexChannel(from[2] + (to[2] - from[2]) * t)}`;
}

export function shadeHex(hex, amount) {
  return mixHex(hex, '#000000', amount);
}

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const DARK_INK = '#1b1338';
const LIGHT_INK = '#ffffff';
const DARK_INK_LUMINANCE = 0.012;

/**
 * Picks white or deep ink for a bar, whichever has the higher contrast ratio.
 */
export function inkFor(hex) {
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  const luminance = relativeLuminance(rgb);
  const contrastWhite = 1.05 / (luminance + 0.05);
  const contrastDark = (luminance + 0.05) / (DARK_INK_LUMINANCE + 0.05);
  return contrastDark >= contrastWhite ? DARK_INK : LIGHT_INK;
}

export function secureRandomIndex(max) {
  if (!Number.isFinite(max) || max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (!cryptoApi?.getRandomValues) return Math.floor(Math.random() * max);
  const buffer = new Uint32Array(1);
  let value = 0;
  do {
    cryptoApi.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
}

const timeFormatter = new Intl.DateTimeFormat('es', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatTime(timestamp) {
  try {
    return timeFormatter.format(timestamp);
  } catch {
    return '';
  }
}

function legacyCopy(text) {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copies text to the clipboard. `navigator.clipboard` only exists in a secure
 * context, so plain-HTTP LAN access falls back to the legacy selection trick.
 */
export function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => legacyCopy(text),
    );
  }
  return Promise.resolve(legacyCopy(text));
}
