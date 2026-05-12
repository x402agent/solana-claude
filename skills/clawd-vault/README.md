# 🐾 ClawdVault Skill

Security scanning and hardening skill for OpenClawd agents.

## Overview

ClawdVault is a security guardian skill that scans codebases for vulnerabilities, hardens security configurations, and manages secrets safely. It integrates with the ACP registry for trust verification and uses the vault-mcp server for tool execution.

## Features

- **Secret Scanning** — Detect API keys, passwords, private keys, and other sensitive data
- **Vulnerability Detection** — Identify common security issues in code
- **Configuration Hardening** — Auto-fix security misconfigurations
- **Audit Reports** — Generate comprehensive security audit reports
- **Policy Enforcement** — Enforce security policies defined in `policy.yaml`

## Integration with ACP Registry

This skill is registered in the OpenClawd ACP registry and integrates with:

- `agents/vault-agent.json` — The ClawdVault guardian agent configuration
- `MCP/vault-mcp/` — MCP server providing vault tools
- `services/hermes-vault/` — Backend scanning service

## Usage

```markdown
# Activate ClawdVault
Use the clawd-vault skill to scan your codebase.

# Scan for secrets
vault-scan --type secrets

# Scan for vulnerabilities
vault-scan --type vulns

# Auto-harden issues
vault-harden --auto

# Generate audit report
vault-audit --output markdown
```

## Security Rules

- Never expose secrets or credentials
- Require confirmation for destructive actions
- Maintain audit trail of all operations
- Restricted to allowed paths only

## License

MIT
