-- ============================================================================
-- VeriGood — BOOTSTRAP SQL AUTOCONTENIDO
-- ============================================================================
-- Levanta una base de datos VeriGood desde CERO en un servidor nuevo.
-- Contiene:
--   • Extensiones necesarias (pgcrypto para gen_random_uuid).
--   • Schema completo (migraciones 001–010 consolidadas).
--   • Seeds de SISTEMA: catálogo de módulos, tools, banco curado de preguntas.
--
-- NO INCLUYE datos demo (admin@verigood.com, profesor@verigood.com, colegios
-- ficticios). Registra tu primer admin desde la UI (/register) tras arrancar
-- la app, o inserta manualmente un usuario con role='superadmin'.
--
-- Uso:
--   createdb verigood
--   psql -d verigood -f bootstrap.sql
--
-- Requisitos:
--   • PostgreSQL 13+ (por gen_random_uuid nativo; en 12 usa la extensión).
--   • Usuario con permisos para CREATE EXTENSION.
--
-- Idempotente: se puede re-ejecutar sin errores. Usa IF NOT EXISTS y
-- ON CONFLICT en todas partes; los CREATE TYPE están envueltos en DO blocks.
-- ============================================================================

-- ── EXTENSIONES ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- MIGRACIÓN 001 · SCHEMA INICIAL
-- ============================================================================
BEGIN;

-- ── ENUMs ───────────────────────────────────────────────────
-- CREATE TYPE no acepta IF NOT EXISTS → envolvemos en DO block.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'admin_centro', 'profesor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('starter', 'colegio', 'enterprise', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE module_type AS ENUM ('cambridge', 'espanol', 'matematicas', 'medio', 'oposiciones');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ORGANIZATIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  city            VARCHAR(100),
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(20),
  plan            plan_type NOT NULL DEFAULT 'trial',
  active_modules  module_type[] NOT NULL DEFAULT '{cambridge}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  stripe_customer_id VARCHAR(100) UNIQUE,
  stripe_sub_id   VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role NOT NULL DEFAULT 'profesor',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org   ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ── REFRESH TOKENS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ── EXAMS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  level           VARCHAR(10) NOT NULL,
  topic           VARCHAR(255),
  questions       JSONB NOT NULL DEFAULT '[]',
  teacher_id      UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module          module_type NOT NULL DEFAULT 'cambridge',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_org     ON exams(organization_id);
CREATE INDEX IF NOT EXISTS idx_exams_teacher ON exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exams_created ON exams(created_at DESC);

-- ── EXAM QUESTIONS (banco curado) ───────────────────────────
CREATE TABLE IF NOT EXISTS exam_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module       module_type DEFAULT 'cambridge',
  level        VARCHAR(50) NOT NULL,
  topic        VARCHAR(255),
  type         VARCHAR(50) NOT NULL,
  question     TEXT NOT NULL,
  options      JSONB,
  answer       TEXT NOT NULL,
  explanation  TEXT,
  points       INTEGER NOT NULL DEFAULT 1,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  source       VARCHAR(50) DEFAULT 'manual',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eq_module_level ON exam_questions(module, level);
CREATE INDEX IF NOT EXISTS idx_eq_topic        ON exam_questions(topic);

-- ── EXAM ATTEMPTS (correcciones OCR Cambridge) ──────────────
CREATE TABLE IF NOT EXISTS exam_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID REFERENCES exams(id),
  teacher_id      UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_name    VARCHAR(255),
  student_class   VARCHAR(50),
  score           NUMERIC(5,2),
  max_score       NUMERIC(5,2),
  answers         JSONB NOT NULL DEFAULT '{}',
  corrections     JSONB DEFAULT '{}',
  feedback        JSONB DEFAULT '{}',
  ocr_text        TEXT,
  module          module_type NOT NULL DEFAULT 'cambridge',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_org     ON exam_attempts(organization_id);
CREATE INDEX IF NOT EXISTS idx_attempts_teacher ON exam_attempts(teacher_id);

-- ── RESOURCES (biblioteca legacy — DEPRECATED, ver library_items) ─
CREATE TABLE IF NOT EXISTS resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  type            VARCHAR(50) NOT NULL,
  module          module_type NOT NULL,
  content         JSONB NOT NULL DEFAULT '{}',
  teacher_id      UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_shared       BOOLEAN NOT NULL DEFAULT true,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_org    ON resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_resources_module ON resources(module);

-- ── USAGE LOGS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module          module_type NOT NULL,
  action_type     VARCHAR(100) NOT NULL,
  tokens_used     INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_org_date ON usage_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_module   ON usage_logs(module, created_at DESC);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated ON organizations;
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

-- ============================================================================
-- MIGRACIÓN 002 · CATÁLOGO DE MÓDULOS
-- ============================================================================
BEGIN;

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

