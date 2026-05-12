import { getDb } from './db.js';

export interface Buddy {
  id: string;
  name: string;
  species: string;
  level: number;
  xp: number;
  hp: number;
  hunger: number;
  energy: number;
  happiness: number;
  strength: number;
  intel: number;
  luck: number;
  degen: number;
  created_at: number;
  last_fed_at: number | null;
  last_played_at: number | null;
}

export const SPECIES = [
  'lobster', 'crab', 'shrimp', 'krill', 'squid', 'octopus',
  'jellyfish', 'manta', 'narwhal', 'orca', 'kraken', 'leviathan',
  'snipper', 'pincer', 'reefer', 'tide', 'trench', 'bloop',
] as const;

export function createBuddy(name: string, species?: string): Buddy {
  const db = getDb();
  const id = `buddy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const sp = species || SPECIES[Math.floor(Math.random() * SPECIES.length)];
  const now = Date.now();
  const stats = {
    strength: 5 + Math.floor(Math.random() * 10),
    intel: 5 + Math.floor(Math.random() * 10),
    luck: 5 + Math.floor(Math.random() * 10),
    degen: 1 + Math.floor(Math.random() * 5),
  };
  db.prepare(
    `INSERT INTO buddies (id, name, species, level, xp, hp, hunger, energy, happiness, strength, intel, luck, degen, created_at, last_fed_at, last_played_at)
     VALUES (?, ?, ?, 1, 0, 100, 50, 100, 80, ?, ?, ?, ?, ?, NULL, NULL)`
  ).run(id, name, sp, stats.strength, stats.intel, stats.luck, stats.degen, now);
  return getBuddy(id)!;
}

export function getBuddy(id: string): Buddy | null {
  return (getDb().prepare('SELECT * FROM buddies WHERE id = ?').get(id) as Buddy) || null;
}

export function getActiveBuddy(): Buddy | null {
  return (
    (getDb().prepare('SELECT * FROM buddies ORDER BY last_played_at DESC, created_at DESC LIMIT 1').get() as Buddy) || null
  );
}

export function listBuddies(): Buddy[] {
  return getDb().prepare('SELECT * FROM buddies ORDER BY created_at DESC').all() as Buddy[];
}

export function feedBuddy(id: string): Buddy | null {
  const db = getDb();
  db.prepare(
    `UPDATE buddies SET hunger = MAX(0, hunger - 30), happiness = MIN(100, happiness + 8), xp = xp + 5, last_fed_at = ? WHERE id = ?`
  ).run(Date.now(), id);
  levelUpIfReady(id);
  return getBuddy(id);
}

export function playBuddy(id: string): Buddy | null {
  const db = getDb();
  db.prepare(
    `UPDATE buddies SET energy = MAX(0, energy - 15), happiness = MIN(100, happiness + 12), xp = xp + 10, last_played_at = ? WHERE id = ?`
  ).run(Date.now(), id);
  levelUpIfReady(id);
  return getBuddy(id);
}

export function tickBuddyDecay(id: string): Buddy | null {
  const db = getDb();
  db.prepare(
    `UPDATE buddies SET hunger = MIN(100, hunger + 1), energy = MIN(100, energy + 1), happiness = MAX(0, happiness - 1) WHERE id = ?`
  ).run(id);
  return getBuddy(id);
}

function levelUpIfReady(id: string) {
  const b = getBuddy(id);
  if (!b) return;
  const need = b.level * 100;
  if (b.xp >= need) {
    getDb()
      .prepare(
        `UPDATE buddies SET level = level + 1, xp = xp - ?, hp = MIN(100, hp + 10), strength = strength + 1, intel = intel + 1 WHERE id = ?`
      )
      .run(need, id);
  }
}

export function moodOf(b: Buddy): string {
  if (b.hunger > 80) return 'HUNGRY 🍤';
  if (b.energy < 20) return 'TIRED 💤';
  if (b.happiness < 30) return 'SAD 😢';
  if (b.happiness > 85 && b.energy > 60) return 'HYPED ✧';
  if (b.degen > 7) return 'DEGEN 🚀';
  return 'CHILL ✨';
}
