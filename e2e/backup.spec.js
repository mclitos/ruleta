import { test, expect } from '@playwright/test';
import { openApp, readSettings } from './support/app';

test.describe('copia de respaldo (exportar e importar)', () => {
  test('exporta la configuración actual como archivo JSON', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Configurar sorteo' }).click();
    const dialog = page.getByRole('dialog');

    // Cambiamos el título en el modal para verificar que exporte el estado actual
    const titleInput = dialog.getByLabel('Título', { exact: true });
    await titleInput.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.insertText('Sorteo Aniversario');

    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Exportar JSON' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^ruleta-config-\d{4}-\d{2}-\d{2}\.json$/);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const content = Buffer.concat(chunks).toString('utf-8');
    const json = JSON.parse(content);

    expect(json.app).toBe('ruleta-de-rifas');
    expect(json.version).toBe(1);
    expect(json.settings.title).toBe('Sorteo Aniversario');
    expect(json.settings.participants.length).toBeGreaterThan(0);
  });

  test('importa una configuración válida y la aplica al guardar', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Configurar sorteo' }).click();
    const dialog = page.getByRole('dialog');

    const backupPayload = {
      app: 'ruleta-de-rifas',
      version: 1,
      settings: {
        title: 'Gran Rifa Solidaria',
        slogan: 'Un premio para cada amigo',
        participants: ['Esteban Quito', 'Armando Paredes', 'Elba Lazo'],
        theme: 'light',
        sounds: false,
      },
    };

    const fileInput = dialog.locator('input[type="file"][accept*=".json"]');
    await fileInput.setInputFiles({
      name: 'mi-copia.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backupPayload)),
    });

    await expect(dialog.getByText(/Configuración importada \(3 participantes\)/)).toBeVisible();
    await expect(dialog.getByLabel('Título', { exact: true })).toHaveValue('Gran Rifa Solidaria');
    await expect(dialog.locator('textarea')).toHaveValue(
      ['Esteban Quito', 'Armando Paredes', 'Elba Lazo'].join('\n'),
    );

    await dialog.getByRole('button', { name: 'Guardar' }).click();
    await expect(dialog).toBeHidden();

    // Verificamos que se refleje en pantalla y en localStorage
    await expect(page.getByText('3 participantes en juego')).toBeVisible();
    const stored = await readSettings(page);
    expect(stored.title).toBe('Gran Rifa Solidaria');
    expect(stored.participants).toEqual(['Esteban Quito', 'Armando Paredes', 'Elba Lazo']);
    expect(stored.sounds).toBe(false);
  });

  test('muestra mensaje de error si el archivo JSON no es válido', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Configurar sorteo' }).click();
    const dialog = page.getByRole('dialog');

    const fileInput = dialog.locator('input[type="file"][accept*=".json"]');
    await fileInput.setInputFiles({
      name: 'invalido.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ esto no es json }'),
    });

    await expect(dialog.getByRole('alert')).toContainText(/JSON válido/i);
    // El textarea conserva la lista original
    await expect(dialog.locator('textarea')).not.toHaveValue('');
  });
});
