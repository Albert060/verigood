const PDFDocument = require('pdfkit');

// ── Palette (matches frontend "Cuaderno del Catedrático") ────
const COLOR = {
  tinta: '#14182B',
  marino: '#1F2A4D',
  granate: '#6B1F2A',
  marron: '#3F2E1A',
  marronSoft: '#5C4A33',
  linea: '#C9B998',
  papel: '#FFFEF9',
  amarillo: '#E8D89A',
  verde: '#1A5C35',
};

const MODULE_COLOR = {
  cambridge: COLOR.marino,
  espanol: COLOR.granate,
  matematicas: '#2D4A6A',
  medio: COLOR.verde,
};

// ── PDF builder helpers ─────────────────────────────────────
const newDoc = () =>
  new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    info: { Title: 'VeriGood', Author: 'VeriGood', Producer: 'VeriGood' },
  });

const drawHeader = (doc, { title, subtitle, accent = COLOR.marino, romanNum }) => {
  const startY = doc.y;
  // Accent bar on the left
  doc.save();
  doc.rect(doc.page.margins.left - 18, startY, 4, 36).fill(accent);
  doc.restore();

  if (romanNum) {
    doc
      .fillColor(COLOR.marronSoft)
      .font('Helvetica-Oblique')
      .fontSize(11)
      .text(`§ ${romanNum}`, { continued: false });
    doc.moveDown(0.1);
  }

  doc
    .fillColor(COLOR.tinta)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(title);

  if (subtitle) {
    doc.moveDown(0.2);
    doc
      .fillColor(COLOR.marronSoft)
      .font('Helvetica')
      .fontSize(11)
      .text(subtitle);
  }

  doc.moveDown(0.6);
  // Hairline
  const y = doc.y;
  doc.save();
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.6)
    .strokeColor(COLOR.linea)
    .stroke();
  doc.restore();
  doc.moveDown(0.8);
};

const drawFooter = (doc, label = 'VeriGood · IA para colegios') => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - doc.page.margins.bottom + 24;
    doc
      .save()
      .fillColor(COLOR.marronSoft)
      .font('Helvetica')
      .fontSize(9)
      .text(label, doc.page.margins.left, bottom, { lineBreak: false })
      .text(`Página ${i + 1} de ${range.count}`, 0, bottom, {
        align: 'right',
        width: doc.page.width - doc.page.margins.right,
      })
      .restore();
  }
};

const sectionLabel = (doc, text) => {
  doc.moveDown(0.6);
  doc
    .fillColor(COLOR.marronSoft)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(text.toUpperCase(), { characterSpacing: 1.5 });
  doc.moveDown(0.4);
};

const paragraph = (doc, text, opts = {}) => {
  doc
    .fillColor(opts.color || COLOR.tinta)
    .font(opts.font || 'Helvetica')
    .fontSize(opts.size || 11)
    .text(text, { lineGap: 2, ...opts });
  doc.moveDown(0.4);
};

// ── Renderers per content type ──────────────────────────────

// Cambridge / Lengua exam
const renderExam = (doc, exam, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || `Examen ${exam.level || ''}`,
    subtitle: subtitle || [exam.topic, exam.totalQuestions ? `${exam.totalQuestions} preguntas` : null].filter(Boolean).join(' · '),
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.marino,
    romanNum: 'I',
  });

  // Student info block
  doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(10);
  doc.text('Nombre: __________________________________', { continued: true });
  doc.text('     Curso: ____________     Fecha: __________');
  doc.moveDown(1.2);

  const questions = exam.questions || [];
  questions.forEach((q, i) => {
    if (doc.y > doc.page.height - 160) doc.addPage();

    doc
      .fillColor(COLOR.marino)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`${i + 1}.`, { continued: true })
      .fillColor(COLOR.tinta)
      .font('Helvetica')
      .text(`  ${q.question || ''}`, { lineGap: 1.5 });

    if (Array.isArray(q.options) && q.options.length) {
      doc.moveDown(0.3);
      q.options.forEach((opt, j) => {
        const letter = String.fromCharCode(65 + j);
        doc
          .fillColor(COLOR.tinta)
          .font('Helvetica')
          .fontSize(10.5)
          .text(`     ${letter})  ${opt}`, { lineGap: 1 });
      });
    } else if (q.type === 'true_false') {
      doc.moveDown(0.2);
      doc.fillColor(COLOR.marronSoft).fontSize(10.5).text('     □ Verdadero      □ Falso');
    } else {
      // open answer / fill blanks → leave a writing line
      doc.moveDown(0.5);
      const y = doc.y;
      doc.save()
        .moveTo(doc.page.margins.left + 24, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .lineWidth(0.5)
        .strokeColor(COLOR.linea)
        .dash(2, { space: 2 })
        .stroke()
        .undash();
      doc.restore();
      doc.y = y + 14;
    }

    doc.moveDown(0.7);
  });

  // Answer key on a fresh page
  doc.addPage();
  drawHeader(doc, {
    title: 'Solucionario',
    subtitle: 'Para uso del docente',
    accent: COLOR.granate,
    romanNum: 'II',
  });

  questions.forEach((q, i) => {
    if (doc.y > doc.page.height - 90) doc.addPage();
    doc
      .fillColor(COLOR.granate)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(`${i + 1}. `, { continued: true })
      .fillColor(COLOR.tinta)
      .font('Helvetica')
      .text(`Respuesta: ${q.answer ?? '—'}`);
    if (q.explanation) {
      doc
        .fillColor(COLOR.marronSoft)
        .font('Helvetica-Oblique')
        .fontSize(9.5)
        .text(`     ${q.explanation}`, { lineGap: 1 });
    }
    doc.moveDown(0.4);
  });
};

