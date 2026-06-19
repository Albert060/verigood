// Configuración Jest del backend.
// Aísla tests de integración (que dependen de BD) en una carpeta aparte para
// que CI pueda correr solo los unitarios por defecto:
//   npm test              → unit tests
//   npm run test:integration → integración con BD/IA real
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  // Excluye integración de la corrida por defecto.
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/migrations/**',
    '!src/seeds/**',
    '!src/index.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: false,
};
