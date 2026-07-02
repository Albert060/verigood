// Catálogo declarativo de qué módulos tienen Corrector OCR y con qué
// prompt y opciones de UI se ejecutan. Una sola fuente de verdad: el backend
// expone la parte pública vía GET /api/modules/:moduleId/ocr/config y el
// frontend la consume para pintar el formulario.
//
// Para añadir un nuevo módulo OCR: 1) entrada aquí, 2) listo. Sin cambios en
// el controlador, el servicio ni el frontend.

const COURSES_PRIMARIA = ['1º Primaria','2º Primaria','3º Primaria','4º Primaria','5º Primaria','6º Primaria'];
const COURSES_ESO      = ['1º ESO','2º ESO','3º ESO','4º ESO'];

const FEEDBACK_MODES = [
  { value: 'full',       label: 'Completo' },
  { value: 'brief',      label: 'Breve' },
  { value: 'score_only', label: 'Solo nota' },
];

// system y userPromptBuilder se ejecutan en el servicio.
// userPromptBuilder({ extractedText, course, focus, feedbackMode }) → string.
const baseUserPrompt = (subjectLabel) => ({ extractedText, course, focus, feedbackMode }) =>
  `Eres corrector de una prueba de ${subjectLabel} de un alumno de ${course || 'curso no indicado'} en un centro español.

${focus ? `Foco de corrección: ${focus}.\n` : ''}Modo de feedback: ${feedbackMode}.

Texto extraído de la prueba del alumno (OCR — puede contener errores de reconocimiento; interpreta lo más probable y márcalo si dudas):
"""
${extractedText}
"""

Devuelve JSON estricto con este formato:
{
  "subject": "${subjectLabel}",
  "course": "${course || ''}",
  "totalScore": número sobre 10,
  "maxScore": 10,
  "percentage": número 0–100,
  "grade": "Insuficiente" | "Suficiente" | "Bien" | "Notable" | "Sobresaliente",
  "questions": [
    {
      "number": 1,
      "question": "enunciado o resumen breve de la pregunta",
      "studentAnswer": "lo que ha escrito el alumno (limpio, sin OCR-noise)",
      "correctAnswer": "respuesta modelo",
      "isCorrect": true | false,
      "points": número,
      "comment": "comentario corto del corrector"
    }
  ],
  "strengths": ["lista breve de aciertos del alumno"],
  "improvements": ["lista breve de áreas a mejorar"],
  "studyRecommendations": ["3-5 recomendaciones concretas de estudio"],
  "overallFeedback": "feedback global del corrector en 3-5 frases, en español de España"
}

En modo "score_only" omite questions, strengths, improvements, studyRecommendations y overallFeedback (deja arrays/strings vacíos).
En modo "brief" reduce questions a un resumen agregado de aciertos/fallos y limita el resto a 1-2 elementos.
Si el OCR es ilegible o el texto no parece una prueba de ${subjectLabel}, devuelve totalScore=0, grade="Insuficiente" y explica el motivo en overallFeedback.

Todo en español de España. Devuelve SOLO JSON, sin envoltorio markdown.`;

