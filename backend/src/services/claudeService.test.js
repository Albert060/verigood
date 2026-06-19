// parseJSON es crítico: tolera las respuestas malformadas más comunes de la
// IA (markdown wrapping, trailing commas, texto antes/después del JSON). Si
// regresa por un cambio de Anthropic, todas las tools dejan de funcionar.

const { parseJSON } = require('./claudeService');

describe('claudeService.parseJSON', () => {
  test('parsea JSON limpio', () => {
    expect(parseJSON('{"a":1}')).toEqual({ a: 1 });
  });

  test('parsea JSON envuelto en bloque ```json', () => {
    const text = '```json\n{"title":"x","exercises":[{"id":1}]}\n```';
    expect(parseJSON(text)).toEqual({ title: 'x', exercises: [{ id: 1 }] });
  });

  test('parsea JSON envuelto en bloque ``` sin tag', () => {
    const text = '```\n{"a":1}\n```';
    expect(parseJSON(text)).toEqual({ a: 1 });
  });

  test('extrae JSON cuando hay texto antes y después', () => {
    const text = 'Aquí tienes el resultado: {"score":7,"max":10}. Espero que sirva.';
    expect(parseJSON(text)).toEqual({ score: 7, max: 10 });
  });

  test('repara trailing commas en objetos', () => {
    const text = '{"a":1,"b":2,}';
    expect(parseJSON(text)).toEqual({ a: 1, b: 2 });
  });

  test('repara trailing commas en arrays', () => {
    const text = '{"items":[1,2,3,]}';
    expect(parseJSON(text)).toEqual({ items: [1, 2, 3] });
  });

  test('parsea arrays como raíz', () => {
    expect(parseJSON('[1,2,3]')).toEqual([1, 2, 3]);
  });

  test('lanza error si no hay JSON identificable', () => {
    expect(() => parseJSON('texto sin ningún objeto')).toThrow();
  });
});
