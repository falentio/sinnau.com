import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../env.ts';
import * as authSchema from './schema/auth-schema.ts';

mkdirSync(dirname(env.DB_FILE_NAME), { recursive: true });

const sqlite = new Database(env.DB_FILE_NAME);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle({ client: sqlite, schema: { ...authSchema } });
export type DB = typeof db;
