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

module.exports = { createItem, listItems, getItem, deleteItem, KNOWN_KINDS };
