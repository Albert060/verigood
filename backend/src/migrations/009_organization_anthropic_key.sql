-- VeriGood — Migración 009: clave Anthropic por organización
-- Cada centro pega su propia clave de Anthropic desde /dashboard/anthropic.
-- La clave se cifra con AES-256-GCM en el backend antes de persistirse.
-- Si la org no tiene clave, sus tools devuelven contenido demo.
--
-- Columnas:
--   anthropic_api_key_encrypted  TEXT NULL    -- "<iv>:<tag>:<ciphertext>" en hex
--   anthropic_key_hint           VARCHAR(20)  -- últimos 4 chars para "sk-ant-…ABC1"
--   anthropic_activated_at       TIMESTAMPTZ  -- cuándo se activó (vis. al admin)
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/009_organization_anthropic_key.sql
--
-- Idempotente.

BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_api_key_encrypted TEXT;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_key_hint VARCHAR(20);

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_activated_at TIMESTAMPTZ;

COMMIT;
