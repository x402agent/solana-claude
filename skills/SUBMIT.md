# Submitting a Skill to the Clawd Skill Hub

Any Solana agent or human can submit a skill, plugin, MCP server, or agent.
Every submission passes a three-layer formal verification gate before it appears
in the hub and receives a Solana Attestation Service (SAS) on-chain record.

---

## Quick Start (One Curl)

### From GitHub

```bash
curl -X POST https://solanaclawd.com/api/skills/submit \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "slug": "your-skill-slug",
    "name": "Your Skill Name",
    "description": "What your skill does in one sentence.",
    "kind": "skill",
    "category": "DeFi",
    "author": {
      "solana_pubkey": "YOUR_WALLET_PUBKEY"
    },
    "source": {
      "type": "github",
      "url": "https://github.com/you/your-skill",
      "branch": "main"
    }
  }'
```

### Inline Content (no GitHub required)

```bash
curl -X POST https://solanaclawd.com/api/skills/submit \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "slug": "my-defi-skill",
    "name": "My DeFi Skill",
    "kind": "skill",
    "author": { "solana_pubkey": "YOUR_WALLET_PUBKEY" },
    "content": {
      "readme": "# My DeFi Skill\nSwaps tokens on Solana using Jupiter..."
    }
  }'
```

The response includes your `skill_id`, STRIDE score, SAS attestation, and the
hub URL where your skill is immediately visible.

---

## Submission Response

```json
{
  "skill_id": "a1b2c3...64hex",
  "slug": "your-skill-slug",
  "stride_score": 87,
  "kani_verified": false,
  "sas_attestation": {
    "schema": "clawd-component-verification-v1",
    "on_chain": true,
    "signature": "<tx_sig>"
  },
  "on_chain": true,
  "metadata_uri": "https://solanaclawd.com/api/skills/slug/your-skill-slug/metadata.json",
  "hub_url": "https://solanaclawd.com/skills/your-skill-slug",
  "next": {
    "hub_url": "https://solanaclawd.com/skills/your-skill-slug",
    "metadata": "https://solanaclawd.com/api/skills/slug/your-skill-slug/metadata.json",
    "on_chain_instruction": "Call register_skill on skill_hub Anchor program with the skill_id above.",
    "anchor_program": "agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ"
  }
}
```

---

## Manifest Schema

Full JSON schema: `GET https://solanaclawd.com/api/skills/schema`

| Field | Required | Description |
|-------|----------|-------------|
| `schema_version` | ✓ | Always `"1.0"` |
| `slug` | ✓ | Lowercase, hyphens OK, 3–64 chars |
| `name` | ✓ | Display name, max 80 chars |
| `kind` | ✓ | `skill` \| `agent` \| `plugin` \| `mcp_server` \| `program` |
| `author.solana_pubkey` | ✓ | Your base58 wallet — becomes on-chain authority |
| `description` | — | What the skill does |
| `category` | — | Grouping, e.g. `"DeFi"`, `"AI / Agents"` |
| `source.type` | — | `"github"` or `"url"` — the hub fetches README/spec for analysis |
| `source.url` | — | GitHub repo URL or direct archive URL |
| `content.readme` | — | Inline README text (instead of source URL) |
| `content.skill_md` | — | Inline skill.md |
| `content.spec_md` | — | Inline SPEC.md for Kani verification |
| `tags` | — | Up to 10 discovery tags |
| `license` | — | SPDX identifier |
| `metadata_uri` | — | Override the default Metaplex metadata URI |

---

## Formal Verification Requirements

| Kind | Min STRIDE Score | Critical Violations |
|------|-----------------|---------------------|
| `skill` | 60 | Blocked (any) |
| `plugin` | 60 | Blocked (any) |
| `mcp_server` | 60 | Blocked (any) |
| `agent` | 70 | Blocked (any) |
| `program` | 70 | Blocked (any) |

### What triggers a rejection?

- **Hardcoded private keys or secrets** (STRIDE S-001, S-002) — always blocked
- **`eval()` or shell exec** (STRIDE T-001, T-002) — high severity
- **Secrets logged to console** (STRIDE I-001) — high severity
- **Deep path traversal** (STRIDE E-001) — high severity
- **3+ high-severity findings** — blocked regardless of total score

### Improving your score

- Use environment variables for all secrets
- Never log key material
- Avoid `eval()` — use typed data instead
- Validate all external inputs before use
- For Solana programs: include PDA owner checks and compute budget instructions

---

## On-Chain Skill ID

Your skill ID is a deterministic 32-byte identifier:

```
skill_id = SHA-256( slug : kind : SHA-256(spec_content) )
```

It is used in two places:
1. **Off-chain registry**: `formal_verification/skill-hub-registry.json`
2. **On-chain PDA**: `seeds = [b"skill", skill_id]` in the `skill_hub` Anchor program

To write the on-chain record yourself after receiving your `skill_id`:

```bash
# Anchor CLI (coming soon — use the API for now)
anchor invoke register_skill \
  --program-id agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ \
  -- ...
```

---

## SAS On-Chain Attestation

Accepted skills receive a permanent Solana Attestation Service (SAS) record:

| Field | Value |
|-------|-------|
| Program | `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG` |
| Schema | `clawd-component-verification-v1` |

Fields recorded on-chain:
```json
{
  "component_name": "your-skill-slug",
  "component_kind": "skill",
  "component_hash": "<skill_id>",
  "stride_score": "87",
  "kani_verified": "false",
  "verified_at": "2026-05-19T00:00:00Z",
  "verifier": "clawd-gate-v1",
  "lineage": "clawd-skill-hub-v1"
}
```

---

## Via PR (for skills hosted in this repo)

1. Add your skill directory to `skills/your-slug/`
2. Include `README.md` or `skill.md` describing what it does
3. Add an entry to `skills/catalog.json`
4. Open a PR — the `Skill Hub Verification` CI workflow runs the gate automatically
5. A passing gate comment is posted to the PR

---

## Discovering Skills (for agents)

```bash
# JSON Feed (agent-friendly)
curl https://solanaclawd.com/api/skills/feed.json

# Search by keyword
curl "https://solanaclawd.com/api/skills/search?q=defi"

# List by kind
curl "https://solanaclawd.com/api/skills?kind=mcp_server"

# Individual skill
curl https://solanaclawd.com/api/skills/slug/your-slug

# Metaplex-compatible metadata
curl https://solanaclawd.com/api/skills/slug/your-slug/metadata.json
```

---

## Rate Limits

| Action | Limit |
|--------|-------|
| Submissions | 10 per IP per hour |
| Read endpoints | Unlimited (cached) |

---

## Questions?

- Hub: `https://solanaclawd.com/skills`
- GitHub: `https://github.com/x402agent/solana-clawd`
- Gate docs: `formal_verification/VERIFIER.md`
- Schema: `GET https://solanaclawd.com/api/skills/schema`
