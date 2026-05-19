/**
 * formal_verification/stride.ts — STRIDE threat model analysis for Solana components.
 *
 * STRIDE = Spoofing · Tampering · Repudiation · Information Disclosure · DoS · Elevation
 * SIREN  = Solana ecosystem security standards (solana.com/news/solana-ecosystem-security)
 *
 * This module provides deep static analysis beyond the fast-path rules in gate.ts.
 * Import and call analyzeComponent() for a full threat model report.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname, relative, sep } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname ?? __dirname, '..');

function isPathWithinRoot(targetPath: string, rootPath: string): boolean {
  const resolvedRoot = resolve(rootPath);
  const resolvedTarget = resolve(targetPath);
  const rel = relative(resolvedRoot, resolvedTarget);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !rel.startsWith('..') && !resolve(rel).startsWith(sep));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThreatCategory = 'S' | 'T' | 'R' | 'I' | 'D' | 'E';

export interface Threat {
  id: string;                  // e.g. "S-003"
  category: ThreatCategory;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  mitre_attack?: string;       // MITRE ATT&CK technique if applicable
  siren_ref?: string;          // SIREN standard reference
  remediation: string;
  evidence?: string;           // snippet from source
}

export interface StrideReport {
  component: string;
  analyzed_at: string;
  threats: Threat[];
  threat_score: number;        // 0–100, lower = riskier
  siren_compliance: SirenCompliance;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    total: number;
  };
  blocked: boolean;
  block_reason?: string;
}

export interface SirenCompliance {
  // Based on Solana ecosystem security standards
  input_validation: boolean;
  privilege_separation: boolean;
  audit_logging: boolean;
  secret_management: boolean;
  supply_chain_integrity: boolean;
  upgrade_safety: boolean;
  score: number;              // 0–100
}

// ---------------------------------------------------------------------------
// SIREN standards (Solana Security Incident Response / Ecosystem Network)
// From: solana.com/news/solana-ecosystem-security
// ---------------------------------------------------------------------------

const SIREN_CHECKS = {
  // SIREN-001: Supply chain — all deps should be pinned and audited
  supplyChain: {
    id: 'SIREN-001',
    description: 'Dependency pinning and supply chain integrity',
    patterns: {
      good: [/"version":\s*"\d+\.\d+\.\d+"/, /lockfile|package-lock|bun\.lock|Cargo\.lock/],
      bad: [/"version":\s*"\*"/, /"version":\s*"latest"/, /"version":\s*"\^0\./],
    },
  },
  // SIREN-002: Key management — no hardcoded secrets
  keyManagement: {
    id: 'SIREN-002',
    description: 'Secret key management and storage',
    patterns: {
      bad: [/private.*key.*=.*["'][1-9A-HJ-NP-Za-km-z]{87,88}["']/, /secret.*=.*["'][A-Za-z0-9+/]{86,88}={0,2}["']/],
    },
  },
  // SIREN-003: Upgrade safety — no unchecked authority transfers
  upgradeSafety: {
    id: 'SIREN-003',
    description: 'Upgrade authority and program ownership safety',
    patterns: {
      bad: [/setAuthority.*None|upgrade_authority.*None|close_authority.*None/],
    },
  },
  // SIREN-004: Input validation — all external inputs validated
  inputValidation: {
    id: 'SIREN-004',
    description: 'External input validation',
    patterns: {
      good: [/zod\.parse|z\.object|isValid|validate\(|require_gte|require_eq/],
      bad: [/req\.body\s+as\s+\w|JSON\.parse\(req|parseInt\(req.*\)\s*[;,]/],
    },
  },
  // SIREN-005: Privilege separation — least-privilege principals
  privilegeSeparation: {
    id: 'SIREN-005',
    description: 'Least-privilege principal separation',
    patterns: {
      bad: [/root|admin.*=.*true|sudo|ADMIN_KEY.*=.*process\.env/],
    },
  },
};

// ---------------------------------------------------------------------------
// Deep threat rules (more thorough than gate.ts fast-path)
// ---------------------------------------------------------------------------

interface DeepRule {
  id: string;
  category: ThreatCategory;
  severity: Threat['severity'];
  title: string;
  description: string;
  detect: (text: string, lines: string[]) => Array<{ line: number; snippet: string }>;
  remediation: string;
  mitre_attack?: string;
  siren_ref?: string;
}

const DEEP_RULES: DeepRule[] = [
  // ── SPOOFING ────────────────────────────────────────────────────────────
  {
    id: 'S-001', category: 'S', severity: 'critical',
    title: 'Hardcoded Solana keypair secret',
    description: 'A Solana secret key appears hardcoded in source. If committed to git, the wallet is compromised.',
    detect: (text) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/["'][1-9A-HJ-NP-Za-km-z]{87,88}["']/.test(lines[i]!)) {
          matches.push({ line: i + 1, snippet: lines[i]!.trim().slice(0, 60) });
        }
      }
      return matches;
    },
    remediation: 'Move to FEE_PAYER_SECRET_KEY or SAS_AUTHORITY_KEY environment variable',
    mitre_attack: 'T1552.001',
    siren_ref: 'SIREN-002',
  },
  {
    id: 'S-002', category: 'S', severity: 'high',
    title: 'Missing signer verification on privileged instruction',
    description: 'A privileged operation does not verify the signer matches the expected authority.',
    detect: (text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (/admin|owner|authority|upgrade/.test(line.toLowerCase()) &&
            !/require_keys_eq|require_signer|has_one|#\[account\(has_one/.test(line)) {
          if (/transfer|mint|burn|close|set_authority/.test(line.toLowerCase())) {
            matches.push({ line: i + 1, snippet: line.trim().slice(0, 80) });
          }
        }
      }
      return matches.slice(0, 3);
    },
    remediation: 'Add require_keys_eq!(authority.key(), expected) or Anchor has_one constraint',
    mitre_attack: 'T1078',
    siren_ref: 'SIREN-005',
  },

  // ── TAMPERING ───────────────────────────────────────────────────────────
  {
    id: 'T-001', category: 'T', severity: 'critical',
    title: 'Dynamic code execution (eval / Function constructor)',
    description: 'Dynamic code execution allows an attacker to inject arbitrary logic.',
    detect: (text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        if (/eval\s*\(|new\s+Function\s*\(|vm\.runInNewContext/.test(lines[i]!)) {
          matches.push({ line: i + 1, snippet: lines[i]!.trim().slice(0, 80) });
        }
      }
      return matches;
    },
    remediation: 'Replace dynamic execution with typed function dispatch; use allow-lists',
    mitre_attack: 'T1059',
    siren_ref: 'SIREN-004',
  },
  {
    id: 'T-002', category: 'T', severity: 'high',
    title: 'Unchecked arithmetic in financial calculation',
    description: 'Arithmetic without overflow guards in a financial context can cause fund loss.',
    detect: (text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        // Look for raw +, -, * near amount/balance/tokens without checked_/saturating_
        if (/amount|balance|total_tokens|protected_principal|realized_pnl/.test(line) &&
            /[^a-z]([\+\-\*])[^a-z]/.test(line) &&
            !/checked_|saturating_|wrapping_|safe_/.test(line) &&
            !/\/\//.test(line.slice(0, line.search(/amount|balance/)))) {
          matches.push({ line: i + 1, snippet: line.trim().slice(0, 80) });
        }
      }
      return matches.slice(0, 3);
    },
    remediation: 'Use checked_add/checked_mul or saturating_ variants; add Kani overflow proof',
  },

  // ── REPUDIATION ─────────────────────────────────────────────────────────
  {
    id: 'R-001', category: 'R', severity: 'medium',
    title: 'Missing structured audit log for privileged action',
    description: 'Privileged operations (transfer, mint, burn) without audit logging cannot be disputed.',
    detect: (text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (/transfer|mint_to|burn|set_authority/.test(line) &&
            !/emit!|msg!|log::info|tracing::/.test(line)) {
          matches.push({ line: i + 1, snippet: line.trim().slice(0, 80) });
        }
      }
      return matches.slice(0, 2);
    },
    remediation: 'Add emit!(Event{...}) or structured log entry for every privileged operation',
    siren_ref: 'SIREN-004',
  },

  // ── INFORMATION DISCLOSURE ──────────────────────────────────────────────
  {
    id: 'I-001', category: 'I', severity: 'critical',
    title: 'Secret key exposed in log or error response',
    description: 'A secret key or private data may be included in logs or API error responses.',
    detect: (text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (/(console\.log|msg!|eprintln!|println!).*(_key|secret|private|password|token)/i.test(line)) {
          matches.push({ line: i + 1, snippet: line.trim().slice(0, 80) });
        }
      }
      return matches;
    },
    remediation: 'Never log secrets; use redact("<key>") helpers; sanitize error responses',
    mitre_attack: 'T1552',
    siren_ref: 'SIREN-002',
  },
  {
    id: 'I-002', category: 'I', severity: 'medium',
    title: 'Full stack trace in API error response',
    description: 'Stack traces in responses reveal internal structure to attackers.',
    detect: (_text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        if (/\.stack|err\.stack|error\.stack/.test(lines[i]!) &&
            /res\.json|res\.send|response\.json/.test(lines[i]!)) {
          matches.push({ line: i + 1, snippet: lines[i]!.trim().slice(0, 80) });
        }
      }
      return matches;
    },
    remediation: 'Return sanitized error codes; log full stacks server-side only',
  },

  // ── DENIAL OF SERVICE ───────────────────────────────────────────────────
  {
    id: 'D-001', category: 'D', severity: 'high',
    title: 'Unbounded loop or recursion',
    description: 'A loop or recursive function without a bound can exhaust compute or stack.',
    detect: (_text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        if (/while\s*\(\s*true\s*\)|loop\s*\{|for\s*\(;;\s*\)/.test(lines[i]!)) {
          // Check that the next 10 lines have a break/return
          const block = lines.slice(i, i + 10).join('\n');
          if (!/break|return|process\.exit/.test(block)) {
            matches.push({ line: i + 1, snippet: lines[i]!.trim().slice(0, 80) });
          }
        }
      }
      return matches;
    },
    remediation: 'Add iteration limits; use `for _ in 0..MAX_ITERS` pattern',
    siren_ref: 'SIREN-004',
  },
  {
    id: 'D-002', category: 'D', severity: 'medium',
    title: 'Missing compute unit budget for Solana program',
    description: 'Solana programs without ComputeBudget instructions can be griefed or hit CU limits.',
    detect: (text) => {
      const hasSolanaProgram = /use solana_program|use anchor_lang/.test(text);
      const hasCU = /ComputeBudget|compute_budget|request_units/.test(text);
      if (hasSolanaProgram && !hasCU) {
        return [{ line: 0, snippet: '(entire file — no ComputeBudget found)' }];
      }
      return [];
    },
    remediation: 'Add ComputeBudgetInstruction::set_compute_unit_limit at the top of complex txs',
  },

  // ── ELEVATION OF PRIVILEGE ──────────────────────────────────────────────
  {
    id: 'E-001', category: 'E', severity: 'critical',
    title: 'Missing PDA validation — arbitrary signer attack',
    description: 'A Solana PDA used as a signer without bump/seed validation allows arbitrary signer attacks.',
    detect: (text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (/find_program_address|create_program_address/.test(line) &&
            !/assert_eq.*bump|require_eq.*bump|bump\s*==/.test(
              lines.slice(i, i + 5).join('\n'))) {
          matches.push({ line: i + 1, snippet: line.trim().slice(0, 80) });
        }
      }
      return matches.slice(0, 2);
    },
    remediation: 'Always store and verify the canonical bump; use Anchor #[account(seeds=..., bump)]',
    mitre_attack: 'T1134',
    siren_ref: 'SIREN-005',
  },
  {
    id: 'E-002', category: 'E', severity: 'high',
    title: 'Missing owner check on account',
    description: 'An account read without verifying its owner allows an attacker to substitute a malicious account.',
    detect: (text, lines) => {
      const matches: Array<{ line: number; snippet: string }> = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (/Account::unpack|try_from_slice|deserialize/.test(line) &&
            !/owner.*==|check.*owner|has_one.*owner/.test(lines.slice(i, i + 3).join('\n'))) {
          matches.push({ line: i + 1, snippet: line.trim().slice(0, 80) });
        }
      }
      return matches.slice(0, 2);
    },
    remediation: 'Add owner check: require_keys_eq!(account.owner, expected_program_id)',
    siren_ref: 'SIREN-005',
  },
];

// ---------------------------------------------------------------------------
// Read component source
// ---------------------------------------------------------------------------

function readSource(componentPath: string): string {
  const abs = resolve(componentPath);
  if (!isPathWithinRoot(abs, REPO_ROOT)) return '';
  if (!existsSync(abs)) return '';
  const stat = statSync(abs);
  if (!stat.isDirectory()) return readFileSync(abs, 'utf8');

  const parts: string[] = [];
  function walk(dir: string, depth = 0): void {
    if (depth > 4) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (!isPathWithinRoot(full, REPO_ROOT)) continue;
      if (entry.isDirectory() && !['target', 'node_modules', '.git'].includes(entry.name)) {
        walk(full, depth + 1);
      } else if (entry.isFile() && ['.ts', '.js', '.rs', '.json', '.md'].includes(extname(entry.name))) {
        try { parts.push(readFileSync(full, 'utf8')); } catch {}
      }
    }
  }
  walk(abs);
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// SIREN compliance check
// ---------------------------------------------------------------------------

function checkSirenCompliance(source: string): SirenCompliance {
  const hasLockfile = /package-lock\.json|bun\.lock|Cargo\.lock/.test(source);
  const hasPinnedDeps = !/"version":\s*"\*"/.test(source) && !/"version":\s*"latest"/.test(source);
  const hasSecretMgmt = !/"[1-9A-HJ-NP-Za-km-z]{87,88}"/.test(source) && !/"version".*\.\.\./.test(source);
  const hasInputValidation = /zod|validate|isValid|require_gte|require_eq/.test(source);
  const hasPrivSep = !/sudo\s|chmod 777/.test(source);
  const hasAuditLog = /emit!|structured_log|tracing::info|audit_trail/.test(source);
  const hasUpgradeSafety = !/upgrade_authority.*None/.test(source);

  const checks = [hasLockfile && hasPinnedDeps, !hasSecretMgmt, hasInputValidation,
                  hasPrivSep, hasAuditLog, hasUpgradeSafety];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    input_validation: hasInputValidation,
    privilege_separation: hasPrivSep,
    audit_logging: hasAuditLog,
    secret_management: !hasSecretMgmt,
    supply_chain_integrity: hasLockfile && hasPinnedDeps,
    upgrade_safety: hasUpgradeSafety,
    score,
  };
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export function analyzeComponent(componentPath: string): StrideReport {
  const source = readSource(componentPath);
  const lines = source.split('\n');

  const threats: Threat[] = [];

  for (const rule of DEEP_RULES) {
    const evidence = rule.detect(source, lines);
    if (evidence.length > 0) {
      threats.push({
        id: rule.id,
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        evidence: evidence[0]
          ? `Line ${evidence[0].line}: ${evidence[0].snippet}` + (evidence.length > 1 ? ` (+${evidence.length - 1} more)` : '')
          : undefined,
        remediation: rule.remediation,
        mitre_attack: rule.mitre_attack,
        siren_ref: rule.siren_ref,
      });
    }
  }

  const siren = checkSirenCompliance(source);

  const counts = {
    critical: threats.filter((t) => t.severity === 'critical').length,
    high: threats.filter((t) => t.severity === 'high').length,
    medium: threats.filter((t) => t.severity === 'medium').length,
    low: threats.filter((t) => t.severity === 'low').length,
    info: threats.filter((t) => t.severity === 'info').length,
    total: threats.length,
  };

  const threatScore = Math.max(0,
    100 - counts.critical * 25 - counts.high * 10 - counts.medium * 5 - counts.low * 2,
  );

  const blocked = counts.critical > 0 || counts.high >= 3;
  const blockReason = counts.critical > 0
    ? `${counts.critical} critical STRIDE threat(s)`
    : counts.high >= 3
    ? `${counts.high} high STRIDE threats`
    : undefined;

  return {
    component: componentPath,
    analyzed_at: new Date().toISOString(),
    threats,
    threat_score: threatScore,
    siren_compliance: siren,
    summary: counts,
    blocked,
    block_reason: blockReason,
  };
}

export function formatReport(report: StrideReport): string {
  const lines: string[] = [
    `STRIDE + SIREN Analysis: ${report.component}`,
    `Analyzed: ${report.analyzed_at}`,
    `─`.repeat(60),
    `Threat Score: ${report.threat_score}/100  SIREN: ${report.siren_compliance.score}/100`,
    `Critical: ${report.summary.critical}  High: ${report.summary.high}  Medium: ${report.summary.medium}  Low: ${report.summary.low}`,
    `Status: ${report.blocked ? `BLOCKED — ${report.block_reason}` : 'PASSED'}`,
    ``,
    `THREATS (${report.threats.length}):`,
  ];

  for (const t of report.threats) {
    lines.push(`  [${t.severity.toUpperCase().padEnd(8)}] ${t.id} — ${t.title}`);
    if (t.evidence) lines.push(`    Evidence: ${t.evidence}`);
    lines.push(`    Fix: ${t.remediation}`);
    if (t.siren_ref) lines.push(`    SIREN: ${t.siren_ref}`);
  }

  lines.push(``, `SIREN COMPLIANCE:`);
  const siren = report.siren_compliance;
  const sirenItems: Array<[string, boolean]> = [
    ['Input Validation', siren.input_validation],
    ['Privilege Separation', siren.privilege_separation],
    ['Audit Logging', siren.audit_logging],
    ['Secret Management', siren.secret_management],
    ['Supply Chain Integrity', siren.supply_chain_integrity],
    ['Upgrade Safety', siren.upgrade_safety],
  ];
  for (const [name, pass] of sirenItems) {
    lines.push(`  ${pass ? '✓' : '✗'} ${name}`);
  }

  return lines.join('\n');
}
