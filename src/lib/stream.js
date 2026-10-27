export const STREAM_CHANNEL = 'ruleta-stream:v1';
export const STREAM_VIEW = 'stream';
export const STREAM_HEARTBEAT_MS = 2000;
export const STREAM_TIMEOUT_MS = 6000;

export function isStreamView(search = window.location.search) {
  return new URLSearchParams(search).get('view') === STREAM_VIEW;
}

export function streamUrl(search = window.location.search) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  const base = new URLSearchParams(search);
  base.forEach((value, key) => {
    if (key !== 'view' && key !== 'bg') url.searchParams.set(key, value);
  });
  url.searchParams.set('view', STREAM_VIEW);
  return url.toString();
}

/**
 * Backgrounds the stream window can paint: its own theme, nothing at all
 * (`bg=transparent`, for overlays) or the classic chroma green (`bg=green`,
 * for window capture plus a chroma-key filter in OBS).
 */
export const STREAM_BACKGROUNDS = ['solid', 'transparent', 'green'];

/** Broadcast chroma green: the usual #00B140 key colour. */
export const CHROMA_GREEN = '#00b140';

export function readStreamParams(search = window.location.search) {
  const background = new URLSearchParams(search).get('bg');
  return {
    background: STREAM_BACKGROUNDS.includes(background) ? background : 'solid',
  };
}

/** Returns `url` with the chosen background applied (no `bg` for `solid`). */
export function streamBackgroundUrl(url, background = 'solid') {
  const next = new URL(url);
  if (background === 'solid') next.searchParams.delete('bg');
  else next.searchParams.set('bg', background);
  return next.toString();
}

/**
 * Same-origin channel between the control page and the stream window. Both
 * windows have to live in the same browser profile (second monitor, or OBS
 * window capture); OBS browser sources run a separate browser and cannot see it.
 */
export function createChannel(name = STREAM_CHANNEL) {
  if (typeof BroadcastChannel !== 'function') return null;
  try {
    return new BroadcastChannel(name);
  } catch {
    return null;
  }
}
