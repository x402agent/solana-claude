# Open Source Release Checklist

Use this checklist before making the repository public or attaching release artifacts.

## Do Not Commit

- `.env`, `.env.*`, `.dev.vars`, or local shell profiles.
- `.wrangler/`, local D1 databases, Miniflare state, or Worker cache files.
- `node_modules/`, `dist/`, `target/`, `artifacts/`, coverage output, or local logs.
- Solana keypairs, wallet files, private keys, seed phrases, or recovery phrases.
- Cloudflare account IDs, D1 database IDs, KV namespace IDs, or provider tenant IDs.
- API keys, bearer tokens, npm tokens, GitHub tokens, webhooks, or session tokens.
- Private deployment folders such as `cloudflare-agent-api/` or local token config under `config/`.

## Safe To Commit

- Placeholder env examples such as `BIRDEYE_API_KEY=`.
- Public program IDs and public deployment addresses.
- Non-secret package metadata and lockfiles.
- Documentation that uses `<subdomain>`, `YOUR_*`, or `${ENV_VAR}` placeholders.

## Required Pre-Public Checks

```bash
git status --short
git ls-files | rg '(node_modules|\.wrangler|/dist/|^dist/|target/deploy|keypair|\.env$|\.dev.vars)' || true
rg --hidden --glob '!.git/**' --glob '!node_modules/**' --glob '!**/node_modules/**' \
  --glob '!dist/**' --glob '!**/dist/**' --glob '!**/.wrangler/**' \
  --glob '!artifacts/**' --glob '!*.lock' --glob '!*.tgz' \
  '(sk-[A-Za-z0-9_-]{20,}|BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY|PRIVATE_KEY\s*=|api-key=[A-Za-z0-9_-]{10,})' .
```

Package artifacts should also be inspected before upload:

```bash
for file in artifacts/packages/*.tgz mpp/*.tgz; do
  tar -tzf "$file" | rg '(\.env|\.wrangler|keypair|id\.json|\.pem|\.key|node_modules)' && exit 1
done
```

## Private Deploy Surfaces

`cloudflare-agent-api/` and `config/` are local/private integration surfaces and are ignored by Git. Keep Worker source, Wrangler state, account IDs, D1/KV IDs, and token configuration outside the public GitHub repository unless they have been intentionally scrubbed and reviewed.

## Solana

The public program id can be documented. The program keypair cannot be committed. Keep keypairs under ignored paths such as `target/deploy/` or an external key management system.
