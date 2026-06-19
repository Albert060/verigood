import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest reusa la config de Vite, así que los alias y el plugin de React
// funcionan igual que en runtime. API compatible con Jest (describe/it/expect).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/**', 'dist/**', '**/*.test.{js,jsx}', '**/*.config.*'],
    },
  },
});
