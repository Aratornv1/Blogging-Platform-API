import { readFileSync } from 'node:fs';
import mysql, { type Pool } from 'mysql2/promise';
import { config } from './config';

const { host, port, user, password } = config.db;
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
//prepare  driver and setup db with schema 
export function createPool(database: string = config.db.name): Pool {
  return mysql.createPool({ host, port, user, password, database, timezone: 'Z', connectionLimit: 10 });
}//create pool for db connect 


export async function initDatabase(database: string = config.db.name): Promise<void> {
  if (!/^\w+$/.test(database)) throw new Error(`Invalid database name: ${database}`);//security check for db name, only letters, numbers and underscore allowed
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
}//initialize db with schema, create db if not exists, use db and run schema statements
