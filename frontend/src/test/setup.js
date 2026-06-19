// Setup global para todos los tests de Vitest.
// Añade los matchers de testing-library/jest-dom (toBeInTheDocument, etc.)
// y limpia el DOM entre tests para evitar fugas.

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