// Diccionario indexado por moduleId.
const OCR_CONFIG = {
  // ── INGLÉS (Primaria + ESO) — compartido ─────────────────
  ingles_primaria: {
    label: 'Inglés',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Gramática','Vocabulario','Comprensión lectora','Writing'],
    system: 'You are an experienced primary-school English teacher in Spain (LOMLOE). You correct the student answer with kindness but accuracy. Reply ONLY with valid JSON.',
    userPromptBuilder: baseUserPrompt('Inglés (Primaria)'),
  },
  ingles_eso: {
    label: 'Inglés',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Grammar','Vocabulary','Reading comprehension','Writing'],
    system: 'You are an experienced secondary-school English teacher in Spain (LOMLOE), CEFR-aware. Reply ONLY with valid JSON.',
    userPromptBuilder: baseUserPrompt('Inglés (ESO)'),
  },

  // ── LENGUA CASTELLANA Y LITERATURA ───────────────────────
  lengua_primaria: {
    label: 'Lengua castellana',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Ortografía','Gramática','Comprensión lectora','Expresión escrita'],
    system: 'Eres maestro/a de Lengua castellana en Primaria, en un colegio español, con criterio LOMLOE. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Lengua castellana (Primaria)'),
  },
  lengua_eso: {
    label: 'Lengua castellana y literatura',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Ortografía','Gramática','Sintaxis','Comentario de texto','Expresión escrita','Literatura'],
    system: 'Eres profesor/a de Lengua castellana y literatura en un IES español, con criterio LOMLOE y terminología NGLE/RAE. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Lengua castellana y literatura (ESO)'),
  },

  // ── MATEMÁTICAS — PRIMARIA ───────────────────────────────
  matematicas_primaria: {
    label: 'Matemáticas',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Cálculo','Problemas','Geometría','Medida','Fracciones/decimales'],
    system: 'Eres maestro/a de Matemáticas en Primaria, en un colegio español, con criterio LOMLOE. Cuidas el procedimiento, no solo el resultado: valoras los pasos correctos aunque el resultado final sea incorrecto. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Matemáticas (Primaria)'),
  },

  // ── MATEMÁTICAS — ESO ────────────────────────────────────
  matematicas_eso: {
    label: 'Matemáticas',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Álgebra','Geometría','Funciones y gráficas','Estadística y probabilidad','Problemas'],
    system: 'Eres profesor/a de Matemáticas en un IES español, con criterio LOMLOE. Valoras el rigor del procedimiento, el uso correcto de la notación matemática y las unidades, y la justificación del método. Reconoces aciertos parciales en pasos intermedios aunque el resultado final sea incorrecto. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Matemáticas (ESO)'),
  },

  // ── CONOCIMIENTO DEL MEDIO ────────────────────────────────
  medio_primaria: {
    label: 'C. del Medio',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Ciencias naturales','Ciencias sociales','Tecnología','Cultura'],
    system: 'Eres maestro/a de Conocimiento del medio natural, social y cultural en Primaria, en un colegio español, con criterio LOMLOE. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Conocimiento del medio (Primaria)'),
  },

  // ── GEOGRAFÍA E HISTORIA — ESO ───────────────────────────
  geo_historia_eso: {
    label: 'Geografía e Historia',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Hechos y fechas','Conceptos','Mapa/croquis','Comentario de fuente','Causalidad histórica'],
    system: 'Eres profesor/a de Geografía e Historia en un IES español, con criterio LOMLOE. Eres riguroso/a con fechas y términos; valoras la capacidad del alumno para argumentar y relacionar. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Geografía e Historia (ESO)'),
  },

  // ── BIOLOGÍA Y GEOLOGÍA — ESO ────────────────────────────
  bio_geo_eso: {
    label: 'Biología y Geología',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Definiciones','Esquemas','Procesos','Cálculo y análisis de datos','Razonamiento experimental'],
    system: 'Eres profesor/a de Biología y Geología en un IES español, con criterio LOMLOE y rigor científico. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Biología y Geología (ESO)'),
  },

  // ── FÍSICA Y QUÍMICA — ESO ───────────────────────────────
  fis_quim_eso: {
    label: 'Física y Química',
    levelLabel: 'Curso',
    levels: ['2º ESO','3º ESO','4º ESO'],
    focusOptions: ['Resolución de problemas','Formulación','Conceptos teóricos','Análisis de gráficas'],
    system: 'Eres profesor/a de Física y Química en un IES español, con criterio LOMLOE. Valoras la coherencia dimensional, el uso correcto de unidades y la justificación del método. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Física y Química (ESO)'),
  },

  // ── TECNOLOGÍA Y DIGITALIZACIÓN — ESO ────────────────────
  tecno_digital_eso: {
    label: 'Tecnología y Digitalización',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Cálculo técnico','Diseño','Algoritmos / código','Conceptos teóricos','Análisis crítico'],
    system: 'Eres profesor/a de Tecnología y Digitalización en un IES español, con criterio LOMLOE. Valoras el rigor técnico y el razonamiento. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Tecnología y Digitalización (ESO)'),
  },

  // ── PLÁSTICA — PRIMARIA ──────────────────────────────────
  plastica_primaria: {
    label: 'Plástica',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Teoría del color','Conceptos técnicos','Análisis de obra','Historia del arte','Vocabulario visual'],
    system: 'Eres maestro/a de Educación Plástica en Primaria, en un colegio español, con criterio LOMLOE. Corriges pruebas teóricas de plástica (color, técnicas, análisis). Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Plástica (Primaria)'),
  },

  // ── MÚSICA — PRIMARIA ────────────────────────────────────
  musica_primaria: {
    label: 'Música',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Lenguaje musical','Historia de la música','Instrumentos','Ritmo y compás','Audición'],
    system: 'Eres maestro/a de Música en Primaria, en un colegio español, con criterio LOMLOE. Corriges pruebas teóricas de música (notación, ritmo, historia). Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Música (Primaria)'),
  },

  // ── RELIGIÓN — PRIMARIA ─────────────────────────────────
  religion_primaria: {
    label: 'Religión',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Conceptos','Textos bíblicos','Valores','Redacción'],
    system: 'Eres maestro/a de Religión en Primaria, en un colegio español. Corriges con criterio pedagógico y sensibilidad al contenido. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Religión (Primaria)'),
  },

  // ── ED. CIUDADANÍA — PRIMARIA ───────────────────────────
  ciudadania_primaria: {
    label: 'Ed. Ciudadanía',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Conceptos','Argumentación','Actualidad','Redacción'],
    system: 'Eres maestro/a de Educación en Valores Cívicos y Éticos en Primaria, con criterio LOMLOE. Valoras la argumentación y el uso de conceptos. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Educación en Valores Cívicos (Primaria)'),
  },

  // ── ED. FÍSICA — PRIMARIA ───────────────────────────────
  ed_fisica_primaria: {
    label: 'Educación Física',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Anatomía básica','Reglas de juegos','Salud y hábitos','Conceptos deportivos'],
    system: 'Eres maestro/a de Educación Física en Primaria, con criterio LOMLOE. Corriges la parte teórica de la asignatura. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Educación Física (Primaria)'),
  },

  // ── ED. ARTÍSTICA — PRIMARIA ────────────────────────────
  ed_artistica_primaria: {
    label: 'Educación Artística',
    levelLabel: 'Curso',
    levels: COURSES_PRIMARIA,
    focusOptions: ['Conceptos','Análisis de obra','Vocabulario artístico','Historia del arte'],
    system: 'Eres maestro/a de Educación Artística en Primaria, en un colegio español, con criterio LOMLOE. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Educación Artística (Primaria)'),
  },

  // ── ED. FÍSICA — ESO ────────────────────────────────────
  ed_fisica_eso: {
    label: 'Educación Física',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Anatomía y fisiología','Sistemas del cuerpo','Reglas deportivas','Entrenamiento y salud','Nutrición'],
    system: 'Eres profesor/a de Educación Física en un IES español, con criterio LOMLOE. Corriges la parte teórica de la asignatura con rigor científico. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Educación Física (ESO)'),
  },

  // ── EPVA (Ed. Plástica, Visual y Audiovisual) — ESO ──────
  epva_eso: {
    label: 'EPVA',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Teoría del color','Perspectiva y geometría','Análisis de obra','Historia del arte','Lenguaje audiovisual'],
    system: 'Eres profesor/a de Educación Plástica, Visual y Audiovisual en un IES español, con criterio LOMLOE. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('EPVA (ESO)'),
  },

  // ── RELIGIÓN — ESO ──────────────────────────────────────
  religion_eso: {
    label: 'Religión',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Conceptos','Textos religiosos','Historia de las religiones','Ética y valores','Redacción'],
    system: 'Eres profesor/a de Religión en un IES español. Corriges con criterio pedagógico y sensibilidad al contenido. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Religión (ESO)'),
  },

  // ── VALORES ÉTICOS — ESO ────────────────────────────────
  valores_eticos_eso: {
    label: 'Valores Éticos',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Argumentación','Conceptos filosóficos','Análisis de dilemas','Actualidad y ética','Redacción'],
    system: 'Eres profesor/a de Valores Éticos / Educación en Valores Cívicos y Éticos en un IES español, con criterio LOMLOE. Valoras la argumentación fundamentada. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Valores Éticos (ESO)'),
  },

  // ── TUTORÍAS — ESO ──────────────────────────────────────
  tutorias_eso: {
    label: 'Tutorías',
    levelLabel: 'Curso',
    levels: COURSES_ESO,
    focusOptions: ['Reflexión personal','Convivencia','Técnicas de estudio','Orientación'],
    system: 'Eres profesor/a-tutor/a en un IES español, con criterio LOMLOE. Corriges cuestionarios y reflexiones de acción tutorial con sensibilidad pedagógica. Devuelve SOLO JSON válido.',
    userPromptBuilder: baseUserPrompt('Tutorías (ESO)'),
  },
};

const isEnabled = (moduleId) => Object.prototype.hasOwnProperty.call(OCR_CONFIG, moduleId);

const getConfig = (moduleId) => OCR_CONFIG[moduleId] || null;

// Versión pública del config para el frontend: oculta el system prompt y el builder.
const getPublicConfig = (moduleId) => {
  const c = OCR_CONFIG[moduleId];
  if (!c) return null;
  return {
    enabled: true,
    label: c.label,
    levelLabel: c.levelLabel,
    levels: c.levels,
    focusOptions: c.focusOptions,
    feedbackModes: FEEDBACK_MODES,
  };
};

const enabledModuleIds = () => Object.keys(OCR_CONFIG);

module.exports = {
  isEnabled,
  getConfig,
  getPublicConfig,
  enabledModuleIds,
  FEEDBACK_MODES,
};
