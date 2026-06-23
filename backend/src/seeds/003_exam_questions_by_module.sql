-- VeriGood — Seed de SISTEMA: banco curado de preguntas por módulo
-- Demo realista (3-5 preguntas por módulo) para que el patrón híbrido BD+IA
-- quede en marcha desde el primer arranque. El contenido pedagógico real
-- se ampliará con el tiempo desde un panel interno o desde SQL directo.
--
-- Requisitos previos:
--   - migration 008_exam_questions_module_id.sql aplicada (module_id existe).
--   - Catálogo de módulos seedeado (001_modules_catalog.sql).
--
-- Idempotente vía clave compuesta (module_id + question hash informal): no
-- usamos ON CONFLICT porque exam_questions tiene id UUID generado y no hay
-- unique constraint sobre (module_id, question). En su lugar, comprobamos
-- existencia con NOT EXISTS para evitar duplicados al re-ejecutar.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/seeds/003_exam_questions_by_module.sql
--
-- Endurecido contra "Failed transaction: ROLLBACK required":
--   - SIN BEGIN/COMMIT global: si un bloque falla, los demás no caen en cascada.
--   - Guard upstream con DO + RAISE EXCEPTION: si falta la migración 008 o el
--     catálogo de módulos, el seed se detiene con un mensaje claro en vez de
--     arrastrar errores oscuros.
--   - Cada INSERT hace JOIN con `modules` para descartar IDs ausentes del
--     catálogo (evita "violates foreign key constraint").
--   - NOT EXISTS para no duplicar al re-ejecutar.

-- ── PRERREQUISITOS ──────────────────────────────────────────
-- Falla CLARO antes de tocar nada si el entorno está incompleto.
DO $prereq$
BEGIN
  -- 1) Migración 008 aplicada (existe columna module_id en exam_questions).
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'exam_questions'
       AND column_name = 'module_id'
  ) THEN
    RAISE EXCEPTION
      USING MESSAGE = 'Falta la migración 008. Ejecuta primero: psql $DATABASE_URL -f backend/src/migrations/008_exam_questions_module_id.sql',
            HINT    = 'Aplica todas las migraciones en orden antes de los seeds.';
  END IF;

  -- 2) Catálogo de módulos seedeado (sin esto, todas las FK fallarían).
  IF NOT EXISTS (SELECT 1 FROM modules LIMIT 1) THEN
    RAISE EXCEPTION
      USING MESSAGE = 'La tabla `modules` está vacía. Ejecuta primero: psql $DATABASE_URL -f backend/src/seeds/001_modules_catalog.sql',
            HINT    = 'Los seeds de SISTEMA deben aplicarse en orden 001 → 002 → 003.';
  END IF;

  -- 3) Defensivo: por si una rama antigua dejó module como NOT NULL.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'exam_questions'
       AND column_name = 'module'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE exam_questions ALTER COLUMN module DROP NOT NULL;
    RAISE NOTICE 'Ajuste menor: se ha relajado el NOT NULL de exam_questions.module (lo hace habitualmente la migración 008).';
  END IF;

  -- 4) La migración 001 dejó `level VARCHAR(10)`, pero etiquetas como
  --    "3º Primaria" o "1º Primaria" tienen 11 caracteres. Las preguntas
  --    Cambridge originales caben (B1, B2, A2, C1) pero el catálogo Fase 1
  --    no. Ampliamos a VARCHAR(50) sin perder datos.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'exam_questions'
       AND column_name = 'level'
       AND character_maximum_length IS NOT NULL
       AND character_maximum_length < 50
  ) THEN
    ALTER TABLE exam_questions ALTER COLUMN level TYPE VARCHAR(50);
    RAISE NOTICE 'Ajuste menor: exam_questions.level ampliado a VARCHAR(50) para soportar etiquetas tipo "3º Primaria".';
  END IF;
END $prereq$;

