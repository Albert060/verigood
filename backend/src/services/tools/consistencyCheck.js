// Comprueba la coherencia entre el catálogo en BD (module_tools) y el
// registro de handlers en código (services/tools/index.js).
//
// Es informativo, no fatal: imprime warnings al arranque. Se ejecuta una
// sola vez tras conectar a la BD.

const { query } = require('../../config/database');
const toolsRegistry = require('./');

const checkToolsConsistency = async () => {
  try {
    const { rows } = await query(
      `SELECT key FROM module_tools WHERE is_available = true`
    );
    const dbKeys  = new Set(rows.map((r) => r.key));
    const codeKeys = new Set(toolsRegistry.knownKeys());

    const missingInCode = [...dbKeys].filter((k) => !codeKeys.has(k));
    const missingInDb   = [...codeKeys].filter((k) => !dbKeys.has(k));

    if (missingInCode.length === 0 && missingInDb.length === 0) {
      console.log(`✓ module_tools: ${dbKeys.size} herramientas, todas con handler.`);
      return;
    }

    if (missingInCode.length) {
      console.warn(
        `⚠ module_tools: ${missingInCode.length} sin handler en código → ` +
          `devolverán 501 NOT_IMPLEMENTED: ${missingInCode.join(', ')}`
      );
    }
    if (missingInDb.length) {
      console.warn(
        `⚠ module_tools: ${missingInDb.length} handlers en código no presentes ` +
          `en BD (¿seed sin pasar?): ${missingInDb.join(', ')}`
      );
    }
  } catch (err) {
    // En arranques en frío puede que la tabla aún no exista — no romper.
    if (err.code === '42P01') {
      console.warn('⚠ module_tools: tabla no existe. Pasa la migración 003.');
    } else {
      console.warn('⚠ module_tools consistency check failed:', err.message);
    }
  }
};

module.exports = { checkToolsConsistency };
