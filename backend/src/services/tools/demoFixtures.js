// Fixtures genéricos para modo demo (sin ANTHROPIC_API_KEY válida).
// Se generan a partir del output_kind declarado en module_tools y de los
// inputs del profesor para que parezcan plausibles. Esto evita tener que
// escribir y mantener 56 fixtures hand-rolled — la filosofía es la misma
// que el resto del sistema: un único punto centralizado, declarativo.
//
// El dispatcher llama a `forKind(kind, { input, tool, moduleId })` y, si hay
// generador, lo usa para responder. Si no, devuelve null y el dispatcher
// emite AI_NOT_CONFIGURED para que el frontend muestre el aviso normal.

const pickLabel = (input, keys, fallback) => {
  for (const k of keys) {
    const v = input?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return fallback;
};

const DEMO_BANNER = '[Modo demo — sin clave de IA configurada]';

// ── output_kind: 'text' ──────────────────────────────────────
const buildText = ({ input, tool }) => {
  const topic = pickLabel(input, ['topic','theme','focus','concept','work','skill','content_block','goal','situation'], tool?.name || 'tema general');
  const course = pickLabel(input, ['course','level','stage_course'], 'curso no indicado');
  return `${DEMO_BANNER}

# ${tool?.name || 'Resultado de la herramienta'}

**Tema:** ${topic}
**Curso:** ${course}

## 1. Objetivos de aprendizaje
- Comprender los conceptos clave relacionados con "${topic}".
- Aplicar lo aprendido en una situación concreta del aula.
- Desarrollar autonomía y pensamiento crítico.

## 2. Desarrollo de la sesión
1. **Apertura (5-10 min):** pregunta-gancho sobre "${topic}" para activar conocimientos previos.
2. **Desarrollo (25-30 min):** explicación guiada con ejemplos cercanos al alumno español; práctica en parejas.
3. **Cierre (10 min):** puesta en común y síntesis individual en el cuaderno.

## 3. Materiales y atención a la diversidad
- Materiales: cerrados, propios de un centro español.
- Variante de menor dificultad para alumnado con dificultades.
- Reto de ampliación para alumnado con más nivel.

## 4. Indicadores de evaluación observables
- Participa con argumentación coherente.
- Aplica los conceptos a un caso nuevo.
- Mantiene una actitud respetuosa con sus compañeros.

> Este es contenido de muestra para que puedas explorar el flujo. Cuando el administrador configure la clave de IA real, las respuestas se generarán con Claude.`;
};

// ── output_kind: 'exercise_set' ──────────────────────────────
const buildExerciseSet = ({ input, tool }) => {
  const topic = pickLabel(input, ['topic','focus','skill','concept'], tool?.name || 'ejercicios');
  const course = pickLabel(input, ['course','level'], '');
  const count = Math.min(Math.max(parseInt(input?.count, 10) || 6, 3), 10);

  const exercises = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    type: 'open',
    prompt: `${DEMO_BANNER} Ejercicio ${i + 1} sobre "${topic}". Resuelve y justifica tu respuesta.`,
    answer: `Respuesta modelo de muestra para el ejercicio ${i + 1}.`,
    points: Math.round(10 / count),
  }));

  return {
    title: `Ejercicios: ${topic}`,
    topic,
    course,
    instructions: `${DEMO_BANNER} Resuelve los ${count} ejercicios y revisa con tu profesor.`,
    exercises,
  };
};

// ── output_kind: 'rubric' ────────────────────────────────────
const buildRubric = ({ input, tool }) => {
  const activity = pickLabel(input, ['activity','project_title','focus'], tool?.name || 'la actividad');
  const course = pickLabel(input, ['course','level'], '');
  const n = Math.min(Math.max(parseInt(input?.criteria_count, 10) || 4, 3), 6);

  const scale = ['Iniciado','En proceso','Adecuado','Avanzado'];
  const criteria = Array.from({ length: n }, (_, i) => ({
    name: `Criterio ${i + 1}`,
    weight: Math.round(100 / n),
    levels: scale.map((label) => ({
      label,
      descriptor: `${label}: descripción de muestra del nivel para el criterio ${i + 1}.`,
    })),
  }));

  return {
    title: `${DEMO_BANNER} Rúbrica: ${activity}`,
    context: course,
    scale,
    criteria,
  };
};

// ── output_kind: 'timeline' ──────────────────────────────────
const buildTimeline = ({ input }) => {
  const period = pickLabel(input, ['period','topic'], 'Período histórico');
  const events_count = Math.min(Math.max(parseInt(input?.events_count, 10) || 6, 3), 10);

  const events = Array.from({ length: events_count }, (_, i) => ({
    year: 1800 + i * 25,
    title: `Hito ${i + 1} (demo)`,
    description: `Descripción de muestra del hito ${i + 1} dentro de "${period}".`,
  }));

  return {
    title: `${DEMO_BANNER} Línea de tiempo: ${period}`,
    period,
    events,
  };
};

// ── output_kind: 'quiz' ──────────────────────────────────────
const buildQuiz = ({ input, tool }) => {
  const topic = pickLabel(input, ['topic'], tool?.name || 'tema');
  const course = pickLabel(input, ['course','level'], '');
  const n = Math.min(Math.max(parseInt(input?.question_count, 10) || 6, 3), 10);

  const questions = Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    prompt: `${DEMO_BANNER} Pregunta ${i + 1} sobre "${topic}".`,
    options: ['Opción A (correcta)', 'Opción B', 'Opción C', 'Opción D'],
    correct_index: 0,
    explanation: `Explicación de muestra para la pregunta ${i + 1}.`,
  }));

  return {
    title: `${DEMO_BANNER} Cuestionario: ${topic}`,
    topic,
    course,
    questions,
  };
};

// ── output_kind: 'commentary' ────────────────────────────────
const buildCommentary = ({ input, tool }) => {
  const ref = pickLabel(input, ['text_or_reference','work_or_reference'], 'texto de muestra');
  return {
    title: `${DEMO_BANNER} ${tool?.name || 'Comentario guiado'}`,
    source_text: typeof ref === 'string' ? ref.slice(0, 400) : 'Texto de muestra para comentar.',
    context: 'Contexto histórico y autor del texto (datos de muestra).',
    key_concepts: [
      { term: 'Concepto 1', definition: 'Definición breve (demo).' },
      { term: 'Concepto 2', definition: 'Definición breve (demo).' },
    ],
    commentary_paragraphs: [
      '1. Tema e ideas principales (demo): este párrafo resume la tesis del texto.',
      '2. Estructura del texto (demo): introducción, desarrollo y conclusión.',
      '3. Análisis estilístico (demo): figuras, registro y recursos relevantes.',
      '4. Juicio crítico (demo): valoración personal con argumentos.',
    ],
    guiding_questions: [
      '¿Cuál es la idea principal del texto?',
      '¿Qué recursos lingüísticos utiliza el autor?',
      '¿Cómo conectarías este texto con tu propia experiencia?',
    ],
  };
};

const GENERATORS = {
  text:         buildText,
  exercise_set: buildExerciseSet,
  rubric:       buildRubric,
  timeline:     buildTimeline,
  quiz:         buildQuiz,
  commentary:   buildCommentary,
};

const forKind = (kind, ctx) => {
  const gen = GENERATORS[kind];
  if (!gen) return null;
  return { output_kind: kind, output: gen(ctx) };
};

module.exports = { forKind, DEMO_BANNER };
