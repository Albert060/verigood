-- VeriGood — Migración 003: catálogo de herramientas por módulo
-- Añade el registro declarativo de "tools" (Generador de ejercicios, Rúbricas,
-- Líneas de tiempo, etc.) y su vinculación a módulos del catálogo existente.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/003_module_tools.sql
--
-- Idempotente.

BEGIN;

-- ── 1. CATÁLOGO DE HERRAMIENTAS ────────────────────────────
CREATE TABLE IF NOT EXISTS module_tools (
  key            VARCHAR(80)  PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  description    TEXT         NOT NULL,
  output_kind    VARCHAR(40)  NOT NULL,
  input_schema   JSONB        NOT NULL DEFAULT '{"fields":[]}'::jsonb,
  default_model  VARCHAR(50)  NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  sort_order     INTEGER      NOT NULL DEFAULT 100,
  is_available   BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_tools_available ON module_tools(is_available);

-- ── 2. VINCULACIÓN MÓDULO ↔ HERRAMIENTA ────────────────────
CREATE TABLE IF NOT EXISTS module_tool_bindings (
  module_id  VARCHAR(50) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  tool_key   VARCHAR(80) NOT NULL REFERENCES module_tools(key) ON DELETE CASCADE,
  sort_order INTEGER     NOT NULL DEFAULT 100,
  PRIMARY KEY (module_id, tool_key)
);

CREATE INDEX IF NOT EXISTS idx_tool_bindings_module ON module_tool_bindings(module_id);
CREATE INDEX IF NOT EXISTS idx_tool_bindings_tool   ON module_tool_bindings(tool_key);

-- ── 3. usage_logs — añadir tool_key opcional ───────────────
-- Permite atribuir el consumo IA a la herramienta concreta, no sólo al módulo.
ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS tool_key VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_usage_logs_tool ON usage_logs(tool_key);

COMMIT;
