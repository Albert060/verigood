// Smoke tests de pdfService. Verifican que cada renderer produce un PDF
// no vacío con cabecera %PDF- válida usando fixtures realistas. No comparan
// el contenido byte a byte (PDFKit incluye timestamps) — solo verifican que
// el binario es un PDF válido y razonablemente extenso.

const { buildPdf } = require('./pdfService');

const isPdf = (buf) => Buffer.isBuffer(buf) && buf.slice(0, 5).toString() === '%PDF-';

const SAMPLE = {
  exercise_set: {
    title: 'Ejercicios: sumas',
    topic: 'sumas',
    course: '1º Primaria',
    exercises: [
      { id: 1, type: 'open', prompt: '¿Cuánto es 2 + 3?', answer: '5', points: 2 },
      { id: 2, type: 'multiple_choice', prompt: '¿Cuánto es 4 + 4?', options: ['7','8','9','10'], answer: '8', points: 2 },
    ],
  },
  quiz: {
    title: 'Cuestionario: El sistema solar',
    questions: [
      { id: 1, prompt: '¿Cuántos planetas hay?', options: ['7','8','9','10'], correct_index: 1, explanation: 'Son 8 planetas.' },
    ],
  },
  rubric: {
    title: 'Rúbrica: Exposición oral',
    scale: ['Iniciado','En proceso','Adecuado','Avanzado'],
    criteria: [
      { name: 'Claridad', weight: 50, levels: [
        { label: 'Iniciado', descriptor: 'Confuso.' },
        { label: 'Adecuado', descriptor: 'Claro.' },
      ]},
    ],
  },
  invoice: {
    number: 'VG-2026-04-TEST',
    status: 'paid', paid: true,
    subtotal: 12314, tax: 2586, total: 14900, currency: 'eur',
    created: '2026-04-01T08:00:00Z',
    paid_at: '2026-04-01T10:00:00Z',
    customer_name: 'Colegio Test',
    customer_address: { line1: 'C/ Test, 1', postal_code: '28001', city: 'Madrid', country: 'ES' },
    lines: [{ description: 'VeriGood Colegio — abril 2026', quantity: 1, amount: 14900 }],
  },
};

describe('pdfService.buildPdf', () => {
  test('genera PDF válido de tipo exercise_set', async () => {
    const buf = await buildPdf({ type: 'exercise_set', data: SAMPLE.exercise_set, title: 'Test', moduleKey: 'matematicas_primaria' });
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });

  test('genera PDF válido de tipo quiz con solucionario', async () => {
    const buf = await buildPdf({ type: 'quiz', data: SAMPLE.quiz, title: 'Quiz Test' });
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });

  test('genera PDF válido de tipo rubric', async () => {
    const buf = await buildPdf({ type: 'rubric', data: SAMPLE.rubric, title: 'Rúbrica Test' });
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(800);
  });

  test('genera PDF válido de factura con IVA y sello', async () => {
    const buf = await buildPdf({ type: 'invoice', data: SAMPLE.invoice, title: 'Factura Test' });
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1500);
  });

  test('tipo desconocido cae a renderJSON sin lanzar', async () => {
    const buf = await buildPdf({ type: 'tipo_inexistente', data: { foo: 'bar' }, title: 'JSON dump' });
    expect(isPdf(buf)).toBe(true);
  });
});
