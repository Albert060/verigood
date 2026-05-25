// End-to-end smoke test: login → generate (every endpoint) → render PDF
// Run after: npm install + DB up + backend running on 3001
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:3001';
const tmp = path.join(__dirname, '..', '..', 'tmp');
fs.mkdirSync(tmp, { recursive: true });

const log = (...a) => console.log(...a);

const json = async (url, opts = {}, token) => {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { _raw: text }; }
  return { status: res.status, body: parsed };
};

const pdf = async (url, body, token) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buf };
};

const tests = [
  {
    name: 'Cambridge exam',
    url: `${API}/api/cambridge/exams/generate`,
    body: { level: 'B2', topic: 'conditionals', exerciseTypes: ['multiple_choice', 'key_word_transformation'], totalQuestions: 5 },
    pdf: (r) => ({ type: 'exam', data: r, moduleKey: 'cambridge' }),
  },
  {
    name: 'Cambridge dynamics',
    url: `${API}/api/cambridge/dynamics/generate`,
    body: { level: 'B1', topic: 'travel', duration: 15, types: ['speaking'], count: 3 },
    pdf: (r) => ({ type: 'dynamics', data: { dynamics: r.dynamics }, moduleKey: 'cambridge' }),
  },
  {
    name: 'Cambridge presentation',
    url: `${API}/api/cambridge/presentations/generate`,
    body: { sourceText: 'Climate change is one of the most pressing global issues. Rising sea levels, extreme weather and shifting ecosystems are signs of a warming planet.', level: 'B2', unit: 'Climate', outputTypes: ['slides', 'notebooklm'] },
    pdf: (r) => ({ type: 'sheet', data: { title: r.title, intro: r.summary, sections: (r.slides || []).map(s => ({ title: s.title, body: s.content || '', bullets: s.bullets || s.keyPoints || [] })) }, moduleKey: 'cambridge' }),
  },
  {
    name: 'Mate problems',
    url: `${API}/api/matematicas/problems/generate`,
    body: { course: '3eso', topics: ['algebra'], difficulty: 'medio', count: 4 },
    pdf: (r) => ({ type: 'problems', data: { problems: r.problems }, moduleKey: 'matematicas' }),
  },
  {
    name: 'Mate series',
    url: `${API}/api/matematicas/series/generate`,
    body: { course: '5primaria', topics: ['operaciones_basicas'], difficulty: 'medio', count: 12 },
    pdf: (r) => ({ type: 'series', data: { problems: (r.series || []).map((s) => ({ statement: s.exercise, answer: s.answer, steps: [] })) }, moduleKey: 'matematicas' }),
  },
  {
    name: 'Lengua exercises',
    url: `${API}/api/lengua/exercises/generate`,
    body: { course: '5primaria', types: ['ortografia'], difficulty: 'medio', count: 5, topic: 'acentuación' },
    pdf: (r) => ({ type: 'exercises', data: { questions: (r.exercises || []).map((e) => ({ question: e.content, answer: e.answer, explanation: e.explanation, points: e.points || 2 })), level: r.level, totalQuestions: (r.exercises || []).length }, moduleKey: 'espanol' }),
  },
  {
    name: 'Lengua essay',
    url: `${API}/api/lengua/essays/correct`,
    body: { text: 'Erase una vez un alumno que no ponia tildes y siempre confundia b con v en sus redacciones para la clase de lengua. Su profesora le explico la importancia de revisar.', course: '6primaria', type: 'redaccion' },
    pdf: (r) => ({ type: 'essay', data: r, moduleKey: 'espanol' }),
  },
  {
    name: 'Lengua syntax',
    url: `${API}/api/lengua/syntax/analyze`,
    body: { sentence: 'María estudia matemáticas en la biblioteca por las tardes.', level: '3eso' },
    pdf: (r) => ({ type: 'syntax', data: r, moduleKey: 'espanol' }),
  },
  {
    name: 'Lengua commentary',
    url: `${API}/api/lengua/commentary/generate`,
    body: { text: 'Erase una vez en un lugar de la Mancha de cuyo nombre no quiero acordarme un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.', level: '4eso', type: 'literario' },
    pdf: (r) => ({ type: 'commentary', data: r, moduleKey: 'espanol' }),
  },
  {
    name: 'Lengua dynamics',
    url: `${API}/api/lengua/dynamics/generate`,
    body: { level: '5primaria', topic: 'cuentos', duration: 20, types: ['speaking'], count: 3 },
    pdf: (r) => ({ type: 'dynamics', data: { dynamics: r.dynamics }, moduleKey: 'espanol' }),
  },
  {
    name: 'Medio sheet',
    url: `${API}/api/medio/sheets/generate`,
    body: { topic: 'Los seres vivos', grade: 3 },
    pdf: (r) => ({ type: 'sheet', data: r, moduleKey: 'medio' }),
  },
  {
    name: 'Medio quiz',
    url: `${API}/api/medio/quizzes/generate`,
    body: { topic: 'El Sistema Solar', grade: 4, count: 8 },
    pdf: (r) => ({ type: 'exam', data: r, moduleKey: 'medio' }),
  },
  {
    name: 'Medio dynamics',
    url: `${API}/api/medio/dynamics/generate`,
    body: { level: '4', topic: 'plantas', duration: 25, types: ['experiment'], count: 3 },
    pdf: (r) => ({ type: 'dynamics', data: { dynamics: r.dynamics }, moduleKey: 'medio' }),
  },
];

(async () => {
  // Login
  const login = await json(`${API}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@verigood.com', password: 'demo1234' }),
  });
  if (login.status !== 200) {
    log('login FAIL', login);
    process.exit(1);
  }
  const token = login.body.accessToken;
  log('login OK');

  let pass = 0, fail = 0;
  for (const t of tests) {
    const gen = await json(t.url, { method: 'POST', body: JSON.stringify(t.body) }, token);
    if (gen.status !== 200) {
      log(`✗ ${t.name}  GEN ${gen.status}  ${(gen.body && gen.body.error) || ''}`);
      fail++;
      continue;
    }
    const pdfBody = { ...t.pdf(gen.body), title: t.name, filename: t.name.replace(/\s+/g, '_') };
    const out = await pdf(`${API}/api/pdf/render`, pdfBody, token);
    const isPdf = out.buf.length >= 4 && out.buf.slice(0, 4).toString() === '%PDF';
    if (out.status === 200 && isPdf) {
      const fp = path.join(tmp, `${t.name.replace(/\s+/g, '_')}.pdf`);
      fs.writeFileSync(fp, out.buf);
      log(`✓ ${t.name}  ${out.buf.length} bytes  ${fp}`);
      pass++;
    } else {
      log(`✗ ${t.name}  PDF ${out.status}  ${out.buf.slice(0, 100).toString()}`);
      fail++;
    }
  }
  log(`\n${pass} ok, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
