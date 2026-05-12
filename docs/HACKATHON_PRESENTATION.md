# Hackathon Presentation

## Private setup

Keep these values local only in `.env.local`:

- `MERCHANT_ID`
- `PAYMENT_PROFILE_ID`
- `OPENAI_API_KEY`

Do not paste them into:

- `README.md`
- `HACKATHON.md`
- demo recordings
- terminal screenshots
- GitHub issues or commits

## Preflight

Run before recording or pushing:

```bash
npm run hackathon:preflight
```

This checks:

- local secret files are ignored
- tracked files do not contain the merchant or payment profile values
- goblin session state is ignored
- root typecheck still passes

## Demo order

```bash
npm run hermes
npm run goblin
npm run demo:paysh
```

## Presenter framing

- `solana-clawd` is a Solana-native agentic harness
- `Goblin Mode` is the OpenAI-backed autonomous OODA path
- pay.sh gives private x402 payment flow
- everything shown in the demo is paper-mode, devnet-safe, and keyless on stage
