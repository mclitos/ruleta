import { test, expect } from '@playwright/test';
import { expectWinnerCount, openApp, readWinners, settledWinner, spin, winnerStatus } from './support/app';

test.describe('ventana de stream', () => {
  test('revela el mismo ganador que la pestaña de control', async ({ page, context }) => {
    await openApp(page);
    const stream = await context.newPage();
    await stream.goto('/?view=stream');
    await expect(stream.getByText('Listo para sortear')).toBeVisible();

    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);

    await expect(stream.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(winnerStatus(stream)).toHaveText(`Ganador: ${name}`);
  });

  test('es sólo lectura: no escribe localStorage y no ofrece girar', async ({ page, context }) => {
    await openApp(page);
    const before = await page.evaluate(() => ({ ...localStorage }));

    const stream = await context.newPage();
    await stream.goto('/?view=stream');
    await expect(stream.getByText('Listo para sortear')).toBeVisible();
    // Enough time for a state broadcast and a heartbeat to land.
    await stream.waitForTimeout(2500);

    await expect(stream.getByRole('button', { name: /Girar/ })).toHaveCount(0);
    await expect(stream.getByRole('button', { name: /Configurar/ })).toHaveCount(0);

    const after = await page.evaluate(() => ({ ...localStorage }));
    expect(after).toEqual(before);
    expect(await readWinners(page)).toHaveLength(0);
  });
});
