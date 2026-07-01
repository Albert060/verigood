-- VeriGood — Migración 010: Temario por módulo (Fase D)
--
-- Introduce el concepto "Temario" como landing principal de cada módulo.
-- El temario es único por (organización, módulo). Un temario tiene N temas
-- (sections). Cada tema tiene N items tipados (ejercicio, presentación,
-- dinámica, examen, documentación) que apuntan opcionalmente a un
-- library_item ya generado por el sistema de tools.
--
-- Los items NO duplican contenido: son punteros a library_items. Un slot vacío
-- (library_item_id NULL) es una casilla en el temario pendiente de rellenar
-- disparando la tool correspondiente.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/010_syllabus.sql
--
-- Idempotente (CREATE TABLE IF NOT EXISTS).

BEGIN;

-- ── 1. Syllabi — un temario por (organización, módulo) ────────
CREATE TABLE IF NOT EXISTS syllabi (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id       VARCHAR(50) NOT NULL REFERENCES modules(id),
  name            VARCHAR(255) NOT NULL DEFAULT 'Temario',
  created_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_syllabi_org_module
  ON syllabi(organization_id, module_id);

-- ── 2. Syllabus sections — temas ordenados dentro del temario ─
CREATE TABLE IF NOT EXISTS syllabus_sections (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  syllabus_id UUID         NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_sections_syllabus
  ON syllabus_sections(syllabus_id, sort_order);

-- ── 3. Syllabus items — casillas tipadas dentro de un tema ────
-- kind:
--   'exercise'      → ejercicio (exercise_set / quiz)
--   'presentation'  → presentación (text / slides)
--   'dynamic'       → dinámica de clase
--   'exam'          → examen completo
--   'documentation' → material de apoyo del profe
--
-- library_item_id: opcional. NULL = slot pendiente de rellenar.
CREATE TABLE IF NOT EXISTS syllabus_items (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id      UUID         NOT NULL REFERENCES syllabus_sections(id) ON DELETE CASCADE,
  kind            VARCHAR(20)  NOT NULL CHECK (kind IN ('exercise', 'presentation', 'dynamic', 'exam', 'documentation')),
  title           VARCHAR(255) NOT NULL,
  library_item_id UUID         REFERENCES library_items(id) ON DELETE SET NULL,
  sort_order      INT          NOT NULL DEFAULT 0,
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syllabus_items_section
  ON syllabus_items(section_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_syllabus_items_library
  ON syllabus_items(library_item_id);

COMMIT;
