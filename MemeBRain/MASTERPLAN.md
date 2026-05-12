# Mnemosyne SOTA Memory Architecture - Masterplan
## Temporal Epistemic Graphs with Veracity-Weighted Consolidation

---

## Paper Citations & Foundations

### Core Papers
1. **Memanto** (arXiv:2604.22085) - Typed Semantic Memory with Information-Theoretic Retrieval
   - 13-type schema, zero ingestion cost, single-query retrieval
   - Authors: Moorcheh AI / EdgeAI Innovations
   
2. **Moorcheh ITS** (arXiv:2601.11557) - From HNSW to Information-Theoretic Binarization
   - 32x compression, deterministic exhaustive scan, 9.6ms latency
   - Authors: Abtahi et al., Ontario Tech University
   
3. **REMem** (ICLR 2026, arXiv:2602.13530) - Reasoning with Episodic Memory
   - Hybrid memory graph, time-aware gists, agentic retrieval
   - Authors: Shu et al., Ohio State / Intuit AI
   
4. **HippoRAG** (arXiv:2405.14831) - Neurobiologically Inspired Long-Term Memory
   - Hippocampal indexing theory, graph-based retrieval
   - Authors: Various

### Supporting Papers
5. **BEAM Benchmark** - Beyond a Million Tokens (2026)
6. **Hindsight Blog** (2026/04) - SOTA on BEAM with structured memory
7. **Honcho Benchmarks** (blog.plasticlabs.ai) - User modeling and dreaming

---

## Our Novel Contribution

**"Temporal Epistemic Graphs with Veracity-Weighted Consolidation"**

No existing system combines:
- Typed semantic memory (Memanto)
- Binary vector compression (Moorcheh)
- Episodic graph structure (REMem)
- Veracity-weighted confidence (our invention)
- Deterministic retrieval (our constraint)
- Zero LLM ingestion (our constraint)

---

## Implementation Phases

### Phase 0: Research & Foundation (COMPLETE)
- [x] Identify all relevant papers
- [x] Map techniques to our architecture
- [x] Define 10 core principles
- [x] Create masterplan document

### Phase 1: Typed Memory Schema
**Goal:** Implement 13-type deterministic classification
**Papers:** Memanto (arXiv:2604.22085)
**Innovation:** Rule-based typing with zero LLM calls

**Types:**
1. fact - Objective, verifiable info
2. preference - User/system preferences
3. decision - Choices affecting future
4. commitment - Promises/obligations
5. goal - Objectives to achieve
6. event - Historical occurrences
7. instruction - Rules/guidelines
8. relationship - Entity connections
9. context - Situational info
10. learning - Lessons from experience
11. observation - Patterns noticed
12. error - Mistakes to avoid
13. artifact - Document/code references

**Implementation:**
- Pattern-based classifier using regex + keyword matching
- Confidence scoring based on pattern match strength
- No LLM calls during classification
- Store type in dedicated column

### Phase 2: Information-Theoretic Binary Vectors
**Goal:** Replace float32 vectors with binary compression
**Papers:** Moorcheh ITS (arXiv:2601.11557)
**Innovation:** Deterministic exhaustive scan over binary vectors

**Implementation:**
- Maximally Informative Binarization (MIB) algorithm
- Efficient Distance Metric (EDM) using Hamming distance
- Information-Theoretic Score (ITS) for ranking
- 32x memory reduction
- No HNSW index needed
- SQLite-native storage

### Phase 3: Episodic Gist+Fact Graph
**Goal:** Build hybrid memory graph with temporal edges
**Papers:** REMem (arXiv:2602.13530)
**Innovation:** Time-aware gists + structured facts in single graph

**Implementation:**
- Gist extraction: concise episode summaries with timestamps
- Fact extraction: (subject, predicate, object) triples
- Graph nodes: V_gist ∪ V_phrase
- Graph edges: E_rel ∪ E_ctx ∪ E_syn
- Temporal qualifiers: point_in_time, start_time, end_time

### Phase 4: Veracity-Weighted Consolidation
**Goal:** Bayesian confidence scoring + conflict resolution
**Papers:** None (our invention)
**Innovation:** Confidence-based synthesis with automatic conflict detection

**Implementation:**
- Veracity tiers: stated (1.0), inferred (0.7), tool (0.5), imported (0.6), unknown (0.8)
- Bayesian updating: confidence = 1 - (0.7^n) where n = mention count
- Conflict detection: contradictory facts with same subject+predicate
- Resolution: higher confidence wins, lower confidence flagged
- Consolidation: periodic background synthesis of high-confidence facts

### Phase 5: Polyphonic Recall Engine
**Goal:** Multi-strategy parallel retrieval with deterministic re-ranking
**Papers:** Memanto + REMem
**Innovation:** Parallel strategies with cross-strategy confirmation boost

**Implementation:**
- Strategy 1: Binary vector similarity (Moorcheh)
- Strategy 2: FTS5 keyword search
- Strategy 3: Temporal index lookup
- Strategy 4: Entity graph traversal
- Strategy 5: Fact triple matching
- Re-ranker: weighted combination with cross-strategy boost
- No LLM calls during retrieval

### Phase 6: Integration & Testing
**Goal:** Full system integration with comprehensive testing
**Tests:**
- Unit tests for each component
- Integration tests for end-to-end flow
- BEAM benchmark validation
- Ablation studies (disable each component, measure impact)
- Performance benchmarks (latency, throughput, memory)

### Phase 7: Paper Draft
**Goal:** arXiv preprint with full methodology and results
**Sections:**
1. Introduction + Related Work
2. Core Principles
3. Architecture
4. Implementation Details
5. Benchmark Results
6. Ablation Studies
7. Cost Analysis
8. Conclusion

---

## Success Metrics

| Metric | Current | Target | SOTA |
|--------|---------|--------|------|
| BEAM 100K | 21.8% | 40%+ | 73.4% |
| Ingestion Latency | ~500ms | <10ms | N/A |
| Query Latency | ~100ms | <50ms | N/A |
| Memory Overhead | 1x | 0.03x (32x comp) | N/A |
| LLM Calls per Ingest | 1+ | 0 | N/A |
| LLM Calls per Query | 1+ | 0 | N/A |

---

## Risk Mitigation

1. **Binary vector quality loss**: Test on BEAM before/after, tune MIB threshold
2. **Type classification accuracy**: Validate against labeled dataset, adjust patterns
3. **Graph traversal performance**: Add depth limits, cache frequent paths
4. **Consolidation correctness**: Conservative thresholds, human review for high-stakes

---

## Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Typed Schema | 2 days | 2 days |
| Phase 2: Binary Vectors | 3 days | 5 days |
| Phase 3: Episodic Graph | 4 days | 9 days |
| Phase 4: Veracity Consolidation | 3 days | 12 days |
| Phase 5: Polyphonic Recall | 3 days | 15 days |
| Phase 6: Testing | 5 days | 20 days |
| Phase 7: Paper | 5 days | 25 days |

**Total: ~25 days to SOTA paper**

---

## Implementation Order

Starting with Phase 1 (Typed Schema) because:
1. Highest impact on BEAM scores (ABS, SUM, KU categories)
2. Lowest risk (rule-based, no dependencies)
3. Foundation for all other phases
4. Can be tested independently

Then Phase 2 (Binary Vectors) for performance gains.
Then Phase 3 (Episodic Graph) for reasoning improvements.
Then Phase 4 (Veracity) for consolidation quality.
Then Phase 5 (Polyphonic Recall) to tie it all together.

Ready to start Phase 1?
