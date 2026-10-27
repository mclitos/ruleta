import { MAX_NAME_LENGTH } from './utils';

export const WINNERS_KEY = 'ruleta-rifas:winners:v1';

/** Keeps `localStorage` small: sorted draws are history, not an audit log. */
export const MAX_WINNERS = 500;

const MAX_ID_LENGTH = 64;

/**
 * A new id per recorded winner. Round ids restart at 1 on every reload, so they
 * cannot key the list: a persisted entry and a fresh one would collide.
 */
export function createWinnerId(seed = 0) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `w-${Date.now()}-${seed}`;
}

/**
 * Everything that comes out of `localStorage` is untrusted: hand-edited storage,
 * an old build with another shape, or a truncated write.
 */
export function sanitizeWinners(input) {
  if (!Array.isArray(input)) return [];

  const seen = new Set();
  const winners = [];

  input.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;

    const name =
      typeof entry.name === 'string'
        ? entry.name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH)
        : '';
    if (!name) return;

    const at = Number(entry.at);
    if (!Number.isFinite(at) || at <= 0) return;

    let id =
      typeof entry.id === 'string' && entry.id.trim()
        ? entry.id.trim().slice(0, MAX_ID_LENGTH)
        : `${at}-${index}`;
    // React keys must stay unique even if storage repeated an id.
    if (seen.has(id)) {
      let suffix = index;
      while (seen.has(`${id}-${suffix}`)) suffix += 1;
      id = `${id}-${suffix}`;
    }
    seen.add(id);

    winners.push({ id, name, at });
  });

  return winners.slice(0, MAX_WINNERS);
}

/** Newest first, so the panel renders in the order it already assumes. */
export function prependWinner(winners, entry) {
  return [entry, ...winners].slice(0, MAX_WINNERS);
}
