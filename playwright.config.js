// Playwright config para los tests end-to-end de VeriGood.
// Arranca backend (3001) + frontend (5173) automáticamente vía `webServer`.
// Los tests asumen MODO DEMO en backend (sin ANTHROPIC_API_KEY válida) para
// no golpear a la IA real durante CI.

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // BD compartida — secuencial para evitar carreras de seeds
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-ES',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Arranca dev servers automáticamente. Si ya están corriendo, los reusa.
  webServer: process.env.E2E_SKIP_SERVERS ? undefined : [
    {
      command: 'npm run dev --workspace=backend',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev --workspace=frontend',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