// Math / mixed: list of problems with step-by-step solutions
const renderProblems = (doc, data, { title, subtitle, accent }) => {
  drawHeader(doc, {
    title: title || 'Problemas',
    subtitle,
    accent: accent || MODULE_COLOR.matematicas,
    romanNum: 'I',
  });

  const problems = data.problems || data.questions || [];
  problems.forEach((p, i) => {
    if (doc.y > doc.page.height - 200) doc.addPage();

    doc
      .fillColor(MODULE_COLOR.matematicas)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`Problema ${i + 1}`);
    doc.moveDown(0.2);
    doc
      .fillColor(COLOR.tinta)
      .font('Helvetica')
      .fontSize(11)
      .text(p.statement || p.question || '', { lineGap: 2 });

    if (Array.isArray(p.steps) && p.steps.length) {
      sectionLabel(doc, 'Solución paso a paso');
      p.steps.forEach((s, j) => {
        doc
          .fillColor(COLOR.granate)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`   ${j + 1}.`, { continued: true })
          .fillColor(COLOR.tinta)
          .font('Helvetica')
          .text(`  ${s}`, { lineGap: 1.5 });
      });
    }
    if (p.answer != null) {
      doc.moveDown(0.3);
      doc
        .fillColor(COLOR.verde)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`Resultado: ${p.answer}`);
    }
    doc.moveDown(0.8);
  });
};

// Dynamics: list of class activities
const renderDynamics = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || 'Dinámicas de aula',
    subtitle,
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.marino,
    romanNum: 'I',
  });

  const dynamics = data.dynamics || data.activities || [];
  dynamics.forEach((d, i) => {
    if (doc.y > doc.page.height - 220) doc.addPage();

    doc
      .fillColor(MODULE_COLOR[moduleKey] || COLOR.marino)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(`${i + 1}. ${d.title || `Actividad ${i + 1}`}`);
    doc.moveDown(0.2);
    if (d.duration) {
      doc
        .fillColor(COLOR.marronSoft)
        .font('Helvetica-Oblique')
        .fontSize(9.5)
        .text(`Duración aprox.: ${d.duration} · Tipo: ${d.type || 'general'}`);
      doc.moveDown(0.2);
    }
    if (d.objective) {
      sectionLabel(doc, 'Objetivo');
      paragraph(doc, d.objective);
    }
    if (Array.isArray(d.steps) && d.steps.length) {
      sectionLabel(doc, 'Desarrollo');
      d.steps.forEach((s, j) => {
        doc
          .fillColor(COLOR.granate)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`   ${j + 1}.`, { continued: true })
          .fillColor(COLOR.tinta)
          .font('Helvetica')
          .text(`  ${s}`, { lineGap: 1.5 });
      });
    }
    if (d.materials) {
      sectionLabel(doc, 'Materiales');
      paragraph(doc, Array.isArray(d.materials) ? d.materials.join(' · ') : d.materials);
    }
    doc.moveDown(0.6);
  });
};

// Sheet / lesson: a thematic page with sections
const renderSheet = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || data.title || 'Ficha temática',
    subtitle: subtitle || data.level,
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.verde,
    romanNum: 'I',
  });

  if (data.intro) paragraph(doc, data.intro);

  (data.sections || []).forEach((s) => {
    if (doc.y > doc.page.height - 160) doc.addPage();
    sectionLabel(doc, s.title || 'Sección');
    if (s.body) paragraph(doc, s.body);
    if (Array.isArray(s.bullets) && s.bullets.length) {
      s.bullets.forEach((b) => {
        doc
          .fillColor(COLOR.granate)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text('•', { continued: true })
          .fillColor(COLOR.tinta)
          .font('Helvetica')
          .text(`  ${b}`, { lineGap: 1.5 });
      });
      doc.moveDown(0.4);
    }
  });

  if (Array.isArray(data.questions) && data.questions.length) {
    sectionLabel(doc, 'Preguntas de comprensión');
    data.questions.forEach((q, i) => {
      doc
        .fillColor(COLOR.marino)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`${i + 1}. `, { continued: true })
        .fillColor(COLOR.tinta)
        .font('Helvetica')
        .text(q.question || q);
      doc.moveDown(0.2);
      const y = doc.y;
      doc.save()
        .moveTo(doc.page.margins.left + 24, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .lineWidth(0.5)
        .strokeColor(COLOR.linea)
        .dash(2, { space: 2 })
        .stroke()
        .undash();
      doc.restore();
      doc.y = y + 18;
    });
  }
};

