const { query, getClient } = require('../config/database');

// Permite acceder al temario a admin_centro / profesor de la propia org, o
// a superadmin cualquiera. Se apoya en middleware/auth para el JWT; aquí
// sólo comprobamos organization scope.
const canAccessOrg = (req, orgId) =>
  req.user?.role === 'superadmin' || req.user?.organization_id === orgId;

// T16 · Resuelve el orgId objetivo con blindaje: el fallback a
// req.query.organizationId SOLO se acepta cuando el rol es superadmin (el
// único caso donde req.user.organization_id puede ser null). Cualquier otro
// rol DEBE tener organization_id no-null tras authenticate. Si en el futuro
// se crea un rol sin org, esta función lo bloquea explícitamente.
const resolveTargetOrg = (req) => {
  if (req.user?.organization_id) return req.user.organization_id;
  if (req.user?.role === 'superadmin' && req.query?.organizationId) {
    return req.query.organizationId;
  }
  return null;
};

// Asegura que existe un temario para (org, module). El primero que entra al
// módulo crea uno vacío. Devuelve la fila.
const ensureSyllabus = async (organizationId, moduleId, userId) => {
  const { rows } = await query(
    `INSERT INTO syllabi (organization_id, module_id, created_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (organization_id, module_id) DO UPDATE
       SET updated_at = syllabi.updated_at
     RETURNING id, organization_id, module_id, name, created_at, updated_at`,
    [organizationId, moduleId, userId || null]
  );
  return rows[0];
};

// GET /api/modules/:moduleId/syllabus
// Devuelve el temario completo (temas + items + library_items enlazados).
const getSyllabus = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const targetOrg = resolveTargetOrg(req);
    if (!targetOrg) return res.status(400).json({ error: 'organizationId requerido' });
    if (!canAccessOrg(req, targetOrg)) return res.status(403).json({ error: 'Acceso denegado' });

    const syllabus = await ensureSyllabus(targetOrg, moduleId, req.user.id);

    const { rows: sections } = await query(
      `SELECT id, syllabus_id, title, sort_order, created_at, updated_at
         FROM syllabus_sections
        WHERE syllabus_id = $1
        ORDER BY sort_order ASC, created_at ASC`,
      [syllabus.id]
    );

    let items = [];
    if (sections.length > 0) {
      const sectionIds = sections.map((s) => s.id);
      const { rows } = await query(
        `SELECT si.id, si.section_id, si.kind, si.title, si.library_item_id,
                si.sort_order, si.metadata, si.created_at, si.updated_at,
                li.title    AS library_title,
                li.kind     AS library_kind,
                li.module_id AS library_module_id,
                li.tool_key AS library_tool_key
           FROM syllabus_items si
           LEFT JOIN library_items li ON li.id = si.library_item_id
          WHERE si.section_id = ANY($1::uuid[])
          ORDER BY si.sort_order ASC, si.created_at ASC`,
        [sectionIds]
      );
      items = rows;
    }

    const itemsBySection = new Map();
    items.forEach((it) => {
      if (!itemsBySection.has(it.section_id)) itemsBySection.set(it.section_id, []);
      itemsBySection.get(it.section_id).push(it);
    });

    res.json({
      syllabus,
      sections: sections.map((s) => ({
        ...s,
        items: itemsBySection.get(s.id) || [],
      })),
    });
  } catch (err) {
    console.error('getSyllabus error:', err);
    res.status(500).json({ error: 'Error al obtener el temario' });
  }
};

// POST /api/modules/:moduleId/syllabus/sections
// body: { title }
const createSection = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title requerido' });
    }
    const orgId = resolveTargetOrg(req);
    if (!orgId) return res.status(400).json({ error: 'Sin organización' });
    if (!canAccessOrg(req, orgId)) return res.status(403).json({ error: 'Acceso denegado' });

    const syllabus = await ensureSyllabus(orgId, moduleId, req.user.id);

    // Nueva sección al final: sort_order = max + 10.
    const { rows: [nextOrder] } = await query(
      `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next
         FROM syllabus_sections WHERE syllabus_id = $1`,
      [syllabus.id]
    );

    const { rows: [row] } = await query(
      `INSERT INTO syllabus_sections (syllabus_id, title, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, syllabus_id, title, sort_order, created_at, updated_at`,
      [syllabus.id, title.trim().slice(0, 255), nextOrder.next]
    );

    res.status(201).json({ section: { ...row, items: [] } });
  } catch (err) {
    console.error('createSection error:', err);
    res.status(500).json({ error: 'Error al crear tema' });
  }
};

