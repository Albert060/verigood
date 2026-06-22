-- VeriGood — Migración 007: índices para anti-spam y retención de notificaciones
-- La 005 creó la tabla con un índice simple por user_id. Con la nueva ola de
-- avisos al admin (cuotas, errores IA repetidos, profes inactivos, digest
-- semanal) necesitamos consultar "ya notifiqué esto en las últimas N horas"
-- de forma barata.
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/migrations/007_notifications_indices.sql
--
-- Idempotente.

BEGIN;

-- Anti-spam: lookup por (usuario, tipo, fecha desc) para wasRecentlyNotified().
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON notifications(user_id, type, created_at DESC);

-- Retención / limpieza periódica: el job semanal borra notificaciones leídas
-- antiguas; este índice acelera ese DELETE.
CREATE INDEX IF NOT EXISTS idx_notifications_readat
  ON notifications(read_at)
  WHERE read_at IS NOT NULL;

COMMIT;
