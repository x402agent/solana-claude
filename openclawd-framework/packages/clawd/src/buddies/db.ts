import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME_DIR = path.join(os.homedir(), '.clawd');
const DB_PATH = path.join(HOME_DIR, 'clawd.db');

let dbSingleton: Database.Database | null = null;

function ensureDir() {
  if (!fs.existsSync(HOME_DIR)) fs.mkdirSync(HOME_DIR, { recursive: true });
}

export function getDb(): Database.Database {
  if (dbSingleton) return dbSingleton;
  ensureDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      model TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE TABLE IF NOT EXISTS buddies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      hp INTEGER DEFAULT 100,
      hunger INTEGER DEFAULT 50,
      energy INTEGER DEFAULT 100,
      happiness INTEGER DEFAULT 80,
      strength INTEGER DEFAULT 10,
      intel INTEGER DEFAULT 10,
      luck INTEGER DEFAULT 10,
      degen INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      last_fed_at INTEGER,
      last_played_at INTEGER
    );
  `);
  dbSingleton = db;
  return db;
}

export function closeDb() {
  if (dbSingleton) {
    dbSingleton.close();
    dbSingleton = null;
  }
}
