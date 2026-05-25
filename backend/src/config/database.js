const { Pool, types } = require('pg');

const registerEnumArrayParsers = async () => {
  const textArrayParser = types.getTypeParser(1009);
  const { rows } = await pool.query(
    `SELECT typarray FROM pg_type WHERE typtype = 'e' AND typarray > 0`
  );
  rows.forEach((r) => types.setTypeParser(r.typarray, textArrayParser));
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('✓ PostgreSQL connected');
  }
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('query', { text: text.slice(0, 60), duration, rows: res.rowCount });
  }
  return res;
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool, registerEnumArrayParsers };