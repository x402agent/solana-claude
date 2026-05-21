import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const DEFAULT_DATA_DIR = join(homedir(), '.clawd', 'memory');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS memories (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    kind         TEXT NOT NULL DEFAULT 'note',
    tier         TEXT NOT NULL DEFAULT 'episodic',
    tags         TEXT NOT NULL DEFAULT '[]',
    importance   REAL NOT NULL DEFAULT 0.5,
    confidence   REAL NOT NULL DEFAULT 1.0,
    bank         TEXT NOT NULL DEFAULT 'default',
    created_at   INTEGER NOT NULL,
    accessed_at  INTEGER NOT NULL,
    access_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    id    UNINDEXED,
    title,
    content,
    kind  UNINDEXED,
    tags,
    content='memories',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS mem_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(rowid, id, title, content, kind, tags)
    VALUES (new.rowid, new.id, new.title, new.content, new.kind, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS mem_ad AFTER DELETE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, id, title, content, kind, tags)
    VALUES ('delete', old.rowid, old.id, old.title, old.content, old.kind, old.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS mem_au AFTER UPDATE ON memories BEGIN
    INSERT INTO memories_fts(memories_fts, rowid, id, title, content, kind, tags)
    VALUES ('delete', old.rowid, old.id, old.title, old.content, old.kind, old.tags);
    INSERT INTO memories_fts(rowid, id, title, content, kind, tags)
    VALUES (new.rowid, new.id, new.title, new.content, new.kind, new.tags);
  END;

  CREATE TABLE IF NOT EXISTS ooda_journal (
    id         TEXT PRIMARY KEY,
    phase      TEXT NOT NULL,
    content    TEXT NOT NULL,
    bank       TEXT NOT NULL DEFAULT 'default',
    created_at INTEGER NOT NULL
  );
`;

export function getDataDir(dataDir?: string): string {
  return resolve(dataDir ?? process.env['CLAWD_MEMORY_DIR'] ?? DEFAULT_DATA_DIR);
}

export function openDb(bank = 'default', dataDir?: string): Database.Database {
  const dir = getDataDir(dataDir);
  const bankDir = bank === 'default' ? dir : join(dir, 'banks', bank);
  mkdirSync(bankDir, { recursive: true });
  const dbPath = join(bankDir, 'memory.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

export function dbPath(bank = 'default', dataDir?: string): string {
  const dir = getDataDir(dataDir);
  return bank === 'default'
    ? join(dir, 'memory.db')
    : join(dir, 'banks', bank, 'memory.db');
}
