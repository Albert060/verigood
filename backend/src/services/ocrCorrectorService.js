const { callClaudeJSON, resolveApiKey } = require('./claudeService');
const { aiAvailable } = require('../utils/aiAvailable');
const fixtures = require('./demoFixtures');

let visionClient = null;
let visionAvailable = null;

const visionConfigured = () => {
  if (visionAvailable !== null) return visionAvailable;
  visionAvailable =
    !!process.env.GOOGLE_CLOUD_PROJECT_ID &&
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS.includes('PLACEHOLDER');
  return visionAvailable;
};

const getVisionClient = () => {
  if (!visionClient) {
    const vision = require('@google-cloud/vision');
    visionClient = new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }
  return visionClient;
};

const extractTextFromImage = async (imageBuffer) => {
  const client = getVisionClient();
  const [result] = await client.textDetection({ image: { content: imageBuffer } });
  const detections = result.textAnnotations;
  if (!detections || detections.length === 0) {
    throw new Error('No se pudo extraer texto de la imagen');
  }
  return detections[0].description;
};

const correctExam = async ({ extractedText, certification, level, feedbackMode = 'full', referenceAnswerKey = null }) => {
  if (!aiAvailable(resolveApiKey())) {
    return fixtures.ocrCorrection({ certification, level });
  }

  const system = `You are an expert Cambridge English examiner. Analyze student exam answers and provide precise corrections.
Always respond with valid JSON only.`;

  // Si el profesor validó una clave de respuestas de referencia (temario), se
  // prepone para que Claude corrija contra ese criterio exacto (igual criterio
  // para todos los alumnos del mismo ejercicio).
  const referenceBlock = referenceAnswerKey && String(referenceAnswerKey).trim()
    ? `\nTEACHER'S REFERENCE ANSWER KEY (validated):
${String(referenceAnswerKey).trim()}

Use this key as the exact correction criterion.`
    : '';

  const prompt = `Analyze this ${certification} ${level} exam text:
${referenceBlock}
---
${extractedText}
---

Feedback mode: ${feedbackMode}

Return JSON: { certification, level, totalScore, maxScore, percentage, grade, questions:[...], grammarErrors:[...], strengths, improvements, studyRecommendations, overallFeedback }.`;

  return await callClaudeJSON({ system, messages: prompt, model: 'haiku', maxTokens: 3000 });
};

const processExamImage = async ({ imageBuffer, certification, level, feedbackMode, referenceAnswerKey = null }) => {
  let extractedText = null;

  if (visionConfigured()) {
    try {
      extractedText = await extractTextFromImage(imageBuffer);
    } catch (err) {
      console.error('OCR error:', err);
    }
  }

  // Demo mode: no Vision configured → use placeholder transcription
  if (!extractedText) {
    extractedText = `[Modo demo — sin Google Vision configurado]
Q1. She has gone to Paris. Q2. I have went to the cinema. Q3. They didn't came yesterday.
Q4. He is the more intelligent boy. Q5. We're playing tennis since 2 hours.`;
  }

  const correction = await correctExam({ extractedText, certification, level, feedbackMode, referenceAnswerKey });

  return {
    ...correction,
    extractedText,
    processedAt: new Date().toISOString(),
    visionUsed: visionConfigured() && extractedText && !extractedText.startsWith('[Modo demo'),
  };
};

module.exports = { processExamImage, extractTextFromImage, correctExam };
