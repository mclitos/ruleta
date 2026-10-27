import { test, expect } from '@playwright/test';
import { expectWinnerCount, openApp, readSettings, settledWinner, spin } from './support/app';

async function fillNumbers(page, count) {
  await page.bringToFront();
  await page.getByRole('button', { name: 'Configurar sorteo' }).click();
  const dialog = page.getByRole('dialog');
  const field = dialog.getByLabel('Cantidad de números');
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(String(count));
  await expect(field).toHaveValue(String(count));
  await dialog.getByRole('button', { name: 'Rifa por número' }).click();
  return dialog;
}

test.describe('rifa por número', () => {
  test('genera los números de la rifa y sortea uno de ellos', async ({ page }) => {
    await openApp(page);
    const dialog = await fillNumbers(page, 8);

    // The draft is the list the user is about to save, one number per line.
    await expect(dialog.locator('textarea')).toHaveValue(
      ['1', '2', '3', '4', '5', '6', '7', '8'].join('\n'),
    );
    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText('8 participantes en juego')).toBeVisible();
    expect((await readSettings(page)).participants).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);

    await spin(page);
    await expectWinnerCount(page, 1);
    const winner = await settledWinner(page);
    expect(Number(winner)).toBeGreaterThanOrEqual(1);
    expect(Number(winner)).toBeLessThanOrEqual(8);
  });

  test('cancelar descarta los números y deja la lista anterior', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Configurar sorteo' }).click();
    const dialog = page.getByRole('dialog');
    const before = (await readSettings(page)).participants;

    await dialog.getByLabel('Cantidad de números').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('4');
    await dialog.getByRole('button', { name: 'Rifa por número' }).click();
    await expect(dialog.locator('textarea')).toHaveValue('1\n2\n3\n4');

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toBeHidden();
    expect((await readSettings(page)).participants).toEqual(before);
  });

  test('sin cantidad la opción queda desactivada y la lista no se toca', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Configurar sorteo' }).click();
    const dialog = page.getByRole('dialog');
    const before = await dialog.locator('textarea').inputValue();
    const field = dialog.getByLabel('Cantidad de números');

    await field.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');

    await expect(field).toHaveValue('');
    await expect(dialog.getByRole('button', { name: 'Rifa por número' })).toBeDisabled();
    await expect(dialog.locator('textarea')).toHaveValue(before);
  });
});
