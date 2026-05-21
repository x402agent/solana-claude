import { ulid } from 'ulid';
import { openDb, dbPath } from './db.js';
import type {
  MemoryEntry,
  MemoryKind,
  MemoryOptions,
  MemoryStats,
  RecallInput,
  RecallResult,
  RememberInput,
} from './types.js';

const WORKING_MEMORY_LIMIT = 20;

function rowToEntry(row: Record<string, unknown>): MemoryEntry {
  return {
    id: row['id'] as string,
    title: row['title'] as string,
    content: row['content'] as string,
    kind: row['kind'] as MemoryKind,
    tier: row['tier'] as 'working' | 'episodic',
    tags: JSON.parse((row['tags'] as string) || '[]') as string[],
    importance: row['importance'] as number,
    confidence: row['confidence'] as number,
    bank: row['bank'] as string,
    createdAt: row['created_at'] as number,
    accessedAt: row['accessed_at'] as number,
    accessCount: row['access_count'] as number,
  };
}

export function remember(input: RememberInput, opts: MemoryOptions = {}): MemoryEntry {
  const bank = opts.bank ?? 'default';
  const db = openDb(bank, opts.dataDir);
  const now = Date.now();
  const id = `mem_${ulid()}`;

  const entry: MemoryEntry = {
    id,
    title: input.title,
    content: input.content,
    kind: input.kind ?? 'note',
    tier: 'episodic',
    tags: input.tags ?? [],
    importance: input.importance ?? 0.5,
    confidence: input.confidence ?? 1.0,
    bank,
    createdAt: now,
    accessedAt: now,
    accessCount: 0,
  };

  db.prepare(`
    INSERT INTO memories
      (id, title, content, kind, tier, tags, importance, confidence, bank, created_at, accessed_at, access_count)
    VALUES
      (@id, @title, @content, @kind, @tier, @tags, @importance, @confidence, @bank, @createdAt, @accessedAt, @accessCount)
  `).run({
    ...entry,
    tags: JSON.stringify(entry.tags),
    tier: entry.tier,
    createdAt: entry.createdAt,
    accessedAt: entry.accessedAt,
    accessCount: entry.accessCount,
  });

  _enforceWorkingMemoryLimit(db, bank);
  db.close();
  return entry;
}

export function recall(input: RecallInput, opts: MemoryOptions = {}): RecallResult {
  const bank = opts.bank ?? input.bank ?? 'default';
  const db = openDb(bank, opts.dataDir);
  const topK = input.topK ?? 8;

  let rows: Record<string, unknown>[];

  if (input.query.trim()) {
    const ftsQuery = input.query.trim().replace(/['"*]/g, '');
    const kindFilter = input.kind ? `AND m.kind = '${input.kind}'` : '';
    const tierFilter = input.tier ? `AND m.tier = '${input.tier}'` : '';
    const impFilter = input.minImportance != null ? `AND m.importance >= ${input.minImportance}` : '';

    rows = db.prepare(`
      SELECT m.*
      FROM memories m
      JOIN memories_fts f ON f.id = m.id
      WHERE f.memories_fts MATCH ?
        AND m.bank = ?
        ${kindFilter} ${tierFilter} ${impFilter}
      ORDER BY rank, m.importance DESC, m.accessed_at DESC
      LIMIT ?
    `).all(ftsQuery, bank, topK) as Record<string, unknown>[];

    if (rows.length < topK) {
      const existingIds = new Set(rows.map((r) => r['id'] as string));
      const fallback = db.prepare(`
        SELECT * FROM memories
        WHERE bank = ? AND (title LIKE ? OR content LIKE ?)
          ${input.kind ? `AND kind = '${input.kind}'` : ''}
        ORDER BY importance DESC, accessed_at DESC
        LIMIT ?
      `).all(bank, `%${input.query}%`, `%${input.query}%`, topK) as Record<string, unknown>[];

      for (const r of fallback) {
        if (!existingIds.has(r['id'] as string) && rows.length < topK) rows.push(r);
      }
    }
  } else {
    rows = db.prepare(`
      SELECT * FROM memories
      WHERE bank = ?
        ${input.kind ? `AND kind = '${input.kind}'` : ''}
      ORDER BY importance DESC, accessed_at DESC
      LIMIT ?
    `).all(bank, topK) as Record<string, unknown>[];
  }

  if (rows.length > 0) {
    const ids = rows.map((r) => r['id'] as string);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`
      UPDATE memories
      SET accessed_at = ?, access_count = access_count + 1
      WHERE id IN (${placeholders})
    `).run(Date.now(), ...ids);
  }

  db.close();
  return { entries: rows.map(rowToEntry), query: input.query, bank };
}

export function forget(id: string, opts: MemoryOptions = {}): boolean {
  const bank = opts.bank ?? 'default';
  const db = openDb(bank, opts.dataDir);
  const result = db.prepare('DELETE FROM memories WHERE id = ? AND bank = ?').run(id, bank);
  db.close();
  return result.changes > 0;
}

export function getContext(query: string, opts: MemoryOptions & { topK?: number } = {}): string {
  const result = recall({ query, topK: opts.topK ?? 6 }, opts);
  if (result.entries.length === 0) return '';
  return result.entries
    .map((e) => `[${e.kind.toUpperCase()}] ${e.title}\n${e.content}`)
    .join('\n\n---\n\n');
}

export function stats(opts: MemoryOptions = {}): MemoryStats {
  const bank = opts.bank ?? 'default';
  const db = openDb(bank, opts.dataDir);

  const total = (db.prepare('SELECT COUNT(*) as n FROM memories WHERE bank = ?').get(bank) as { n: number }).n;
  const working = (db.prepare(`SELECT COUNT(*) as n FROM memories WHERE bank = ? AND tier = 'working'`).get(bank) as { n: number }).n;
  const episodic = total - working;

  const kindRows = db.prepare(`
    SELECT kind, COUNT(*) as n FROM memories WHERE bank = ? GROUP BY kind
  `).all(bank) as Array<{ kind: MemoryKind; n: number }>;

  const byKind = {} as Record<MemoryKind, number>;
  for (const row of kindRows) byKind[row.kind] = row.n;

  db.close();

  return {
    bank,
    total,
    working,
    episodic,
    byKind,
    dbPath: dbPath(bank, opts.dataDir),
  };
}

export function journalOoda(phase: string, content: string, opts: MemoryOptions = {}): void {
  const bank = opts.bank ?? 'default';
  const db = openDb(bank, opts.dataDir);
  db.prepare(`
    INSERT INTO ooda_journal (id, phase, content, bank, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`ooda_${ulid()}`, phase, content, bank, Date.now());
  db.close();
}

function _enforceWorkingMemoryLimit(db: ReturnType<typeof openDb>, bank: string): void {
  const count = (db.prepare(`SELECT COUNT(*) as n FROM memories WHERE bank = ? AND tier = 'working'`).get(bank) as { n: number }).n;
  if (count > WORKING_MEMORY_LIMIT) {
    db.prepare(`
      DELETE FROM memories WHERE id IN (
        SELECT id FROM memories
        WHERE bank = ? AND tier = 'working'
        ORDER BY importance ASC, accessed_at ASC
        LIMIT ?
      )
    `).run(bank, count - WORKING_MEMORY_LIMIT);
  }
}
