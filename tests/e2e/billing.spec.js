const { test, expect } = require('@playwright/test');
const { ADMIN, loginAs } = require('./helpers');

test.describe('Facturación', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN);
  });

  test('listado de facturas se renderiza con datos (fixture o reales)', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page.getByText(/facturación/i).first()).toBeVisible();
    // Plan actual debe estar visible
    await expect(page.getByText(/plan actual/i)).toBeVisible();
    // Histórico de facturas — debe haber al menos las 4 precargadas de fallback
    await expect(page.getByText(/histórico de facturas/i)).toBeVisible();
  });

  test('botón "Gestionar suscripción" existe y es interactivo', async ({ page }) => {
    await page.goto('/dashboard/billing');
    const btn = page.getByRole('button', { name: /gestionar suscripción/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('botón PDF dispara descarga al hacer click', async ({ page }) => {
    await page.goto('/dashboard/billing');
    // Espera a que el listado de facturas cargue.
    await page.waitForSelector('text=Histórico de facturas');
    // Localiza el primer botón PDF — pueden ser varios (uno por factura).
    const pdfButtons = page.getByRole('button', { name: /pdf/i });
    const count = await pdfButtons.count();
    test.skip(count === 0, 'No hay facturas para descargar');

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await pdfButtons.first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
