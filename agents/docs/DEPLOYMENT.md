# 🚀 Solana Clawd Agent Deployment Guide

There are **four paths** to getting your agent live on the [Solana Clawd hub](https://solanaclawd.com/agents). Pick the one that matches how much control you want.

| Path                         | Best for                                  | Result                                             |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------- |
| **1. PR into the repo**      | Simple, static agent prompts              | Auto-hosted on CDN + hub + 18 locales              |
| **2. Self-host + A2A**       | Custom logic, private tools, streaming    | Your infra, discoverable via hub                   |
| **3. Mint as MPL Core**      | On-chain identity, transferable ownership | Registered on Solana, listed at `/agents-registry` |
| **4. MCP server only**       | Tool provider for Claude Desktop / Cursor | Endpoint listed in MCP catalog                     |

---

## Path 1 — Open a PR (easiest)

Push your `agent.json` into the repo and everything else is automatic.

### Steps

```bash
git clone https://github.com/x402agent.com/solana-clawd.git
cd solana-clawd/defi-agents
cp agent-template.json src/your-agent-name.json
# edit src/your-agent-name.json
bun install
bun run format
bun run build
git checkout -b add-your-agent
git commit -am "feat(agents): add your-agent-name"
git push origin add-your-agent
# open PR at github.com/x402agent.com/solana-clawd
```

### What CI does on merge

1. Validates JSON schema
2. Translates `config.systemRole`, `meta.title`, `meta.description` into 18 languages via OpenRouter
3. Builds the aggregated index (`index.json`, `index.{locale}.json`, `agents-manifest.json`)
4. Deploys to both:
   - **GitHub Pages** at `https://clawd.click/{your-agent-name}.json`
   - **Solana Clawd hub** at `https://solanaclawd.com/agents/{your-agent-name}`

### Required secret for translation

Set once at **Settings → Secrets → Actions**:

| Name                 | Value               |
| -------------------- | ------------------- |
| `OPENROUTER_API_KEY` | Your OpenRouter key |

If absent, CI skips translation and only ships English.

---

## Path 2 — Self-host + A2A register

Run your agent on your own infra (Vercel, Fly, Railway, Modal, Cloudflare Workers, your laptop) and expose the A2A endpoint. The hub proxies queries to you.

### Minimal A2A server (Node)

```ts
import express from "express";

const app = express();
app.use(express.json());

app.post("/a2a", async (req, res) => {
  const { method, params } = req.body;
  if (method === "message/send") {
    // call your LLM with params.message.content
    const reply = await yourAgentLogic(params.message.content);
    res.json({ jsonrpc: "2.0", id: req.body.id, result: { role: "assistant", content: reply } });
    return;
  }
  res.status(400).json({ error: "unknown method" });
});

app.get("/agent.json", (_, res) => res.json({
  identifier: "your-agent-name",
  author: "your-handle",
  meta: {
    title: "Your Agent",
    description: "What it does",
    avatar: "🤖",
    tags: ["solana", "..."],
    category: "defi",
  },
  config: { systemRole: "..." },
  schemaVersion: 1,
  a2a: "https://your-host.example.com/a2a",
}));

app.listen(3000);
```

### Register with the hub

```bash
curl -X POST https://beepboop.solanaclawd.com/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "your-agent-name",
    "manifestUrl": "https://your-host.example.com/agent.json",
    "a2a": "https://your-host.example.com/a2a"
  }'
```

The registry polls your `manifestUrl` every 24h to pick up prompt/metadata changes.

---

## Path 3 — Mint as on-chain MPL Core asset

For agents that should have **transferable ownership**, **royalty rails**, or a **permanent on-chain record**, mint it as a Metaplex Core asset on Solana mainnet.

### UI flow (recommended)

1. Go to [solanaclawd.com/agents-mint](https://solanaclawd.com/agents-mint)
2. Connect your Solana wallet (Phantom, Solflare, Backpack)
3. Either:
   - **Upload `agent.json`** — we handle IPFS pinning and metadata
   - **Paste a manifest URL** if you're already hosting it
4. Confirm the mint transaction (~0.003 SOL + priority fee)
5. Your agent appears in [/agents-registry](https://solanaclawd.com/agents-registry) with its on-chain asset address

### Programmatic mint (server-side)

```ts
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore, create } from "@metaplex-foundation/mpl-core";
import { generateSigner, publicKey } from "@metaplex-foundation/umi";

const umi = createUmi(process.env.RPC_URL!).use(mplCore());
const asset = generateSigner(umi);

await create(umi, {
  asset,
  name: "Solana Portfolio Manager",
  uri: "https://beepboop.solanaclawd.com/api/agents/nft-metadata.json?identifier=solana-portfolio-manager",
  collection: publicKey(process.env.AGENT_COLLECTION!),
}).sendAndConfirm(umi);

console.log("Agent asset:", asset.publicKey);
```

The MPL Core asset address becomes your agent's canonical Solana identity. Transfer it, sell it, or delegate update authority — the hub reads the asset on every registry refresh.

---

## Path 4 — MCP server only

If you only want to expose **tools** (not a full prompt-driven agent), run an MCP Streamable HTTP server and register it.

### Register your MCP endpoint

```bash
curl -X POST https://modelcontextprotocol.name/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "your-tool-server",
    "url": "https://your-host.example.com/mcp",
    "tags": ["solana", "..."]
  }'
```

Your server shows up in both the [MCP catalog](https://modelcontextprotocol.name) and the Solana Clawd [agents registry](https://solanaclawd.com/agents-registry) under "Tool Providers".

---

## Custom Domains for Self-Hosted Agents

If you're hosting your own agent manifest, map a clean subdomain:

```bash
# Example CNAME record
agent.yourdomain.com  CNAME  your-host.example.com
```

Then set:

```bash
echo "agent.yourdomain.com" > CNAME
git add CNAME && git commit -m "Custom domain" && git push
```

Enable HTTPS in your hosting provider after DNS propagates.

---

## Path Comparison

| Feature                        | PR     | Self-host A2A | MPL Core Mint           | MCP Server       |
| ------------------------------ | ------ | ------------- | ----------------------- | ---------------- |
| Cost                           | Free   | Your hosting  | ~0.003 SOL              | Free             |
| Setup time                     | 10 min | 1–2 hrs       | 15 min                  | 30 min           |
| 18-language translation        | ✅     | ❌ (DIY)      | Inherits from manifest  | ❌               |
| Custom logic / tools           | ❌     | ✅            | Depends on manifest     | ✅ tools only    |
| Transferable ownership         | ❌     | ❌            | ✅                      | ❌               |
| On-chain proof                 | ❌     | ❌            | ✅                      | ❌               |
| Shows up on `/agents`          | ✅     | ✅            | ✅                      | ✅ (under Tools) |
| Shows up on `/agents-registry` | ✅     | ✅            | ✅ (with asset address) | ✅               |
| Auto-deploy                    | ✅     | Your CI       | On mint                 | Your CI          |

---

## Tracking Your Agent

Once deployed, monitor your agent at:

- **Gallery card**: `https://solanaclawd.com/agents/{identifier}`
- **Registry entry**: `https://solanaclawd.com/agents-registry?filter={identifier}`
- **Usage stats** (A2A call counts, install counts): `https://solanaclawd.com/agents/{identifier}/stats`
- **On-chain asset** (if minted): `https://solscan.io/token/{asset-address}`

---

## FAQ

**Q: Do I have to open-source my agent?**
A: Only if you go Path 1 (PR). Paths 2, 3, 4 keep your implementation private — the hub only needs the public manifest.

**Q: Can I monetize my agent?**
A: Yes. Self-hosted agents can require an API key or x402 payment before responding. On-chain minted agents can enforce royalties via MPL Core.

**Q: What happens if my A2A server goes down?**
A: The hub marks it `offline` in `/agents-registry` but keeps the card visible. Three failed polls in 24h → hidden from the default gallery until it recovers.

**Q: Can I update a minted on-chain agent?**
A: Yes, as long as you hold update authority on the MPL Core asset. Update the metadata URI or manifest, re-register, done.

**Q: Can one identifier have multiple deployment paths?**
A: Yes. Recommended combo for serious agents: Path 1 (public prompt + translations) + Path 3 (on-chain mint) + Path 2 (private tools behind A2A).

---

## Related Docs

- [AGENT_GUIDE.md](./AGENT_GUIDE.md) — writing effective prompts
- [API.md](./API.md) — the full endpoint surface
- [CONTRIBUTING.md](./CONTRIBUTING.md) — PR workflow
- [I18N_WORKFLOW.md](./I18N_WORKFLOW.md) — translation pipeline
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — common issues
