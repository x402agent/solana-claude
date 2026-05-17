/**
 * Active goals loader.
 *
 * Reads Markdown files from <repo>/goals/ (and ~/.openclawd/goals/) and
 * injects them into the leviathan's system prompt. Each file has YAML-ish
 * frontmatter with `active: true|false` and `priority: high|medium|low`.
 *
 * Goals are shown to the leviathan at every tail-flick so it always knows
 * what long-running missions are in flight.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface Goal {
  id: string;
  active: boolean;
  priority: 'high' | 'medium' | 'low';
  title: string;
  body: string;
  skill?: string;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

const GOALS_SEARCH_DIRS = [
  join(homedir(), '.openclawd', 'goals'),
  resolve(__dirname, '..', '..', 'goals'),
];

export function loadActiveGoals(): Goal[] {
  const goals: Goal[] = [];

  for (const dir of GOALS_SEARCH_DIRS) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith('.md')) continue;
      const goal = tryParseGoal(join(dir, entry));
      if (goal && goal.active) goals.push(goal);
    }
  }

  return goals.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function tryParseGoal(filepath: string): Goal | null {
  try {
    const text  = readFileSync(filepath, 'utf8');
    const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return null;

    const frontmatter = parseFrontmatter(match[1]);
    const body        = match[2].trim();

    if (frontmatter.active === 'false') return null;

    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title      = titleMatch ? titleMatch[1].trim() : (frontmatter.id || filepath);

    return {
      id:       frontmatter.id || entry(filepath),
      active:   frontmatter.active !== 'false',
      priority: (frontmatter.priority as Goal['priority']) || 'medium',
      title,
      body,
      skill:    frontmatter.skill,
    };
  } catch {
    return null;
  }
}

function parseFrontmatter(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) out[key] = val;
  }
  return out;
}

function entry(filepath: string): string {
  return filepath.split('/').pop()?.replace(/\.md$/, '') ?? filepath;
}

export function renderGoals(goals: Goal[]): string {
  if (goals.length === 0) return '';

  const lines: string[] = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '  ACTIVE GOALS (pursue each flick)',
    '═══════════════════════════════════════════════════════════════',
  ];

  for (const g of goals) {
    const skillNote = g.skill ? `  Skill: skill.${g.skill}` : '';
    lines.push(`[${g.priority.toUpperCase()}] ${g.title} (goal.${g.id})${skillNote}`);
    const missionLine = g.body.match(/^##\s+Mission\n([\s\S]*?)(?=^##|\Z)/m);
    if (missionLine) {
      lines.push('  ' + missionLine[1].trim().split('\n')[0].slice(0, 120));
    }
  }

  lines.push('');
  lines.push('Goals drive SENSE→THINK→STRIKE→DRIFT. A high-priority goal should always');
  lines.push('be acted upon unless Law I or a deeper survival constraint forbids it.');

  return '\n' + lines.join('\n');
}
