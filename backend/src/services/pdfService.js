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
        case 'exam':
        case 'exercises':
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
        case 'commentary':
          renderSheet(doc, data, opts);
          break;
        case 'feedback':
        case 'ocr':
        case 'essay':
        case 'syntax':
          renderFeedback(doc, data, opts);
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
