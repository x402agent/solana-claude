# Email Worker

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=18&duration=1700&pause=350&color=9945FF&center=true&vCenter=true&width=900&lines=notifications+%E2%86%92+workers+%E2%86%92+operator+alerts;Cloudflare+worker+surface+for+Clawd+email+events" alt="Email Worker animated header" />
</p>

`email-worker/` contains the Cloudflare Worker used for email-oriented notifications and operator event delivery.

## Quickstart

```bash
npm --prefix email-worker install
npm --prefix email-worker run dev
```

Deployment uses Wrangler:

```bash
npm --prefix email-worker run deploy
```

Keep Cloudflare credentials in Wrangler or local environment storage, not in this repository.
