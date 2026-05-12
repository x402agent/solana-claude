# Model Parameters Guide for Solana Clawd Agents

Tuning model parameters is how you control an agent's personality — deterministic vs creative, terse vs exploratory. This guide walks through every knob and recommends settings for the five most common Solana Clawd agent archetypes.

The Solana Clawd hub currently routes agent calls through OpenRouter, which supports most major models. Anything set in `config.modelParameters` on your agent JSON gets passed through on every call.

---

## Core Parameters

### Temperature (0.0 – 2.0)

Controls randomness.

- **Low (0.0 – 0.3)** → deterministic. Same input → same output. Best for code, calculations, protocol lookups.
- **Medium (0.4 – 0.7)** — default. Balanced creativity and consistency. Best for analysis and general conversation.
- **High (0.8 – 2.0)** → creative, unpredictable. Best for brainstorming, name generation, narrative takes.

**Example — explaining a Solana concept:**

```text
Temperature 0.0:
"Priority fees are lamports paid per compute unit to increase the likelihood of inclusion..."
[Same answer every time]

Temperature 0.7:
"Priority fees work like a tip to validators..."
[Slight phrasing variation]

Temperature 1.5:
"Picture Solana's mempool as a crowded bar — priority fees are how you get the bartender's attention..."
[Creative analogies, different every call]
```

### Top P (0.0 – 1.0)

Alternative to temperature. Controls diversity by cumulative probability.

- **0.1 – 0.5** → very focused, conservative
- **0.6 – 0.9** → balanced (default: 0.9)
- **0.95 – 1.0** → maximum diversity

⚠️ **Don't tune both temperature and top_p.** Pick one.

### Presence Penalty (-2.0 to 2.0)

Penalizes words that already appeared (any frequency). Reduces topic repetition.

- Negative → encourages repetition (good for reinforcing key terms)
- Zero → natural, default
- Positive → forces vocabulary diversity (good for creative writing)

### Frequency Penalty (-2.0 to 2.0)

Penalizes words based on **how many times** they've appeared. Stronger anti-repetition than presence penalty.

**Difference:**

- **Presence** = did the word appear? (yes/no)
- **Frequency** = how often? (count)

### Max Tokens

Response length cap. Scale to the agent's job:

- Quick answers / tooltips: 500–1000
- Analysis / recommendations: 1000–2000
- Full reports: 2000–4000

### Reasoning Effort (Claude Sonnet 4.5 / Opus 4.6)

- **low** — fastest, basic chain-of-thought
- **medium** — default, good for most Solana agents
- **high** — deep analysis, slower, more tokens — use for audit/risk agents

---

## Recommended Settings by Solana Agent Archetype

### 1. DeFi Analyst (Kamino picker, yield scanner)

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.3,
  "top_p": 0.8,
  "presence_penalty": 0.2,
  "frequency_penalty": 0.3,
  "reasoning_effort": "medium",
  "max_tokens": 2000
}
```

Consistent, factual, number-driven.

### 2. Memecoin / Pump.fun Screener

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.2,
  "top_p": 0.8,
  "presence_penalty": 0.0,
  "frequency_penalty": 0.1,
  "reasoning_effort": "medium",
  "max_tokens": 1500
}
```

Low temperature so scoring is reproducible — two users pasting the same token should see the same verdict.

### 3. Anchor / Program Auditor

```json
{
  "model": "anthropic/claude-opus-4-6",
  "temperature": 0.1,
  "top_p": 0.9,
  "presence_penalty": 0.0,
  "frequency_penalty": 0.0,
  "reasoning_effort": "high",
  "max_tokens": 4000
}
```

Deterministic, deep reasoning, long context — finds edge cases.

### 4. Trading Strategy / Alpha Hunter

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.4,
  "top_p": 0.85,
  "presence_penalty": 0.1,
  "frequency_penalty": 0.2,
  "reasoning_effort": "medium",
  "max_tokens": 2000
}
```

Slightly higher creativity to surface non-obvious correlations, still grounded.

### 5. Memecoin Name / Narrative Generator

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.9,
  "top_p": 0.95,
  "presence_penalty": 0.5,
  "frequency_penalty": 0.6,
  "reasoning_effort": "low",
  "max_tokens": 800
}
```

Max creativity, strong anti-repetition so each suggestion is distinct.

