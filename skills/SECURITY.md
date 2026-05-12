# 🛡️ OpenClawd Skill Security Framework

> Security guidelines for publishing and auditing skills in the OpenClawd ecosystem.

## Overview

All skills published to the OpenClawd marketplace must pass security review before being available for installation. This framework ensures:

- **No secrets leakage** — Skills must not expose API keys, passwords, or credentials
- **Safe execution** — Skills run with minimal required permissions
- **Verified authorship** — Wallet-signature verification for publishers
- **Audit trail** — All skill changes are logged and reversible

---

## Skill Security Requirements

### Required Metadata

Every SKILL.md must include:

```markdown
---
security:
  status: "approved" | "pending" | "rejected"
  scan_date: "ISO-8601 timestamp"
  approved_by: "wallet_address"
  permissions: ["read", "write", "network"]
  risk_level: "low" | "medium" | "high" | "critical"
  vault_certified: boolean
---
```

### Prohibited Patterns

Skills MUST NOT contain:

| Pattern | Severity | Example |
|---------|----------|---------|
| Plaintext API keys | Critical | `OPENAI_API_KEY=sk-...` |
| Private keys | Critical | `PRIVATE_KEY=4...` |
| Bearer tokens | High | `Authorization: Bearer xxx` |
| Passwords | Critical | `password=secret123` |
| Database URLs with credentials | High | `postgres://user:pass@...` |
| AWS keys | Critical | `AKIAIOSFODNN7EXAMPLE` |

### Allowed Patterns

| Pattern | Example |
|---------|---------|
| Placeholder variables | `{{OPENAI_API_KEY}}` |
| Environment references | `${API_KEY}` |
| Config file paths | `.env.example` |
| Documentation links | `[Get API Key](https://...)` |

---

## Security Review Process

### 1. Automated Scanning

All submitted skills are scanned with ClawdVault (hermes-vault):

```bash
# Scan a skill for secrets
clawd-vault scan ./skills/my-skill

# Expected output
✅ No secrets detected
⚠️ 1 warning: File permissions too open
🔒 Security score: 95/100
```

### 2. Manual Review Checklist

| Check | Required |
|-------|----------|
| SKILL.md exists | ✅ |
| Valid trigger keywords | ✅ |
| No hardcoded secrets | ✅ |
| Safe tool usage | ✅ |
| Proper permission scope | ✅ |
| Author wallet verified | ✅ |

### 3. Approval Criteria

A skill is approved when:

1. ✅ ClawdVault scan returns `score >= 80/100`
2. ✅ No critical severity findings
3. ✅ Author has verified wallet signature
4. ✅ Skill follows SKILL.md schema
5. ✅ Permissions are minimal and justified

---

## Vault Certification

Skills that pass rigorous security review can receive **Vault Certification**:

### Certification Levels

| Level | Requirements | Badge |
|-------|-------------|-------|
| 🐾 Basic | Passes scan, no critical issues | `basic` |
| 🔒 Standard | + Manual review, minimal permissions | `standard` |
| 🛡️ Premium | + Full audit, wallet verification | `premium` |
| ⚡ Elite | + Performance review, ecosystem approved | `elite` |

### Certification Benefits

- Higher trust rating in marketplace
- Eligible for featured placement
- Access to premium skill slots
- Integration with paid APIs

---

## Running Security Scans

### CLI Scan

```bash
# Scan all bundled skills
clawd-vault scan ./skills

# Scan specific skill
clawd-vault scan ./skills/pumpfun-trading

# Generate audit report
clawd-vault audit --format markdown --output security-report.md
```

### CI/CD Integration

```yaml
# .github/workflows/skill-security.yml
name: Skill Security Scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run ClawdVault scan
        run: |
          pip install hermes-vault
          hermes-vault scan ./skills --fail-on critical
```

---

## Reporting Security Issues

Found a vulnerability in a skill?

1. **DO NOT** open a public issue
2. Email: security@solanaclawd.com
3. Include:
   - Skill name and version
   - Description of the issue
   - Proof of concept (if applicable)
   - Your wallet address for bounty eligibility

---

## Security Contacts

| Role | Contact |
|------|---------|
| Security Team | security@solanaclawd.com |
| Vault Guardian | @clawdvault (Telegram) |
| Bug Bounty | See [Security guide](../docs/SECURITY.md) |

---

## Related Documentation

- [ClawdVault Skill](../clawd-vault/SKILL.md)
- [Skills Hub README](README.md)
- [Marketplace Article](../docs/articles/ARTICLE_MARKET.md)
- [Permissions & Sandboxing](../docs/articles/permissions-sandboxing.md)

---

## License

MIT — See [`../LICENSE.md`](../LICENSE.md)
