-- VeriGood — Migración 002: catálogo de módulos
-- Pasa de organizations.active_modules[] (ENUM array) a un catálogo en tabla
-- + tabla pivote organization_modules. Mantiene el enum por compatibilidad
-- hasta la migración 003. Añade flags de onboarding en organizations.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/002_modules_catalog.sql
--
-- Idempotente: se puede re-ejecutar.

BEGIN;

-- ── 1. CATÁLOGO DE MÓDULOS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id            VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  stage         VARCHAR(20)  NOT NULL,
  category      VARCHAR(50)  NOT NULL,
  icon          VARCHAR(50),
  route_prefix  VARCHAR(100) NOT NULL,
  sort_order    INTEGER      NOT NULL DEFAULT 100,
  is_available  BOOLEAN      NOT NULL DEFAULT true,
  metadata      JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_stage    ON modules(stage);
CREATE INDEX IF NOT EXISTS idx_modules_category ON modules(category);

-- ── 2. ACTIVACIÓN POR ORGANIZACIÓN ─────────────────────────
CREATE TABLE IF NOT EXISTS organization_modules (
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id       VARCHAR(50)  NOT NULL REFERENCES modules(id),
  activated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  activated_by    UUID         REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_orgmod_org    ON organization_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_orgmod_module ON organization_modules(module_id);

-- ── 3. COLUMNAS DE ONBOARDING ──────────────────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS created_with_demo_data BOOLEAN NOT NULL DEFAULT false;

-- Marcar el active_modules legacy como deprecated. La columna se elimina
-- en la migración 003 junto con el tipo ENUM module_type.
COMMENT ON COLUMN organizations.active_modules IS
  'DEPRECATED: usar la tabla organization_modules. Se elimina en migración 003.';

COMMIT;
