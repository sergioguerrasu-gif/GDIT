const { createApp } = require('./app');
const { createDb } = require('./db');

const port = Number(process.env.PORT) || 3000;
const db = createDb();
const app = createApp(db);

// Se levanta el servidor primero (para que /health responda de inmediato)
// y la tabla se crea en segundo plano, reintentando mientras RDS termina de arrancar.
app.listen(port, '0.0.0.0', () => {
  console.log(`API escuchando en el puerto ${port}`);
});

async function initWithRetry(attempt = 1) {
  try {
    await db.init();
    console.log('Base de datos lista');
  } catch (err) {
    console.error(`Intento ${attempt} de inicializar la BD fallo: ${err.message}`);
    setTimeout(() => initWithRetry(attempt + 1), Math.min(attempt * 5000, 30000));
  }
}

initWithRetry();