-- ── MATEMÁTICAS PRIMARIA ───────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('matematicas_primaria','3º Primaria','sumas','problem',
   'En una caja hay 27 manzanas. Si añadimos otra caja con 18 manzanas, ¿cuántas hay en total?',
   NULL,'45 manzanas','27 + 18 = 45. Suma sin llevadas mentalmente: 27+10=37, 37+8=45.',1),
  ('matematicas_primaria','4º Primaria','multiplicaciones','calculation',
   'Calcula: 23 × 4',NULL,'92','23 × 4 = (20 × 4) + (3 × 4) = 80 + 12 = 92.',1),
  ('matematicas_primaria','5º Primaria','fracciones','multiple_choice',
   '¿Cuál de estas fracciones es equivalente a 1/2?',
   '["2/3","3/6","2/5","1/4"]','3/6','Multiplicando numerador y denominador por 3 obtenemos 3/6.',1),
  ('matematicas_primaria','6º Primaria','decimales','problem',
   'Ana compra 1,5 kg de pan a 2,40 €/kg. ¿Cuánto paga?',
   NULL,'3,60 €','1,5 × 2,40 = 3,60 €.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── MATEMÁTICAS PRIMARIA · COMPLEMENTO 1º–2º ───────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('matematicas_primaria','1º Primaria','sumas','calculation',
   '5 + 3 = ?',NULL,'8','Suma básica con apoyo de los dedos: 5 dedos + 3 dedos = 8.',1),
  ('matematicas_primaria','1º Primaria','sumas','problem',
   'Marta tiene 4 lápices y le regalan 2. ¿Cuántos lápices tiene ahora?',
   NULL,'6 lápices','4 + 2 = 6.',1),
  ('matematicas_primaria','1º Primaria','restas','calculation',
   '9 - 4 = ?',NULL,'5','Resta básica: si quitamos 4 de 9, quedan 5.',1),
  ('matematicas_primaria','2º Primaria','sumas','problem',
   'En clase hay 12 niñas y 11 niños. ¿Cuántos alumnos hay en total?',
   NULL,'23 alumnos','12 + 11 = 23.',1),
  ('matematicas_primaria','2º Primaria','multiplicar','multiple_choice',
   '¿Cuánto es 3 × 4?',
   '["7","12","9","16"]','12','3 × 4 se lee "tres veces cuatro". 4+4+4=12.',1),
  ('matematicas_primaria','2º Primaria','multiplicar','calculation',
   '2 × 5 = ?',NULL,'10','Tabla del 2: dos veces 5 son 10.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── MATEMÁTICAS ESO ────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('matematicas_eso','1º ESO','fracciones','calculation',
   'Simplifica al máximo: 18/24',NULL,'3/4','MCD(18,24)=6. 18/6=3, 24/6=4.',1),
  ('matematicas_eso','2º ESO','ecuaciones','problem',
   'Resuelve: 3x + 5 = 20',NULL,'x = 5','3x = 15 → x = 5.',1),
  ('matematicas_eso','3º ESO','sistemas','problem',
   'Resuelve el sistema: x + y = 10 ; x - y = 4',NULL,'x = 7, y = 3',
   'Sumando ambas: 2x = 14, x=7. Sustituyendo: y=3.',1),
  ('matematicas_eso','4º ESO','funciones','multiple_choice',
   'La pendiente de la recta y = -2x + 7 es:',
   '["-2","2","7","-7"]','-2','En y = mx + n, m es la pendiente.',1),
  ('matematicas_eso','3º ESO','probabilidad','open',
   'Al lanzar un dado, ¿cuál es la probabilidad de obtener un número par?',
   NULL,'1/2 ó 0,5',
   'Casos favorables {2,4,6}=3. Casos posibles {1..6}=6. P=3/6=1/2.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── LENGUA PRIMARIA ────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('lengua_primaria','3º Primaria','ortografía','multiple_choice',
   '¿Cuál de las siguientes palabras está bien escrita?',
   '["beber","veber","bevér","veverr"]','beber','Verbo regular; se escribe con b en ambos casos.',1),
  ('lengua_primaria','4º Primaria','sustantivos','identify',
   'Identifica los sustantivos en: "La niña corre por el parque con su perro."',
   NULL,'niña, parque, perro','Son los nombres de personas, lugares o cosas.',1),
  ('lengua_primaria','5º Primaria','comprensión','literal',
   'Lee: "El verano es la estación más cálida del año en España, con temperaturas que pueden superar los 35 ºC." ¿Qué temperatura puede superarse en verano?',
   NULL,'35 ºC','Información literal del texto.',1),
  ('lengua_primaria','6º Primaria','verbos','transform',
   'Pon el verbo entre paréntesis en pretérito perfecto simple: "Ayer (comer) en casa de mi abuela."',
   NULL,'comí','1ª persona singular del pretérito perfecto simple de "comer".',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── LENGUA PRIMARIA · COMPLEMENTO 1º–2º ────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('lengua_primaria','1º Primaria','vocales','multiple_choice',
   '¿Cuál de estas letras es una vocal?',
   '["b","a","r","t"]','a','Las vocales son: a, e, i, o, u.',1),
  ('lengua_primaria','1º Primaria','sílabas','identify',
   '¿Cuántas sílabas tiene la palabra "casa"?',
   NULL,'2','ca-sa son dos sílabas.',1),
  ('lengua_primaria','2º Primaria','sustantivos','identify',
   'Identifica los sustantivos en: "El gato come pescado."',
   NULL,'gato, pescado','Son nombres de cosas, animales o personas.',1),
  ('lengua_primaria','2º Primaria','ortografía','multiple_choice',
   '¿Qué palabra está bien escrita?',
   '["arból","árbol","arbol","arboll"]','árbol','Lleva tilde en la primera sílaba (palabra grave terminada en consonante distinta de n/s).',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── LENGUA ESO ─────────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('lengua_eso','1º ESO','categorías gramaticales','identify',
   'Indica la categoría gramatical de "rápidamente": ',
   '["adjetivo","adverbio","sustantivo","preposición"]','adverbio',
   'Termina en -mente y modifica al verbo; es adverbio de modo.',1),
  ('lengua_eso','2º ESO','sintaxis','open',
   '¿Cuál es el sujeto de la oración: "Los estudiantes de tercero terminaron el examen pronto"?',
   NULL,'Los estudiantes de tercero','El sujeto es el sintagma nominal que concuerda con el verbo.',1),
  ('lengua_eso','3º ESO','literatura','multiple_choice',
   '"La casa de Bernarda Alba" fue escrita por:',
   '["Federico García Lorca","Antonio Machado","Miguel Hernández","Rafael Alberti"]',
   'Federico García Lorca','Obra teatral de Lorca publicada en 1936.',1),
  ('lengua_eso','4º ESO','comentario','open',
   'Define brevemente "metáfora" y pon un ejemplo:',
   NULL,'Figura retórica que identifica un término real con otro imaginario por semejanza. Ej.: "tus ojos son dos luceros".',
   'Identificación implícita basada en semejanza.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── INGLÉS PRIMARIA ────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('ingles_primaria','4º Primaria','present_simple','multiple_choice',
   'She ___ to school every day.',
   '["go","goes","going","gone"]','goes','Tercera persona del singular: -s.',1),
  ('ingles_primaria','5º Primaria','vocabulary','fill_blank',
   'Complete with the right colour: "The sun is ___."',
   NULL,'yellow','Color amarillo en inglés.',1),
  ('ingles_primaria','5º Primaria','prepositions','multiple_choice',
   'The book is ___ the table.',
   '["in","on","under","at"]','on','Sobre la mesa = on.',1),
  ('ingles_primaria','6º Primaria','present_continuous','transform',
   'Put the verb in present continuous: "I (play) football now."',
   NULL,'I am playing','Estructura: subject + am/is/are + verb-ing.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── INGLÉS PRIMARIA · COMPLEMENTO 1º–2º ────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('ingles_primaria','1º Primaria','colours','multiple_choice',
   'What colour is the sun?',
   '["blue","yellow","green","black"]','yellow','El sol es amarillo.',1),
  ('ingles_primaria','1º Primaria','numbers','fill_blank',
   'Complete: "1, 2, 3, ___, 5"',NULL,'4','Número cuatro en orden.',1),
  ('ingles_primaria','2º Primaria','greetings','multiple_choice',
   'What do you say in the morning?',
   '["Good night","Good morning","Goodbye","Good evening"]','Good morning',
   'Saludo de la mañana.',1),
  ('ingles_primaria','2º Primaria','animals','fill_blank',
   'Complete: "A ___ says meow."',NULL,'cat','El gato hace meow en inglés.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── INGLÉS ESO ─────────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('ingles_eso','1º ESO','past_simple','transform',
   'Transform to past simple: "I eat an apple."',
   NULL,'I ate an apple.','Irregular: eat → ate.',1),
  ('ingles_eso','2º ESO','conditionals','multiple_choice',
   'If it rains tomorrow, we ___ at home.',
   '["will stay","stay","stayed","would stay"]','will stay',
   'First conditional: if + present, will + infinitive.',1),
  ('ingles_eso','3º ESO','passive_voice','transform',
   'Make passive: "Shakespeare wrote Hamlet."',
   NULL,'Hamlet was written by Shakespeare.','Passive: BE + past participle + by.',1),
  ('ingles_eso','4º ESO','phrasal_verbs','multiple_choice',
   'Choose the meaning of "give up":',
   '["surrender","increase","collect","continue"]','surrender',
   '"Give up" means to stop trying or surrender.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── MEDIO PRIMARIA ─────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('medio_primaria','3º Primaria','seres vivos','multiple_choice',
   '¿Cuál de estos NO es un ser vivo?',
   '["roca","perro","planta","abeja"]','roca','Las rocas no nacen, ni se reproducen, ni mueren.',1),
  ('medio_primaria','4º Primaria','agua','literal',
   '¿En qué estados puede encontrarse el agua en la naturaleza?',
   NULL,'Sólido, líquido y gaseoso','Los tres estados de la materia comunes en la Tierra.',1),
  ('medio_primaria','5º Primaria','Tierra','multiple_choice',
   '¿Qué planeta es el más cercano al Sol?',
   '["Venus","Mercurio","Marte","Tierra"]','Mercurio','Mercurio es el primero del sistema solar.',1),
  ('medio_primaria','6º Primaria','España','multiple_choice',
   '¿Cuál es el río más largo de España?',
   '["Ebro","Tajo","Duero","Guadalquivir"]','Tajo',
   'Aunque desemboca en Portugal, su recorrido total es el mayor (≈1.007 km).',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── MEDIO PRIMARIA · COMPLEMENTO 1º–2º ─────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('medio_primaria','1º Primaria','cuerpo humano','multiple_choice',
   '¿Cuántos brazos tiene una persona?',
   '["1","2","3","4"]','2','Cada persona tiene dos brazos.',1),
  ('medio_primaria','1º Primaria','animales','multiple_choice',
   '¿Cuál de estos es un animal doméstico?',
   '["león","tigre","perro","oso"]','perro',
   'El perro vive con las personas en casa.',1),
  ('medio_primaria','2º Primaria','estaciones','multiple_choice',
   '¿En qué estación caen las hojas de los árboles?',
   '["primavera","verano","otoño","invierno"]','otoño',
   'En otoño los árboles caducifolios pierden sus hojas.',1),
  ('medio_primaria','2º Primaria','sentidos','literal',
   '¿Qué sentido usamos para escuchar la música?',
   NULL,'el oído','Oído: percibe los sonidos.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── GEOGRAFÍA E HISTORIA ESO ───────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('geo_historia_eso','1º ESO','prehistoria','multiple_choice',
   '¿Qué etapa de la prehistoria corresponde al descubrimiento de la agricultura?',
   '["Paleolítico","Neolítico","Edad del Bronce","Edad del Hierro"]','Neolítico',
   'El Neolítico (≈10.000 a.C.) marca la revolución agrícola.',1),
  ('geo_historia_eso','2º ESO','Edad Media','multiple_choice',
   '¿Qué hecho marca el inicio de la Edad Media?',
   '["Caída del Imperio Romano de Occidente (476)","Descubrimiento de América (1492)","Hégira (622)","Revolución Francesa (1789)"]',
   'Caída del Imperio Romano de Occidente (476)',
   'Es la convención académica más extendida.',1),
  ('geo_historia_eso','3º ESO','geografía','multiple_choice',
   '¿Cuál es la capital de Australia?',
   '["Sídney","Melbourne","Canberra","Perth"]','Canberra',
   'Sídney y Melbourne son las más pobladas, pero la capital es Canberra.',1),
  ('geo_historia_eso','4º ESO','contemporánea','multiple_choice',
   '¿En qué año cayó el Muro de Berlín?',
   '["1989","1991","1985","1979"]','1989',
   'El 9 de noviembre de 1989, símbolo del fin de la Guerra Fría.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── BIOLOGÍA Y GEOLOGÍA ESO ────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('bio_geo_eso','1º ESO','células','multiple_choice',
   '¿Cuál es la unidad fundamental de los seres vivos?',
   '["átomo","molécula","célula","tejido"]','célula','La célula es la unidad estructural y funcional.',1),
  ('bio_geo_eso','3º ESO','genética','open',
   'Define brevemente el concepto de "gen":',
   NULL,'Fragmento de ADN que codifica una proteína o un carácter heredable.',
   'Definición operativa básica del nivel.',1),
  ('bio_geo_eso','4º ESO','evolución','multiple_choice',
   '¿Quién formuló la teoría de la evolución por selección natural?',
   '["Mendel","Lamarck","Darwin","Pasteur"]','Darwin',
   'Charles Darwin (1859, "El origen de las especies").',1),
  ('bio_geo_eso','3º ESO','geología','multiple_choice',
   '¿Qué tipo de roca se forma por enfriamiento del magma?',
   '["sedimentaria","metamórfica","ígnea","caliza"]','ígnea',
   'Las rocas ígneas se forman por solidificación del magma.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── FÍSICA Y QUÍMICA ESO ───────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('fis_quim_eso','2º ESO','materia','multiple_choice',
   '¿Qué unidad del SI se usa para medir la masa?',
   '["litro","kilogramo","newton","julio"]','kilogramo',
   'Unidad fundamental del SI para la masa.',1),
  ('fis_quim_eso','3º ESO','química','open',
   'Calcula la masa molecular del agua (H₂O). Datos: H=1, O=16',
   NULL,'18 u','2·1 + 16 = 18 u.',1),
  ('fis_quim_eso','4º ESO','cinemática','problem',
   'Un coche recorre 240 km en 3 h. Calcula su velocidad media en km/h.',
   NULL,'80 km/h','v = e/t = 240/3 = 80 km/h.',1),
  ('fis_quim_eso','4º ESO','dinámica','problem',
   'Calcula la fuerza necesaria para acelerar a 2 m/s² una masa de 5 kg.',
   NULL,'10 N','F = m·a = 5 × 2 = 10 N.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── TECNOLOGÍA Y DIGITALIZACIÓN ESO ────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('tecno_digital_eso','1º ESO','informática','multiple_choice',
   '¿Qué dispositivo es de SALIDA?',
   '["teclado","ratón","impresora","escáner"]','impresora',
   'La impresora produce salida (papel impreso).',1),
  ('tecno_digital_eso','2º ESO','programación','multiple_choice',
   'En programación, ¿qué representa una "variable"?',
   '["un valor fijo","un espacio con nombre que guarda datos","un tipo de bucle","una función"]',
   'un espacio con nombre que guarda datos',
   'Las variables almacenan valores que pueden cambiar.',1),
  ('tecno_digital_eso','3º ESO','redes','multiple_choice',
   '¿Qué significa "URL"?',
   '["Universal Resource Locator","Uniform Resource Locator","Unique Reference Link","Unified Random List"]',
   'Uniform Resource Locator','Dirección única que identifica un recurso en la web.',1),
  ('tecno_digital_eso','4º ESO','digital','multiple_choice',
   '¿Cuál de estas NO es una buena práctica de contraseña segura?',
   '["Usar tu fecha de nacimiento","Combinar mayúsculas, minúsculas y números","Tener más de 12 caracteres","Usar gestor de contraseñas"]',
   'Usar tu fecha de nacimiento',
   'Las fechas son fáciles de adivinar para un atacante.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id  -- ignora IDs que no estén en el catálogo
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- Sin COMMIT global: cada INSERT se autocompromete individualmente.