### 6. Solana Onboarding / Educator

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.5,
  "top_p": 0.9,
  "presence_penalty": 0.3,
  "frequency_penalty": 0.3,
  "reasoning_effort": "low",
  "max_tokens": 1500
}
```

Warm, varied phrasing without sacrificing accuracy.

---

## Model Recommendations

| Use case                                     | Recommended model                        |
| -------------------------------------------- | ---------------------------------------- |
| Anchor audits, complex reasoning, long docs  | `anthropic/claude-opus-4-6`              |
| Everyday Solana DeFi analysis                | `anthropic/claude-sonnet-4-5`            |
| Fast memecoin screeners, low-latency chats   | `anthropic/claude-haiku-4-5-20251001`    |
| Open-source / cost-sensitive                 | `meta-llama/llama-3.3-70b-instruct`      |
| xAI-native agents (built on SolanaOS runtime)| `x-ai/grok-4-fast`                       |

You can also set `"fallback_models"` to let OpenRouter retry on provider outages — handy for mainnet congestion spikes.

---

## Tuning Tips

### Start Conservative

Begin with defaults, then increase only when outputs are too rigid:

1. Test with `temperature: 0.3`
2. If too rigid, bump to `0.5`
3. Keep going in `0.1` steps until it feels right

### Single Variable

Change **one parameter at a time**. Otherwise you can't tell which change caused the improvement.

### Context Matters

- Short prompts → lower temperature (prompt can't anchor output, model needs focus)
- Long, detailed prompts → you can push temperature higher
- Ambiguous queries → lower temperature, ask clarifying questions
- Creative tasks → temperature 0.8+

### Monitor Quality

After shipping, track across the `/agents-registry`:

- Consistency (same input → similar output?)
- Accuracy (does it get Solana program IDs and APY math right?)
- Creativity (does the output feel fresh or canned?)
- Token usage (is max_tokens cutting off answers?)

---

## Parameter Interactions

- **Temperature + Top P**: don't tune both — use temperature for intuition, top_p for fine-grained control
- **Presence + Frequency**: can combine (typical combo: `presence: 0.3`, `frequency: 0.5`)
- **Reasoning Effort + Temperature**: independent — you can pair `reasoning: high, temperature: 0.2` for deep *and* consistent analysis (best for auditors)

---

## Context Window by Model

| Model                          | Context window |
| ------------------------------ | -------------- |
| Claude Opus 4.6 (1M context)   | 1,000,000      |
| Claude Sonnet 4.5              | 200,000        |
| Claude Haiku 4.5               | 200,000        |
| Grok-4-fast                    | 256,000        |
| Llama 3.3 70B                  | 128,000        |

For Anchor audits or long on-chain transcripts, prefer Opus. For quick swap quote explanations, Haiku is faster and cheaper.

---

## Troubleshooting

| Problem                          | Try                                                       |
| -------------------------------- | --------------------------------------------------------- |
| Too random / inconsistent        | Lower temperature (0.3), lower top_p (0.8)                |
| Too repetitive                   | Raise `presence_penalty` (0.5–1.0), `frequency_penalty`   |
| Too boring / generic             | Raise temperature (0.7–1.0), raise top_p (0.95)           |
| Off-topic responses              | Lower temperature; sharpen the system prompt              |
| Answers cut off                  | Raise `max_tokens`                                        |
| Too verbose                      | Raise `frequency_penalty`; add "be concise" to prompt     |
| Wrong program IDs / hallucinated | Switch to Opus; lower temperature; add prompt evidence    |

---

## Testing Methodology

1. **Baseline** — test with defaults
2. **Hypothesis** — "Lower temperature will make price-impact answers more consistent"
3. **Test** — run same Jupiter quote prompt 5× at `temperature: 0.2`
4. **Measure** — rate consistency, accuracy, token usage
5. **Compare vs baseline**
6. **Iterate** — change one parameter, repeat

Keep a lightweight eval suite in `defi-agents/tests/` with real Solana prompts so regressions are visible.

---

## Resources

- [OpenRouter model catalog](https://openrouter.ai/models)
- [Anthropic parameter docs](https://docs.anthropic.com/claude/docs/models-overview)
- [OpenRouter parameter playground](./openrouter.md) (local doc)

---

**Default heuristic for Solana Clawd agents**: start at `temperature: 0.3`, `reasoning_effort: medium`, Claude Sonnet 4.5. Tune from there based on whether outputs are too rigid or too loose.
