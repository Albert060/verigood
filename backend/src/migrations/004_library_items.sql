-- VeriGood — Migración 004 — Biblioteca unificada
--
-- Persiste los outputs de CUALQUIER tool del catálogo Fase 1 (mat_eso.exam,
-- byg.quiz, len_eso.commentary, ingles.exercises, etc.) para que aparezcan
-- en la biblioteca del centro y se puedan re-descargar en PDF on-demand.
--
-- Cambridge sigue usando su tabla `exams` (legacy, ya en producción). La
-- biblioteca los une en runtime — sin duplicar storage.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/004_library_items.sql

BEGIN;

CREATE TABLE IF NOT EXISTS library_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES users(id),
  module_id       VARCHAR(64) NOT NULL,           -- 'lengua_eso', 'mat_eso', etc. (catálogo Fase 1)
  tool_key        VARCHAR(64),                    -- 'len_eso.exercises', null si es de otra fuente
  kind            VARCHAR(32) NOT NULL,           -- output_kind de la tool: text|exercise_set|rubric|timeline|quiz|commentary|exam
  title           VARCHAR(255) NOT NULL,
  payload         JSONB NOT NULL,                 -- el output completo (datos para regenerar PDF on-demand)
  metadata        JSONB NOT NULL DEFAULT '{}',    -- inputs del form (course, level, focus, count…)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_org        ON library_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_library_module     ON library_items(module_id);
CREATE INDEX IF NOT EXISTS idx_library_kind       ON library_items(kind);
CREATE INDEX IF NOT EXISTS idx_library_created    ON library_items(created_at DESC);

COMMIT;
