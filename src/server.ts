import { createApp } from './app';
import { config } from './config';
import { createPool } from './db';

const pool = createPool();


try {
  await pool.query('SELECT 1');
} catch (err) {
  console.error(`Cannot connect to MySQL database "${config.db.name}": ${(err as Error).message}`);
  console.error('Check .env and run "npm run db:init" first.');
  process.exit(1);
}
//check db connection, if not connected exit with error message
const server = createApp(pool).listen(config.port, () => {
  console.log(`Blogging Platform API listening on http://localhost:${config.port}`);
});
//check server connection, if connected log message
const shutdown = () => {
  server.close(() => pool.end().then(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
//shutdown server and db connection on SIGINT and SIGTERM signals