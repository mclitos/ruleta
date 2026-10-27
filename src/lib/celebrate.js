import confetti from 'canvas-confetti';

let firedAt = 0;

export function celebrate(colors, { enabled = true } = {}) {
  if (!enabled) return;
  const now = Date.now();
  if (now - firedAt < 1200) return;
  firedAt = now;

  const base = {
    colors,
    disableForReducedMotion: true,
    zIndex: 90,
    scalar: 1.05,
  };

  confetti({
    ...base,
    particleCount: 130,
    spread: 78,
    startVelocity: 46,
    gravity: 0.95,
    ticks: 220,
    origin: { x: 0.5, y: 0.42 },
  });

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 62,
      angle: 58,
      spread: 62,
      startVelocity: 52,
      origin: { x: 0.02, y: 0.72 },
    });
  }, 160);

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 62,
      angle: 122,
      spread: 62,
      startVelocity: 52,
      origin: { x: 0.98, y: 0.72 },
    });
  }, 280);
}
