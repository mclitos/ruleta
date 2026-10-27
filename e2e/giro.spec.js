import { test, expect } from '@playwright/test';
import {
  CHANNEL_NAME,
  PARTICIPANTS,
  expectWinnerCount,
  openApp,
  readSettings,
  readWinners,
  settledWinner,
  spin,
} from './support/app';

test.describe('giro completo', () => {
  test('revela un ganador y lo registra una sola vez', async ({ page }) => {
    await openApp(page);
    await spin(page);
    await expectWinnerCount(page, 1);

    const name = await settledWinner(page);
    expect(PARTICIPANTS).toContain(name);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);

    const [entry] = await readWinners(page);
    expect(entry.name).toBe(name);
    expect(entry.at).toBeGreaterThan(0);

    await expect(page.locator('ol li').first()).toContainText(name);
    await expect(page.getByText('1 guardado')).toBeVisible();

    // The reel, the control tab and the stream all close the same round; the
    // registration must stay idempotent once the animation settled.
    await page.waitForTimeout(1200);
    await expectWinnerCount(page, 1);
  });

  test('el historial y los ajustes sobreviven a recargar', async ({ page }) => {
    await openApp(page);
    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Listo para sortear');

    const winners = await readWinners(page);
    expect(winners).toHaveLength(1);
    expect(winners[0].name).toBe(name);
    await expect(page.locator('ol li').first()).toContainText(name);

    const settings = await readSettings(page);
    expect(settings.participants).toEqual(PARTICIPANTS);
    expect(settings.spinMin).toBe(1);
    expect(settings.spinMax).toBe(1);
  });

  test('con autoRemove activo el ganador sale de la lista', async ({ page }) => {
    await openApp(page, { autoRemove: true });
    await expect(page.getByText('3 participantes en juego')).toBeVisible();

    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);

    const settings = await readSettings(page);
    expect(settings.participants).toHaveLength(2);
    expect(settings.participants).not.toContain(name);
    await expect(page.getByText('2 participantes en juego')).toBeVisible();
  });

  test('con autoRemove apagado la lista queda igual', async ({ page }) => {
    await openApp(page, { autoRemove: false });
    await spin(page);
    await expectWinnerCount(page, 1);
    await settledWinner(page);

    const settings = await readSettings(page);
    expect(settings.participants).toEqual(PARTICIPANTS);
    await expect(page.getByText('3 participantes en juego')).toBeVisible();
  });

  test('cada giro sortea una duración dentro del rango configurado', async ({ page }) => {
    await openApp(page, { spinMin: 1, spinMax: 1.5 });

    // A second BroadcastChannel object in the same page receives its own tab's
    // messages, so the suite can observe the real spun duration.
    await page.evaluate((name) => {
      window.__durations = [];
      window.__channel = new BroadcastChannel(name);
      window.__channel.addEventListener('message', (event) => {
        if (event.data?.type === 'round') window.__durations.push(event.data.duration);
      });
    }, CHANNEL_NAME);

    await spin(page);
    await expectWinnerCount(page, 1);
    await spin(page);
    await expectWinnerCount(page, 2);

    const durations = await page.evaluate(() => window.__durations);
    expect(durations).toHaveLength(2);
    for (const duration of durations) {
      expect(duration).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThanOrEqual(1.5);
    }
  });

  test('la barra espaciadora gira igual que el botón', async ({ page }) => {
    await openApp(page);
    await page.keyboard.press('Space');
    await expectWinnerCount(page, 1);
    await settledWinner(page);
  });

  test('con la lista vacía el botón queda deshabilitado', async ({ page }) => {
    await openApp(page, { participants: [] });
    const button = page.getByRole('button', { name: 'Girar ruleta' });
    await expect(button).toBeDisabled();
    await expect(page.getByText('Agregá participantes en la configuración para poder girar.')).toBeVisible();
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);
    expect(await readWinners(page)).toHaveLength(0);
  });
});
