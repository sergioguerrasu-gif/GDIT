const { Pool } = require('pg');

function makePool(host) {
  return new Pool({
    host,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // RDS PostgreSQL 15+ exige SSL por defecto
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 10,
    connectionTimeoutMillis: 3000,
  });
}

// Escrituras -> instancia primaria. Lecturas -> replica (si existe DB_READ_HOST).
function createDb() {
  const primary = makePool(process.env.DB_HOST);
  const replica = process.env.DB_READ_HOST ? makePool(process.env.DB_READ_HOST) : primary;

  return {
    write: (sql, params) => primary.query(sql, params),
    read: (sql, params) => replica.query(sql, params),
    init: () =>
      primary.query(`
        CREATE TABLE IF NOT EXISTS items (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`),
  };
}

module.exports = { createDb };
