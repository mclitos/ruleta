import { test, expect } from '@playwright/test';
import { expectWinnerCount, openApp, settledWinner, spin } from './support/app';

test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('el giro igual revela un ganador', async ({ page }) => {
    await openApp(page);
    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  });
});

test.describe('anuncio para lectores de pantalla', () => {
  test('el ganador se anuncia por una región aria-live', async ({ page }) => {
    await openApp(page);
    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);

    // The winners panel also owns a (silent) status region, so match the one
    // that actually carries the announcement.
    const live = page.locator('p[role="status"][aria-live="polite"]', { hasText: 'Ganador:' });
    await expect(live).toHaveCount(1);
    await expect(live).toHaveText(`Ganador: ${name}`);
  });
});