// Essay correction / OCR result: feedback report
const renderFeedback = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || 'Informe de corrección',
    subtitle,
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.granate,
    romanNum: 'I',
  });

  if (data.score != null || data.grade != null) {
    const score = data.score ?? data.grade;
    const max = data.maxScore ?? data.maxGrade ?? 10;
    doc.save();
    const x = doc.page.margins.left;
    const y = doc.y;
    doc.roundedRect(x, y, 220, 56, 8).strokeColor(COLOR.granate).lineWidth(1.4).stroke();
    doc
      .fillColor(COLOR.granate)
      .font('Helvetica-Bold')
      .fontSize(28)
      .text(`${score}`, x + 16, y + 12, { width: 60, lineBreak: false });
    doc
      .fillColor(COLOR.marronSoft)
      .font('Helvetica')
      .fontSize(10)
      .text(`/ ${max}`, x + 80, y + 28, { lineBreak: false });
    doc
      .fillColor(COLOR.tinta)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Calificación', x + 124, y + 14, { lineBreak: false });
    if (data.summary) {
      doc
        .fillColor(COLOR.marronSoft)
        .font('Helvetica')
        .fontSize(9.5)
        .text(data.summary.slice(0, 80), x + 124, y + 32, { width: 90, lineBreak: false });
    }
    doc.restore();
    doc.y = y + 74;
  }

  if (data.summary) {
    sectionLabel(doc, 'Resumen');
    paragraph(doc, data.summary);
  }
  if (Array.isArray(data.strengths) && data.strengths.length) {
    sectionLabel(doc, 'Fortalezas');
    data.strengths.forEach((s) => {
      doc
        .fillColor(COLOR.verde)
        .font('Helvetica-Bold')
        .text('✓', { continued: true })
        .fillColor(COLOR.tinta)
        .font('Helvetica')
        .fontSize(11)
        .text(`  ${s}`, { lineGap: 1.5 });
    });
    doc.moveDown(0.4);
  }
  if (Array.isArray(data.improvements) && data.improvements.length) {
    sectionLabel(doc, 'A mejorar');
    data.improvements.forEach((s) => {
      doc
        .fillColor(COLOR.granate)
        .font('Helvetica-Bold')
        .text('!', { continued: true })
        .fillColor(COLOR.tinta)
        .font('Helvetica')
        .fontSize(11)
        .text(`  ${s}`, { lineGap: 1.5 });
    });
    doc.moveDown(0.4);
  }
  if (Array.isArray(data.errors) && data.errors.length) {
    sectionLabel(doc, 'Errores detectados');
    data.errors.forEach((e, i) => {
      doc
        .fillColor(COLOR.tinta)
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text(`${i + 1}. ${e.category || 'Error'}`);
      doc
        .fillColor(COLOR.marronSoft)
        .font('Helvetica')
        .fontSize(10)
        .text(`   ${e.original || ''}  →  ${e.correction || ''}`, { lineGap: 1.5 });
      if (e.note) {
        doc
          .fillColor(COLOR.marronSoft)
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .text(`   ${e.note}`);
      }
      doc.moveDown(0.2);
    });
  }
};

// ── Renderers por output_kind del catálogo Fase 1 ───────────
// La forma de los datos viene determinada por los handlers en services/tools/
// y por demoFixtures. Mantenemos formato "Cuaderno del Catedrático" (paleta,
// hairline, sección romana) idéntico al renderer Cambridge.

// output_kind: 'exercise_set' → data: { title, topic, course, exercises:[{ id, type, prompt, options?, answer, points }] }
const renderExerciseSet = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || data.title || 'Ejercicios',
    subtitle: subtitle || [data.topic, data.course].filter(Boolean).join(' · '),
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.marino,
    romanNum: 'I',
  });

  // Cabecera de alumno
  doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(10);
  doc.text('Nombre: __________________________________', { continued: true });
  doc.text('     Curso: ____________     Fecha: __________');
  doc.moveDown(1.0);

  if (data.instructions) paragraph(doc, data.instructions, { color: COLOR.marronSoft, font: 'Helvetica-Oblique', size: 10.5 });

  const exercises = data.exercises || [];
  if (!exercises.length) {
    paragraph(doc, 'Sin ejercicios.', { color: COLOR.marronSoft });
  }

  exercises.forEach((ex, i) => {
    if (doc.y > doc.page.height - 160) doc.addPage();

    doc
      .fillColor(COLOR.marino)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`${i + 1}.`, { continued: true })
      .fillColor(COLOR.tinta)
      .font('Helvetica')
      .text(`  ${ex.prompt || ex.question || ''}`, { lineGap: 1.5 });

    if (Array.isArray(ex.options) && ex.options.length) {
      doc.moveDown(0.3);
      ex.options.forEach((opt, j) => {
        const letter = String.fromCharCode(65 + j);
        doc
          .fillColor(COLOR.tinta)
          .font('Helvetica')
          .fontSize(10.5)
          .text(`     ${letter})  ${opt}`, { lineGap: 1 });
      });
    } else {
      // Línea de respuesta para ejercicios abiertos
      doc.moveDown(0.4);
      const y = doc.y;
      doc.save()
        .moveTo(doc.page.margins.left + 24, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .lineWidth(0.5)
        .strokeColor(COLOR.linea)
        .dash(2, { space: 2 })
        .stroke()
        .undash();
      doc.restore();
      doc.y = y + 14;
    }

    if (Array.isArray(ex.data) || ex.data) {
      doc.moveDown(0.2);
      const txt = Array.isArray(ex.data) ? ex.data.join(' · ') : String(ex.data);
      doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(9.5).text(`     Datos: ${txt}`);
    }

    doc.moveDown(0.7);
  });

  // Solucionario
  doc.addPage();
  drawHeader(doc, {
    title: 'Solucionario',
    subtitle: 'Para uso del docente',
    accent: COLOR.granate,
    romanNum: 'II',
  });

  exercises.forEach((ex, i) => {
    if (doc.y > doc.page.height - 110) doc.addPage();
    doc
      .fillColor(COLOR.granate)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(`${i + 1}. `, { continued: true })
      .fillColor(COLOR.tinta)
      .font('Helvetica')
      .text(`Respuesta: ${ex.answer ?? '—'}`);

    if (Array.isArray(ex.solution_steps) && ex.solution_steps.length) {
      ex.solution_steps.forEach((s, j) => {
        doc
          .fillColor(COLOR.marronSoft)
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .text(`     ${j + 1}) ${s}`, { lineGap: 1 });
      });
    }
    if (ex.explanation) {
      doc
        .fillColor(COLOR.marronSoft)
        .font('Helvetica-Oblique')
        .fontSize(9.5)
        .text(`     ${ex.explanation}`, { lineGap: 1 });
    }
    doc.moveDown(0.4);
  });
};