// PATCH /api/modules/:moduleId/syllabus/reorder
// body: { sectionIds: [uuid, uuid, ...] }
// T4 · Reordena los temas del temario de forma atómica en una transacción.
// El orden del array determina el sort_order final (0, 10, 20, ...). Si algo
// falla en medio, la transacción se revierte y no queda un estado a medias.
const reorderSections = async (req, res) => {
  const { moduleId } = req.params;
  const { sectionIds } = req.body || {};

  if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
    return res.status(400).json({ error: 'sectionIds requerido (array de uuid)' });
  }
  // Anti-duplicados
  if (new Set(sectionIds).size !== sectionIds.length) {
    return res.status(400).json({ error: 'sectionIds no puede tener duplicados' });
  }

  const orgId = resolveTargetOrg(req);
  if (!orgId) return res.status(400).json({ error: 'Sin organización' });
  if (!canAccessOrg(req, orgId)) return res.status(403).json({ error: 'Acceso denegado' });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. El syllabus del (org, moduleId) — debe existir todos los sectionIds ahí.
    const { rows: [syl] } = await client.query(
      `SELECT id FROM syllabi WHERE organization_id = $1 AND module_id = $2`,
      [orgId, moduleId]
    );
    if (!syl) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Temario no encontrado' });
    }

    // 2. Verificar que todos los sectionIds pertenecen a ESE syllabus.
    // Sin esta comprobación un profe podría reordenar secciones de otro
    // temario mezclándolas con las suyas.
    const { rows: found } = await client.query(
      `SELECT id FROM syllabus_sections WHERE syllabus_id = $1 AND id = ANY($2::uuid[])`,
      [syl.id, sectionIds]
    );
    if (found.length !== sectionIds.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Algún sectionId no pertenece a este temario',
        code: 'CROSS_SYLLABUS',
      });
    }

    // 3. Aplicar sort_order en el orden recibido (0, 10, 20, ...).
    for (let i = 0; i < sectionIds.length; i += 1) {
      await client.query(
        `UPDATE syllabus_sections
            SET sort_order = $1, updated_at = NOW()
          WHERE id = $2`,
        [i * 10, sectionIds[i]]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, count: sectionIds.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('reorderSections error:', err);
    res.status(500).json({ error: 'Error al reordenar temas' });
  } finally {
    client.release();
  }
};

// PATCH /api/syllabus/sections/:sectionId
// body: { title?, sort_order? }
const updateSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { title, sort_order } = req.body;

    // Verifica scope de org via join.
    const { rows: [scope] } = await query(
      `SELECT s.organization_id
         FROM syllabus_sections ss
         JOIN syllabi s ON s.id = ss.syllabus_id
        WHERE ss.id = $1`,
      [sectionId]
    );
    if (!scope) return res.status(404).json({ error: 'Tema no encontrado' });
    if (!canAccessOrg(req, scope.organization_id)) return res.status(403).json({ error: 'Acceso denegado' });

    const fields = [];
    const values = [];
    let idx = 1;
    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(String(title).slice(0, 255));
    }
    if (sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(Number(sort_order));
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    fields.push(`updated_at = NOW()`);
    values.push(sectionId);

    const { rows: [row] } = await query(
      `UPDATE syllabus_sections SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, syllabus_id, title, sort_order, created_at, updated_at`,
      values
    );
    res.json({ section: row });
  } catch (err) {
    console.error('updateSection error:', err);
    res.status(500).json({ error: 'Error al actualizar tema' });
  }
};

// DELETE /api/syllabus/sections/:sectionId
const deleteSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { rows: [scope] } = await query(
      `SELECT s.organization_id
         FROM syllabus_sections ss
         JOIN syllabi s ON s.id = ss.syllabus_id
        WHERE ss.id = $1`,
      [sectionId]
    );
    if (!scope) return res.status(404).json({ error: 'Tema no encontrado' });
    if (!canAccessOrg(req, scope.organization_id)) return res.status(403).json({ error: 'Acceso denegado' });

    await query(`DELETE FROM syllabus_sections WHERE id = $1`, [sectionId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteSection error:', err);
    res.status(500).json({ error: 'Error al eliminar tema' });
  }
};

const VALID_KINDS = new Set(['exercise', 'presentation', 'dynamic', 'exam', 'documentation']);

