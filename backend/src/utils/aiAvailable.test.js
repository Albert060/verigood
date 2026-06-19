// Tests del detector de configuración de IA. Importante porque define cuándo
// la plataforma entra en modo demo controlado vs llama a Claude de verdad.

const { aiAvailable } = require('./aiAvailable');

describe('aiAvailable', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  afterAll(() => { process.env.ANTHROPIC_API_KEY = originalKey; });

  test('devuelve false si la variable no está definida', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(aiAvailable()).toBe(false);
  });

  test('devuelve false si la variable está vacía', () => {
    process.env.ANTHROPIC_API_KEY = '';
    expect(aiAvailable()).toBe(false);
  });

  test('devuelve false si contiene PLACEHOLDER', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-PLACEHOLDER';
    expect(aiAvailable()).toBe(false);
  });

  test('devuelve false si no empieza por sk-ant-', () => {
    process.env.ANTHROPIC_API_KEY = 'random-key-1234567890123456789012345';
    expect(aiAvailable()).toBe(false);
  });

  test('devuelve false si la clave es demasiado corta', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-short';
    expect(aiAvailable()).toBe(false);
  });

  test('devuelve true con una clave aparentemente válida', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-' + 'x'.repeat(40);
    expect(aiAvailable()).toBe(true);
  });
});
