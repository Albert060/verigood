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
      {"key":"level","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria","1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"topic","label":"Tema","type":"text","placeholder":"Past simple, family vocabulary…","required":true},
      {"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":30,"default":10}
    ]}'::jsonb,
   10),

  ('ingles.writing',
   'Redacciones',
   'Propuestas de redacción guiadas o corrección de un texto del alumno.',
   'text',
   '{"fields":[
      {"key":"level","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria","1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"mode","label":"Modo","type":"select","options":["propose","correct"],"required":true},
      {"key":"prompt_or_text","label":"Tema o texto","type":"textarea","required":true}
    ]}'::jsonb,
   20),

  ('ingles.reading',
   'Comprensión lectora',
   'Texto adaptado al nivel + preguntas con clave.',
   'exercise_set',
   '{"fields":[
      {"key":"level","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria","1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
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
   20),

  -- ── MATEMÁTICAS — PRIMARIA ──
  ('mat_prim.problems',
   'Problemas matemáticos',
   'Problemas verbalizados con resolución paso a paso, contextualizados a la vida cotidiana.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"topic","label":"Tema","type":"text","placeholder":"Sumas con llevadas, fracciones, perímetro…","required":true},
      {"key":"count","label":"Nº de problemas","type":"number","min":3,"max":15,"default":6}
    ]}'::jsonb,
   10),

  ('mat_prim.series',
   'Series de cálculo',
   'Serie graduada de ejercicios de cálculo puro para practicar una destreza concreta.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"skill","label":"Destreza","type":"text","placeholder":"Multiplicar por una cifra, dividir por dos cifras…","required":true},
      {"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":30,"default":15}
    ]}'::jsonb,
   20),

  ('mat_prim.manipulative',
   'Actividades manipulativas',
   'Actividad manipulativa para introducir o reforzar un concepto.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"concept","label":"Concepto","type":"text","placeholder":"Decenas y unidades, simetría, fracciones…","required":true}
    ]}'::jsonb,
   30),

  -- ── LENGUA — PRIMARIA ──
  ('len_prim.exercises',
   'Ejercicios de lengua',
   'Ejercicios mixtos de gramática, ortografía y léxico con clave.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"focus","label":"Foco","type":"text","placeholder":"Sílaba tónica, sinónimos, uso de la b/v…","required":true},
      {"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":25,"default":12}
    ]}'::jsonb,
   10),

  ('len_prim.reading',
   'Comprensión lectora',
   'Texto adaptado al curso con preguntas literales, inferenciales y de vocabulario.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"topic","label":"Tema del texto","type":"text","placeholder":"Animales del bosque, una excursión, un invento…","required":true},
      {"key":"question_count","label":"Preguntas","type":"number","min":4,"max":15,"default":8}
    ]}'::jsonb,
   20),

  ('len_prim.writing',
   'Propuestas de escritura',
   'Tarea de escritura con andamiaje, plantilla y criterios de revisión.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"genre","label":"Género o tipo de texto","type":"text","placeholder":"Carta, descripción, cuento, noticia…","required":true}
    ]}'::jsonb,
   30),

  -- ── CONOCIMIENTO DEL MEDIO — PRIMARIA ──
  ('med_prim.sheets',
   'Fichas temáticas',
   'Ficha con conceptos clave, explicación y actividades sobre un tema del medio.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"topic","label":"Tema","type":"text","placeholder":"El ciclo del agua, los oficios, los mamíferos…","required":true}
    ]}'::jsonb,
   10),

  ('med_prim.quiz',
   'Cuestionarios',
   'Cuestionario tipo test con 4 opciones y explicación de cada respuesta.',
   'quiz',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"topic","label":"Tema","type":"text","required":true},
      {"key":"question_count","label":"Preguntas","type":"number","min":5,"max":20,"default":10}
    ]}'::jsonb,
   20),

  ('med_prim.experiments',
   'Experimentos sencillos',
   'Experimento o investigación sencilla con materiales del aula.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"topic","label":"Tema","type":"text","placeholder":"Flotación, plantas, sombras…","required":true}
    ]}'::jsonb,
   30),

  -- ── EDUCACIÓN FÍSICA — PRIMARIA ──
  ('efi_prim.sessions',
   'Sesiones de EF',
   'Sesión completa con calentamiento, parte principal y vuelta a la calma.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"content_block","label":"Bloque","type":"text","placeholder":"Habilidades motrices, juegos populares, expresión corporal…","required":true},
      {"key":"duration_minutes","label":"Duración (min)","type":"number","min":30,"max":90,"default":50}
    ]}'::jsonb,
   10),

  ('efi_prim.games',
   'Juegos motrices',
   'Fichas de juegos para desarrollar una habilidad concreta, con variantes inclusivas.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"skill","label":"Habilidad","type":"text","placeholder":"Coordinación, equilibrio, cooperación…","required":true},
      {"key":"count","label":"Nº de juegos","type":"number","min":2,"max":8,"default":4}
    ]}'::jsonb,
   20),

  ('efi_prim.rubric',
   'Rúbricas EF',
   'Rúbrica con criterios observables para evaluar una actividad de EF.',
   'rubric',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"activity","label":"Actividad evaluada","type":"text","required":true},
      {"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}
    ]}'::jsonb,
   30),

  -- ── EDUCACIÓN ARTÍSTICA — PRIMARIA ──
  ('art_prim.projects',
   'Proyectos artísticos',
   'Proyecto integrado de plástica y/o música con producto final y secuencia.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"theme","label":"Temática","type":"text","placeholder":"El color, los sonidos del entorno, retrato…","required":true},
      {"key":"duration_sessions","label":"Sesiones","type":"number","min":1,"max":8,"default":3}
    ]}'::jsonb,
   10),

  ('art_prim.audition',
   'Audiciones comentadas',
   'Audición activa de una obra con guion de escucha y conexión plástica.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"work","label":"Obra","type":"text","placeholder":"En la gruta del rey de la montaña, El Carnaval de los Animales…","required":true}
    ]}'::jsonb,
   20),

  ('art_prim.rubric',
   'Rúbricas artísticas',
   'Rúbrica con criterios técnicos, expresivos y procesuales.',
   'rubric',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},
      {"key":"activity","label":"Actividad evaluada","type":"text","required":true},
      {"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}
    ]}'::jsonb,
   30),

  -- ── LENGUA — ESO ──
  ('len_eso.exercises',
   'Ejercicios de lengua',
   'Ejercicios mixtos de gramática, léxico y ortografía de nivel ESO.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"focus","label":"Foco","type":"text","placeholder":"Perífrasis verbales, locuciones, signos de puntuación…","required":true},
      {"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":25,"default":12}
    ]}'::jsonb,
   10),

  ('len_eso.syntax',
   'Análisis sintáctico',
   'Análisis sintáctico paso a paso de una oración, con árbol final y errores frecuentes.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"sentence","label":"Oración","type":"textarea","placeholder":"Pega aquí la oración a analizar…","required":true}
    ]}'::jsonb,
   20),

  ('len_eso.commentary',
   'Comentario de texto',
   'Comentario guiado: tema, estructura, análisis estilístico e interpretación.',
   'commentary',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"text_or_reference","label":"Texto o referencia","type":"textarea","required":true}
    ]}'::jsonb,
   30),

  ('len_eso.writing',
   'Redacciones',
   'Propuestas de redacción guiadas o corrección de un texto del alumno.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"mode","label":"Modo","type":"select","options":["propose","correct"],"required":true},
      {"key":"prompt_or_text","label":"Tema o texto","type":"textarea","required":true}
    ]}'::jsonb,
   40),

  -- ── MATEMÁTICAS — ESO ──
  ('mat_eso.problems',
   'Problemas con resolución',
   'Problemas verbalizados con resolución paso a paso y comprobación.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"topic","label":"Tema","type":"text","placeholder":"Ecuaciones de primer grado, proporcionalidad, geometría…","required":true},
      {"key":"difficulty","label":"Dificultad","type":"select","options":["baja","media","alta"],"required":true},
      {"key":"count","label":"Nº de problemas","type":"number","min":3,"max":15,"default":6}
    ]}'::jsonb,
   10),

  ('mat_eso.exercises',
   'Tandas de ejercicios',
   'Serie graduada de ejercicios procedimentales para una destreza.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"topic","label":"Tema","type":"text","required":true},
      {"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":30,"default":15}
    ]}'::jsonb,
   20),

  ('mat_eso.exam',
   'Preguntas de examen',
   'Preguntas de examen tipo (test, abiertas, desarrollo) con soluciones y puntuación sobre 10.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"topic","label":"Tema","type":"text","required":true},
      {"key":"count","label":"Nº de preguntas","type":"number","min":4,"max":15,"default":8}
    ]}'::jsonb,
   30),

  -- ── EDUCACIÓN FÍSICA — ESO ──
  ('efi_eso.sessions',
   'Sesiones de EF',
   'Sesión completa de EF para ESO, con calentamiento, parte principal y vuelta a la calma.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"content_block","label":"Bloque","type":"text","placeholder":"Acondicionamiento físico, deportes colectivos, ritmo y expresión…","required":true},
      {"key":"duration_minutes","label":"Duración (min)","type":"number","min":30,"max":90,"default":55}
    ]}'::jsonb,
   10),

  ('efi_eso.theory',
   'Contenidos teóricos',
   'Explicación didáctica de un contenido teórico (salud, anatomía, sistemas energéticos…).',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"topic","label":"Tema","type":"text","required":true}
    ]}'::jsonb,
   20),

  ('efi_eso.rubric',
   'Rúbricas EF',
   'Rúbrica con criterios técnicos, tácticos y actitudinales.',
   'rubric',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"activity","label":"Actividad evaluada","type":"text","required":true},
      {"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}
    ]}'::jsonb,
   30),

  -- ── TECNOLOGÍA Y DIGITALIZACIÓN — ESO ──
  ('tec_eso.projects',
   'Proyectos tecnológicos',
   'Proyecto guiado por el método de proyectos: análisis, diseño, construcción y evaluación.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"theme","label":"Reto / temática","type":"text","placeholder":"Vivienda eficiente, juguete con motor, app de aula…","required":true},
      {"key":"duration_sessions","label":"Sesiones","type":"number","min":2,"max":12,"default":4}
    ]}'::jsonb,
   10),

  ('tec_eso.exercises',
   'Ejercicios técnicos',
   'Ejercicios mixtos: cálculo técnico, diseño, identificación o snippets de código.',
   'exercise_set',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"topic","label":"Tema","type":"text","placeholder":"Circuitos eléctricos, hojas de cálculo, algoritmos básicos…","required":true},
      {"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":20,"default":10}
    ]}'::jsonb,
   20),

  ('tec_eso.digital',
   'Competencia digital',
   'Actividad de competencia digital con reflexión crítica sobre el uso de las herramientas.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"focus","label":"Foco","type":"text","placeholder":"Búsqueda de información, identidad digital, IA generativa…","required":true}
    ]}'::jsonb,
   30),

  -- ── EPVA — ESO ──
  ('epva.projects',
   'Proyectos visuales',
   'Proyecto plástico o audiovisual con referente artístico y producto final.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"theme","label":"Temática","type":"text","placeholder":"Autorretrato, paisaje sonoro, cartel social…","required":true},
      {"key":"duration_sessions","label":"Sesiones","type":"number","min":2,"max":10,"default":4}
    ]}'::jsonb,
   10),

  ('epva.rubric',
   'Rúbricas EPVA',
   'Rúbrica que combina técnica, expresividad y proceso.',
   'rubric',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"activity","label":"Actividad evaluada","type":"text","required":true},
      {"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}
    ]}'::jsonb,
   20),

  ('epva.analysis',
   'Análisis de obra',
   'Análisis guiado de una obra visual o audiovisual con descripción, análisis y juicio.',
   'commentary',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"work_or_reference","label":"Obra o referencia","type":"textarea","placeholder":"Las Meninas, un fotograma de una película, un cartel publicitario…","required":true}
    ]}'::jsonb,
   30),

  -- ── VALORES ÉTICOS — ESO ──
  ('valores.dilemma',
   'Dilemas éticos',
   'Dilema ético con marcos filosóficos en juego y preguntas de análisis.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"theme","label":"Tema","type":"text","placeholder":"Privacidad, justicia, lealtad, libertad de expresión…","required":true}
    ]}'::jsonb,
   10),

  ('valores.debate',
   'Debates guiados',
   'Guion de debate con posturas anclajes filosóficos y reglas.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"topic","label":"Tema","type":"text","required":true}
    ]}'::jsonb,
   20),

  ('valores.commentary',
   'Comentario filosófico',
   'Comentario guiado de un texto filosófico o ensayo.',
   'commentary',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"text_or_reference","label":"Texto o referencia","type":"textarea","required":true}
    ]}'::jsonb,
   30),

  -- ── TUTORÍAS — ESO ──
  ('tutorias.session',
   'Sesiones de tutoría',
   'Sesión de tutoría con apertura, desarrollo, cierre y atención a la diversidad.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"focus","label":"Foco","type":"text","placeholder":"Gestión del estrés, hábitos de estudio, autoestima…","required":true},
      {"key":"duration_minutes","label":"Duración (min)","type":"number","min":30,"max":90,"default":55}
    ]}'::jsonb,
   10),

  ('tutorias.dynamics',
   'Dinámicas de grupo',
   'Dinámicas de cohesión y trabajo socioemocional con riesgos a vigilar.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"goal","label":"Objetivo","type":"text","placeholder":"Cohesión, escucha activa, conocimiento mutuo…","required":true},
      {"key":"count","label":"Nº de dinámicas","type":"number","min":1,"max":6,"default":3}
    ]}'::jsonb,
   20),

  ('tutorias.conflict',
   'Gestión de conflictos',
   'Guion de intervención ante una situación de convivencia, con protocolo y derivaciones.',
   'text',
   '{"fields":[
      {"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},
      {"key":"situation","label":"Situación","type":"textarea","placeholder":"Describe la situación que ha surgido en el grupo…","required":true}
    ]}'::jsonb,
   30)

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
  ('ciudadania_primaria', 'ciudadania.case',   20),
  -- Matemáticas Primaria
  ('matematicas_primaria', 'mat_prim.problems',     10),
  ('matematicas_primaria', 'mat_prim.series',       20),
  ('matematicas_primaria', 'mat_prim.manipulative', 30),
  -- Lengua Primaria
  ('lengua_primaria', 'len_prim.exercises', 10),
  ('lengua_primaria', 'len_prim.reading',   20),
  ('lengua_primaria', 'len_prim.writing',   30),
  -- Conocimiento del medio
  ('medio_primaria', 'med_prim.sheets',      10),
  ('medio_primaria', 'med_prim.quiz',        20),
  ('medio_primaria', 'med_prim.experiments', 30),
  -- Educación Física Primaria
  ('ed_fisica_primaria', 'efi_prim.sessions', 10),
  ('ed_fisica_primaria', 'efi_prim.games',    20),
  ('ed_fisica_primaria', 'efi_prim.rubric',   30),
  -- Educación Artística Primaria
  ('ed_artistica_primaria', 'art_prim.projects', 10),
  ('ed_artistica_primaria', 'art_prim.audition', 20),
  ('ed_artistica_primaria', 'art_prim.rubric',   30),
  -- Lengua ESO
  ('lengua_eso', 'len_eso.exercises',  10),
  ('lengua_eso', 'len_eso.syntax',     20),
  ('lengua_eso', 'len_eso.commentary', 30),
  ('lengua_eso', 'len_eso.writing',    40),
  -- Matemáticas ESO
  ('matematicas_eso', 'mat_eso.problems',  10),
  ('matematicas_eso', 'mat_eso.exercises', 20),
  ('matematicas_eso', 'mat_eso.exam',      30),
  -- Educación Física ESO
  ('ed_fisica_eso', 'efi_eso.sessions', 10),
  ('ed_fisica_eso', 'efi_eso.theory',   20),
  ('ed_fisica_eso', 'efi_eso.rubric',   30),
  -- Tecnología y Digitalización ESO
  ('tecno_digital_eso', 'tec_eso.projects',  10),
  ('tecno_digital_eso', 'tec_eso.exercises', 20),
  ('tecno_digital_eso', 'tec_eso.digital',   30),
  -- EPVA ESO
  ('epva_eso', 'epva.projects', 10),
  ('epva_eso', 'epva.rubric',   20),
  ('epva_eso', 'epva.analysis', 30),
  -- Valores Éticos ESO
  ('valores_eticos_eso', 'valores.dilemma',    10),
  ('valores_eticos_eso', 'valores.debate',     20),
  ('valores_eticos_eso', 'valores.commentary', 30),
  -- Tutorías ESO
  ('tutorias_eso', 'tutorias.session',  10),
  ('tutorias_eso', 'tutorias.dynamics', 20),
  ('tutorias_eso', 'tutorias.conflict', 30)
ON CONFLICT (module_id, tool_key) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;

COMMIT;