// POST /api/syllabus/sections/:sectionId/items
// body: { kind, title, library_item_id?, metadata? }
const createItem = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { kind, title, library_item_id = null, metadata = {} } = req.body;
    if (!VALID_KINDS.has(kind)) return res.status(400).json({ error: 'kind inválido' });
    if (!title || !title.trim()) return res.status(400).json({ error: 'title requerido' });

    const { rows: [scope] } = await query(
      `SELECT s.organization_id
         FROM syllabus_sections ss
         JOIN syllabi s ON s.id = ss.syllabus_id
        WHERE ss.id = $1`,
      [sectionId]
    );
    if (!scope) return res.status(404).json({ error: 'Tema no encontrado' });
    if (!canAccessOrg(req, scope.organization_id)) return res.status(403).json({ error: 'Acceso denegado' });

    // T1 · Blindaje cross-tenant: si viene library_item_id, verificar que el
    // recurso pertenezca a la misma org que el tema. Sin esta comprobación,
    // un profe con un UUID adivinado podría enlazar recursos de otra org a
    // su temario y accederlos vía syllabusApi.getItem.
    if (library_item_id) {
      const { rows: [owner] } = await query(
        `SELECT organization_id FROM library_items WHERE id = $1`,
        [library_item_id]
      );
      if (!owner) {
        return res.status(404).json({ error: 'library_item no encontrado' });
      }
      if (owner.organization_id !== scope.organization_id) {
        return res.status(403).json({
          error: 'El library_item pertenece a otra organización',
          code: 'CROSS_TENANT',
        });
      }
    }

    const { rows: [nextOrder] } = await query(
      `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next
         FROM syllabus_items WHERE section_id = $1`,
      [sectionId]
    );

    const { rows: [row] } = await query(
      `INSERT INTO syllabus_items (section_id, kind, title, library_item_id, sort_order, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, section_id, kind, title, library_item_id, sort_order, metadata, created_at, updated_at`,
      [sectionId, kind, title.trim().slice(0, 255), library_item_id, nextOrder.next, JSON.stringify(metadata || {})]
    );

    res.status(201).json({ item: row });
  } catch (err) {
    console.error('createItem error:', err);
    res.status(500).json({ error: 'Error al crear item' });
  }
};

// GET /api/syllabus/items/:itemId
// Devuelve el item con library_item enlazado + payload. Sirve al corrector OCR
// para precargar la clave de respuestas de referencia (metadata.answer_key)
// y saber contra qué syllabus_item guardar las correcciones (B).
const getItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { rows: [row] } = await query(
      `SELECT si.id, si.section_id, si.kind, si.title, si.library_item_id,
              si.sort_order, si.metadata, si.created_at, si.updated_at,
              s.organization_id, s.module_id,
              li.title    AS library_title,
              li.kind     AS library_kind,
              li.payload  AS library_payload,
              li.tool_key AS library_tool_key
         FROM syllabus_items si
         JOIN syllabus_sections ss ON ss.id = si.section_id
         JOIN syllabi s ON s.id = ss.syllabus_id
         LEFT JOIN library_items li ON li.id = si.library_item_id
        WHERE si.id = $1`,
      [itemId]
    );
    if (!row) return res.status(404).json({ error: 'Item no encontrado' });
    if (!canAccessOrg(req, row.organization_id)) return res.status(403).json({ error: 'Acceso denegado' });
    res.json({ item: row });
  } catch (err) {
    console.error('getItem error:', err);
    res.status(500).json({ error: 'Error al obtener item' });
  }
};

// GET /api/syllabus/items/:itemId/corrections
// Lista todas las correcciones OCR del ejercicio (B6). Se leen de library_items
// filtrando por metadata->>'syllabusItemId' = itemId.
const listItemCorrections = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { rows: [scope] } = await query(
      `SELECT s.organization_id
         FROM syllabus_items si
         JOIN syllabus_sections ss ON ss.id = si.section_id
         JOIN syllabi s ON s.id = ss.syllabus_id
        WHERE si.id = $1`,
      [itemId]
    );
    if (!scope) return res.status(404).json({ error: 'Item no encontrado' });
    if (!canAccessOrg(req, scope.organization_id)) return res.status(403).json({ error: 'Acceso denegado' });

    const { rows } = await query(
      `SELECT id, title, payload, metadata, created_at
         FROM library_items
        WHERE organization_id = $1
          AND kind = 'ocr'
          AND metadata->>'syllabusItemId' = $2
        ORDER BY created_at DESC`,
      [scope.organization_id, itemId]
    );

    const corrections = rows.map((r) => ({
      id: r.id,
      studentName: r.metadata?.studentName || null,
      title:       r.title,
      totalScore:  r.payload?.totalScore ?? null,
      maxScore:    r.payload?.maxScore   ?? null,
      grade:       r.payload?.grade      ?? null,
      finalScore:  r.metadata?.finalScore ?? null,   // override manual del profe (B5)
      approvedAt:  r.metadata?.approvedAt || null,   // visto bueno (B5)
      created_at:  r.created_at,
    }));

    res.json({ corrections });
  } catch (err) {
    console.error('listItemCorrections error:', err);
    res.status(500).json({ error: 'Error al listar correcciones' });
  }
};

