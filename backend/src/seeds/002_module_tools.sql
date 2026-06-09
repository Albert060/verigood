-- VeriGood — Seed de herramientas (tools) por módulo
-- Esto NO es demo data: es datos de sistema. Se ejecuta también en producción.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/seeds/002_module_tools.sql
--
-- Idempotente: ON CONFLICT actualiza nombre, descripción, schema y orden.
-- NO toca activaciones por organización.

BEGIN;

-- ── 1. CATÁLOGO DE HERRAMIENTAS ────────────────────────────
INSERT INTO module_tools (key, name, description, output_kind, input_schema, sort_order) VALUES

  -- ── INGLÉS (compartido Primaria + ESO) ──
  ('ingles.exercises',
   'Generador de ejercicios',
   'Baterías de ejercicios de gramática o vocabulario con clave de respuestas.',
   'exercise_set',
   '{"fields":[
      {"key":"level","label":"Nivel","type":"select","options":["A1","A2","B1","B2"],"required":true},
      {"key":"topic","label":"Tema","type":"text","placeholder":"Past simple, family vocabulary…","required":true},
      {"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":30,"default":10}
    ]}'::jsonb,
   10),

  ('ingles.writing',
   'Redacciones',
   'Propuestas de redacción guiadas o corrección de un texto del alumno.',
   'text',
   '{"fields":[
      {"key":"level","label":"Nivel","type":"select","options":["A1","A2","B1","B2"],"required":true},
      {"key":"mode","label":"Modo","type":"select","options":["propose","correct"],"required":true},
      {"key":"prompt_or_text","label":"Tema o texto","type":"textarea","required":true}
    ]}'::jsonb,
   20),

  ('ingles.reading',
   'Comprensión lectora',
   'Texto adaptado al nivel + preguntas con clave.',
   'exercise_set',
   '{"fields":[
      {"key":"level","label":"Nivel","type":"select","options":["A1","A2","B1","B2"],"required":true},
      {"key":"topic","label":"Temática","type":"text","required":false},
      {"key":"question_count","label":"Preguntas","type":"number","min":4,"max":15,"default":8}
    ]}'::jsonb,
   30),

  -- ── PLÁSTICA ──
  ('plastica.projects',
   'Proyectos creativos',
   'Propuestas de proyectos de plástica adaptados al curso, con materiales y fases.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"theme","label":"Temática","type":"text","placeholder":"Naturaleza, retrato, color…","required":true},
      {"key":"duration_sessions","label":"Sesiones","type":"number","min":1,"max":8,"default":2}
    ]}'::jsonb,
   10),

  ('plastica.rubric',
   'Rúbricas de evaluación',
   'Rúbrica con criterios y niveles de logro para evaluar un proyecto de plástica.',
   'rubric',
   '{"fields":[
      {"key":"project_title","label":"Título del proyecto","type":"text","required":true},
      {"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}
    ]}'::jsonb,
   20),

  -- ── MÚSICA ──
  ('musica.listening',
   'Actividades de escucha',
   'Actividades de escucha activa con preguntas guiadas sobre una obra.',
   'text',
   '{"fields":[
      {"key":"work","label":"Obra o pieza","type":"text","required":true},
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"focus","label":"Foco de la escucha","type":"select","options":["ritmo","melodia","timbre","forma","cultura"],"required":true}
    ]}'::jsonb,
   10),

  ('musica.theory',
   'Teoría musical',
   'Explicación didáctica de un concepto teórico con ejemplos y ejercicios.',
   'text',
   '{"fields":[
      {"key":"concept","label":"Concepto","type":"text","placeholder":"Notas en la clave de sol, compases simples…","required":true},
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true}
    ]}'::jsonb,
   20),

  ('musica.assessment',
   'Evaluación',
   'Rúbrica de evaluación de interpretación, audición o trabajo escrito.',
   'rubric',
   '{"fields":[
      {"key":"activity","label":"Actividad evaluada","type":"text","required":true},
      {"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":4}
    ]}'::jsonb,
   30),

  -- ── GEOGRAFÍA E HISTORIA ──
  ('geh.sheets',
   'Fichas temáticas',
   'Ficha con resumen, conceptos clave y actividades sobre un tema histórico o geográfico.',
   'text',
   '{"fields":[
      {"key":"topic","label":"Tema","type":"text","placeholder":"La Edad Media, climas de España…","required":true},
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}
    ]}'::jsonb,
   10),

  ('geh.timeline',
   'Líneas de tiempo',
   'Línea de tiempo con hitos seleccionados y contexto breve para cada uno.',
   'timeline',
   '{"fields":[
      {"key":"period","label":"Periodo","type":"text","placeholder":"Reconquista, Revolución Industrial…","required":true},
      {"key":"events_count","label":"Nº de hitos","type":"number","min":4,"max":15,"default":8},
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}
    ]}'::jsonb,
   20),

  ('geh.quiz',
   'Cuestionarios',
   'Cuestionario de preguntas tipo test sobre un tema, con corrección.',
   'quiz',
   '{"fields":[
      {"key":"topic","label":"Tema","type":"text","required":true},
      {"key":"question_count","label":"Preguntas","type":"number","min":5,"max":20,"default":10},
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}
    ]}'::jsonb,
   30),

  -- ── BIOLOGÍA Y GEOLOGÍA ──
  ('byg.schemas',
   'Esquemas',
   'Esquema jerárquico de un tema con conceptos, relaciones y ejemplos.',
   'text',
   '{"fields":[
      {"key":"topic","label":"Tema","type":"text","placeholder":"La célula, el ciclo del agua…","required":true},
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}
    ]}'::jsonb,
   10),

  ('byg.lab',
   'Actividades prácticas',
   'Práctica de laboratorio o de campo con objetivos, materiales y procedimiento.',
   'text',
   '{"fields":[
      {"key":"topic","label":"Tema","type":"text","required":true},
      {"key":"context","label":"Contexto","type":"select","options":["laboratorio","aula","campo"],"required":true},
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}
    ]}'::jsonb,
   20),

  ('byg.exam',
   'Preguntas de examen',
   'Preguntas de examen tipo (test, abiertas, desarrollo) con soluciones.',
   'exercise_set',
   '{"fields":[
      {"key":"topic","label":"Tema","type":"text","required":true},
      {"key":"types","label":"Tipos","type":"select","options":["mixto","test","abiertas","desarrollo"],"required":true},
      {"key":"count","label":"Nº de preguntas","type":"number","min":5,"max":25,"default":10},
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}
    ]}'::jsonb,
   30),

  -- ── FÍSICA Y QUÍMICA ──
  ('fyq.problems',
   'Problemas con resolución',
   'Problemas con enunciado, resolución paso a paso y resultado comentado.',
   'exercise_set',
   '{"fields":[
      {"key":"topic","label":"Tema","type":"text","placeholder":"Cinemática, formulación inorgánica…","required":true},
      {"key":"difficulty","label":"Dificultad","type":"select","options":["baja","media","alta"],"required":true},
      {"key":"count","label":"Nº de problemas","type":"number","min":3,"max":15,"default":5},
      {"key":"course","label":"Curso","type":"select","options":["2º ESO","3º ESO","4º ESO"],"required":true}
    ]}'::jsonb,
   10),

  -- ── RELIGIÓN (compartido Primaria + ESO) ──
  ('religion.reflection',
   'Actividades de reflexión',
   'Actividades de reflexión personal o grupal a partir de una idea o valor.',
   'text',
   '{"fields":[
      {"key":"theme","label":"Tema o valor","type":"text","placeholder":"Solidaridad, perdón, esperanza…","required":true},
      {"key":"stage_course","label":"Curso","type":"text","placeholder":"5º Primaria, 2º ESO…","required":true}
    ]}'::jsonb,
   10),

  ('religion.commentary',
   'Textos comentados',
   'Texto religioso o filosófico con comentario guiado y preguntas.',
   'commentary',
   '{"fields":[
      {"key":"text_or_reference","label":"Texto o referencia","type":"textarea","required":true},
      {"key":"stage_course","label":"Curso","type":"text","required":true}
    ]}'::jsonb,
   20),

  -- ── EDUCACIÓN PARA LA CIUDADANÍA ──
  ('ciudadania.debate',
   'Debates guiados',
   'Guion de debate con posturas, argumentos y preguntas moderadoras.',
   'text',
   '{"fields":[
      {"key":"topic","label":"Tema del debate","type":"text","required":true},
      {"key":"course","label":"Curso","type":"select","options":["3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true}
    ]}'::jsonb,
   10),

  ('ciudadania.case',
   'Casos prácticos',
   'Caso práctico con dilema ético y preguntas de análisis.',
   'text',
   '{"fields":[
      {"key":"theme","label":"Ámbito","type":"text","placeholder":"Convivencia, derechos, medio ambiente…","required":true},
      {"key":"course","label":"Curso","type":"select","options":["3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true}
    ]}'::jsonb,
   20)

