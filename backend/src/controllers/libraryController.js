const { query } = require('../config/database');

// Output kinds que el frontend sabe pintar (ResultRenderer) y que tienen un
// renderer PDF en pdfService. Si alguien intenta guardar un kind no listado,
// se acepta igualmente: la biblioteca lo mostrará como JSON crudo.
const KNOWN_KINDS = new Set(['text','exercise_set','rubric','timeline','quiz','commentary','exam']);

// POST /api/library/items
const createItem = async (req, res) => {
  try {
    const { moduleId, toolKey, kind, title, payload, metadata } = req.body || {};

    if (!moduleId || !kind || !title || !payload) {
      return res.status(400).json({ error: 'moduleId, kind, title y payload son obligatorios' });
    }
    if (title.length > 255) {
      return res.status(400).json({ error: 'El título es demasiado largo (máx. 255)' });
    }

    // T15 · El módulo debe estar contratado por la org antes de aceptar
    // recursos etiquetados con él. Sin esta comprobación se podían crear
    // library_items con moduleId de módulos NO contratados — no era
    // explotable directamente pero rompía el modelo (biblioteca podría
    // mostrar módulos que el centro no debería estar viendo).
    // Superadmin pasa por diseño (opera sin restricción de contratos).
    if (req.user.role !== 'superadmin') {
      const { rows: [active] } = await query(
        `SELECT 1 FROM organization_modules WHERE organization_id = $1 AND module_id = $2`,
        [req.user.organization_id, moduleId]
      );
      if (!active) {
        return res.status(403).json({
          error: 'Módulo no contratado por el centro',
          code: 'MODULE_NOT_CONTRACTED',
        });
      }
    }

    const result = await query(
      `INSERT INTO library_items
         (organization_id, teacher_id, module_id, tool_key, kind, title, payload, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at AS "createdAt"`,
      [
        req.user.organization_id,
        req.user.id,
        moduleId,
        toolKey || null,
        kind,
        title,
        JSON.stringify(payload),
        JSON.stringify(metadata || {}),
      ]
    );

    res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].createdAt });
  } catch (err) {
    console.error('library createItem error:', err);
    res.status(500).json({ error: 'Error al guardar en biblioteca' });
  }
};

// GET /api/library/items
// Query: search, module, kind, from, to, limit, offset
const listItems = async (req, res) => {
  try {
    const { search, module, kind, from, to, limit = 200, offset = 0 } = req.query;
    const where = ['li.organization_id = $1'];
    const params = [req.user.organization_id];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where.push(`LOWER(li.title) LIKE $${params.length}`);
    }
    if (module) {
      params.push(module);
      where.push(`li.module_id = $${params.length}`);
    }
    if (kind) {
      params.push(kind);
      where.push(`li.kind = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`li.created_at >= $${params.length}`);
    }
    if (to) {
      // incluye día completo
      params.push(to);
      where.push(`li.created_at <= ($${params.length}::timestamptz + INTERVAL '1 day' - INTERVAL '1 microsecond')`);
    }

    params.push(parseInt(limit, 10));
    const limitIdx = params.length;
    params.push(parseInt(offset, 10));
    const offsetIdx = params.length;

    const result = await query(
      `SELECT li.id,
              li.module_id   AS "moduleId",
              li.tool_key    AS "toolKey",
              li.kind,
              li.title,
              li.metadata,
              li.created_at  AS "createdAt",
              u.name         AS "teacherName"
       FROM library_items li
       JOIN users u ON u.id = li.teacher_id
       WHERE ${where.join(' AND ')}
       ORDER BY li.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    res.json({ items: result.rows });
  } catch (err) {
    // Tabla aún no existe (migración 004 pendiente): devolvemos lista vacía
    // en lugar de 500 para que la Biblioteca renderice y muestre el estado
    // vacío con instrucciones, en vez de petar la pantalla.
    if (err.code === '42P01') {
      console.warn('library_items: tabla no existe. Pasa la migración 004.');
      return res.json({ items: [], migrationPending: true });
    }
    console.error('library listItems error:', err);
    res.status(500).json({ error: 'Error al listar la biblioteca' });
  }
};

// GET /api/library/items/:id
const getItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT li.id,
              li.module_id  AS "moduleId",
              li.tool_key   AS "toolKey",
              li.kind,
              li.title,
              li.payload,
              li.metadata,
              li.created_at AS "createdAt",
              u.name        AS "teacherName"
       FROM library_items li
       JOIN users u ON u.id = li.teacher_id
       WHERE li.id = $1 AND li.organization_id = $2`,
      [id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Elemento no encontrado' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('library getItem error:', err);
    res.status(500).json({ error: 'Error al obtener el elemento' });
  }
};

// PATCH /api/library/items/:id
// Actualiza campos de metadata que el profe controla desde el flujo de
// corrección: puntuación final (B5), visto bueno (B5), nombre del alumno (B).
// No permite tocar el payload ni otras columnas.
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { finalScore, approvedAt, studentName } = req.body || {};

    // T6 · Validación estricta de finalScore: no aceptamos strings vacíos,
    // NaN ni negativos. Antes `Number('')` daba 0 y el alumno acababa con
    // 0/10 silenciosamente.
    if (finalScore !== undefined) {
      const n = Number(finalScore);
      if (finalScore === '' || finalScore === null || Number.isNaN(n) || n < 0) {
        return res.status(400).json({
          error: 'finalScore inválido — debe ser un número ≥ 0',
          code: 'INVALID_SCORE',
        });
      }
    }
    // studentName con límite razonable para evitar guardar novelas en JSONB.
    if (studentName !== undefined && String(studentName).length > 120) {
      return res.status(400).json({ error: 'studentName demasiado largo (máx. 120)' });
    }

    const { rows: [row] } = await query(
      `SELECT metadata FROM library_items
        WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organization_id]
    );
    if (!row) return res.status(404).json({ error: 'Elemento no encontrado' });

    const metadata = { ...(row.metadata || {}) };
    if (finalScore   !== undefined) metadata.finalScore   = Number(finalScore);
    if (approvedAt   !== undefined) metadata.approvedAt   = approvedAt;
    if (studentName  !== undefined) metadata.studentName  = String(studentName).slice(0, 120);

    const { rows: [saved] } = await query(
      `UPDATE library_items SET metadata = $1
        WHERE id = $2 AND organization_id = $3
        RETURNING id, metadata`,
      [JSON.stringify(metadata), id, req.user.organization_id]
    );
    res.json({ id: saved.id, metadata: saved.metadata });
  } catch (err) {
    console.error('library updateItem error:', err);
    res.status(500).json({ error: 'Error al actualizar el elemento' });
  }
};

// DELETE /api/library/items/:id
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM library_items WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, req.user.organization_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Elemento no encontrado' });
    res.json({ id });
  } catch (err) {
    console.error('library deleteItem error:', err);
    res.status(500).json({ error: 'Error al eliminar el elemento' });
  }
};

module.exports = { createItem, listItems, getItem, updateItem, deleteItem, KNOWN_KINDS };