// PATCH /api/syllabus/items/:itemId
// body: { title?, library_item_id?, sort_order?, metadata? }
const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { title, library_item_id, sort_order, metadata } = req.body;

    const { rows: [scope] } = await query(
      `SELECT s.organization_id
         FROM syllabus_items si
         JOIN syllabus_sections ss ON ss.id = si.section_id
         JOIN syllabi s ON s.id = ss.syllabus_id
        WHERE si.id = $1`,
      [itemId]
    );
    if (!scope) return res.status(404).json({ error: 'Item no encontrado' });
    if (!canAccessOrg(req, scope.organization_id)) return res.status(403).json({ error: 'Acceso denegado' });

    // T1 · Blindaje cross-tenant: reasignar library_item_id a un recurso de
    // otra org rompería el aislamiento. Se permite null explícito (desvincular)
    // y cualquier UUID cuya org coincida con la del temario.
    if (library_item_id !== undefined && library_item_id !== null) {
      const { rows: [owner] } = await query(
        `SELECT organization_id FROM library_items WHERE id = $1`,
        [library_item_id]
      );
      if (!owner) {
        return res.status(404).json({ error: 'library_item no encontrado' });
      }
      if (owner.organization_id !== scope.organization_id) {
        return res.status(403).json({
          error: 'El library_item pertenece a otra organización',
          code: 'CROSS_TENANT',
        });
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;
    if (title !== undefined)           { fields.push(`title = $${idx++}`);           values.push(String(title).slice(0, 255)); }
    if (library_item_id !== undefined) { fields.push(`library_item_id = $${idx++}`); values.push(library_item_id); }
    if (sort_order !== undefined)      { fields.push(`sort_order = $${idx++}`);      values.push(Number(sort_order)); }
    if (metadata !== undefined)        { fields.push(`metadata = $${idx++}`);        values.push(JSON.stringify(metadata || {})); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    fields.push(`updated_at = NOW()`);
    values.push(itemId);

    const { rows: [row] } = await query(
      `UPDATE syllabus_items SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, section_id, kind, title, library_item_id, sort_order, metadata, created_at, updated_at`,
      values
    );
    res.json({ item: row });
  } catch (err) {
    console.error('updateItem error:', err);
    res.status(500).json({ error: 'Error al actualizar item' });
  }
};

// DELETE /api/syllabus/items/:itemId
const deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { rows: [scope] } = await query(
      `SELECT s.organization_id
         FROM syllabus_items si
         JOIN syllabus_sections ss ON ss.id = si.section_id
         JOIN syllabi s ON s.id = ss.syllabus_id
        WHERE si.id = $1`,
      [itemId]
    );
    if (!scope) return res.status(404).json({ error: 'Item no encontrado' });
    if (!canAccessOrg(req, scope.organization_id)) return res.status(403).json({ error: 'Acceso denegado' });

    // T14 · Antes de borrar el item, desvinculamos las correcciones OCR que
    // lo referenciaban vía metadata.syllabusItemId (no hay FK real por diseño
    // — las correcciones viven como library_items independientes). Sin este
    // cleanup, listItemCorrections seguía devolviendo correcciones cuyo
    // itemId ya no existía. Las correcciones NO se borran: mantienen su
    // valor pedagógico en la biblioteca del centro; solo pierden el enlace.
    try {
      await query(
        `UPDATE library_items
            SET metadata = metadata - 'syllabusItemId'
          WHERE organization_id = $1
            AND kind = 'ocr'
            AND metadata->>'syllabusItemId' = $2`,
        [scope.organization_id, itemId]
      );
    } catch (cleanupErr) {
      console.warn('T14 · cleanup metadata failed (non-fatal):', cleanupErr.message);
    }

    await query(`DELETE FROM syllabus_items WHERE id = $1`, [itemId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteItem error:', err);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
};

module.exports = {
  getSyllabus,
  createSection,
  updateSection,
  reorderSections,
  deleteSection,
  createItem,
  getItem,
  listItemCorrections,
  updateItem,
  deleteItem,
};