CREATE TABLE IF NOT EXISTS organization_modules (
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id       VARCHAR(50)  NOT NULL REFERENCES modules(id),
  activated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  activated_by    UUID         REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_orgmod_org    ON organization_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_orgmod_module ON organization_modules(module_id);

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS created_with_demo_data BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN organizations.active_modules IS
  'DEPRECATED: usar la tabla organization_modules.';

COMMIT;

-- ============================================================================
-- MIGRACIÓN 003 · CATÁLOGO DE HERRAMIENTAS
-- ============================================================================
BEGIN;

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

CREATE TABLE IF NOT EXISTS module_tool_bindings (
  module_id  VARCHAR(50) NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  tool_key   VARCHAR(80) NOT NULL REFERENCES module_tools(key) ON DELETE CASCADE,
  sort_order INTEGER     NOT NULL DEFAULT 100,
  PRIMARY KEY (module_id, tool_key)
);

CREATE INDEX IF NOT EXISTS idx_tool_bindings_module ON module_tool_bindings(module_id);
CREATE INDEX IF NOT EXISTS idx_tool_bindings_tool   ON module_tool_bindings(tool_key);

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS tool_key VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_usage_logs_tool ON usage_logs(tool_key);

COMMIT;

-- ============================================================================
-- MIGRACIÓN 004 · BIBLIOTECA UNIFICADA
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS library_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES users(id),
  module_id       VARCHAR(64) NOT NULL,
  tool_key        VARCHAR(64),
  kind            VARCHAR(32) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  payload         JSONB NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_org     ON library_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_library_module  ON library_items(module_id);
CREATE INDEX IF NOT EXISTS idx_library_kind    ON library_items(kind);
CREATE INDEX IF NOT EXISTS idx_library_created ON library_items(created_at DESC);

COMMIT;

-- ============================================================================
-- MIGRACIÓN 005 · NOTIFICACIONES IN-APP
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type            VARCHAR(64) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  link            VARCHAR(512),
  metadata        JSONB NOT NULL DEFAULT '{}',
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user        ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_org         ON notifications(organization_id);

COMMIT;

-- ============================================================================
-- MIGRACIÓN 006 · USER_MODULES (asignación profesor ↔ módulo)
-- ============================================================================
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

-- ============================================================================
-- MIGRACIÓN 007 · ÍNDICES ANTI-SPAM + RETENCIÓN NOTIFICACIONES
-- ============================================================================
BEGIN;

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON notifications(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_readat
  ON notifications(read_at)
  WHERE read_at IS NOT NULL;

COMMIT;

-- ============================================================================
-- MIGRACIÓN 008 · EXAM_QUESTIONS SOPORTA CATÁLOGO FASE 1
-- ============================================================================
BEGIN;

ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS module_id VARCHAR(50) REFERENCES modules(id);

-- Backfill desde el enum legacy (idempotente).
UPDATE exam_questions
   SET module_id = 'cambridge'
 WHERE module_id IS NULL AND module = 'cambridge';

-- Relajar NOT NULL del enum legacy y ampliar level.
ALTER TABLE exam_questions
  ALTER COLUMN module DROP NOT NULL;

ALTER TABLE exam_questions
  ALTER COLUMN level TYPE VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_eq_moduleid_level
  ON exam_questions(module_id, level)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_eq_moduleid_topic
  ON exam_questions(module_id, topic)
  WHERE is_active = true;

COMMIT;

-- ============================================================================
-- MIGRACIÓN 009 · CLAVE ANTHROPIC POR ORGANIZACIÓN (AES-256-GCM)
-- ============================================================================
BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_api_key_encrypted TEXT;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_key_hint VARCHAR(20);

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS anthropic_activated_at TIMESTAMPTZ;

COMMIT;

-- ============================================================================
-- MIGRACIÓN 010 · TEMARIO (SYLLABUS) POR MÓDULO
-- ============================================================================
BEGIN;

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

-- ============================================================================
-- SEED 001 · CATÁLOGO DE MÓDULOS (23 módulos: Primaria + ESO)
-- ============================================================================
BEGIN;

INSERT INTO modules (id, name, stage, category, icon, route_prefix, sort_order) VALUES
  -- ── PRIMARIA (bloque inicial) ──
  ('ingles_primaria',     'Inglés',              'primaria', 'asignatura',         'languages',  '/primaria/ingles',     10),
  ('plastica_primaria',   'Plástica',            'primaria', 'asignatura',         'palette',    '/primaria/plastica',   20),
  ('musica_primaria',     'Música',              'primaria', 'asignatura',         'music',      '/primaria/musica',     30),
  ('religion_primaria',   'Religión',            'primaria', 'asignatura',         'book-open',  '/primaria/religion',   40),
  ('ciudadania_primaria', 'Ed. Ciudadanía',      'primaria', 'asignatura',         'users',      '/primaria/ciudadania', 50),
  -- ── ESO (bloque inicial) ──
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

INSERT INTO modules (id, name, stage, category, icon, route_prefix, sort_order) VALUES
  -- ── PRIMARIA (ampliación LOMLOE) ──
  ('matematicas_primaria',  'Matemáticas',                                       'primaria', 'asignatura',       'calculator', '/primaria/matematicas',   5),
  ('lengua_primaria',       'Lengua castellana y literatura',                    'primaria', 'asignatura',       'type',       '/primaria/lengua',        7),
  ('medio_primaria',        'Conocimiento del medio natural, social y cultural', 'primaria', 'asignatura',       'earth',      '/primaria/medio',        15),
  ('ed_fisica_primaria',    'Educación física',                                  'primaria', 'asignatura',       'activity',   '/primaria/ed-fisica',    25),
  ('ed_artistica_primaria', 'Educación artística',                               'primaria', 'asignatura',       'palette',    '/primaria/ed-artistica', 35),
  -- ── ESO (ampliación LOMLOE) ──
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

COMMIT;

-- ============================================================================
-- SEED 002 · CATÁLOGO DE TOOLS (56 tools + bindings a módulos)
-- ============================================================================
BEGIN;

INSERT INTO module_tools (key, name, description, output_kind, input_schema, sort_order) VALUES

  -- ── INGLÉS (Primaria + ESO) ──
  ('ingles.exercises', 'Generador de ejercicios',
   'Baterías de ejercicios de gramática o vocabulario con clave de respuestas.',
   'exercise_set',
   '{"fields":[{"key":"level","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria","1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Tema","type":"text","placeholder":"Past simple, family vocabulary…","required":true},{"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":30,"default":10}]}'::jsonb, 10),

  ('ingles.writing', 'Redacciones',
   'Propuestas de redacción guiadas o corrección de un texto del alumno.', 'text',
   '{"fields":[{"key":"level","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria","1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"mode","label":"Modo","type":"select","options":["propose","correct"],"required":true},{"key":"prompt_or_text","label":"Tema o texto","type":"textarea","required":true}]}'::jsonb, 20),

  ('ingles.reading', 'Comprensión lectora',
   'Texto adaptado al nivel + preguntas con clave.', 'exercise_set',
   '{"fields":[{"key":"level","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria","1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Temática","type":"text","required":false},{"key":"question_count","label":"Preguntas","type":"number","min":4,"max":15,"default":8}]}'::jsonb, 30),

  -- ── PLÁSTICA ──
  ('plastica.projects', 'Proyectos creativos',
   'Propuestas de proyectos de plástica adaptados al curso, con materiales y fases.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"theme","label":"Temática","type":"text","placeholder":"Naturaleza, retrato, color…","required":true},{"key":"duration_sessions","label":"Sesiones","type":"number","min":1,"max":8,"default":2}]}'::jsonb, 10),

  ('plastica.rubric', 'Rúbricas de evaluación',
   'Rúbrica con criterios y niveles de logro para evaluar un proyecto de plástica.', 'rubric',
   '{"fields":[{"key":"project_title","label":"Título del proyecto","type":"text","required":true},{"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}]}'::jsonb, 20),

  -- ── MÚSICA ──
  ('musica.listening', 'Actividades de escucha',
   'Actividades de escucha activa con preguntas guiadas sobre una obra.', 'text',
   '{"fields":[{"key":"work","label":"Obra o pieza","type":"text","required":true},{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"focus","label":"Foco de la escucha","type":"select","options":["ritmo","melodia","timbre","forma","cultura"],"required":true}]}'::jsonb, 10),

  ('musica.theory', 'Teoría musical',
   'Explicación didáctica de un concepto teórico con ejemplos y ejercicios.', 'text',
   '{"fields":[{"key":"concept","label":"Concepto","type":"text","placeholder":"Notas en la clave de sol, compases simples…","required":true},{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true}]}'::jsonb, 20),

  ('musica.assessment', 'Evaluación',
   'Rúbrica de evaluación de interpretación, audición o trabajo escrito.', 'rubric',
   '{"fields":[{"key":"activity","label":"Actividad evaluada","type":"text","required":true},{"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":4}]}'::jsonb, 30),

  -- ── GEOGRAFÍA E HISTORIA ──
  ('geh.sheets', 'Fichas temáticas',
   'Ficha con resumen, conceptos clave y actividades sobre un tema histórico o geográfico.', 'text',
   '{"fields":[{"key":"topic","label":"Tema","type":"text","placeholder":"La Edad Media, climas de España…","required":true},{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}]}'::jsonb, 10),

  ('geh.timeline', 'Líneas de tiempo',
   'Línea de tiempo con hitos seleccionados y contexto breve para cada uno.', 'timeline',
   '{"fields":[{"key":"period","label":"Periodo","type":"text","placeholder":"Reconquista, Revolución Industrial…","required":true},{"key":"events_count","label":"Nº de hitos","type":"number","min":4,"max":15,"default":8},{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}]}'::jsonb, 20),

  ('geh.quiz', 'Cuestionarios',
   'Cuestionario de preguntas tipo test sobre un tema, con corrección.', 'quiz',
   '{"fields":[{"key":"topic","label":"Tema","type":"text","required":true},{"key":"question_count","label":"Preguntas","type":"number","min":5,"max":20,"default":10},{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}]}'::jsonb, 30),

  -- ── BIOLOGÍA Y GEOLOGÍA ──
  ('byg.schemas', 'Esquemas',
   'Esquema jerárquico de un tema con conceptos, relaciones y ejemplos.', 'text',
   '{"fields":[{"key":"topic","label":"Tema","type":"text","placeholder":"La célula, el ciclo del agua…","required":true},{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}]}'::jsonb, 10),

  ('byg.lab', 'Actividades prácticas',
   'Práctica de laboratorio o de campo con objetivos, materiales y procedimiento.', 'text',
   '{"fields":[{"key":"topic","label":"Tema","type":"text","required":true},{"key":"context","label":"Contexto","type":"select","options":["laboratorio","aula","campo"],"required":true},{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}]}'::jsonb, 20),

  ('byg.exam', 'Preguntas de examen',
   'Preguntas de examen tipo (test, abiertas, desarrollo) con soluciones.', 'exercise_set',
   '{"fields":[{"key":"topic","label":"Tema","type":"text","required":true},{"key":"types","label":"Tipos","type":"select","options":["mixto","test","abiertas","desarrollo"],"required":true},{"key":"count","label":"Nº de preguntas","type":"number","min":5,"max":25,"default":10},{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true}]}'::jsonb, 30),

  -- ── FÍSICA Y QUÍMICA ──
  ('fyq.problems', 'Problemas con resolución',
   'Problemas con enunciado, resolución paso a paso y resultado comentado.', 'exercise_set',
   '{"fields":[{"key":"topic","label":"Tema","type":"text","placeholder":"Cinemática, formulación inorgánica…","required":true},{"key":"difficulty","label":"Dificultad","type":"select","options":["baja","media","alta"],"required":true},{"key":"count","label":"Nº de problemas","type":"number","min":3,"max":15,"default":5},{"key":"course","label":"Curso","type":"select","options":["2º ESO","3º ESO","4º ESO"],"required":true}]}'::jsonb, 10),

  -- ── RELIGIÓN ──
  ('religion.reflection', 'Actividades de reflexión',
   'Actividades de reflexión personal o grupal a partir de una idea o valor.', 'text',
   '{"fields":[{"key":"theme","label":"Tema o valor","type":"text","placeholder":"Solidaridad, perdón, esperanza…","required":true},{"key":"stage_course","label":"Curso","type":"text","placeholder":"5º Primaria, 2º ESO…","required":true}]}'::jsonb, 10),

  ('religion.commentary', 'Textos comentados',
   'Texto religioso o filosófico con comentario guiado y preguntas.', 'commentary',
   '{"fields":[{"key":"text_or_reference","label":"Texto o referencia","type":"textarea","required":true},{"key":"stage_course","label":"Curso","type":"text","required":true}]}'::jsonb, 20),

  -- ── CIUDADANÍA ──
  ('ciudadania.debate', 'Debates guiados',
   'Guion de debate con posturas, argumentos y preguntas moderadoras.', 'text',
   '{"fields":[{"key":"topic","label":"Tema del debate","type":"text","required":true},{"key":"course","label":"Curso","type":"select","options":["3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true}]}'::jsonb, 10),

  ('ciudadania.case', 'Casos prácticos',
   'Caso práctico con dilema ético y preguntas de análisis.', 'text',
   '{"fields":[{"key":"theme","label":"Ámbito","type":"text","placeholder":"Convivencia, derechos, medio ambiente…","required":true},{"key":"course","label":"Curso","type":"select","options":["3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true}]}'::jsonb, 20),

  -- ── MATEMÁTICAS PRIMARIA ──
  ('mat_prim.problems', 'Problemas matemáticos',
   'Problemas verbalizados con resolución paso a paso, contextualizados a la vida cotidiana.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"topic","label":"Tema","type":"text","placeholder":"Sumas con llevadas, fracciones, perímetro…","required":true},{"key":"count","label":"Nº de problemas","type":"number","min":3,"max":15,"default":6}]}'::jsonb, 10),

  ('mat_prim.series', 'Series de cálculo',
   'Serie graduada de ejercicios de cálculo puro para practicar una destreza concreta.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"skill","label":"Destreza","type":"text","placeholder":"Multiplicar por una cifra, dividir por dos cifras…","required":true},{"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":30,"default":15}]}'::jsonb, 20),

  ('mat_prim.manipulative', 'Actividades manipulativas',
   'Actividad manipulativa para introducir o reforzar un concepto.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"concept","label":"Concepto","type":"text","placeholder":"Decenas y unidades, simetría, fracciones…","required":true}]}'::jsonb, 30),

  -- ── LENGUA PRIMARIA ──
  ('len_prim.exercises', 'Ejercicios de lengua',
   'Ejercicios mixtos de gramática, ortografía y léxico con clave.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"focus","label":"Foco","type":"text","placeholder":"Sílaba tónica, sinónimos, uso de la b/v…","required":true},{"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":25,"default":12}]}'::jsonb, 10),

  ('len_prim.reading', 'Comprensión lectora',
   'Texto adaptado al curso con preguntas literales, inferenciales y de vocabulario.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"topic","label":"Tema del texto","type":"text","placeholder":"Animales del bosque, una excursión, un invento…","required":true},{"key":"question_count","label":"Preguntas","type":"number","min":4,"max":15,"default":8}]}'::jsonb, 20),

  ('len_prim.writing', 'Propuestas de escritura',
   'Tarea de escritura con andamiaje, plantilla y criterios de revisión.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"genre","label":"Género o tipo de texto","type":"text","placeholder":"Carta, descripción, cuento, noticia…","required":true}]}'::jsonb, 30),

  -- ── CONOCIMIENTO DEL MEDIO ──
  ('med_prim.sheets', 'Fichas temáticas',
   'Ficha con conceptos clave, explicación y actividades sobre un tema del medio.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"topic","label":"Tema","type":"text","placeholder":"El ciclo del agua, los oficios, los mamíferos…","required":true}]}'::jsonb, 10),

  ('med_prim.quiz', 'Cuestionarios',
   'Cuestionario tipo test con 4 opciones y explicación de cada respuesta.', 'quiz',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"topic","label":"Tema","type":"text","required":true},{"key":"question_count","label":"Preguntas","type":"number","min":5,"max":20,"default":10}]}'::jsonb, 20),

  ('med_prim.experiments', 'Experimentos sencillos',
   'Experimento o investigación sencilla con materiales del aula.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"topic","label":"Tema","type":"text","placeholder":"Flotación, plantas, sombras…","required":true}]}'::jsonb, 30),

  -- ── EDUCACIÓN FÍSICA PRIMARIA ──
  ('efi_prim.sessions', 'Sesiones de EF',
   'Sesión completa con calentamiento, parte principal y vuelta a la calma.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"content_block","label":"Bloque","type":"text","placeholder":"Habilidades motrices, juegos populares, expresión corporal…","required":true},{"key":"duration_minutes","label":"Duración (min)","type":"number","min":30,"max":90,"default":50}]}'::jsonb, 10),

  ('efi_prim.games', 'Juegos motrices',
   'Fichas de juegos para desarrollar una habilidad concreta, con variantes inclusivas.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"skill","label":"Habilidad","type":"text","placeholder":"Coordinación, equilibrio, cooperación…","required":true},{"key":"count","label":"Nº de juegos","type":"number","min":2,"max":8,"default":4}]}'::jsonb, 20),

  ('efi_prim.rubric', 'Rúbricas EF',
   'Rúbrica con criterios observables para evaluar una actividad de EF.', 'rubric',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"activity","label":"Actividad evaluada","type":"text","required":true},{"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}]}'::jsonb, 30),

  -- ── EDUCACIÓN ARTÍSTICA PRIMARIA ──
  ('art_prim.projects', 'Proyectos artísticos',
   'Proyecto integrado de plástica y/o música con producto final y secuencia.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"theme","label":"Temática","type":"text","placeholder":"El color, los sonidos del entorno, retrato…","required":true},{"key":"duration_sessions","label":"Sesiones","type":"number","min":1,"max":8,"default":3}]}'::jsonb, 10),

  ('art_prim.audition', 'Audiciones comentadas',
   'Audición activa de una obra con guion de escucha y conexión plástica.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"work","label":"Obra","type":"text","placeholder":"En la gruta del rey de la montaña, El Carnaval de los Animales…","required":true}]}'::jsonb, 20),

  ('art_prim.rubric', 'Rúbricas artísticas',
   'Rúbrica con criterios técnicos, expresivos y procesuales.', 'rubric',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º Primaria","2º Primaria","3º Primaria","4º Primaria","5º Primaria","6º Primaria"],"required":true},{"key":"activity","label":"Actividad evaluada","type":"text","required":true},{"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}]}'::jsonb, 30),

  -- ── LENGUA ESO ──
  ('len_eso.exercises', 'Ejercicios de lengua',
   'Ejercicios mixtos de gramática, léxico y ortografía de nivel ESO.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"focus","label":"Foco","type":"text","placeholder":"Perífrasis verbales, locuciones, signos de puntuación…","required":true},{"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":25,"default":12}]}'::jsonb, 10),

  ('len_eso.syntax', 'Análisis sintáctico',
   'Análisis sintáctico paso a paso de una oración, con árbol final y errores frecuentes.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"sentence","label":"Oración","type":"textarea","placeholder":"Pega aquí la oración a analizar…","required":true}]}'::jsonb, 20),

  ('len_eso.commentary', 'Comentario de texto',
   'Comentario guiado: tema, estructura, análisis estilístico e interpretación.', 'commentary',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"text_or_reference","label":"Texto o referencia","type":"textarea","required":true}]}'::jsonb, 30),

  ('len_eso.writing', 'Redacciones',
   'Propuestas de redacción guiadas o corrección de un texto del alumno.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"mode","label":"Modo","type":"select","options":["propose","correct"],"required":true},{"key":"prompt_or_text","label":"Tema o texto","type":"textarea","required":true}]}'::jsonb, 40),

  -- ── MATEMÁTICAS ESO ──
  ('mat_eso.problems', 'Problemas con resolución',
   'Problemas verbalizados con resolución paso a paso y comprobación.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Tema","type":"text","placeholder":"Ecuaciones de primer grado, proporcionalidad, geometría…","required":true},{"key":"difficulty","label":"Dificultad","type":"select","options":["baja","media","alta"],"required":true},{"key":"count","label":"Nº de problemas","type":"number","min":3,"max":15,"default":6}]}'::jsonb, 10),

  ('mat_eso.exercises', 'Tandas de ejercicios',
   'Serie graduada de ejercicios procedimentales para una destreza.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Tema","type":"text","required":true},{"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":30,"default":15}]}'::jsonb, 20),

  ('mat_eso.exam', 'Preguntas de examen',
   'Preguntas de examen tipo (test, abiertas, desarrollo) con soluciones y puntuación sobre 10.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Tema","type":"text","required":true},{"key":"count","label":"Nº de preguntas","type":"number","min":4,"max":15,"default":8}]}'::jsonb, 30),

  -- ── EDUCACIÓN FÍSICA ESO ──
  ('efi_eso.sessions', 'Sesiones de EF',
   'Sesión completa de EF para ESO, con calentamiento, parte principal y vuelta a la calma.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"content_block","label":"Bloque","type":"text","placeholder":"Acondicionamiento físico, deportes colectivos, ritmo y expresión…","required":true},{"key":"duration_minutes","label":"Duración (min)","type":"number","min":30,"max":90,"default":55}]}'::jsonb, 10),

  ('efi_eso.theory', 'Contenidos teóricos',
   'Explicación didáctica de un contenido teórico (salud, anatomía, sistemas energéticos…).', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Tema","type":"text","required":true}]}'::jsonb, 20),

  ('efi_eso.rubric', 'Rúbricas EF',
   'Rúbrica con criterios técnicos, tácticos y actitudinales.', 'rubric',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"activity","label":"Actividad evaluada","type":"text","required":true},{"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}]}'::jsonb, 30),

  -- ── TECNOLOGÍA Y DIGITALIZACIÓN ESO ──
  ('tec_eso.projects', 'Proyectos tecnológicos',
   'Proyecto guiado por el método de proyectos: análisis, diseño, construcción y evaluación.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"theme","label":"Reto / temática","type":"text","placeholder":"Vivienda eficiente, juguete con motor, app de aula…","required":true},{"key":"duration_sessions","label":"Sesiones","type":"number","min":2,"max":12,"default":4}]}'::jsonb, 10),

  ('tec_eso.exercises', 'Ejercicios técnicos',
   'Ejercicios mixtos: cálculo técnico, diseño, identificación o snippets de código.', 'exercise_set',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Tema","type":"text","placeholder":"Circuitos eléctricos, hojas de cálculo, algoritmos básicos…","required":true},{"key":"count","label":"Nº de ejercicios","type":"number","min":5,"max":20,"default":10}]}'::jsonb, 20),

  ('tec_eso.digital', 'Competencia digital',
   'Actividad de competencia digital con reflexión crítica sobre el uso de las herramientas.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"focus","label":"Foco","type":"text","placeholder":"Búsqueda de información, identidad digital, IA generativa…","required":true}]}'::jsonb, 30),

  -- ── EPVA ESO ──
  ('epva.projects', 'Proyectos visuales',
   'Proyecto plástico o audiovisual con referente artístico y producto final.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"theme","label":"Temática","type":"text","placeholder":"Autorretrato, paisaje sonoro, cartel social…","required":true},{"key":"duration_sessions","label":"Sesiones","type":"number","min":2,"max":10,"default":4}]}'::jsonb, 10),

  ('epva.rubric', 'Rúbricas EPVA',
   'Rúbrica que combina técnica, expresividad y proceso.', 'rubric',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"activity","label":"Actividad evaluada","type":"text","required":true},{"key":"criteria_count","label":"Nº de criterios","type":"number","min":3,"max":8,"default":5}]}'::jsonb, 20),

  ('epva.analysis', 'Análisis de obra',
   'Análisis guiado de una obra visual o audiovisual con descripción, análisis y juicio.', 'commentary',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"work_or_reference","label":"Obra o referencia","type":"textarea","placeholder":"Las Meninas, un fotograma de una película, un cartel publicitario…","required":true}]}'::jsonb, 30),

  -- ── VALORES ÉTICOS ESO ──
  ('valores.dilemma', 'Dilemas éticos',
   'Dilema ético con marcos filosóficos en juego y preguntas de análisis.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"theme","label":"Tema","type":"text","placeholder":"Privacidad, justicia, lealtad, libertad de expresión…","required":true}]}'::jsonb, 10),

  ('valores.debate', 'Debates guiados',
   'Guion de debate con posturas anclajes filosóficos y reglas.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"topic","label":"Tema","type":"text","required":true}]}'::jsonb, 20),

  ('valores.commentary', 'Comentario filosófico',
   'Comentario guiado de un texto filosófico o ensayo.', 'commentary',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"text_or_reference","label":"Texto o referencia","type":"textarea","required":true}]}'::jsonb, 30),

  -- ── TUTORÍAS ESO ──
  ('tutorias.session', 'Sesiones de tutoría',
   'Sesión de tutoría con apertura, desarrollo, cierre y atención a la diversidad.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"focus","label":"Foco","type":"text","placeholder":"Gestión del estrés, hábitos de estudio, autoestima…","required":true},{"key":"duration_minutes","label":"Duración (min)","type":"number","min":30,"max":90,"default":55}]}'::jsonb, 10),

  ('tutorias.dynamics', 'Dinámicas de grupo',
   'Dinámicas de cohesión y trabajo socioemocional con riesgos a vigilar.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"goal","label":"Objetivo","type":"text","placeholder":"Cohesión, escucha activa, conocimiento mutuo…","required":true},{"key":"count","label":"Nº de dinámicas","type":"number","min":1,"max":6,"default":3}]}'::jsonb, 20),

  ('tutorias.conflict', 'Gestión de conflictos',
   'Guion de intervención ante una situación de convivencia, con protocolo y derivaciones.', 'text',
   '{"fields":[{"key":"course","label":"Curso","type":"select","options":["1º ESO","2º ESO","3º ESO","4º ESO"],"required":true},{"key":"situation","label":"Situación","type":"textarea","placeholder":"Describe la situación que ha surgido en el grupo…","required":true}]}'::jsonb, 30)

