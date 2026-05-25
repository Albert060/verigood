const { Pool, types } = require('pg');

// Postgres returns arrays of custom enum types as raw literals like
// "{cambridge,espanol}" because pg only ships parsers for built-in array
// types. Reuse the text[] parser (OID 1009) for every enum array OID
// (typtype='e', typarray>0) so they come back as JS arrays.
const registerEnumArrayParsers = async () => {
  const textArrayParser = types.getTypeParser(1009);
  const { rows } = await pool.query(
    `SELECT typarray FROM pg_type WHERE typtype = 'e' AND typarray > 0`
  );
  rows.forEach((r) => types.setTypeParser(r.typarray, textArrayParser));
};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'verigood_db',
  user: process.env.DB_USER || 'verigood',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
