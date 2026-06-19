-- VeriGood — Migración 005 — Notificaciones in-app
--
-- Sistema de notificaciones in-app para admins de centro y profesores.
-- Cada notificación pertenece a un usuario concreto (user_id). El campo
-- organization_id es informativo (permite agregaciones rápidas por org).
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/005_notifications.sql

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type            VARCHAR(64) NOT NULL,           -- 'module_activated', 'tool_generated', 'exam_saved', 'ocr_completed', 'invoice_paid', 'ai_error'
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  link            VARCHAR(512),                   -- ruta interna a la que navegar al hacer click
  metadata        JSONB NOT NULL DEFAULT '{}',
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_org       ON notifications(organization_id);

COMMIT;
