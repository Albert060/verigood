-- VeriGood — Seed del catálogo de módulos
-- Esto NO es demo data: es datos de sistema. Se ejecuta también en producción.
--
-- Lista cerrada (definida por producto):
--   Primaria: Inglés, Plástica, Música, Religión, Ed. Ciudadanía
--   ESO    : Inglés, Cambridge, Geografía e Historia, Biología y Geología, Física y Química
--
-- Ejecutar con:
--   psql $DATABASE_URL -f backend/src/seeds/001_modules_catalog.sql
--
-- Idempotente: ON CONFLICT actualiza nombre, orden y metadatos sin tocar
-- las activaciones por organización ya existentes.

BEGIN;

INSERT INTO modules (id, name, stage, category, icon, route_prefix, sort_order) VALUES
  -- ── PRIMARIA ──
  ('ingles_primaria',     'Inglés',              'primaria', 'asignatura',         'languages',  '/primaria/ingles',     10),
  ('plastica_primaria',   'Plástica',            'primaria', 'asignatura',         'palette',    '/primaria/plastica',   20),
  ('musica_primaria',     'Música',              'primaria', 'asignatura',         'music',      '/primaria/musica',     30),
  ('religion_primaria',   'Religión',            'primaria', 'asignatura',         'book-open',  '/primaria/religion',   40),
  ('ciudadania_primaria', 'Ed. Ciudadanía',      'primaria', 'asignatura',         'users',      '/primaria/ciudadania', 50),
  -- ── ESO ──
  ('ingles_eso',          'Inglés',              'eso',      'asignatura',         'languages',  '/eso/ingles',          10),
  ('cambridge',           'Cambridge',           'eso',      'preparacion_examen', 'award',      '/eso/cambridge',       15),
  ('geo_historia_eso',    'Geografía e Historia','eso',      'asignatura',         'globe',      '/eso/geh',             20),
  ('bio_geo_eso',         'Biología y Geología', 'eso',      'asignatura',         'leaf',       '/eso/byg',             30),
  ('fis_quim_eso',        'Física y Química',    'eso',      'asignatura',         'atom',       '/eso/fyq',             40)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  stage        = EXCLUDED.stage,
  category     = EXCLUDED.category,
  icon         = EXCLUDED.icon,
  route_prefix = EXCLUDED.route_prefix,
  sort_order   = EXCLUDED.sort_order;

-- ── AMPLIACIÓN FASE 1.1 — asignaturas troncales y específicas LOMLOE ───────────
-- Aditivo: no toca activaciones existentes ni los módulos del bloque anterior.
-- Categorías nuevas: 'religion_valores' y 'accion_tutorial'.
INSERT INTO modules (id, name, stage, category, icon, route_prefix, sort_order) VALUES
  -- ── PRIMARIA (ampliación) ──
  ('matematicas_primaria',  'Matemáticas',                                       'primaria', 'asignatura',       'calculator', '/primaria/matematicas',   5),
  ('lengua_primaria',       'Lengua castellana y literatura',                    'primaria', 'asignatura',       'type',       '/primaria/lengua',        7),
  ('medio_primaria',        'Conocimiento del medio natural, social y cultural', 'primaria', 'asignatura',       'earth',      '/primaria/medio',        15),
  ('ed_fisica_primaria',    'Educación física',                                  'primaria', 'asignatura',       'activity',   '/primaria/ed-fisica',    25),
  ('ed_artistica_primaria', 'Educación artística',                               'primaria', 'asignatura',       'palette',    '/primaria/ed-artistica', 35),
  -- ── ESO (ampliación) ──
  ('lengua_eso',            'Lengua castellana y literatura',                    'eso',      'asignatura',       'type',       '/eso/lengua',             5),
  ('matematicas_eso',       'Matemáticas',                                       'eso',      'asignatura',       'calculator', '/eso/matematicas',        7),
  ('ed_fisica_eso',         'Educación física',                                  'eso',      'asignatura',       'activity',   '/eso/ed-fisica',         25),
  ('tecno_digital_eso',     'Tecnología y digitalización',                       'eso',      'asignatura',       'cpu',        '/eso/tecno-digital',     35),
  ('epva_eso',              'Educación plástica, visual y audiovisual',          'eso',      'asignatura',       'palette',    '/eso/epva',              45),
  ('religion_eso',          'Religión',                                          'eso',      'religion_valores', 'cross',      '/eso/religion',          60),
  ('valores_eticos_eso',    'Educación en valores éticos',                       'eso',      'religion_valores', 'scale',      '/eso/valores-eticos',    65),
  ('tutorias_eso',          'Tutorías',                                          'eso',      'accion_tutorial',  'compass',    '/eso/tutorias',          80)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  stage        = EXCLUDED.stage,
  category     = EXCLUDED.category,
  icon         = EXCLUDED.icon,
  route_prefix = EXCLUDED.route_prefix,
  sort_order   = EXCLUDED.sort_order;

-- ── Backfill: migrar organizations.active_modules[] → organization_modules ─────
-- Solo se mapea el enum legacy 'cambridge' al catálogo nuevo (mismo id).
-- Los enums legacy ('espanol', 'matematicas', 'medio', 'oposiciones') no tienen
-- equivalente en el catálogo Fase 1 — se ignoran de forma silenciosa.
-- Cuando esos módulos se rediseñen, se añadirán al catálogo y se backfilleará.
INSERT INTO organization_modules (organization_id, module_id)
SELECT o.id, m_legacy::text
FROM organizations o,
     LATERAL unnest(o.active_modules) AS m_legacy
WHERE m_legacy::text IN (SELECT id FROM modules)
ON CONFLICT (organization_id, module_id) DO NOTHING;

-- ── Marcar como onboarding completado a las orgs que ya tenían datos ──────────
-- Criterio: tienen más de 1 usuario o algún examen creado. Las orgs realmente
-- nuevas (sin actividad) quedan con onboarding_completed_at = NULL y verán el
-- hero de bienvenida.
UPDATE organizations o
SET onboarding_completed_at = NOW()
WHERE onboarding_completed_at IS NULL
  AND (
    (SELECT COUNT(*) FROM users WHERE organization_id = o.id) > 1
    OR EXISTS (SELECT 1 FROM exams WHERE organization_id = o.id)
  );

COMMIT;
