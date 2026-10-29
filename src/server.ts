import { createApp } from './app';
import { config } from './config';
import { createPool } from './db';

const pool = createPool();
const server = createApp(pool).listen(config.port, () => {
  console.log(`Blogging Platform API listening on http://localhost:${config.port}`);
});

process.on('SIGINT', () => {
  server.close(() => pool.end().then(() => process.exit(0)));
});
