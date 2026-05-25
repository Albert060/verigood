-- VeriGood — Seed data demo
-- Contraseñas: demo1234 (hash bcrypt rounds=12)
-- IMPORTANT: Regenera los hashes con bcrypt antes de producción

BEGIN;

-- Superadmin (sin org)
INSERT INTO users (id, name, email, password_hash, role, organization_id, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Superadmin VeriGood',
  'superadmin@verigood.com',
  '$2a$12$QltKDRsf7vxuOB6l8hm1tuZsdzAgN8coMuUGaUQcarx4nT.hP3Fdq',
  'superadmin',
  NULL,
  true
);

-- Organization 1: Colegio San Isidro (plan colegio)
INSERT INTO organizations (id, name, city, contact_email, plan, active_modules, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Colegio San Isidro',
  'Madrid',
  'admin@sanisidro.es',
  'colegio',
  '{cambridge,espanol,matematicas,medio}',
  true
);

INSERT INTO users (id, name, email, password_hash, role, organization_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'María Pérez', 'admin@verigood.com',
   '$2a$12$QltKDRsf7vxuOB6l8hm1tuZsdzAgN8coMuUGaUQcarx4nT.hP3Fdq', 'admin_centro',
   'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'Juan García', 'profesor@verigood.com',
   '$2a$12$QltKDRsf7vxuOB6l8hm1tuZsdzAgN8coMuUGaUQcarx4nT.hP3Fdq', 'profesor',
   'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'Ana Martín', 'ana.martin@sanisidro.es',
   '$2a$12$QltKDRsf7vxuOB6l8hm1tuZsdzAgN8coMuUGaUQcarx4nT.hP3Fdq', 'profesor',
   'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000004', 'Luis Torres', 'luis.torres@sanisidro.es',
   '$2a$12$QltKDRsf7vxuOB6l8hm1tuZsdzAgN8coMuUGaUQcarx4nT.hP3Fdq', 'profesor',
   'b0000000-0000-0000-0000-000000000001');

-- Organization 2: IES Cervantes (plan starter — trial)
INSERT INTO organizations (id, name, city, contact_email, plan, active_modules, is_active)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'IES Cervantes',
  'Barcelona',
  'admin@iescervantes.es',
  'starter',
  '{cambridge}',
  true
);

INSERT INTO users (id, name, email, password_hash, role, organization_id)
VALUES
  ('c0000000-0000-0000-0000-000000000005', 'Carmen López', 'carmen@iescervantes.es',
   '$2a$12$QltKDRsf7vxuOB6l8hm1tuZsdzAgN8coMuUGaUQcarx4nT.hP3Fdq', 'admin_centro',
   'b0000000-0000-0000-0000-000000000002');

-- Demo exam questions (Cambridge)
INSERT INTO exam_questions (module, level, topic, type, question, options, answer, explanation, points)
VALUES
  ('cambridge', 'B1', 'present_perfect', 'multiple_choice',
   'She ___ to London three times this year.',
   '["has gone", "went", "had gone", "goes"]', 'has gone',
   'Present perfect with frequency adverb (this year).', 1),
  ('cambridge', 'B1', 'present_perfect', 'fill_blanks',
   'I have never ___ (see) a whale in real life.',
   NULL, 'seen',
   'Past participle of irregular verb "see".', 1),
  ('cambridge', 'B2', 'conditionals', 'multiple_choice',
   'If she ___ harder, she would have passed the exam.',
   '["had studied", "studied", "has studied", "would study"]', 'had studied',
   'Third conditional — unreal past situation.', 1),
  ('cambridge', 'A2', 'present_simple', 'true_false',
   'The sentence "She don''t like coffee" is correct.',
   NULL, 'False',
   'Third person singular requires "doesn''t".', 1),
  ('cambridge', 'C1', 'word_formation', 'fill_blanks',
   'Her ___ (inspire) speech moved the entire audience.',
   NULL, 'inspirational',
   'Adjective form of "inspire" → inspirational.', 1);

-- Demo usage logs
INSERT INTO usage_logs (user_id, organization_id, module, action_type, tokens_used, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'cambridge', 'exam_generate', 450, NOW() - INTERVAL '2 hours'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'cambridge', 'ocr_correct', 800, NOW() - INTERVAL '1 day'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'espanol', 'essay_correct', 600, NOW() - INTERVAL '2 days'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'matematicas', 'problems_generate', 350, NOW() - INTERVAL '3 days');

COMMIT;
