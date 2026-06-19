// Servicio genérico de corrección por OCR para asignaturas.
// Reutiliza extractTextFromImage del servicio Cambridge para no duplicar el
// cliente de Google Vision. El prompt y la configuración por asignatura viven
// en ocrSubjects.js.

const { callClaudeJSON } = require('./claudeService');
const { extractTextFromImage } = require('./ocrCorrectorService');
const { getConfig } = require('./ocrSubjects');
const { aiAvailable } = require('../utils/aiAvailable');

const visionConfigured = () =>
  !!process.env.GOOGLE_CLOUD_PROJECT_ID &&
  !!process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !process.env.GOOGLE_APPLICATION_CREDENTIALS.includes('PLACEHOLDER');

// Fixture mínimo cuando no hay IA disponible: permite que la UI siga viva
// en entornos demo sin credenciales.
const demoFixture = (cfg, { course }) => ({
  subject: cfg.label,
  course: course || '',
  totalScore: 6,
  maxScore: 10,
  percentage: 60,
  grade: 'Bien',
  questions: [
    { number: 1, question: 'Pregunta de ejemplo 1', studentAnswer: 'respuesta del alumno', correctAnswer: 'respuesta correcta', isCorrect: true,  points: 2, comment: 'Correcta.' },
    { number: 2, question: 'Pregunta de ejemplo 2', studentAnswer: 'respuesta del alumno', correctAnswer: 'respuesta correcta', isCorrect: false, points: 0, comment: 'Confunde el concepto.' },
  ],
  strengths: ['Comprende la idea general.'],
  improvements: ['Falta precisión en los conceptos clave.'],
  studyRecommendations: [
    'Repasar los términos del tema.',
    'Resolver 3 ejercicios extra del libro.',
  ],
  overallFeedback: '[Modo demo — sin credenciales de IA] Correcciones de muestra para ilustrar el flujo.',
});

const processSubjectExam = async ({ imageBuffer, moduleId, course, focus, feedbackMode = 'full' }) => {
  const cfg = getConfig(moduleId);
  if (!cfg) {
    const err = new Error(`OCR no disponible para el módulo ${moduleId}`);
    err.code = 'OCR_NOT_ENABLED';
    err.status = 404;
    throw err;
  }

  // 1) OCR
  let extractedText = null;
  if (visionConfigured()) {
    try {
      extractedText = await extractTextFromImage(imageBuffer);
    } catch (err) {
      console.error(`OCR error (module=${moduleId}):`, err.message);
    }
  }
  if (!extractedText) {
    extractedText = `[Modo demo — sin Google Vision configurado]
Ejemplo de respuesta del alumno: contenido placeholder para que la corrección IA pueda ejecutarse aún sin OCR real.`;
  }

  // 2) Corrección
  let correction;
  if (!aiAvailable()) {
    correction = demoFixture(cfg, { course });
  } else {
    const userMessage = cfg.userPromptBuilder({ extractedText, course, focus, feedbackMode });
    correction = await callClaudeJSON({
      system: cfg.system,
      messages: userMessage,
      model: 'haiku',
      maxTokens: 3000,
    });
  }

  return {
    ...correction,
    moduleId,
    subjectLabel: cfg.label,
    course: course || '',
    focus: focus || null,
    feedbackMode,
    extractedText,
    processedAt: new Date().toISOString(),
    visionUsed: visionConfigured() && !extractedText.startsWith('[Modo demo'),
  };
};

module.exports = { processSubjectExam };
