import { readFileSync } from 'node:fs';
import mysql, { type Pool } from 'mysql2/promise';
import { config } from './config';

const { host, port, user, password } = config.db;
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export function createPool(database: string = config.db.name): Pool {
  // timezone 'Z': DATETIME читається й пишеться як UTC
  return mysql.createPool({ host, port, user, password, database, timezone: 'Z', connectionLimit: 10 });
}

// Створює базу (якщо її немає) і таблиці зі schema.sql. Можна запускати повторно.
export async function initDatabase(database: string = config.db.name): Promise<void> {
  if (!/^\w+$/.test(database)) throw new Error(`Invalid database name: ${database}`);
  const conn = await mysql.createConnection({ host, port, user, password });
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4`);
    await conn.query(`USE \`${database}\``);
    for (const statement of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
      await conn.query(statement);
    }
  } finally {
    await conn.end();
  }
}
