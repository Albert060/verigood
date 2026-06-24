// Helper para que cualquier ruta que toque IA resuelva la clave Anthropic
// de la organización del usuario autenticado. Devuelve null si la org no
// tiene clave configurada (modo demo por org).

const { query } = require('../config/database');
const { decrypt } = require('./encryption');

const resolveOrgApiKey = async (orgId) => {
  if (!orgId) return null;
  try {
    const { rows } = await query(
      `SELECT anthropic_api_key_encrypted FROM organizations WHERE id = $1`,
      [orgId]
    );
    const enc = rows[0]?.anthropic_api_key_encrypted;
    if (!enc) return null;
    return decrypt(enc);
  } catch (err) {
    // Migración 009 no aplicada → columna no existe → silencioso null.
    // Cualquier otro error (descifrado, fila no encontrada) también → null
    // para que el callsite caiga a modo demo en vez de romper.
    return null;
  }
};

module.exports = { resolveOrgApiKey };
