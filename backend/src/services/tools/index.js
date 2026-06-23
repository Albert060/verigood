// Registro central de handlers de herramientas.
// Cada handler es una función async (input, ctx) => { output_kind, output }.
// ctx = { moduleId, stage, userId, orgId, model }.
//
// El dispatcher HTTP (controllers/moduleToolsController.run) busca el handler
// por toolKey y lo invoca. Si no hay handler aún, devuelve 501 NOT_IMPLEMENTED.

const ingles              = require('./ingles');
const plastica            = require('./plastica');
const musica              = require('./musica');
const geoHistoria         = require('./geoHistoria');
const bioGeo              = require('./bioGeo');
const fisQuim             = require('./fisQuim');
const religion            = require('./religion');
const ciudadania          = require('./ciudadania');
const matematicasPrimaria = require('./matematicasPrimaria');
const lenguaPrimaria      = require('./lenguaPrimaria');
const medioPrimaria       = require('./medioPrimaria');
const edFisicaPrimaria    = require('./edFisicaPrimaria');
const edArtisticaPrimaria = require('./edArtisticaPrimaria');
const lenguaEso           = require('./lenguaEso');
const matematicasEso      = require('./matematicasEso');
const edFisicaEso         = require('./edFisicaEso');
const tecnoDigitalEso     = require('./tecnoDigitalEso');
const epvaEso             = require('./epvaEso');
const valoresEticosEso    = require('./valoresEticosEso');
const tutoriasEso         = require('./tutoriasEso');

const HANDLERS = {
  // ── output_kind: 'text' ──
  'ingles.writing':       ingles.writing, // legacy alias (compartido)
  'ingles_prim.writing':  ingles.writing, // separado: Primaria
  'ingles_eso.writing':   ingles.writing, // separado: ESO
  'plastica.projects':    plastica.projects,
  'musica.listening':     musica.listening,
  'musica.theory':        musica.theory,
  'geh.sheets':           geoHistoria.sheets,
  'byg.schemas':          bioGeo.schemas,
  'byg.lab':              bioGeo.lab,
  'religion.reflection':  religion.reflection,
  'ciudadania.debate':    ciudadania.debate,
  'ciudadania.case':      ciudadania.case_, // 'case' es palabra reservada → export como case_

  'mat_prim.manipulative': matematicasPrimaria.manipulative,
  'len_prim.writing':      lenguaPrimaria.writing,
  'med_prim.sheets':       medioPrimaria.sheets,
  'med_prim.experiments':  medioPrimaria.experiments,
  'efi_prim.sessions':     edFisicaPrimaria.sessions,
  'efi_prim.games':        edFisicaPrimaria.games,
  'art_prim.projects':     edArtisticaPrimaria.projects,
  'art_prim.audition':     edArtisticaPrimaria.audition,
  'len_eso.syntax':        lenguaEso.syntax,
  'len_eso.writing':       lenguaEso.writing,
  'efi_eso.sessions':      edFisicaEso.sessions,
  'efi_eso.theory':        edFisicaEso.theory,
  'tec_eso.projects':      tecnoDigitalEso.projects,
  'tec_eso.digital':       tecnoDigitalEso.digital,
  'epva.projects':         epvaEso.projects,
  'valores.dilemma':       valoresEticosEso.dilemma,
  'valores.debate':        valoresEticosEso.debate,
  'tutorias.session':      tutoriasEso.session,
  'tutorias.dynamics':     tutoriasEso.dynamics,
  'tutorias.conflict':     tutoriasEso.conflict,

  // ── output_kind: 'exercise_set' ──
  'ingles.exercises':       ingles.exercises, // legacy alias (compartido)
  'ingles.reading':         ingles.reading,
  'ingles_prim.exercises':  ingles.exercises, // separado: Primaria
  'ingles_prim.reading':    ingles.reading,
  'ingles_eso.exercises':   ingles.exercises, // separado: ESO
  'ingles_eso.reading':     ingles.reading,
  'byg.exam':             bioGeo.exam,
  'fyq.problems':         fisQuim.problems,

  'mat_prim.problems':    matematicasPrimaria.problems,
  'mat_prim.series':      matematicasPrimaria.series,
  'len_prim.exercises':   lenguaPrimaria.exercises,
  'len_prim.reading':     lenguaPrimaria.reading,
  'len_eso.exercises':    lenguaEso.exercises,
  'mat_eso.problems':     matematicasEso.problems,
  'mat_eso.exercises':    matematicasEso.exercises,
  'mat_eso.exam':         matematicasEso.exam,
  'tec_eso.exercises':    tecnoDigitalEso.exercises,

  // ── output_kind: 'rubric' ──
  'plastica.rubric':      plastica.rubric,
  'musica.assessment':    musica.assessment,

  'efi_prim.rubric':      edFisicaPrimaria.rubric,
  'art_prim.rubric':      edArtisticaPrimaria.rubric,
  'efi_eso.rubric':       edFisicaEso.rubric,
  'epva.rubric':          epvaEso.rubric,

  // ── output_kind: 'timeline' ──
  'geh.timeline':         geoHistoria.timeline,

  // ── output_kind: 'quiz' ──
  'geh.quiz':             geoHistoria.quiz,

  'med_prim.quiz':        medioPrimaria.quiz,

  // ── output_kind: 'commentary' ──
  'religion.commentary':  religion.commentary,

  'len_eso.commentary':   lenguaEso.commentary,
  'epva.analysis':        epvaEso.analysis,
  'valores.commentary':   valoresEticosEso.commentary,
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