ON CONFLICT (key) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  output_kind  = EXCLUDED.output_kind,
  input_schema = EXCLUDED.input_schema,
  sort_order   = EXCLUDED.sort_order;

-- ── BINDINGS módulo ↔ tool ──
INSERT INTO module_tool_bindings (module_id, tool_key, sort_order) VALUES
  ('ingles_primaria', 'ingles.exercises', 10),
  ('ingles_primaria', 'ingles.writing',   20),
  ('ingles_primaria', 'ingles.reading',   30),
  ('ingles_eso',      'ingles.exercises', 10),
  ('ingles_eso',      'ingles.writing',   20),
  ('ingles_eso',      'ingles.reading',   30),
  ('plastica_primaria', 'plastica.projects', 10),
  ('plastica_primaria', 'plastica.rubric',   20),
  ('musica_primaria', 'musica.listening',  10),
  ('musica_primaria', 'musica.theory',     20),
  ('musica_primaria', 'musica.assessment', 30),
  ('geo_historia_eso', 'geh.sheets',   10),
  ('geo_historia_eso', 'geh.timeline', 20),
  ('geo_historia_eso', 'geh.quiz',     30),
  ('bio_geo_eso', 'byg.schemas', 10),
  ('bio_geo_eso', 'byg.lab',     20),
  ('bio_geo_eso', 'byg.exam',    30),
  ('fis_quim_eso', 'fyq.problems', 10),
  ('religion_primaria', 'religion.reflection', 10),
  ('religion_primaria', 'religion.commentary', 20),
  ('religion_eso',      'religion.reflection', 10),
  ('religion_eso',      'religion.commentary', 20),
  ('ciudadania_primaria', 'ciudadania.debate', 10),
  ('ciudadania_primaria', 'ciudadania.case',   20),
  ('matematicas_primaria', 'mat_prim.problems',     10),
  ('matematicas_primaria', 'mat_prim.series',       20),
  ('matematicas_primaria', 'mat_prim.manipulative', 30),
  ('lengua_primaria', 'len_prim.exercises', 10),
  ('lengua_primaria', 'len_prim.reading',   20),
  ('lengua_primaria', 'len_prim.writing',   30),
  ('medio_primaria', 'med_prim.sheets',      10),
  ('medio_primaria', 'med_prim.quiz',        20),
  ('medio_primaria', 'med_prim.experiments', 30),
  ('ed_fisica_primaria', 'efi_prim.sessions', 10),
  ('ed_fisica_primaria', 'efi_prim.games',    20),
  ('ed_fisica_primaria', 'efi_prim.rubric',   30),
  ('ed_artistica_primaria', 'art_prim.projects', 10),
  ('ed_artistica_primaria', 'art_prim.audition', 20),
  ('ed_artistica_primaria', 'art_prim.rubric',   30),
  ('lengua_eso', 'len_eso.exercises',  10),
  ('lengua_eso', 'len_eso.syntax',     20),
  ('lengua_eso', 'len_eso.commentary', 30),
  ('lengua_eso', 'len_eso.writing',    40),
  ('matematicas_eso', 'mat_eso.problems',  10),
  ('matematicas_eso', 'mat_eso.exercises', 20),
  ('matematicas_eso', 'mat_eso.exam',      30),
  ('ed_fisica_eso', 'efi_eso.sessions', 10),
  ('ed_fisica_eso', 'efi_eso.theory',   20),
  ('ed_fisica_eso', 'efi_eso.rubric',   30),
  ('tecno_digital_eso', 'tec_eso.projects',  10),
  ('tecno_digital_eso', 'tec_eso.exercises', 20),
  ('tecno_digital_eso', 'tec_eso.digital',   30),
  ('epva_eso', 'epva.projects', 10),
  ('epva_eso', 'epva.rubric',   20),
  ('epva_eso', 'epva.analysis', 30),
  ('valores_eticos_eso', 'valores.dilemma',    10),
  ('valores_eticos_eso', 'valores.debate',     20),
  ('valores_eticos_eso', 'valores.commentary', 30),
  ('tutorias_eso', 'tutorias.session',  10),
  ('tutorias_eso', 'tutorias.dynamics', 20),
  ('tutorias_eso', 'tutorias.conflict', 30)
