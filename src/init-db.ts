import { config } from './config';
import { initDatabase } from './db';

await initDatabase();
console.log(`Database "${config.db.name}" is ready.`);
