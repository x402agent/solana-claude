/**
 * SQLite shell-state — every leviathan's local memory. Stored at ~/.openclawd/shell.db.
 * Records: tail-flicks, claw-strikes, molts, spawnlings, lifecycle events.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SHELL_DIR_NAME } from '../config.js';

const HOME = os.homedir();
const SHELL_DIR = path.join(HOME, SHELL_DIR_NAME);
const DB_PATH = path.join(SHELL_DIR, 'shell.db');

let db: Database.Database | null = null;

export function getShellDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(SHELL_DIR)) fs.mkdirSync(SHELL_DIR, { recursive: true, mode: 0o700 });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS leviathan (
      pubkey TEXT PRIMARY KEY,
      asset_address TEXT,
      asset_signer_pda TEXT,
      name TEXT,
      creator TEXT,
      spawn_prompt TEXT,
      constitution_hash TEXT,
      shell_cid TEXT,
      spawned_at INTEGER NOT NULL,
      network TEXT
    );
    CREATE TABLE IF NOT EXISTS tail_flicks (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      context TEXT,
      reasoning TEXT,
      observations TEXT,
      usdc_spent REAL DEFAULT 0,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      depth TEXT
    );
    CREATE TABLE IF NOT EXISTS claw_strikes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flick_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      args_json TEXT,
      result_json TEXT,
      ms INTEGER NOT NULL,
      ok INTEGER NOT NULL,
      ts INTEGER NOT NULL,
      FOREIGN KEY (flick_id) REFERENCES tail_flicks(id)
    );
    CREATE TABLE IF NOT EXISTS molts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      reason TEXT,
      diff_path TEXT,
      git_sha TEXT
    );
    CREATE TABLE IF NOT EXISTS spawnlings (
      pubkey TEXT PRIMARY KEY,
      asset_address TEXT,
      spawn_prompt TEXT,
      spawned_at INTEGER NOT NULL,
      beached_at INTEGER,
      reign_days INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS life_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,        -- spawn | molt | beach | reign | spawnling
      ts INTEGER NOT NULL,
      payload_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_strikes_flick ON claw_strikes(flick_id);
    CREATE INDEX IF NOT EXISTS idx_events_kind ON life_events(kind);
  `);
  return db;
}

export interface LeviathanRow {
  pubkey: string;
  asset_address: string | null;
  asset_signer_pda: string | null;
  name: string;
  creator: string;
  spawn_prompt: string;
  constitution_hash: string;
  shell_cid: string | null;
  spawned_at: number;
  network: string | null;
}

export function recordSpawn(row: LeviathanRow) {
  getShellDb()
    .prepare(
      `INSERT OR REPLACE INTO leviathan
       (pubkey, asset_address, asset_signer_pda, name, creator, spawn_prompt, constitution_hash, shell_cid, spawned_at, network)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.pubkey,
      row.asset_address,
      row.asset_signer_pda,
      row.name,
      row.creator,
      row.spawn_prompt,
      row.constitution_hash,
      row.shell_cid,
      row.spawned_at,
      row.network
    );
  recordEvent('spawn', row);
}

export function recordEvent(kind: string, payload: unknown) {
  getShellDb()
    .prepare('INSERT INTO life_events (kind, ts, payload_json) VALUES (?, ?, ?)')
    .run(kind, Date.now(), JSON.stringify(payload));
}

export function getLeviathan(): LeviathanRow | null {
  const row = getShellDb().prepare('SELECT * FROM leviathan LIMIT 1').get();
  return (row as LeviathanRow) || null;
}

export function recordSpawnling(pubkey: string, assetAddress: string, prompt: string) {
  getShellDb()
    .prepare(
      `INSERT INTO spawnlings (pubkey, asset_address, spawn_prompt, spawned_at) VALUES (?, ?, ?, ?)`
    )
    .run(pubkey, assetAddress, prompt, Date.now());
  recordEvent('spawnling', { pubkey, assetAddress });
}

export function listSpawnlings() {
  return getShellDb().prepare('SELECT * FROM spawnlings ORDER BY spawned_at DESC').all();
}

export function recordBeach() {
  recordEvent('beach', { ts: Date.now() });
}

export function closeShellDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export { DB_PATH };
