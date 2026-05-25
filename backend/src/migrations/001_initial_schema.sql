-- VeriGood — Schema inicial
-- Ejecutar con: psql -U verigood -d verigood_db -f 001_initial_schema.sql

BEGIN;

-- ── ENUMs ──────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('superadmin', 'admin_centro', 'profesor');
CREATE TYPE plan_type AS ENUM ('starter', 'colegio', 'enterprise', 'trial');
CREATE TYPE module_type AS ENUM ('cambridge', 'espanol', 'matematicas', 'medio', 'oposiciones');

-- ── ORGANIZATIONS ──────────────────────────────────────────
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

-- ── USERS ──────────────────────────────────────────────────
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

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- ── REFRESH TOKENS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ── EXAMS ──────────────────────────────────────────────────
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

CREATE INDEX idx_exams_org ON exams(organization_id);
CREATE INDEX idx_exams_teacher ON exams(teacher_id);
CREATE INDEX idx_exams_created ON exams(created_at DESC);

-- ── EXAM QUESTIONS (biblioteca) ────────────────────────────
CREATE TABLE IF NOT EXISTS exam_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module       module_type NOT NULL DEFAULT 'cambridge',
  level        VARCHAR(10) NOT NULL,
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

CREATE INDEX idx_eq_module_level ON exam_questions(module, level);
CREATE INDEX idx_eq_topic ON exam_questions(topic);

-- ── EXAM ATTEMPTS (correcciones OCR) ───────────────────────
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

CREATE INDEX idx_attempts_org ON exam_attempts(organization_id);
CREATE INDEX idx_attempts_teacher ON exam_attempts(teacher_id);

-- ── RESOURCES (biblioteca compartida) ─────────────────────
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

CREATE INDEX idx_resources_org ON resources(organization_id);
CREATE INDEX idx_resources_module ON resources(module);

-- ── USAGE LOGS ─────────────────────────────────────────────
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

CREATE INDEX idx_usage_org_date ON usage_logs(organization_id, created_at DESC);
CREATE INDEX idx_usage_module ON usage_logs(module, created_at DESC);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
