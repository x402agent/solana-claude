# Clawd Skill Hub

Every skill, plugin, MCP server, agent, or Solana program listed here has
passed the three-layer formal verification gate before it was accepted.
Adding anything to the hub without running the gate is **blocked at install time**.

---

## What is a Skill ID?

A skill ID is a deterministic 32-byte identifier derived from the skill's slug,
kind, and spec content:

```
skill_id = SHA-256( slug : kind : SHA-256(spec_content_or_slug) )
```

The same ID is used both in the off-chain registry (`skill-hub-registry.json`)
and the on-chain `SkillRecord` PDA (`seeds = [b"skill", skill_id]`).

---

## Three-Layer Gate (Required Before Listing)

```
Your skill/agent/plugin
         │
         ▼
┌────────────────────────────────────┐
│  1. STRIDE + SIREN Analysis        │  score ≥ 60 for skills
│     formal_verification/stride.ts  │  score ≥ 70 for agents
│     Critical → BLOCKED             │
└─────────────────┬──────────────────┘
                  │ pass
                  ▼
┌────────────────────────────────────┐
│  2. Kani Model Checking            │  Rust source only
│     formal_verification/kani/      │  proof failure → BLOCKED
└─────────────────┬──────────────────┘
                  │ pass
                  ▼
┌────────────────────────────────────┐
│  3. SAS On-Chain Attestation       │  warning if unconfigured
│     Program: 22zoJMtdu4tQc2PzL...  │
└─────────────────┬──────────────────┘
                  │
                  ▼
         skill-hub-registry.json
         on-chain SkillRecord PDA
```

---

## Adding a Skill

### 1 — Run the verification gate

```bash
npx tsx formal_verification/gate.ts verify --path skills/<your-skill>
```

This must exit `0`. If it exits `1` (STRIDE) or `2` (Kani), fix the issues
reported and re-run before proceeding.

### 2 — Register in the local hub

```bash
npx tsx formal_verification/skill-hub.ts register \
  --slug=<your-skill> \
  --name="Human Readable Name" \
  --kind=skill \
  --authority=<your-solana-pubkey>
```

Supported kinds: `skill` | `agent` | `plugin` | `mcp_server` | `program`

### 3 — Submit on-chain (optional, for permanent record)

Use the `register_skill` instruction on the `skill_hub` Anchor program
(`agents/agent-minter/src/lib.rs`). Pass the `skill_id` from step 2.

```bash
# Example with Anchor CLI
anchor invoke register_skill \
  --program-id agnmDKzZkv63sRhPFvm3iWpxaopgTRcohXA6CSYSXvQ \
  --args '{ "skill_id": "<32-byte hex>", ... }'
```

---

## Minimum STRIDE Scores

| Component Kind | Minimum Score |
|----------------|---------------|
| `skill`        | 60            |
| `plugin`       | 60            |
| `mcp_server`   | 60            |
| `agent`        | 70            |
| `program`      | 70            |

A score of 100 means no STRIDE violations were found. Critical violations
always block registration regardless of score.

---

## Skill Hub API

The gateway exposes a read-only API for the hub:

| Endpoint | Description |
|----------|-------------|
| `GET /api/skills` | List all registered skills |
| `GET /api/skills?kind=agent` | Filter by kind |
| `GET /api/skills/catalog` | Raw catalog.json |
| `GET /api/skills/kinds` | Count by kind |
| `GET /api/skills/:skillId` | Skill by 64-char hex ID |
| `GET /api/skills/slug/:slug` | Skill by slug |
| `GET /api/skills/slug/:slug/metadata.json` | Metaplex-compatible metadata |
| `GET /api/skills/slug/:slug/card.svg` | Visual identity card |
| `POST /api/skills/register` | Register new skill (gate enforced) |
| `POST /api/skills/revoke/:skillId` | Revoke a skill |

---

## On-Chain Program

Anchor program: `agents/agent-minter/src/lib.rs` — `skill_hub` module

| Instruction | Who Can Call | Enforcement |
|-------------|-------------|-------------|
| `initialize_skill_hub` | authority | one-time |
| `register_skill` | anyone | stride_score ≥ 60 |
| `register_agent_identity` | anyone | stride_score ≥ 70 |
| `attest_verification` | verifier | stride_score ≥ 60 |
| `link_skill_to_agent` | agent authority | skill must be active |
| `revoke_skill` | skill or hub authority | marks inactive |

PDAs:
- Hub: `seeds = [b"skill_hub"]`
- Skill: `seeds = [b"skill", skill_id]`
- Agent: `seeds = [b"agent_id", authority]`
- Verification: `seeds = [b"verification", component_hash]`

---

## Adding to install.sh

The curl installer runs the gate automatically. If you're adding a skill
directly to the repository, the CI workflow in `.github/workflows/verify.yml`
will block the PR if the gate fails.

```bash
# CI snippet
npx tsx formal_verification/gate.ts verify --path skills/<new-skill> || exit 1
npx tsx formal_verification/skill-hub.ts register \
  --slug=<new-skill> --authority=$CI_AUTHORITY --kind=skill
```

---

## Revoking a Skill

A skill can be revoked by its registered authority or the hub authority.
Revoked skills remain in the registry (for audit) but are marked `active: false`
and excluded from the default listing.

```bash
# Off-chain
npx tsx formal_verification/skill-hub.ts  # no revoke CLI yet — use the API
curl -X POST https://solanaclawd.com/api/skills/revoke/<skill_id> \
  -H "X-Authority-Pubkey: <your-pubkey>"

# On-chain
anchor invoke revoke_skill --args '{ "skill_id": "<hex>" }'
```
