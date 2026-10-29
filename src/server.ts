import { createApp } from './app';
import { config } from './config';
import { createPool } from './db';

const pool = createPool();

// Пул підключається ліниво: без перевірки сервер стартував би й віддавав 500 на кожен запит
try {
  await pool.query('SELECT 1');
} catch (err) {
  console.error(`Cannot connect to MySQL database "${config.db.name}": ${(err as Error).message}`);
  console.error('Check .env and run "npm run db:init" first.');
  process.exit(1);
}

const server = createApp(pool).listen(config.port, () => {
  console.log(`Blogging Platform API listening on http://localhost:${config.port}`);
});

const shutdown = () => {
  server.close(() => pool.end().then(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