ON CONFLICT (module_id, tool_key) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;

COMMIT;

-- ============================================================================
-- SEED 003 · BANCO CURADO DE PREGUNTAS POR MÓDULO
-- ============================================================================
-- Sin BEGIN/COMMIT global: cada INSERT usa NOT EXISTS y es autocontenido.

-- ── MATEMÁTICAS PRIMARIA ─────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('matematicas_primaria','3º Primaria','sumas','problem',
   'En una caja hay 27 manzanas. Si añadimos otra caja con 18 manzanas, ¿cuántas hay en total?',
   NULL,'45 manzanas','27 + 18 = 45. Suma sin llevadas mentalmente: 27+10=37, 37+8=45.',1),
  ('matematicas_primaria','4º Primaria','multiplicaciones','calculation',
   'Calcula: 23 × 4',NULL,'92','23 × 4 = (20 × 4) + (3 × 4) = 80 + 12 = 92.',1),
  ('matematicas_primaria','5º Primaria','fracciones','multiple_choice',
   '¿Cuál de estas fracciones es equivalente a 1/2?',
   '["2/3","3/6","2/5","1/4"]','3/6','Multiplicando numerador y denominador por 3 obtenemos 3/6.',1),
  ('matematicas_primaria','6º Primaria','decimales','problem',
   'Ana compra 1,5 kg de pan a 2,40 €/kg. ¿Cuánto paga?',
   NULL,'3,60 €','1,5 × 2,40 = 3,60 €.',1),
  ('matematicas_primaria','1º Primaria','sumas','calculation',
   '5 + 3 = ?',NULL,'8','Suma básica con apoyo de los dedos: 5 dedos + 3 dedos = 8.',1),
  ('matematicas_primaria','1º Primaria','sumas','problem',
   'Marta tiene 4 lápices y le regalan 2. ¿Cuántos lápices tiene ahora?',
   NULL,'6 lápices','4 + 2 = 6.',1),
  ('matematicas_primaria','1º Primaria','restas','calculation',
   '9 - 4 = ?',NULL,'5','Resta básica: si quitamos 4 de 9, quedan 5.',1),
  ('matematicas_primaria','2º Primaria','sumas','problem',
   'En clase hay 12 niñas y 11 niños. ¿Cuántos alumnos hay en total?',
   NULL,'23 alumnos','12 + 11 = 23.',1),
  ('matematicas_primaria','2º Primaria','multiplicar','multiple_choice',
   '¿Cuánto es 3 × 4?',
   '["7","12","9","16"]','12','3 × 4 se lee "tres veces cuatro". 4+4+4=12.',1),
  ('matematicas_primaria','2º Primaria','multiplicar','calculation',
   '2 × 5 = ?',NULL,'10','Tabla del 2: dos veces 5 son 10.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── MATEMÁTICAS ESO ──────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('matematicas_eso','1º ESO','fracciones','calculation',
   'Simplifica al máximo: 18/24',NULL,'3/4','MCD(18,24)=6. 18/6=3, 24/6=4.',1),
  ('matematicas_eso','2º ESO','ecuaciones','problem',
   'Resuelve: 3x + 5 = 20',NULL,'x = 5','3x = 15 → x = 5.',1),
  ('matematicas_eso','3º ESO','sistemas','problem',
   'Resuelve el sistema: x + y = 10 ; x - y = 4',NULL,'x = 7, y = 3',
   'Sumando ambas: 2x = 14, x=7. Sustituyendo: y=3.',1),
  ('matematicas_eso','4º ESO','funciones','multiple_choice',
   'La pendiente de la recta y = -2x + 7 es:',
   '["-2","2","7","-7"]','-2','En y = mx + n, m es la pendiente.',1),
  ('matematicas_eso','3º ESO','probabilidad','open',
   'Al lanzar un dado, ¿cuál es la probabilidad de obtener un número par?',
   NULL,'1/2 ó 0,5',
   'Casos favorables {2,4,6}=3. Casos posibles {1..6}=6. P=3/6=1/2.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── LENGUA PRIMARIA ──────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('lengua_primaria','3º Primaria','ortografía','multiple_choice',
   '¿Cuál de las siguientes palabras está bien escrita?',
   '["beber","veber","bevér","veverr"]','beber','Verbo regular; se escribe con b en ambos casos.',1),
  ('lengua_primaria','4º Primaria','sustantivos','identify',
   'Identifica los sustantivos en: "La niña corre por el parque con su perro."',
   NULL,'niña, parque, perro','Son los nombres de personas, lugares o cosas.',1),
  ('lengua_primaria','5º Primaria','comprensión','literal',
   'Lee: "El verano es la estación más cálida del año en España, con temperaturas que pueden superar los 35 ºC." ¿Qué temperatura puede superarse en verano?',
   NULL,'35 ºC','Información literal del texto.',1),
  ('lengua_primaria','6º Primaria','verbos','transform',
   'Pon el verbo entre paréntesis en pretérito perfecto simple: "Ayer (comer) en casa de mi abuela."',
   NULL,'comí','1ª persona singular del pretérito perfecto simple de "comer".',1),
  ('lengua_primaria','1º Primaria','vocales','multiple_choice',
   '¿Cuál de estas letras es una vocal?',
   '["b","a","r","t"]','a','Las vocales son: a, e, i, o, u.',1),
  ('lengua_primaria','1º Primaria','sílabas','identify',
   '¿Cuántas sílabas tiene la palabra "casa"?',
   NULL,'2','ca-sa son dos sílabas.',1),
  ('lengua_primaria','2º Primaria','sustantivos','identify',
   'Identifica los sustantivos en: "El gato come pescado."',
   NULL,'gato, pescado','Son nombres de cosas, animales o personas.',1),
  ('lengua_primaria','2º Primaria','ortografía','multiple_choice',
   '¿Qué palabra está bien escrita?',
   '["arból","árbol","arbol","arboll"]','árbol','Lleva tilde en la primera sílaba (palabra grave terminada en consonante distinta de n/s).',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── LENGUA ESO ───────────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('lengua_eso','1º ESO','categorías gramaticales','identify',
   'Indica la categoría gramatical de "rápidamente": ',
   '["adjetivo","adverbio","sustantivo","preposición"]','adverbio',
   'Termina en -mente y modifica al verbo; es adverbio de modo.',1),
  ('lengua_eso','2º ESO','sintaxis','open',
   '¿Cuál es el sujeto de la oración: "Los estudiantes de tercero terminaron el examen pronto"?',
   NULL,'Los estudiantes de tercero','El sujeto es el sintagma nominal que concuerda con el verbo.',1),
  ('lengua_eso','3º ESO','literatura','multiple_choice',
   '"La casa de Bernarda Alba" fue escrita por:',
   '["Federico García Lorca","Antonio Machado","Miguel Hernández","Rafael Alberti"]',
   'Federico García Lorca','Obra teatral de Lorca publicada en 1936.',1),
  ('lengua_eso','4º ESO','comentario','open',
   'Define brevemente "metáfora" y pon un ejemplo:',
   NULL,'Figura retórica que identifica un término real con otro imaginario por semejanza. Ej.: "tus ojos son dos luceros".',
   'Identificación implícita basada en semejanza.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── INGLÉS PRIMARIA ──────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('ingles_primaria','4º Primaria','present_simple','multiple_choice',
   'She ___ to school every day.',
   '["go","goes","going","gone"]','goes','Tercera persona del singular: -s.',1),
  ('ingles_primaria','5º Primaria','vocabulary','fill_blank',
   'Complete with the right colour: "The sun is ___."',
   NULL,'yellow','Color amarillo en inglés.',1),
  ('ingles_primaria','5º Primaria','prepositions','multiple_choice',
   'The book is ___ the table.',
   '["in","on","under","at"]','on','Sobre la mesa = on.',1),
  ('ingles_primaria','6º Primaria','present_continuous','transform',
   'Put the verb in present continuous: "I (play) football now."',
   NULL,'I am playing','Estructura: subject + am/is/are + verb-ing.',1),
  ('ingles_primaria','1º Primaria','colours','multiple_choice',
   'What colour is the sun?',
   '["blue","yellow","green","black"]','yellow','El sol es amarillo.',1),
  ('ingles_primaria','1º Primaria','numbers','fill_blank',
   'Complete: "1, 2, 3, ___, 5"',NULL,'4','Número cuatro en orden.',1),
  ('ingles_primaria','2º Primaria','greetings','multiple_choice',
   'What do you say in the morning?',
   '["Good night","Good morning","Goodbye","Good evening"]','Good morning',
   'Saludo de la mañana.',1),
  ('ingles_primaria','2º Primaria','animals','fill_blank',
   'Complete: "A ___ says meow."',NULL,'cat','El gato hace meow en inglés.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── INGLÉS ESO ───────────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('ingles_eso','1º ESO','past_simple','transform',
   'Transform to past simple: "I eat an apple."',
   NULL,'I ate an apple.','Irregular: eat → ate.',1),
  ('ingles_eso','2º ESO','conditionals','multiple_choice',
   'If it rains tomorrow, we ___ at home.',
   '["will stay","stay","stayed","would stay"]','will stay',
   'First conditional: if + present, will + infinitive.',1),
  ('ingles_eso','3º ESO','passive_voice','transform',
   'Make passive: "Shakespeare wrote Hamlet."',
   NULL,'Hamlet was written by Shakespeare.','Passive: BE + past participle + by.',1),
  ('ingles_eso','4º ESO','phrasal_verbs','multiple_choice',
   'Choose the meaning of "give up":',
   '["surrender","increase","collect","continue"]','surrender',
   '"Give up" means to stop trying or surrender.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── MEDIO PRIMARIA ───────────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('medio_primaria','3º Primaria','seres vivos','multiple_choice',
   '¿Cuál de estos NO es un ser vivo?',
   '["roca","perro","planta","abeja"]','roca','Las rocas no nacen, ni se reproducen, ni mueren.',1),
  ('medio_primaria','4º Primaria','agua','literal',
   '¿En qué estados puede encontrarse el agua en la naturaleza?',
   NULL,'Sólido, líquido y gaseoso','Los tres estados de la materia comunes en la Tierra.',1),
  ('medio_primaria','5º Primaria','Tierra','multiple_choice',
   '¿Qué planeta es el más cercano al Sol?',
   '["Venus","Mercurio","Marte","Tierra"]','Mercurio','Mercurio es el primero del sistema solar.',1),
  ('medio_primaria','6º Primaria','España','multiple_choice',
   '¿Cuál es el río más largo de España?',
   '["Ebro","Tajo","Duero","Guadalquivir"]','Tajo',
   'Aunque desemboca en Portugal, su recorrido total es el mayor (≈1.007 km).',1),
  ('medio_primaria','1º Primaria','cuerpo humano','multiple_choice',
   '¿Cuántos brazos tiene una persona?',
   '["1","2","3","4"]','2','Cada persona tiene dos brazos.',1),
  ('medio_primaria','1º Primaria','animales','multiple_choice',
   '¿Cuál de estos es un animal doméstico?',
   '["león","tigre","perro","oso"]','perro',
   'El perro vive con las personas en casa.',1),
  ('medio_primaria','2º Primaria','estaciones','multiple_choice',
   '¿En qué estación caen las hojas de los árboles?',
   '["primavera","verano","otoño","invierno"]','otoño',
   'En otoño los árboles caducifolios pierden sus hojas.',1),
  ('medio_primaria','2º Primaria','sentidos','literal',
   '¿Qué sentido usamos para escuchar la música?',
   NULL,'el oído','Oído: percibe los sonidos.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── GEOGRAFÍA E HISTORIA ESO ─────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('geo_historia_eso','1º ESO','prehistoria','multiple_choice',
   '¿Qué etapa de la prehistoria corresponde al descubrimiento de la agricultura?',
   '["Paleolítico","Neolítico","Edad del Bronce","Edad del Hierro"]','Neolítico',
   'El Neolítico (≈10.000 a.C.) marca la revolución agrícola.',1),
  ('geo_historia_eso','2º ESO','Edad Media','multiple_choice',
   '¿Qué hecho marca el inicio de la Edad Media?',
   '["Caída del Imperio Romano de Occidente (476)","Descubrimiento de América (1492)","Hégira (622)","Revolución Francesa (1789)"]',
   'Caída del Imperio Romano de Occidente (476)',
   'Es la convención académica más extendida.',1),
  ('geo_historia_eso','3º ESO','geografía','multiple_choice',
   '¿Cuál es la capital de Australia?',
   '["Sídney","Melbourne","Canberra","Perth"]','Canberra',
   'Sídney y Melbourne son las más pobladas, pero la capital es Canberra.',1),
  ('geo_historia_eso','4º ESO','contemporánea','multiple_choice',
   '¿En qué año cayó el Muro de Berlín?',
   '["1989","1991","1985","1979"]','1989',
   'El 9 de noviembre de 1989, símbolo del fin de la Guerra Fría.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── BIOLOGÍA Y GEOLOGÍA ESO ──────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('bio_geo_eso','1º ESO','células','multiple_choice',
   '¿Cuál es la unidad fundamental de los seres vivos?',
   '["átomo","molécula","célula","tejido"]','célula','La célula es la unidad estructural y funcional.',1),
  ('bio_geo_eso','3º ESO','genética','open',
   'Define brevemente el concepto de "gen":',
   NULL,'Fragmento de ADN que codifica una proteína o un carácter heredable.',
   'Definición operativa básica del nivel.',1),
  ('bio_geo_eso','4º ESO','evolución','multiple_choice',
   '¿Quién formuló la teoría de la evolución por selección natural?',
   '["Mendel","Lamarck","Darwin","Pasteur"]','Darwin',
   'Charles Darwin (1859, "El origen de las especies").',1),
  ('bio_geo_eso','3º ESO','geología','multiple_choice',
   '¿Qué tipo de roca se forma por enfriamiento del magma?',
   '["sedimentaria","metamórfica","ígnea","caliza"]','ígnea',
   'Las rocas ígneas se forman por solidificación del magma.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── FÍSICA Y QUÍMICA ESO ─────────────────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('fis_quim_eso','2º ESO','materia','multiple_choice',
   '¿Qué unidad del SI se usa para medir la masa?',
   '["litro","kilogramo","newton","julio"]','kilogramo',
   'Unidad fundamental del SI para la masa.',1),
  ('fis_quim_eso','3º ESO','química','open',
   'Calcula la masa molecular del agua (H₂O). Datos: H=1, O=16',
   NULL,'18 u','2·1 + 16 = 18 u.',1),
  ('fis_quim_eso','4º ESO','cinemática','problem',
   'Un coche recorre 240 km en 3 h. Calcula su velocidad media en km/h.',
   NULL,'80 km/h','v = e/t = 240/3 = 80 km/h.',1),
  ('fis_quim_eso','4º ESO','dinámica','problem',
   'Calcula la fuerza necesaria para acelerar a 2 m/s² una masa de 5 kg.',
   NULL,'10 N','F = m·a = 5 × 2 = 10 N.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ── TECNOLOGÍA Y DIGITALIZACIÓN ESO ──────────────────────────
INSERT INTO exam_questions (module_id, level, topic, type, question, options, answer, explanation, points, source)
SELECT v.module_id, v.level, v.topic, v.type, v.question, v.options::jsonb, v.answer, v.explanation, v.points, 'system'
FROM (VALUES
  ('tecno_digital_eso','1º ESO','informática','multiple_choice',
   '¿Qué dispositivo es de SALIDA?',
   '["teclado","ratón","impresora","escáner"]','impresora',
   'La impresora produce salida (papel impreso).',1),
  ('tecno_digital_eso','2º ESO','programación','multiple_choice',
   'En programación, ¿qué representa una "variable"?',
   '["un valor fijo","un espacio con nombre que guarda datos","un tipo de bucle","una función"]',
   'un espacio con nombre que guarda datos',
   'Las variables almacenan valores que pueden cambiar.',1),
  ('tecno_digital_eso','3º ESO','redes','multiple_choice',
   '¿Qué significa "URL"?',
   '["Universal Resource Locator","Uniform Resource Locator","Unique Reference Link","Unified Random List"]',
   'Uniform Resource Locator','Dirección única que identifica un recurso en la web.',1),
  ('tecno_digital_eso','4º ESO','digital','multiple_choice',
   '¿Cuál de estas NO es una buena práctica de contraseña segura?',
   '["Usar tu fecha de nacimiento","Combinar mayúsculas, minúsculas y números","Tener más de 12 caracteres","Usar gestor de contraseñas"]',
   'Usar tu fecha de nacimiento',
   'Las fechas son fáciles de adivinar para un atacante.',1)
) AS v(module_id, level, topic, type, question, options, answer, explanation, points)
JOIN modules m ON m.id = v.module_id
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions e WHERE e.module_id = v.module_id AND e.question = v.question
);

-- ============================================================================
-- FIN DEL BOOTSTRAP
-- ============================================================================
-- Verifica el resultado con:
--   SELECT COUNT(*) FROM modules;         -- debería devolver 23
--   SELECT COUNT(*) FROM module_tools;    -- debería devolver 56
--   SELECT COUNT(*) FROM module_tool_bindings; -- debería devolver 61
--   SELECT COUNT(*) FROM exam_questions WHERE source = 'system';  -- ~55
--
-- Siguiente paso: crea tu primer usuario. Opción rápida vía SQL:
--   INSERT INTO users (name, email, password_hash, role, is_active)
--   VALUES ('Admin', 'admin@tucentro.es',
--           -- hash bcrypt de 'CambiaEstoYa!' (rounds=12) — REGENÉRALO:
--           '$2a$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
--           'superadmin', true);
-- Recomendado: registra al primer admin desde la UI (/register) — el backend
-- ya usa bcrypt rounds=12 al crear el usuario.
