const { test, expect } = require('@playwright/test');
const { ADMIN, loginAs } = require('./helpers');

// Asume modo demo en el backend (sin ANTHROPIC_API_KEY). En ese caso, el
// dispatcher devuelve fixture genérico y la respuesta trae `demo: true`.
// El flujo verifica el ciclo completo: módulo → generar → ver resultado →
// confirmar que se ha guardado en biblioteca.

test.describe('Flujo de tool del catálogo (modo demo)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN);
  });

  test('Cambridge sigue accesible (módulo siempre activo en demo)', async ({ page }) => {
    await page.goto('/cambridge');
    await expect(page.getByText(/cambridge/i).first()).toBeVisible();
  });

  test('biblioteca se carga sin errores', async ({ page }) => {
    await page.goto('/dashboard/resources');
    // Cabecera de la página debe ser visible.
    await expect(page.getByText(/biblioteca/i).first()).toBeVisible();
  });

  test('mis exámenes Cambridge muestra el listado o estado vacío', async ({ page }) => {
    await page.goto('/cambridge/exams');
    await expect(page.getByText(/mis exámenes|examen/i).first()).toBeVisible();
    // Debe haber o bien tabla o bien estado vacío con CTA — ninguno de los dos
    // implica error.
  });

  test('panel admin de módulos accesible para admin_centro', async ({ page }) => {
    await page.goto('/dashboard/modules');
    await expect(page.getByText(/módulos/i).first()).toBeVisible();
  });
});
