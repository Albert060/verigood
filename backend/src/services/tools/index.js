// Registro central de handlers de herramientas.
// Cada handler es una función async (input, ctx) => { output_kind, output }.
// ctx = { moduleId, stage, userId, orgId, model }.
//
// El dispatcher HTTP (controllers/moduleToolsController.run) busca el handler
// por toolKey y lo invoca. Si no hay handler aún, devuelve 501 NOT_IMPLEMENTED.

const ingles      = require('./ingles');
const plastica    = require('./plastica');
const musica      = require('./musica');
const geoHistoria = require('./geoHistoria');
const bioGeo      = require('./bioGeo');
const fisQuim     = require('./fisQuim');
const religion    = require('./religion');
const ciudadania  = require('./ciudadania');

const HANDLERS = {
  // ── output_kind: 'text' ──
  'ingles.writing':       ingles.writing,
  'plastica.projects':    plastica.projects,
  'musica.listening':     musica.listening,
  'musica.theory':        musica.theory,
  'geh.sheets':           geoHistoria.sheets,
  'byg.schemas':          bioGeo.schemas,
  'byg.lab':              bioGeo.lab,
  'religion.reflection':  religion.reflection,
  'ciudadania.debate':    ciudadania.debate,
  'ciudadania.case':      ciudadania.case_, // 'case' es palabra reservada → export como case_

  // ── output_kind: 'exercise_set' ──
  'ingles.exercises':     ingles.exercises,
  'ingles.reading':       ingles.reading,
  'byg.exam':             bioGeo.exam,
  'fyq.problems':         fisQuim.problems,

  // ── output_kind: 'rubric' ──
  'plastica.rubric':      plastica.rubric,
  'musica.assessment':    musica.assessment,

  // ── output_kind: 'timeline' ──
  'geh.timeline':         geoHistoria.timeline,

  // ── output_kind: 'quiz' ──
  'geh.quiz':             geoHistoria.quiz,

  // ── output_kind: 'commentary' ──
  'religion.commentary':  religion.commentary,
};

const run = async (toolKey, input, ctx) => {
  const handler = HANDLERS[toolKey];
  if (!handler) {
    const err = new Error(`Tool handler no implementado: ${toolKey}`);
    err.code = 'TOOL_NOT_IMPLEMENTED';
    err.status = 501;
    throw err;
  }
  return handler(input, ctx);
};

const knownKeys = () => Object.keys(HANDLERS);

module.exports = { run, knownKeys };
