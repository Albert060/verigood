// Generador híbrido BD + IA reutilizable por cualquier handler de tool que
// produzca exercise_set / quiz. Extracción del patrón de examGeneratorService
// (Cambridge) parametrizado por moduleId, topic, level y forma del output.
//
// Contrato del handler:
//
//   const { items, dbCount, aiCount, demoMode } = await generateExerciseSet({
//     moduleId:  'matematicas_eso',
//     topic, course, count,
//     systemPrompt: '...',
//     userPromptBuilder: ({ remaining, seeds, input }) => '... prompt para Claude ...',
//     model: 'haiku', maxTokens: 2400,
//     outputArrayKey: 'exercises',          // dónde vienen los items en el JSON de Claude
//     dbMapper: (row) => ({ type, prompt, answer, explanation }),  // row→item del handler
//     demoFixture: ({ remaining, input }) => ({ exercises: [...] }), // opcional
//   });
//
// La función:
//   1. Lee hasta ceil(count * 0.5) preguntas curadas de exam_questions
//      WHERE module_id = $1 AND (level/course match) AND (topic ILIKE).
//   2. Llama a Claude para el resto, pasándole el prompt del handler.
//   3. Marca cada item con `source: 'database' | 'ai' | 'demo'` para trazabilidad.
//   4. Si no hay clave de IA y no hay seeds, cae al demoFixture si existe.

const { query } = require('../config/database');
const { callClaudeJSON } = require('./claudeService');
const { aiAvailable } = require('../utils/aiAvailable');

const DB_TARGET_RATIO = 0.5; // hasta 50% del total se cubre con preguntas curadas

const fetchSeeds = async ({ moduleId, course, topic, limit, excludeIds = [] }) => {
  if (!moduleId || limit <= 0) return [];
  // course → level: las celdas de level del seed son "2º ESO", "5º Primaria", etc.
  // Empate parcial (ILIKE) para que filtrar por "ESO" recupere "1º ESO", "2º ESO"...
  // excludeIds evita devolver filas ya vistas en pasadas anteriores del
  // progressive fallback — sin esto el ORDER BY RANDOM puede repetir.
  const { rows } = await query(
    `SELECT id, module_id, level, topic, type, question, options, answer, explanation, points
       FROM exam_questions
      WHERE module_id = $1
        AND is_active = true
        AND ($2 = '' OR level ILIKE '%' || $2 || '%')
        AND ($3 = '' OR topic ILIKE '%' || $3 || '%')
        AND ($5::uuid[] IS NULL OR id <> ALL($5::uuid[]))
      ORDER BY RANDOM()
      LIMIT $4`,
    [moduleId, course || '', topic || '', limit, excludeIds.length ? excludeIds : null]
  );
  return rows;
};

const generateExerciseSet = async ({
  moduleId,
  topic,
  course,
  count,
  systemPrompt,
  userPromptBuilder,
  model = 'haiku',
  maxTokens = 2400,
  outputArrayKey = 'exercises',
  dbMapper,
  demoFixture,
  input = {},
}) => {
  const seedLimit = Math.max(0, Math.floor(count * DB_TARGET_RATIO));
  const seeds = seedLimit > 0
    ? await fetchSeeds({ moduleId, course, topic, limit: seedLimit })
    : [];

  const seedItems = seeds.map((row, i) => ({
    ...(dbMapper ? dbMapper(row) : defaultMapper(row)),
    id: i + 1,
    source: 'database',
  }));

  const remaining = count - seedItems.length;
  let aiItems = [];
  let demoMode = false;

  if (remaining > 0) {
    if (aiAvailable()) {
      const messages = userPromptBuilder({ remaining, seeds: seedItems, input });
      let aiOutput;
      try {
        aiOutput = await callClaudeJSON({
          system: systemPrompt, messages, model, maxTokens,
        });
      } catch (err) {
        // Propagamos errores AI_* al dispatcher; el resto los tratamos como BAD_AI_RESPONSE.
        if (err.code && err.code.startsWith('AI_')) throw err;
        const wrapped = new Error('BAD_AI_RESPONSE en hybridGenerator');
        wrapped.code = 'BAD_AI_RESPONSE';
        wrapped.preview = err.message;
        throw wrapped;
      }
      const aiArray = Array.isArray(aiOutput?.[outputArrayKey])
        ? aiOutput[outputArrayKey]
        : (Array.isArray(aiOutput) ? aiOutput : []);
      aiItems = aiArray.slice(0, remaining).map((it, i) => ({
        ...it,
        id: seedItems.length + i + 1,
        source: 'ai',
      }));
    } else if (demoFixture) {
      demoMode = true;
      const fx = demoFixture({ remaining, input }) || {};
      const fxArray = Array.isArray(fx[outputArrayKey]) ? fx[outputArrayKey] : [];
      aiItems = fxArray.slice(0, remaining).map((it, i) => ({
        ...it,
        id: seedItems.length + i + 1,
        source: 'demo',
      }));
    }
  }

  return {
    items: [...seedItems, ...aiItems].slice(0, count),
    dbCount: seedItems.length,
    aiCount: demoMode ? 0 : aiItems.length,
    demoMode,
  };
};

