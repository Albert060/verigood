// demoFixtures es el corazón del modo demo: produce el resultado que ven los
// profesores cuando no hay clave de IA configurada. Si esto se rompe, el
// modo demo deja de funcionar y la plataforma muestra errores 503 en demos.

const { forKind } = require('./demoFixtures');

const tool = { key: 'mat_prim.problems', name: 'Problemas matemáticos' };

describe('demoFixtures.forKind', () => {
  test('devuelve null para output_kind desconocido', () => {
    expect(forKind('inexistente', { input: {}, tool })).toBeNull();
  });

  test('text: devuelve markdown que incluye el topic', () => {
    const r = forKind('text', { input: { topic: 'fotosíntesis', course: '3º Primaria' }, tool });
    expect(r.output_kind).toBe('text');
    expect(typeof r.output).toBe('string');
    expect(r.output).toContain('fotosíntesis');
  });

  test('exercise_set: respeta el count solicitado dentro de los límites', () => {
    const r = forKind('exercise_set', { input: { topic: 'sumas', count: 8 }, tool });
    expect(r.output_kind).toBe('exercise_set');
    expect(Array.isArray(r.output.exercises)).toBe(true);
    expect(r.output.exercises).toHaveLength(8);
    r.output.exercises.forEach((ex) => {
      expect(ex).toHaveProperty('prompt');
      expect(ex).toHaveProperty('answer');
    });
  });

  test('exercise_set: clamp inferior a 3 cuando count es absurdamente bajo', () => {
    const r = forKind('exercise_set', { input: { topic: 'x', count: 1 }, tool });
    expect(r.output.exercises).toHaveLength(3);
  });

  test('exercise_set: clamp superior a 10 cuando count es absurdamente alto', () => {
    const r = forKind('exercise_set', { input: { topic: 'x', count: 100 }, tool });
    expect(r.output.exercises).toHaveLength(10);
  });

  test('quiz: cada pregunta tiene 4 opciones y correct_index válido', () => {
    const r = forKind('quiz', { input: { topic: 'historia', question_count: 5 }, tool });
    expect(r.output.questions).toHaveLength(5);
    r.output.questions.forEach((q) => {
      expect(q.options).toHaveLength(4);
      expect(q.correct_index).toBe(0);
    });
  });

  test('rubric: la suma de pesos cubre 100 (con redondeo)', () => {
    const r = forKind('rubric', { input: { criteria_count: 4 }, tool });
    const totalWeight = r.output.criteria.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeGreaterThanOrEqual(96); // redondeo permite 96–100
    expect(totalWeight).toBeLessThanOrEqual(100);
  });

  test('commentary: estructura completa con párrafos', () => {
    const r = forKind('commentary', { input: { text_or_reference: 'fragmento' }, tool });
    expect(r.output).toHaveProperty('commentary_paragraphs');
    expect(Array.isArray(r.output.commentary_paragraphs)).toBe(true);
    expect(r.output.commentary_paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  test('todos los kinds incluyen el banner [Modo demo - ...]', () => {
    const kinds = ['text', 'exercise_set', 'rubric', 'quiz', 'timeline', 'commentary'];
    kinds.forEach((k) => {
      const r = forKind(k, { input: { topic: 'x' }, tool });
      const serialized = typeof r.output === 'string' ? r.output : JSON.stringify(r.output);
      expect(serialized).toMatch(/Modo demo/i);
    });
  });
});
