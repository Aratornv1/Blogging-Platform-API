import { readFileSync } from 'node:fs';
import mysql, { type Pool } from 'mysql2/promise';
import { config } from './config';

const { host, port, user, password } = config.db;
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

// Factory: кожен виклик створює новий пул для вказаної бази.
// Тести беруть окремий пул для тестової бази (blog_api_test).
export function createPool(database: string = config.db.name): Pool {
  // timezone 'Z': DATETIME читається й пишеться як UTC
  return mysql.createPool({ host, port, user, password, database, timezone: 'Z', connectionLimit: 10 });
}

// Singleton: один спільний пул для робочої бази на весь застосунок.
// Створюється при першому виклику, далі повертається той самий об'єкт.
let sharedPool: Pool | undefined;

export function getPool(): Pool {
  sharedPool ??= createPool();
  return sharedPool;
}

// Закриває спільний пул і скидає його, щоб наступний getPool() створив новий.
export async function closePool(): Promise<void> {
  const pool = sharedPool;
  sharedPool = undefined;
  await pool?.end();
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