// output_kind: 'quiz' → data: { title, topic, course, questions:[{ id, prompt, options, correct_index, explanation }] }
const renderQuiz = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || data.title || 'Cuestionario',
    subtitle: subtitle || [data.topic, data.course].filter(Boolean).join(' · '),
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.marino,
    romanNum: 'I',
  });

  doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(10);
  doc.text('Nombre: __________________________________', { continued: true });
  doc.text('     Curso: ____________     Fecha: __________');
  doc.moveDown(1.0);

  const questions = data.questions || [];
  questions.forEach((q, i) => {
    if (doc.y > doc.page.height - 160) doc.addPage();

    doc
      .fillColor(COLOR.marino)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`${i + 1}.`, { continued: true })
      .fillColor(COLOR.tinta)
      .font('Helvetica')
      .text(`  ${q.prompt || q.question || ''}`, { lineGap: 1.5 });

    (q.options || []).forEach((opt, j) => {
      const letter = String.fromCharCode(65 + j);
      doc.fillColor(COLOR.tinta).font('Helvetica').fontSize(10.5)
        .text(`     ${letter})  ${opt}`, { lineGap: 1 });
    });
    doc.moveDown(0.7);
  });

  // Solucionario
  doc.addPage();
  drawHeader(doc, {
    title: 'Solucionario',
    subtitle: 'Para uso del docente',
    accent: COLOR.granate,
    romanNum: 'II',
  });

  questions.forEach((q, i) => {
    if (doc.y > doc.page.height - 90) doc.addPage();
    const idx = Number.isInteger(q.correct_index) ? q.correct_index : null;
    const letter = idx != null ? String.fromCharCode(65 + idx) : '—';
    const text = idx != null && q.options?.[idx] ? `${letter}) ${q.options[idx]}` : '—';
    doc
      .fillColor(COLOR.granate)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(`${i + 1}. `, { continued: true })
      .fillColor(COLOR.tinta)
      .font('Helvetica')
      .text(`Respuesta correcta: ${text}`);
    if (q.explanation) {
      doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(9.5)
        .text(`     ${q.explanation}`, { lineGap: 1 });
    }
    doc.moveDown(0.4);
  });
};

// output_kind: 'rubric' → data: { title, context, scale:[], criteria:[{ name, weight, levels:[{label, descriptor}] }] }
const renderRubric = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || data.title || 'Rúbrica',
    subtitle: subtitle || data.context || '',
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.granate,
    romanNum: 'I',
  });

  const scale = data.scale || ['Iniciado','En proceso','Adecuado','Avanzado'];
  const criteria = data.criteria || [];

  criteria.forEach((c, i) => {
    if (doc.y > doc.page.height - 180) doc.addPage();
    doc
      .fillColor(COLOR.marino)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`${i + 1}. ${c.name || `Criterio ${i + 1}`}` + (c.weight ? `  (peso: ${c.weight})` : ''));
    doc.moveDown(0.3);

    (c.levels || []).forEach((lv) => {
      doc
        .fillColor(COLOR.granate)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`   ${lv.label || ''}:`, { continued: true })
        .fillColor(COLOR.tinta)
        .font('Helvetica')
        .text(`  ${lv.descriptor || ''}`, { lineGap: 1.5 });
    });

    if (!c.levels && scale.length) {
      scale.forEach((label) => {
        doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(10)
          .text(`   ${label}: ____________________________________________________`);
      });
    }

    doc.moveDown(0.7);
  });
};

// output_kind: 'timeline' → data: { title, period, events:[{ year, title, description }] }
const renderTimeline = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || data.title || 'Línea de tiempo',
    subtitle: subtitle || data.period || '',
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.marino,
    romanNum: 'I',
  });

  const events = data.events || [];
  events.forEach((ev, i) => {
    if (doc.y > doc.page.height - 110) doc.addPage();
    doc
      .fillColor(COLOR.granate)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(`${ev.year ?? '—'}`, { continued: true })
      .fillColor(COLOR.tinta)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`   ${ev.title || ''}`);
    doc.moveDown(0.15);
    if (ev.description) {
      doc.fillColor(COLOR.tinta).font('Helvetica').fontSize(10.5)
        .text(`     ${ev.description}`, { lineGap: 1.5 });
    }
    doc.moveDown(0.5);
  });
};

// output_kind: 'commentary' → data: { title, source_text, context, key_concepts:[{term, definition}], commentary_paragraphs:[], guiding_questions:[] }
const renderCommentary = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || data.title || 'Comentario',
    subtitle: subtitle || '',
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.marino,
    romanNum: 'I',
  });

  if (data.source_text) {
    sectionLabel(doc, 'Texto');
    paragraph(doc, data.source_text, { font: 'Helvetica-Oblique' });
  }
  if (data.context) {
    sectionLabel(doc, 'Contexto');
    paragraph(doc, data.context);
  }
  if (Array.isArray(data.key_concepts) && data.key_concepts.length) {
    sectionLabel(doc, 'Conceptos clave');
    data.key_concepts.forEach((kc) => {
      doc
        .fillColor(COLOR.granate)
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .text(`• ${kc.term || ''}:`, { continued: true })
        .fillColor(COLOR.tinta)
        .font('Helvetica')
        .text(`  ${kc.definition || ''}`, { lineGap: 1.5 });
    });
    doc.moveDown(0.4);
  }
  if (Array.isArray(data.commentary_paragraphs) && data.commentary_paragraphs.length) {
    sectionLabel(doc, 'Comentario');
    data.commentary_paragraphs.forEach((p) => paragraph(doc, p));
  }
  if (Array.isArray(data.guiding_questions) && data.guiding_questions.length) {
    sectionLabel(doc, 'Preguntas guía');
    data.guiding_questions.forEach((q, i) => {
      doc.fillColor(COLOR.marino).font('Helvetica-Bold').fontSize(11)
        .text(`${i + 1}. `, { continued: true })
        .fillColor(COLOR.tinta).font('Helvetica').text(typeof q === 'string' ? q : (q.question || ''));
      doc.moveDown(0.3);
    });
  }
};

