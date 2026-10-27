import { test, expect } from '@playwright/test';
import {
  expectWinnerCount,
  openApp,
  readWinners,
  settledWinner,
  spin,
  winnerStatus,
} from './support/app';

async function saveParticipants(page, names, { reset = true } = {}) {
  await page.bringToFront();
  await page.getByRole('button', { name: 'Configurar sorteo' }).click();
  const dialog = page.getByRole('dialog');
  const textarea = dialog.locator('textarea');
  const text = names.join('\n');
  // `fill` sets the value from JS and some runs drop the event entirely.
  // Real keyboard input always reaches the controlled textarea.
  await textarea.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(text);
  // Prove the draft took it before saving: otherwise the test would assert on a
  // save that never happened.
  await expect(textarea).toHaveValue(text);
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
  // Wait for the commit that owns the reset before the caller asserts on it.
  if (reset) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Listo para sortear');
  }
}

test.describe('nueva rifa', () => {
  test('renovar la lista vuelve la ruleta a cero y conserva el historial', async ({
    page,
    context,
  }) => {
    await openApp(page);
    const stream = await context.newPage();
    await stream.goto('/?view=stream');

    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);
    await expect(stream.locator('h1')).toHaveText(name);

    await saveParticipants(page, ['Ana Uno', 'Beto Dos']);

    // The control owns the state machine: a finished round belongs to the list
    // that produced it, so saving a different list closes it.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Listo para sortear');
    await expect(stream.getByText('Listo para sortear')).toBeVisible();
    await expect(stream.locator('h1')).toHaveCount(0);
    await expect(winnerStatus(stream)).toHaveCount(0);

    // The winner is history now, not a live result.
    expect(await readWinners(page)).toHaveLength(1);
    await expect(page.getByText('2 participantes en juego')).toBeVisible();
    await expect(page.getByText('1 guardado')).toBeVisible();
  });

  test('un stream abierto después de renovar la lista no revive al ganador anterior', async ({
    page,
    context,
  }) => {
    await openApp(page);
    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);

    await saveParticipants(page, ['Ana Uno', 'Beto Dos']);

    // A `ready` handshake replays the live round so a window opened mid-round
    // catches up. A closed round must not be replayed forever.
    const stream = await context.newPage();
    await stream.goto('/?view=stream');
    await expect(stream.getByText('Listo para sortear')).toBeVisible();
    await stream.waitForTimeout(2500);
    await expect(stream.locator('h1')).toHaveCount(0);
    await expect(stream.getByText(name)).toHaveCount(0);
  });

  test('después de renovar la lista se puede sortear la rifa nueva', async ({ page, context }) => {
    await openApp(page);
    const stream = await context.newPage();
    await stream.goto('/?view=stream');

    await spin(page);
    await expectWinnerCount(page, 1);
    await saveParticipants(page, ['Ana Uno', 'Beto Dos']);

    await spin(page);
    await expectWinnerCount(page, 2);
    const name = await settledWinner(page);
    expect(['Ana Uno', 'Beto Dos']).toContain(name);
    await expect(stream.locator('h1')).toHaveText(name);

    // Both rounds live in the history, newest first.
    const winners = await readWinners(page);
    expect(winners).toHaveLength(2);
    expect(winners[0].name).toBe(name);
    expect(winners[0].id).not.toBe(winners[1].id);
  });

  test('guardar sin cambiar la lista conserva el ganador en pantalla', async ({
    page,
    context,
  }) => {
    await openApp(page);
    const stream = await context.newPage();
    await stream.goto('/?view=stream');

    await spin(page);
    await expectWinnerCount(page, 1);
    const name = await settledWinner(page);

    await saveParticipants(page, ['Martina Herrera Ríos', 'Lucía Benítez', 'Camila Duarte'], {
      reset: false,
    });

    // Same list, so the round is still current: the reveal must survive.
    await expect(stream.locator('h1')).toHaveText(name);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  });
});