const defaultMapper = (row) => ({
  type: row.type || 'short',
  prompt: row.question,
  options: row.options || undefined,
  answer: row.answer,
  explanation: row.explanation || undefined,
  points: row.points || 1,
});

// Wrapper minimalista pensado para que un handler de tool existente añada el
// patrón BD+IA cambiando lo mínimo. El handler sigue construyendo su propio
// prompt — solo le pasa al wrapper:
//   - moduleId   (típicamente ctx.moduleId)
//   - input, count, topic, course
//   - mapSeed    (row → item con la shape del handler)
//   - buildOutput async ({ remaining, seedItems }) => objeto JSON del handler
//                 (el mismo que devolvería sin BD, pero pidiendo `remaining` items)
//   - itemsKey   ('exercises' por defecto; usa 'questions' para quizzes)
//
// Devuelve el JSON original con el array fusionado (BD primero, IA después)
// y dos campos extra `dbCount` / `aiCount` para trazabilidad.
//
// Si no hay BD ni clave de IA, deja que el handler decida (lanza/falla en
// buildOutput). El cortocircuito a fixtures lo hace el dispatcher fuera.
const withCuratedBank = async ({
  moduleId, input = {}, count, topic, course,
  mapSeed, buildOutput, itemsKey = 'exercises',
}) => {
  // En modo demo, pedimos a la BD HASTA el total para llenar la respuesta sin
  // tocar la IA. Cuando hay clave de IA, mantenemos el 50% de mezcla.
  const seedLimit = aiAvailable()
    ? Math.max(0, Math.floor(count * DB_TARGET_RATIO))
    : count;
  let seeds = seedLimit > 0
    ? await fetchSeeds({ moduleId, course, topic, limit: seedLimit })
    : [];

  // Demo + filtro exacto incompleto → rellenamos huecos con consultas más
  // amplias hasta llegar al `count` pedido (o agotar el banco del módulo).
  // Orden: (curso+tema) → (curso) → (tema) → (sin filtro). Deduplicamos por
  // id para no repetir la misma pregunta dos veces.
  if (!aiAvailable() && seeds.length < count) {
    const seen = new Set(seeds.map((s) => s.id));
    const extend = async (params) => {
      if (seeds.length >= count) return;
      const more = await fetchSeeds({
        ...params,
        limit: count - seeds.length,
        excludeIds: Array.from(seen),
      });
      for (const row of more) {
        if (seen.has(row.id)) continue;
        seeds.push(row);
        seen.add(row.id);
        if (seeds.length >= count) break;
      }
    };
    if (topic)  await extend({ moduleId, course, topic: '' });
    if (course) await extend({ moduleId, course: '', topic });
    await extend({ moduleId, course: '', topic: '' });
  }
  const seedItems = seeds.map((row, i) => ({
    ...(mapSeed ? mapSeed(row) : defaultMapper(row)),
    id: i + 1,
    source: 'database',
  }));
  const remaining = count - seedItems.length;

  // Si la BD ya cubre el total, evitamos el call a Claude y construimos un
  // envoltorio mínimo. buildOutput nunca se invoca con remaining<=0.
  if (remaining <= 0) {
    return {
      title: input.title,
      topic, course,
      [itemsKey]: seedItems.slice(0, count),
      dbCount: seedItems.length,
      aiCount: 0,
    };
  }

  // Modo demo: no hay clave de IA pero la BD cubrió SOLO una parte. Devolvemos
  // lo que tenemos (sin llamar a Claude para no explotar con AI_NOT_CONFIGURED).
  // El dispatcher ya probará BD upstream para decidir si llega hasta aquí.
  if (!aiAvailable()) {
    return {
      title: input.title,
      topic, course,
      [itemsKey]: seedItems,
      dbCount: seedItems.length,
      aiCount: 0,
      demoMode: true,
    };
  }

  const aiOutput = await buildOutput({ remaining, seedItems });
  const aiArray = Array.isArray(aiOutput?.[itemsKey]) ? aiOutput[itemsKey] : [];
  const aiItems = aiArray.slice(0, remaining).map((it, i) => ({
    ...it,
    id: seedItems.length + i + 1,
    source: 'ai',
  }));

  return {
    ...aiOutput,
    [itemsKey]: [...seedItems, ...aiItems].slice(0, count),
    dbCount: seedItems.length,
    aiCount: aiItems.length,
  };
};

module.exports = { generateExerciseSet, withCuratedBank, fetchSeeds, defaultMapper };
