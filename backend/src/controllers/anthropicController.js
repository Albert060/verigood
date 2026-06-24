// Endpoints para que cada organización gestione su propia clave de Anthropic.
// Patrón:
//   GET    /api/organizations/:orgId/anthropic            → estado (sin clave)
//   PUT    /api/organizations/:orgId/anthropic            → guarda y activa
//   DELETE /api/organizations/:orgId/anthropic            → desactiva
//
// La clave se valida con una llamada barata a Anthropic antes de aceptarse,
// se cifra con AES-256-GCM y se persiste en organizations.anthropic_api_key_encrypted.

const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../config/database');
const { encrypt, encryptionAvailable } = require('../utils/encryption');
const { aiAvailable } = require('../utils/aiAvailable');

// Lo único que devolvemos al frontend sobre la clave guardada: pista visual
// del formato "sk-ant-…ABC1" (últimos 4 chars) + cuándo se activó. NUNCA la
// clave entera, ni siquiera al admin propietario.
const buildHint = (apiKey) => {
  if (!apiKey || apiKey.length < 8) return null;
  return `sk-ant-…${apiKey.slice(-4)}`;
};

const ensureOrgAccess = (req, orgId) => {
  if (req.user.role === 'superadmin') return true;
  if (req.user.role !== 'admin_centro') return false;
  return req.user.organization_id === orgId;
};

// GET — devuelve estado de configuración (sin secreto)
const getAnthropicStatus = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (!ensureOrgAccess(req, orgId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const { rows } = await query(
      `SELECT anthropic_api_key_encrypted IS NOT NULL AS configured,
              anthropic_key_hint AS hint,
              anthropic_activated_at AS activated_at
         FROM organizations WHERE id = $1`,
      [orgId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Organización no encontrada' });
    res.json({
      configured:   !!rows[0].configured,
      hint:         rows[0].hint || null,
      activated_at: rows[0].activated_at || null,
      encryption_ready: encryptionAvailable(),
    });
  } catch (err) {
    console.error('getAnthropicStatus error:', err);
    res.status(500).json({ error: 'Error al obtener estado de Anthropic' });
  }
};

// PUT — guarda + activa
const setAnthropicKey = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { apiKey } = req.body || {};
    if (!ensureOrgAccess(req, orgId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const cleaned = (apiKey || '').trim();
    if (!aiAvailable(cleaned)) {
      return res.status(400).json({
        error: 'La clave no tiene el formato correcto. Debe empezar por sk-ant- y tener al menos 30 caracteres.',
        code: 'BAD_KEY_FORMAT',
      });
    }
    if (!encryptionAvailable()) {
      return res.status(503).json({
        error: 'El cifrado de secretos no está configurado en el servidor. Pide al operador que añada ENCRYPTION_KEY al .env del backend.',
        code: 'ENCRYPTION_NOT_CONFIGURED',
      });
    }

    // Verificación viva: una llamada mínima a Anthropic para confirmar que
    // la clave es válida ANTES de guardarla. Si Anthropic la rechaza, el
    // admin lo sabe inmediatamente en vez de descubrirlo al generar tools.
    try {
      const client = new Anthropic({ apiKey: cleaned });
      await client.messages.create({
        model: process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      });
    } catch (probeErr) {
      const status = probeErr?.status || probeErr?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(400).json({
          error: 'Anthropic ha rechazado esta clave. Comprueba que la copiaste entera y que no está revocada en console.anthropic.com.',
          code: 'KEY_REJECTED_BY_ANTHROPIC',
        });
      }
      // Errores transitorios (5xx, network) NO bloquean la grabación: el
      // admin podrá probar luego. Logueamos la causa.
      console.warn('Anthropic probe falló (no 401/403), guardando igualmente:', probeErr.message);
    }

    const encrypted = encrypt(cleaned);
    const hint = buildHint(cleaned);
    await query(
      `UPDATE organizations
          SET anthropic_api_key_encrypted = $1,
              anthropic_key_hint = $2,
              anthropic_activated_at = NOW(),
              updated_at = NOW()
        WHERE id = $3`,
      [encrypted, hint, orgId]
    );

    res.json({
      ok: true,
      configured: true,
      hint,
      activated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('setAnthropicKey error:', err);
    res.status(500).json({ error: 'Error al guardar la clave de Anthropic' });
  }
};

// DELETE — desactiva (vuelve a modo demo)
const clearAnthropicKey = async (req, res) => {
  try {
    const { orgId } = req.params;
    if (!ensureOrgAccess(req, orgId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    await query(
      `UPDATE organizations
          SET anthropic_api_key_encrypted = NULL,
              anthropic_key_hint = NULL,
              anthropic_activated_at = NULL,
              updated_at = NOW()
        WHERE id = $1`,
      [orgId]
    );
    res.json({ ok: true, configured: false });
  } catch (err) {
    console.error('clearAnthropicKey error:', err);
    res.status(500).json({ error: 'Error al desactivar Anthropic' });
  }
};

module.exports = { getAnthropicStatus, setAnthropicKey, clearAnthropicKey };
