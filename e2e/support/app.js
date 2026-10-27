import { expect } from '@playwright/test';

export const SETTINGS_KEY = 'ruleta-rifas:settings:v1';
export const WINNERS_KEY = 'ruleta-rifas:winners:v1';
export const CHANNEL_NAME = 'ruleta-stream:v1';

export const PARTICIPANTS = ['Martina Herrera Ríos', 'Lucía Benítez', 'Camila Duarte'];

/**
 * Shortest legal spin so the suite stays fast: the product floor is 1 s and the
 * range may not be inverted.
 */
export const FAST_SETTINGS = {
  autoRemove: false,
  sounds: false,
  confetti: false,
  participants: PARTICIPANTS,
  spinMin: 1,
  spinMax: 1,
};

/**
 * Seeds settings before the app boots. It only writes when the key is missing so
 * a `reload()` inside a test still tests what the app itself persisted.
 */
export async function openApp(page, overrides = {}) {
  await page.addInitScript(
    ({ key, seed }) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(seed));
      }
    },
    { key: SETTINGS_KEY, seed: { ...FAST_SETTINGS, ...overrides } },
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Listo para sortear');
}

export function spin(page) {
  return page.getByRole('button', { name: /^Girar/ }).click();
}

export function winnerStatus(page) {
  return page.locator('p[role="status"]', { hasText: 'Ganador:' });
}

export async function readSettings(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SETTINGS_KEY);
}

export async function readWinners(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), WINNERS_KEY);
}

/** The round closes on animation end, so wait for the stored count, not for the click. */
export async function expectWinnerCount(page, count) {
  await expect.poll(async () => (await readWinners(page)).length, { timeout: 15_000 }).toBe(count);
}

/** Returns the announced winner after the round settled, and checks it matches storage. */
export async function settledWinner(page, index = 0) {
  const winners = await readWinners(page);
  const winner = winners[index];
  await expect(winnerStatus(page)).toHaveText(`Ganador: ${winner.name}`);
  return winner.name;
}