// output_kind: 'text' → data: string (markdown ligero) o { content }
const renderText = (doc, data, { title, subtitle, accent, moduleKey }) => {
  drawHeader(doc, {
    title: title || (typeof data === 'object' ? data.title : '') || 'Documento',
    subtitle: subtitle || '',
    accent: accent || MODULE_COLOR[moduleKey] || COLOR.marino,
    romanNum: 'I',
  });

  const text = typeof data === 'string'
    ? data
    : (data.content || data.text || data.body || JSON.stringify(data, null, 2));

  // Soporte mínimo de markdown: # / ## / ### / -. Sin parser pesado: paso
  // línea a línea decidiendo estilo. Mantiene márgenes y saltos del estilo
  // "Cuaderno del Catedrático" sin pintar la sintaxis cruda.
  const lines = String(text).split(/\n/);
  for (const raw of lines) {
    if (doc.y > doc.page.height - 90) doc.addPage();
    const line = raw.replace(/\r$/, '');
    if (!line.trim()) { doc.moveDown(0.4); continue; }

    let m;
    if ((m = line.match(/^#\s+(.+)$/))) {
      doc.moveDown(0.3);
      doc.fillColor(COLOR.marino).font('Helvetica-Bold').fontSize(15).text(m[1]);
      doc.moveDown(0.3);
      continue;
    }
    if ((m = line.match(/^##\s+(.+)$/))) {
      doc.moveDown(0.25);
      doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(12).text(m[1]);
      doc.moveDown(0.2);
      continue;
    }
    if ((m = line.match(/^###\s+(.+)$/))) {
      doc.fillColor(COLOR.marronSoft).font('Helvetica-Bold').fontSize(10).text(m[1].toUpperCase(), { characterSpacing: 1 });
      doc.moveDown(0.2);
      continue;
    }
    if ((m = line.match(/^[\-*]\s+(.+)$/))) {
      doc.fillColor(COLOR.granate).font('Helvetica-Bold').fontSize(11).text('• ', { continued: true })
        .fillColor(COLOR.tinta).font('Helvetica').text(m[1].replace(/\*\*(.+?)\*\*/g, '$1'), { lineGap: 1.5 });
      continue;
    }
    if ((m = line.match(/^(\d+)\.\s+(.+)$/))) {
      doc.fillColor(COLOR.marino).font('Helvetica-Bold').fontSize(11).text(`${m[1]}. `, { continued: true })
        .fillColor(COLOR.tinta).font('Helvetica').text(m[2].replace(/\*\*(.+?)\*\*/g, '$1'), { lineGap: 1.5 });
      continue;
    }
    if (/^>\s+/.test(line)) {
      doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(10.5)
        .text(line.replace(/^>\s+/, ''), { lineGap: 1.5 });
      continue;
    }
    doc.fillColor(COLOR.tinta).font('Helvetica').fontSize(11)
      .text(line.replace(/\*\*(.+?)\*\*/g, '$1'), { lineGap: 1.5 });
  }
};

// output_kind: 'invoice' → factura. Estilo limpio profesional con mismo lenguaje
// del proyecto (paleta, hairline, tipografía). Lleva número de factura, datos
// del emisor, del cliente, periodo, líneas, totales con IVA y sello de pago.
const fmtEUR = (cents, currency = 'eur') => {
  if (cents == null || isNaN(cents)) return '—';
  const amount = (cents / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return `${amount} ${currency.toUpperCase() === 'EUR' ? '€' : currency.toUpperCase()}`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch (_) { return '—'; }
};

const ISSUER = {
  name: 'VeriGood S.L.',
  taxId: 'B-XXXXXXXX',
  address: 'Calle Gran Vía, 1 · 28013 Madrid · España',
  contact: 'facturacion@verigood.es · verigood.es',
};

const renderInvoice = (doc, data, { title, subtitle, accent, moduleKey }) => {
  const ac = accent || COLOR.marino;

  // Cabecera tipo cuaderno + nº de factura grande a la derecha
  drawHeader(doc, {
    title: title || 'Factura',
    subtitle: subtitle || (data.number ? `Nº ${data.number}` : ''),
    accent: ac,
    romanNum: 'I',
  });

  // ── Bloque: emisor y cliente
  const leftX  = doc.page.margins.left;
  const rightX = doc.page.width / 2 + 12;
  const blockY = doc.y;
  const colW   = doc.page.width / 2 - doc.page.margins.left - 12;

  const renderParty = (x, y, label, lines) => {
    doc.save();
    doc.fillColor(COLOR.marronSoft).font('Helvetica-Bold').fontSize(9)
      .text(label.toUpperCase(), x, y, { characterSpacing: 1.5, width: colW });
    doc.fillColor(COLOR.tinta).font('Helvetica').fontSize(10.5);
    let cursor = doc.y + 2;
    lines.filter(Boolean).forEach((l) => {
      doc.text(l, x, cursor, { width: colW, lineGap: 1 });
      cursor = doc.y;
    });
    doc.restore();
    return cursor;
  };

  const emisorBottom = renderParty(leftX, blockY, 'Emisor', [
    ISSUER.name,
    `CIF: ${ISSUER.taxId}`,
    ISSUER.address,
    ISSUER.contact,
  ]);

  const addr = data.customer_address || {};
  const taxId = (data.customer_tax_ids?.[0]?.value) || data.customer_tax_id || null;
  const clienteBottom = renderParty(rightX, blockY, 'Cliente', [
    data.customer_name || '—',
    taxId ? `CIF/NIF: ${taxId}` : null,
    [addr.line1, addr.line2].filter(Boolean).join(', ') || null,
    [addr.postal_code, addr.city, addr.country].filter(Boolean).join(' · ') || null,
    data.customer_email || null,
  ]);

  doc.y = Math.max(emisorBottom, clienteBottom) + 14;

  // ── Bloque: metadatos de factura (fechas, estado)
  const metaY = doc.y;
  doc.save()
    .rect(leftX, metaY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 56)
    .strokeColor(COLOR.linea).lineWidth(0.6).stroke();
  doc.restore();

  const metaCols = [
    { label: 'Nº FACTURA', value: data.number || data.id || '—' },
    { label: 'EMITIDA',    value: fmtDate(data.created) },
    { label: 'VENCIMIENTO', value: fmtDate(data.due_date) },
    { label: 'PAGADA',     value: data.paid ? fmtDate(data.paid_at) : 'Pendiente' },
  ];
  const colWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / metaCols.length;
  metaCols.forEach((c, i) => {
    const x = leftX + i * colWidth + 10;
    doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(8)
      .text(c.label, x, metaY + 9, { characterSpacing: 1.2, width: colWidth - 20 });
    doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(11)
      .text(c.value, x, metaY + 24, { width: colWidth - 20 });
  });
  doc.y = metaY + 56 + 18;

  // ── Sello de estado (PAGADA / PENDIENTE)
  const sealY = doc.y;
  const sealColor = data.paid ? COLOR.verde : COLOR.granate;
  const sealText  = data.paid ? 'PAGADA' : (data.status || 'PENDIENTE').toUpperCase();
  doc.save();
  doc.rotate(-6, { origin: [doc.page.width - 150, sealY + 14] });
  doc.roundedRect(doc.page.width - 220, sealY, 130, 36, 3)
    .lineWidth(1.6).strokeColor(sealColor).stroke();
  doc.fillColor(sealColor).font('Helvetica-Bold').fontSize(16)
    .text(sealText, doc.page.width - 220, sealY + 10, { width: 130, align: 'center', characterSpacing: 2 });
  doc.restore();

  // ── Periodo facturado
  if (data.period_start || data.period_end) {
    doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(10);
    doc.text(`Periodo facturado: ${fmtDate(data.period_start)} — ${fmtDate(data.period_end)}`, leftX, doc.y);
    doc.moveDown(1);
  } else {
    doc.moveDown(0.5);
  }

  // ── Tabla de líneas
  sectionLabel(doc, 'Detalle');
  const tableTop = doc.y;
  const colDescW = doc.page.width - doc.page.margins.left - doc.page.margins.right - 140;
  const colQtyW  = 50;
  const colAmtW  = 90;

  // Header
  doc.fillColor(COLOR.marronSoft).font('Helvetica-Bold').fontSize(9);
  doc.text('CONCEPTO', leftX, tableTop, { width: colDescW, characterSpacing: 1.2 });
  doc.text('CANT.', leftX + colDescW, tableTop, { width: colQtyW, align: 'right', characterSpacing: 1.2 });
  doc.text('IMPORTE', leftX + colDescW + colQtyW, tableTop, { width: colAmtW, align: 'right', characterSpacing: 1.2 });

  doc.moveDown(0.5);
  doc.save()
    .moveTo(leftX, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(0.5).strokeColor(COLOR.linea).stroke()
    .restore();
  doc.moveDown(0.4);

  // Rows
  const lines = data.lines || [];
  if (!lines.length) {
    doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(10)
      .text('Sin líneas de detalle.', leftX);
    doc.moveDown(0.5);
  }
  lines.forEach((l) => {
    const y = doc.y;
    doc.fillColor(COLOR.tinta).font('Helvetica').fontSize(10.5);
    doc.text(l.description || '—', leftX, y, { width: colDescW });
    const rowBottom = doc.y;
    doc.text(String(l.quantity ?? 1), leftX + colDescW, y, { width: colQtyW, align: 'right' });
    doc.text(fmtEUR(l.amount, data.currency), leftX + colDescW + colQtyW, y, { width: colAmtW, align: 'right' });
    if (l.period_start || l.period_end) {
      doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(9)
        .text(`Periodo: ${fmtDate(l.period_start)} — ${fmtDate(l.period_end)}`, leftX, rowBottom + 1);
    }
    doc.moveDown(0.4);
  });

  doc.save()
    .moveTo(leftX, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(0.5).strokeColor(COLOR.linea).stroke()
    .restore();
  doc.moveDown(0.6);

  // ── Totales (alineados a la derecha)
  const totalsX = doc.page.width - doc.page.margins.right - 220;
  const labelW = 110;
  const valueW = 110;

  const drawTotalRow = (label, value, bold = false) => {
    const y = doc.y;
    doc.fillColor(COLOR.marronSoft).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10.5);
    doc.text(label, totalsX, y, { width: labelW });
    doc.fillColor(bold ? COLOR.tinta : COLOR.tinta).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10.5);
    doc.text(value, totalsX + labelW, y, { width: valueW, align: 'right' });
    doc.moveDown(bold ? 0.5 : 0.3);
  };

  drawTotalRow('Base imponible',   fmtEUR(data.subtotal, data.currency));
  if (data.tax != null && data.tax !== 0) {
    drawTotalRow('IVA (21%)',      fmtEUR(data.tax, data.currency));
  }
  // Línea separadora del total
  doc.save()
    .moveTo(totalsX, doc.y).lineTo(totalsX + labelW + valueW, doc.y)
    .lineWidth(0.6).strokeColor(COLOR.linea).stroke()
    .restore();
  doc.moveDown(0.3);
  drawTotalRow('TOTAL',            fmtEUR(data.total ?? data.amount_due, data.currency), true);

  if (data.paid && data.amount_paid != null) {
    drawTotalRow('Importe pagado', fmtEUR(data.amount_paid, data.currency));
  }

  // ── Pie legal
  doc.moveDown(2);
  doc.fillColor(COLOR.marronSoft).font('Helvetica-Oblique').fontSize(8.5);
  doc.text(
    'Factura emitida conforme a la normativa española vigente. Conserva este documento como justificante de pago. ' +
    'Para cualquier incidencia escribe a facturacion@verigood.es indicando el número de factura.',
    doc.page.margins.left, doc.y,
    { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, lineGap: 1.5, align: 'justify' }
  );
};

// ── Global billing report (superadmin) ───────────────────────
// Renderiza un informe ejecutivo de facturación global del SaaS.
// data = {
//   period: 'monthly' | 'yearly',
//   periodLabel: string,
//   generatedAt: ISO string,
//   mrr_eur: number,
//   arr_eur: number,
//   active_orgs: number,
//   total_orgs: number,
//   planBreakdown: [{ plan, count }],
//   planPrices: { starter, colegio, enterprise },
//   series: [{ bucket, value, active_orgs }],  // value en EUR (MRR o ARR según period)
//   invoices: [{ issued_at, org_name, plan, amount_eur, status, source }],
// }
const renderGlobalBilling = (doc, data, { title, subtitle }) => {
  const isYearly = data.period === 'yearly';
  drawHeader(doc, {
    title: title || (isYearly ? 'Facturación global — Anual' : 'Facturación global — Mensual'),
    subtitle: subtitle || `${data.periodLabel || ''}`,
    accent: COLOR.marino,
  });

  const fmtEur = (v) => `${Number(v || 0).toLocaleString('es-ES')} €`;
  const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('es-ES'); } catch { return '—'; }
  };

  // Cabecera: fecha de emisión + periodo
  doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(10)
    .text(`Emitido: ${fmtDate(data.generatedAt)}`, { continued: true })
    .text(`     Vista: ${isYearly ? 'Anual' : 'Mensual'}`, { align: 'right' });
  doc.moveDown(0.8);

  // KPIs en grid 2x2 simulado con texto
  sectionLabel(doc, 'Indicadores globales');
  const kpis = [
    ['MRR actual',     fmtEur(data.mrr_eur)],
    ['ARR estimado',   fmtEur(data.arr_eur)],
    ['Orgs activas',   `${data.active_orgs ?? 0} / ${data.total_orgs ?? 0}`],
    ['Facturas',       String((data.invoices || []).length)],
  ];
  const leftX = doc.page.margins.left;
  const colW = (doc.page.width - leftX - doc.page.margins.right) / 2;
  let yTop = doc.y;
  kpis.forEach(([label, value], i) => {
    const x = leftX + (i % 2) * colW;
    const y = yTop + Math.floor(i / 2) * 50;
    doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(8).text(label.toUpperCase(), x, y, { characterSpacing: 1.2 });
    doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(18).text(value, x, y + 12);
  });
  doc.y = yTop + 110;

  // Serie temporal como mini-tabla
  sectionLabel(doc, isYearly ? 'Evolución anual (ARR)' : 'Evolución mensual (MRR)');
  const series = data.series || [];
  if (series.length === 0) {
    paragraph(doc, 'Sin datos en el periodo.');
  } else {
    const max = Math.max(...series.map((s) => Number(s.value) || 0), 1);
    series.forEach((s) => {
      const v = Number(s.value) || 0;
      const barW = Math.round((v / max) * 240);
      const y0 = doc.y;
      doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(10)
        .text(String(s.bucket), leftX, y0, { width: 70, lineBreak: false });
      doc.save();
      doc.rect(leftX + 80, y0 + 2, barW, 10).fill(COLOR.marino);
      doc.restore();
      doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(10)
        .text(fmtEur(v), leftX + 340, y0, { width: 100, lineBreak: false });
      doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(9)
        .text(`${s.active_orgs ?? 0} orgs`, leftX + 450, y0, { lineBreak: false });
      doc.y = y0 + 16;
    });
  }
  doc.moveDown(0.5);

  // Plan breakdown
  sectionLabel(doc, 'Distribución por plan');
  const breakdown = data.planBreakdown || [];
  if (breakdown.length === 0) {
    paragraph(doc, 'Sin organizaciones activas.');
  } else {
    breakdown.forEach((row) => {
      const price = (data.planPrices || {})[row.plan] || 0;
      const total = price * Number(row.count || 0);
      const y0 = doc.y;
      doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(11)
        .text((row.plan || '').toUpperCase(), leftX, y0, { width: 120, lineBreak: false });
      doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(10)
        .text(`${row.count} orgs`, leftX + 130, y0, { width: 80, lineBreak: false })
        .text(price ? `${fmtEur(price)} / mes` : 'precio a medida', leftX + 210, y0, { width: 140, lineBreak: false });
      doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(11)
        .text(price ? `${fmtEur(total)} / mes` : '—', leftX + 360, y0, { lineBreak: false, align: 'right', width: 130 });
      doc.y = y0 + 16;
    });
  }
  doc.moveDown(0.8);

  // Tabla de facturas
  sectionLabel(doc, 'Facturas del periodo');
  const invoices = (data.invoices || []).slice(0, 60);
  if (invoices.length === 0) {
    paragraph(doc, 'Sin facturas registradas en el periodo.');
    return;
  }

  // Cabecera de tabla
  const headers = ['Fecha', 'Organización', 'Plan', 'Importe', 'Estado'];
  const colXs = [leftX, leftX + 75, leftX + 260, leftX + 340, leftX + 430];
  doc.fillColor(COLOR.marronSoft).font('Helvetica-Bold').fontSize(9);
  headers.forEach((h, i) => doc.text(h.toUpperCase(), colXs[i], doc.y, { lineBreak: false, characterSpacing: 1 }));
  doc.moveDown(0.4);
  doc.save();
  doc.moveTo(leftX, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(0.5).strokeColor(COLOR.linea).stroke();
  doc.restore();
  doc.moveDown(0.3);

  let totalPeriod = 0;
  invoices.forEach((inv) => {
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
    }
    const y0 = doc.y;
    const amount = Number(inv.amount_eur || 0);
    if (inv.status === 'paid') totalPeriod += amount;
    doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(9)
      .text(fmtDate(inv.issued_at), colXs[0], y0, { width: 70, lineBreak: false });
    doc.fillColor(COLOR.tinta).font('Helvetica').fontSize(10)
      .text(String(inv.org_name || '—'), colXs[1], y0, { width: 180, lineBreak: false, ellipsis: true });
    doc.fillColor(COLOR.marronSoft).font('Helvetica').fontSize(9)
      .text(String(inv.plan || '').toUpperCase(), colXs[2], y0, { width: 75, lineBreak: false });
    doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(10)
      .text(fmtEur(amount), colXs[3], y0, { width: 85, lineBreak: false });
    doc.fillColor(inv.status === 'paid' ? COLOR.verde : COLOR.granate).font('Helvetica-Bold').fontSize(9)
      .text(inv.status === 'paid' ? 'PAGADA' : 'PENDIENTE', colXs[4], y0, { lineBreak: false });
    doc.y = y0 + 14;
  });

  // Total cobrado
  doc.moveDown(0.6);
  doc.save();
  doc.moveTo(leftX, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(0.6).strokeColor(COLOR.linea).stroke();
  doc.restore();
  doc.moveDown(0.3);
  const y1 = doc.y;
  doc.fillColor(COLOR.marronSoft).font('Helvetica-Bold').fontSize(10)
    .text('TOTAL COBRADO EN EL PERIODO', leftX, y1, { lineBreak: false, characterSpacing: 1 });
  doc.fillColor(COLOR.tinta).font('Helvetica-Bold').fontSize(13)
    .text(fmtEur(totalPeriod), 0, y1 - 2, { align: 'right', width: doc.page.width - doc.page.margins.right });
};

// Generic JSON dump (last-resort, but pretty)
const renderJSON = (doc, data, { title, subtitle, accent }) => {
  drawHeader(doc, { title: title || 'Documento', subtitle, accent: accent || COLOR.marino });
  doc
    .fillColor(COLOR.tinta)
    .font('Courier')
    .fontSize(9)
    .text(JSON.stringify(data, null, 2), { lineGap: 1.5 });
};

// ── Public: stream a buffer ─────────────────────────────────
const buildPdf = ({ type, data, title, subtitle, moduleKey }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = newDoc();
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const accent = MODULE_COLOR[moduleKey];
      const opts = { title, subtitle, accent, moduleKey };

      switch (type) {
        // Cambridge / Lengua legacy
        case 'exam':
          renderExam(doc, data, opts);
          break;
        case 'problems':
        case 'series':
          renderProblems(doc, data, opts);
          break;
        case 'dynamics':
          renderDynamics(doc, data, opts);
          break;
        case 'sheet':
          renderSheet(doc, data, opts);
          break;
        case 'feedback':
        case 'ocr':
        case 'essay':
        case 'syntax':
          renderFeedback(doc, data, opts);
          break;

        // Catálogo Fase 1: el `type` es el `output_kind` literal
        case 'exercises':       // alias usado por algunos handlers viejos
        case 'exercise_set':
          renderExerciseSet(doc, data, opts);
          break;
        case 'quiz':
          renderQuiz(doc, data, opts);
          break;
        case 'rubric':
          renderRubric(doc, data, opts);
          break;
        case 'timeline':
          renderTimeline(doc, data, opts);
          break;
        case 'commentary':
          renderCommentary(doc, data, opts);
          break;
        case 'text':
          renderText(doc, data, opts);
          break;

        // Facturación
        case 'invoice':
          renderInvoice(doc, data, opts);
          break;
        case 'global_billing':
          renderGlobalBilling(doc, data, opts);
          break;

        default:
          renderJSON(doc, data, opts);
      }

      drawFooter(doc);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });

module.exports = { buildPdf, MODULE_COLOR, COLOR };
