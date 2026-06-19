const { query } = require('../config/database');

// GET /api/notifications?unread=true&limit=20
const listForUser = async (req, res) => {
  try {
    const { unread, limit = 30 } = req.query;
    const where = ['user_id = $1'];
    const params = [req.user.id];

    if (unread === 'true') where.push('read_at IS NULL');

    params.push(Math.min(parseInt(limit, 10) || 30, 100));

    const result = await query(
      `SELECT id, type, title, body, link, metadata, read_at AS "readAt", created_at AS "createdAt"
       FROM notifications
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ notifications: result.rows });
  } catch (err) {
    if (err.code === '42P01') {
      // Tabla aún no migrada → devolvemos lista vacía para que el frontend
      // no peté y mostremos un estado normal de "sin notificaciones".
      return res.json({ notifications: [], migrationPending: true });
    }
    console.error('listForUser error:', err);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

// GET /api/notifications/unread-count
const unreadCount = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: rows[0]?.count || 0 });
  } catch (err) {
    if (err.code === '42P01') return res.json({ count: 0, migrationPending: true });
    console.error('unreadCount error:', err);
    res.status(500).json({ error: 'Error al obtener contador' });
  }
};

// POST /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE notifications SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING id`,
      [id, req.user.id]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ error: 'Error al marcar como leída' });
  }
};

// POST /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    const result = await query(
      `UPDATE notifications SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    console.error('markAllRead error:', err);
    res.status(500).json({ error: 'Error al marcar como leídas' });
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'No encontrada' });
    res.json({ id });
  } catch (err) {
    console.error('deleteNotification error:', err);
    res.status(500).json({ error: 'Error al eliminar' });
  }
};

module.exports = { listForUser, unreadCount, markRead, markAllRead, deleteNotification };
