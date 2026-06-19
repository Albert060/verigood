const { test, expect } = require('@playwright/test');
const { ADMIN, loginAs } = require('./helpers');

test.describe('Autenticación', () => {
  test('admin del centro puede iniciar sesión y llega al dashboard', async ({ page }) => {
    await loginAs(page, ADMIN);
    await expect(page).toHaveURL(/\/dashboard/);
    // El topbar muestra el nombre o iniciales del usuario logeado.
    await expect(page.locator('header')).toBeVisible();
  });

  test('credenciales inválidas mantienen al usuario en /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/correo|email/i).fill('inexistente@verigood.com');
    await page.getByPlaceholder(/contraseña|password/i).fill('contrasena-mala');
    await page.getByRole('button', { name: /entrar|iniciar|login/i }).click();
    // No debería navegar fuera de /login. Damos un margen para el roundtrip.
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout devuelve a la landing/login', async ({ page }) => {
    await loginAs(page, ADMIN);
    // Abrir menú de usuario y pulsar Cerrar sesión.
    const avatar = page.locator('header button').filter({ hasText: /^[A-Z]{1,2}$/ }).first();
    await avatar.click();
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await page.waitForURL(/\/(login|bienvenida|$)/);
  });
});
