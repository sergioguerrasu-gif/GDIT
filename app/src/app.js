const express = require('express');
const os = require('os');
const swaggerUi = require('swagger-ui-express');
const spec = require('./openapi');

// `db` se inyecta para poder probar la app sin una base de datos real.
function createApp(db) {
  const app = express();
  app.use(express.json());

  // Cada instancia se identifica por su hostname (ip-10-0-x-x): sirve para ver el balanceo.
  const instance = process.env.INSTANCE_ID || os.hostname();

  app.use((_req, res, next) => {
    res.set('X-Instance', instance);
    next();
  });

  // Documentacion Swagger: UI en /docs y especificacion en /openapi.json
  app.get('/openapi.json', (_req, res) => res.json(spec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

  // Health check del ALB: NO depende de la BD, para que una caida de la BD
  // no marque todas las instancias como unhealthy a la vez.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', instance });
  });

  // Validacion de punta a punta: app -> BD primaria y lectura desde la replica.
  app.get('/api/test', async (_req, res) => {
    try {
      const w = await db.write('SELECT NOW() AS now');
      const r = await db.read('SELECT pg_is_in_recovery() AS is_replica');
      res.json({
        status: 'ok',
        instance,
        db_time: w.rows[0].now,
        read_connection_is_replica: r.rows[0].is_replica,
      });
    } catch (err) {
      res.status(503).json({ status: 'error', instance, error: err.message });
    }
  });

  app.get('/api/items', async (_req, res) => {
    try {
      const r = await db.read('SELECT id, name, created_at FROM items ORDER BY id DESC LIMIT 50');
      res.json({ instance, items: r.rows });
    } catch (err) {
      res.status(503).json({ status: 'error', instance, error: err.message });
    }
  });

  app.post('/api/items', async (req, res) => {
    const name = req.body && typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'name es obligatorio' });
    }
    try {
      const r = await db.write(
        'INSERT INTO items (name) VALUES ($1) RETURNING id, name, created_at',
        [name],
      );
      return res.status(201).json({ instance, item: r.rows[0] });
    } catch (err) {
      return res.status(503).json({ status: 'error', instance, error: err.message });
    }
  });

  // Endpoint que consume CPU a proposito para la prueba de carga (k6).
  // ms controla cuanto CPU se gasta por peticion (maximo 200).
  app.get('/api/load', (req, res) => {
    const ms = Math.min(Math.max(Number(req.query.ms) || 30, 1), 200);
    const end = Date.now() + ms;
    let x = 0;
    while (Date.now() < end) {
      x += Math.sqrt(Math.random());
    }
    res.json({ status: 'ok', instance, burned_ms: ms, x: Math.round(x) });
  });

  return app;
}

module.exports = { createApp };
