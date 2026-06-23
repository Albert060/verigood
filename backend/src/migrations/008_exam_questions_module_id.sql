-- VeriGood — Migración 008: exam_questions soporta el catálogo Fase 1
-- Hasta ahora `exam_questions.module` era del enum legacy `module_type`
-- (cambridge / espanol / matematicas / medio / oposiciones), lo que impedía
-- almacenar preguntas para los 23 módulos del catálogo Fase 1
-- (matematicas_primaria, ingles_eso, bio_geo_eso, …).
--
-- Solución no destructiva: añadimos `module_id VARCHAR(50) REFERENCES modules(id)`
-- y dejamos el enum como NULLABLE para compat con las filas existentes.
-- Los nuevos seeds y el código nuevo trabajan con `module_id` exclusivamente.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/008_exam_questions_module_id.sql
--
-- Idempotente.

BEGIN;

-- 1. Nueva columna y FK al catálogo.
ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS module_id VARCHAR(50) REFERENCES modules(id);

-- 2. Backfill desde el enum legacy.
UPDATE exam_questions
   SET module_id = 'cambridge'
 WHERE module_id IS NULL AND module = 'cambridge';

-- 3. El enum era NOT NULL. Lo flexibilizamos para que los seeds del
--    catálogo Fase 1 puedan usar solo module_id sin tener que mapear a
--    un valor del enum legacy.
ALTER TABLE exam_questions
  ALTER COLUMN module DROP NOT NULL;

-- 3b. La 001 declaró `level VARCHAR(10)`, pensada para "B1"/"C1" de
--     Cambridge. Etiquetas del catálogo Fase 1 como "3º Primaria" tienen
--     11 caracteres. Ampliamos sin pérdida (idempotente vía cast).
ALTER TABLE exam_questions
  ALTER COLUMN level TYPE VARCHAR(50);

-- 4. Índice principal por module_id + level + topic — sustituye en el
--    futuro al idx_eq_module_level que indexa el enum legacy.
CREATE INDEX IF NOT EXISTS idx_eq_moduleid_level
  ON exam_questions(module_id, level)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_eq_moduleid_topic
  ON exam_questions(module_id, topic)
  WHERE is_active = true;

COMMIT;
