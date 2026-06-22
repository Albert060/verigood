#!/usr/bin/env node
// Job semanal — ejecutado por PM2 con cron_restart (lunes 08:00 Madrid).
// No abre puertos. Imprime un resumen en logs y sale con código 0/1.
//
// Lanzar manualmente:
//   node backend/src/jobs/weeklyDigest.js

require('dotenv').config();

const { runWeeklyDigest } = require('../services/digestService');
const { pool } = require('../config/database');

(async () => {
  const startedAt = Date.now();
  try {
    const summary = await runWeeklyDigest();
    const ms = Date.now() - startedAt;
    console.log(`[weeklyDigest] ok in ${ms}ms`, summary);
    process.exit(0);
  } catch (err) {
    console.error('[weeklyDigest] failed:', err);
    process.exit(1);
  } finally {
    try { await pool?.end?.(); } catch (_) {}
  }
})();
