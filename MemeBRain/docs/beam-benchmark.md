# Mnemosyne BEAM Benchmark

**Evaluated against ICLR 2026 BEAM dataset (Tavakoli et al.)**
**Date:** 2026-05-06 | **Version:** Mnemosyne 2.5 | **Model:** Gemini 2.5 Flash via OpenRouter

---

## End-to-End Results (LLM-as-Judge, Rubric Scoring)

180 questions across 3 scales (48 per scale, 3 conversations each).

| Scale | Mnemosyne | RAG (Llama-4) | LIGHT | Honcho | Hindsight |
|-------|-----------|---------------|-------|--------|-----------|
| 100K | **35.4%** | 32.3% | 35.8% | 63.0% | 73.4% |
| 500K | 19.3% | 33.0% | 35.9% | 64.9% | 71.1% |
| 1M | 19.2% | 30.7% | 33.6% | 63.1% | 73.9% |

Published baselines from Tavakoli et al., ICLR 2026 and Hindsight blog (Apr 2026). Identical BEAM dataset and LLM-as-judge protocol for valid comparison.

---

## Per-Ability Breakdown

### 100K (35.4% overall)

| Ability | Score | Assessment |
|---------|-------|------------|
| IE (Info Extraction) | 80.5% | Strong. Extracts specific facts from conversation context |
| ABS (Abstention) | 50.0% | Identifies half of unanswerable questions |
| SUM (Summarization) | 41.7% | Moderate synthesis across conversation windows |
| CR (Contradiction) | 35.4% | Some contradiction detection |
| TR (Temporal) | 29.2% | Time-difference reasoning works occasionally |
| MR (Multi-hop) | 16.7% | Weak. Cannot connect facts across distant messages |
| KU (Knowledge Update) | 16.7% | Weak. Cannot track changing values over time |
| EO (Event Ordering) | 13.3% | Very weak. Cannot order events chronologically |
| IF (Instruction Following) | 0.0% | Not tested at this scale |
| PF (Preference Following) | 0.0% | Not tested at this scale |

### 500K (19.3% overall)

| Ability | Score | Assessment |
|---------|-------|------------|
| ABS (Abstention) | 83.3% | Stronger than 100K. Larger conversations make abstention clearer |
| SUM (Summarization) | 25.3% | Degraded from 100K |
| KU (Knowledge Update) | 16.7% | Same weak performance as 100K |
| MR (Multi-hop) | 14.6% | Same weak performance |
| IE (Info Extraction) | 8.3% | **Major degradation.** Facts lost in larger contexts |
| CR (Contradiction) | 4.2% | Near zero |
| EO (Event Ordering) | 1.7% | Near zero |
| TR (Temporal) | 0.0% | Lost entirely |

### 1M (19.2% overall)

| Ability | Score | Assessment |
|---------|-------|------------|
| ABS (Abstention) | 100.0% | Anomalous. Sample size effect (6 questions, all flagged correctly) |
| MR (Multi-hop) | 16.7% | Same as smaller scales |
| IE (Info Extraction) | 16.7% | Degraded from 80.5% at 100K |
| TR (Temporal) | 16.7% | Slight recovery? Not significant |
| EO (Event Ordering) | 3.3% | Near zero |
| CR (Contradiction) | 0.0% | Zero |
| KU (Knowledge Update) | 0.0% | Zero |
| SUM (Summarization) | 0.0% | Lost entirely |

---

## Analysis

### What Works
- **Small-scale information extraction (80.5% at 100K).** Mnemosyne retrieves and surfaces specific facts well when conversations are under 500 messages. The full-context strategy (giving the LLM all messages) works well.
- **Abstention.** Consistently identifies unanswerable questions. Improves with scale (50% → 83% → 100%).

### What Doesn't Work
- **Scaling beyond 500 messages.** Performance drops from 35.4% to 19.3% when moving from 100K to 500K. The retrieval fallback for large conversations (`_multi_strategy_recall`) is not surfacing relevant memories.
- **Fact linking across messages.** MR, EO, and KU scores are weak at all scales. These require connecting information spread across distant parts of a conversation, which needs a working episodic tier.
- **Episodic consolidation.** The benchmark ingestion code calls `consolidate_to_episodic()` but the episodic tier remains empty. Without episodic entries, retrieval searches only working memory, which is purged during ingestion.

### Root Cause
The episodic consolidation in the benchmark script produces zero entries. This means the retrieval path is missing its primary speed and quality tier for large conversations. Fixing this should significantly improve 500K and 1M scores.

### Cautions
- Sample size: 48 questions per scale. Confidence intervals are wide. Full 100-conversation evaluation pending.
- The 100% ABS at 1M is likely a sample artifact (6 questions, all easy to identify as unanswerable).
- IF and PF abilities had zero questions in the sampled conversations. Not representative.

---

## Next Steps

1. Fix episodic consolidation to produce entries during benchmark ingestion
2. Run full-scale evaluation (all 100 conversations, all 2,000+ questions)
3. After episodic fix: re-evaluate 500K and 1M to measure improvement
4. Set up Honcho/Hindsight/RAG baselines locally for same-LLM comparison
