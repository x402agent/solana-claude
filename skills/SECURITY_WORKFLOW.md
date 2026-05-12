# 🔐 OpenClawd Skill Security Workflow

> Automated security scanning and approval workflow for skills.

## Overview

This document defines the security review workflow for all skills in the OpenClawd ecosystem. Every skill must pass automated scanning before being published or updated.

---

## Workflow Stages

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. SUBMIT                                                         │
│    ├── Skill author submits SKILL.md via clawdhub publish        │
│    └── Triggers automated security scan                          │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────────┐
│ 2. SCAN                                                           │
│    ├── ClawdVault secret scanner                                  │
│    ├── Pattern matching (API keys, tokens, passwords)              │
│    ├── File permission checks                                     │
│    └── Permission scope validation                                │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼─────────┐           ┌─────────▼─────────┐
    │ FAIL              │           │ PASS               │
    │ Critical issues    │           │ Score >= 80        │
    │ Reject + Report   │           │ Proceed to review  │
    └───────────────────┘           └─────────┬───────────┘
                                              │
┌─────────────────────────────────────────────▼─────────────────────┐
│ 3. REVIEW                                                          │
│    ├── Automated checks complete                                    │
│    ├── Manual review by security team (for premium/elite)          │
│    └── Wallet signature verification                               │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────▼─────────┐           ┌─────────▼─────────┐
    │ REJECT            │           │ APPROVE            │
    │ Return to author  │           │ Publish to market  │
    │ with issues       │           │ Add vault badge    │
    └───────────────────┘           └───────────────────┘
```

---

## Scan Criteria

### Secret Detection Patterns

| Pattern | Regex | Severity |
|---------|-------|----------|
| OpenAI API Key | `sk-[A-Za-z0-9]{20,}` | CRITICAL |
| Anthropic Key | `sk-ant-[A-Za-z0-9_-]{20,}` | CRITICAL |
| GitHub Token | `gh[pousr]_[A-Za-z0-9]{20,}` | HIGH |
| Generic Bearer | `[Bb]earer\s+[A-Za-z0-9_-]{10,}` | HIGH |
| AWS Access Key | `AKIA[0-9A-Z]{16}` | CRITICAL |
| Private Key | `-----BEGIN.*PRIVATE KEY-----` | CRITICAL |
| Database URL | `(postgres\|mysql\|mongodb)://[^@]+@` | HIGH |
| Solana Private Key | `[1-9A-HJ-NP-Za-km-z]{32,44}` | CRITICAL |

### Scoring Formula

```
Score = 100 - (CRITICAL * 30) - (HIGH * 15) - (MEDIUM * 5) - (LOW * 1)
```

### Approval Thresholds

| Certification | Minimum Score | Requirements |
|---------------|---------------|--------------|
| 🐾 Basic | 80 | Automated scan only |
| 🔒 Standard | 90 | + Permission review |
| 🛡️ Premium | 95 | + Manual audit |
| ⚡ Elite | 98 | + Performance review |

---

## Automated Actions

### On Scan Failure

1. **Block publication** immediately
2. **Generate report** with findings
3. **Notify author** via registered wallet
4. **Log incident** for audit trail

### On Scan Success

1. **Generate certificate** with scan ID
2. **Assign certification level** based on score
3. **Update registry** with security metadata
4. **Notify author** with badge assignment

---

## Skill Metadata Schema

All skills in the registry include:

```json
{
  "name": "skill-name",
  "security": {
    "scan_id": "scan_abc123",
    "scan_date": "2026-04-22T00:00:00Z",
    "score": 95,
    "level": "premium",
    "findings": [],
    "approved_by": "wallet_signature",
    "expires_at": "2026-07-22T00:00:00Z"
  }
}
```

---

## Integration Points

### ClawdHub

```typescript
// Before publishing, scan is mandatory
const result = await clawdhub.publish({
  skill: './my-skill',
  scanFirst: true, // Always scan before publish
  failOnCritical: true
});
```

### API Registrar

```json
// API key required for publishing
{
  "Authorization": "Bearer clawd_sk_..."
}
```

### ClawdRouter

```typescript
// Skills with x402 support flagged
const skill = await clawdhub.get('pumpfun-trading');
if (skill.security.x402_support) {
  // Apply payment gating
}
```

---

## Compliance

This workflow ensures compliance with:

- [ ] No secrets in skill code
- [ ] Minimal permission scope
- [ ] Wallet-verified authorship
- [ ] Reversible skill versions
- [ ] Audit trail for all changes
- [ ] Regular rescan on updates

---

## Quick Reference

| Command | Action |
|---------|--------|
| `clawd-vault scan ./skills` | Scan all skills |
| `clawd-vault scan ./skill-name --fail-on critical` | Scan single, fail on critical |
| `clawdhub publish ./skill --scan-first` | Publish with mandatory scan |
| `clawdhub list --certified-only` | List vault-certified skills |

---

## Related

- [Skills Security Framework](SECURITY.md)
- [ClawdVault SKILL.md](../clawd-vault/SKILL.md)
- [ClawdHub Publish Flow](../clawdhub/README.md)
