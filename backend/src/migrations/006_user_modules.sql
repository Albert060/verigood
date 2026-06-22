-- VeriGood — Migración 006: asignación de módulos por profesor
-- Añade la capa profesor↔módulo sobre organization_modules. El admin_centro
-- gestiona todos los módulos del centro; los profesores solo ven y usan los
-- módulos que el admin les haya asignado expresamente.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/006_user_modules.sql
--
-- Idempotente.

BEGIN;

CREATE TABLE IF NOT EXISTS user_modules (
  user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id    VARCHAR(50)  NOT NULL REFERENCES modules(id),
  assigned_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  assigned_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_user_modules_user   ON user_modules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_module ON user_modules(module_id);

COMMIT;