ON CONFLICT (key) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  output_kind  = EXCLUDED.output_kind,
  input_schema = EXCLUDED.input_schema,
  sort_order   = EXCLUDED.sort_order;

-- ── 2. VINCULACIONES MÓDULO ↔ HERRAMIENTA ──────────────────
INSERT INTO module_tool_bindings (module_id, tool_key, sort_order) VALUES
  -- Inglés (compartido)
  ('ingles_primaria', 'ingles.exercises', 10),
  ('ingles_primaria', 'ingles.writing',   20),
  ('ingles_primaria', 'ingles.reading',   30),
  ('ingles_eso',      'ingles.exercises', 10),
  ('ingles_eso',      'ingles.writing',   20),
  ('ingles_eso',      'ingles.reading',   30),
  -- Plástica
  ('plastica_primaria', 'plastica.projects', 10),
  ('plastica_primaria', 'plastica.rubric',   20),
  -- Música
  ('musica_primaria', 'musica.listening',  10),
  ('musica_primaria', 'musica.theory',     20),
  ('musica_primaria', 'musica.assessment', 30),
  -- Geografía e Historia
  ('geo_historia_eso', 'geh.sheets',   10),
  ('geo_historia_eso', 'geh.timeline', 20),
  ('geo_historia_eso', 'geh.quiz',     30),
  -- Biología y Geología
  ('bio_geo_eso', 'byg.schemas', 10),
  ('bio_geo_eso', 'byg.lab',     20),
  ('bio_geo_eso', 'byg.exam',    30),
  -- Física y Química
  ('fis_quim_eso', 'fyq.problems', 10),
  -- Religión (compartido)
  ('religion_primaria', 'religion.reflection', 10),
  ('religion_primaria', 'religion.commentary', 20),
  ('religion_eso',      'religion.reflection', 10),
  ('religion_eso',      'religion.commentary', 20),
  -- Ciudadanía
  ('ciudadania_primaria', 'ciudadania.debate', 10),
  ('ciudadania_primaria', 'ciudadania.case',   20)
ON CONFLICT (module_id, tool_key) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;

COMMIT;
