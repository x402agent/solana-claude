#!/usr/bin/env python3
"""
BEAM SOTA Benchmark: Mnemosyne vs ICLR 2026 BEAM Dataset
=========================================================
Evaluates Mnemosyne's BEAM architecture against the official BEAM benchmark
(Tavakoli et al., ICLR 2026) across all scales: 100K, 500K, 1M, 10M tokens.

Metrics:
  - Recall@K (K=1,3,5,10)
  - MRR (Mean Reciprocal Rank)
  - NDCG@K
  - Robustness-δ@K (δ=0.1, 0.3, 0.5)
  - Latency (avg, p50, p95, p99)
  - Throughput (queries/sec)

Modes:
  - full: All BEAM tiers active (working + episodic + scratchpad)
  - fts5_only: FTS5 text search only (no vectors)
  - vec_only: Vector search only (no FTS5)
  - keyword_only: Simple keyword fallback (no FTS5, no vectors)
  - no_scratchpad: Ablation - scratchpad disabled
  - no_episodic: Ablation - episodic memory disabled

Run: PYTHONPATH=. python tests/benchmark_beam_sota.py --scales 100K,500K,1M
"""

import argparse
import ast
import gc
import hashlib
import json
import math
import os
import resource
import statistics
import sys
import tempfile
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

# --- Raise file descriptor limit (must happen early) ---
import resource as _resource
try:
    _resource.setrlimit(_resource.RLIMIT_NOFILE, (65536, 65536))
except Exception:
    pass

# Pre-load embedding model before datasets consume file descriptors
print("  Pre-loading embedding model...")
try:
    from mnemosyne.core import embeddings as _emb
    _ = _emb.embed(["warmup"])
    print(f"  Embeddings ready: {_emb.available()}")
except Exception:
    print("  Embeddings not available (will use FTS5 fallback)")

import gc as _gc

# --- Config ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from mnemosyne.core.beam import BeamMemory, init_beam
from mnemosyne.core import embeddings as _embeddings

# Defaults
DEFAULT_SCALES = ["100K"]
DEFAULT_TOP_K = 10
DEFAULT_WARMUP = 3
BENCHMARK_QUERIES_PER_SCALE = 50  # Cap probing questions per scale
WORKING_MEMORY_BATCH = 500
SCRATCHPAD_MAX = 200
EMBEDDING_DIM = 384
VEC_TYPE = os.environ.get("MNEMOSYNE_VEC_TYPE", "int8")

# Robustness thresholds
ROBUSTNESS_DELTAS = [0.1, 0.3, 0.5]

# --- Utility ---

def fmt_ms(val: float) -> str:
    if val < 1:
        return f"{val*1000:.1f} µs"
    elif val < 1000:
        return f"{val:.1f} ms"
    else:
        return f"{val/1000:.1f} s"

def fmt_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024**2):.2f} MB"

def pcnt(val: float) -> str:
    return f"{val * 100:.1f}%"

# --- Data Loading ---

def load_beam_dataset(scales: List[str] = None, max_conversations: int = None):
    """Load BEAM dataset from HuggingFace. Returns dict[scale] -> list[conversation]."""
    try:
        from datasets import load_dataset
    except ImportError:
        print("ERROR: 'datasets' package not installed. Run: pip install datasets")
        sys.exit(1)

    if scales is None:
        scales = ["100K", "500K", "1M"]

    data = {}
    total_loaded = 0

    for scale in scales:
        print(f"  Loading BEAM {scale}...")
        try:
            ds = load_dataset("Mohammadta/BEAM", streaming=True)
            if scale not in ds:
                print(f"    WARNING: split '{scale}' not found. Available: {list(ds.keys())}")
                continue

            conversations = []
            for i, sample in enumerate(ds[scale]):
                if max_conversations and i >= max_conversations:
                    break

                # Parse probing questions
                try:
                    pq_raw = sample.get("probing_questions", "{}")
                    if isinstance(pq_raw, str):
                        probing = ast.literal_eval(pq_raw)
                    else:
                        probing = pq_raw
                except Exception:
                    probing = {}

                # Flatten probing questions into list of {question, ideal_answer, ability}
                flat_questions = []
                for ability, questions in probing.items():
                    if isinstance(questions, list):
                        for q in questions:
                            if isinstance(q, dict):
                                flat_questions.append({
                                    "ability": ability,
                                    "question": q.get("question", ""),
                                    "ideal_answer": q.get("ideal_answer", q.get("ideal_response", "")),
                                })

                # Extract chat messages
                chat_blocks = sample.get("chat", [])
                messages = []
                for block in chat_blocks:
                    if isinstance(block, list):
                        for msg in block:
                            if isinstance(msg, dict):
                                messages.append({
                                    "role": msg.get("role", "unknown"),
                                    "content": msg.get("content", ""),
                                    "time_anchor": msg.get("time_anchor", ""),
                                    "index": msg.get("index", len(messages)),
                                })

                conv_id = sample.get("conversation_id", str(i))
                conversations.append({
                    "id": conv_id,
                    "messages": messages,
                    "questions": flat_questions,
                    "seed": sample.get("conversation_seed", {}),
                    "scale": scale,
                })
                total_loaded += 1

            data[scale] = conversations
            
            # Release dataset handles
            try:
                ds.cleanup_cache_files()
            except Exception:
                pass
            del ds
            _gc.collect()  # Force GC to release file handles
            print(f"    Loaded {len(conversations)} conversations")
        except Exception as e:
            print(f"    ERROR loading {scale}: {e}")
            import traceback
            traceback.print_exc()

    print(f"  Total: {total_loaded} conversations across {len(data)} scales")
    return data


def load_beam_10m(max_conversations: int = None):
    """Load BEAM-10M dataset from HuggingFace. Has special multi-plan structure."""
    try:
        from datasets import load_dataset
    except ImportError:
        print("ERROR: 'datasets' package not installed.")
        return []

    print("  Loading BEAM-10M...")
    try:
        ds = load_dataset("Mohammadta/BEAM-10M", streaming=True)
        conversations = []

        # BEAM-10M has a single split named "10M" or similar
        split_name = "10M" if "10M" in ds else list(ds.keys())[0]
        for i, sample in enumerate(ds[split_name]):
            if max_conversations and i >= max_conversations:
                break

            # BEAM-10M: probing questions are at top level, not inside plans
            probing_raw = sample.get("probing_questions", {})
            if isinstance(probing_raw, str):
                try:
                    probing = ast.literal_eval(probing_raw)
                except Exception:
                    probing = {}
            else:
                probing = probing_raw
            
            all_questions = []
            for ability, questions in probing.items():
                if isinstance(questions, list):
                    for q in questions:
                        if isinstance(q, dict):
                            all_questions.append({
                                "ability": ability,
                                "question": q.get("question", ""),
                                "ideal_answer": q.get("ideal_answer", q.get("ideal_response", "")),
                            })

            # Extract messages from plans
            plans = sample.get("plans", [])
            all_messages = []
            for plan in plans:
                chat_blocks = plan.get("chat", []) if isinstance(plan, dict) else []
                for block in chat_blocks:
                    if isinstance(block, list):
                        for msg in block:
                            if isinstance(msg, dict):
                                all_messages.append({
                                    "role": msg.get("role", "unknown"),
                                    "content": msg.get("content", ""),
                                    "time_anchor": msg.get("time_anchor", ""),
                                    "index": len(all_messages),
                                })

            conv_id = sample.get("conversation_id", str(i))
            conversations.append({
                "id": conv_id,
                "messages": all_messages,
                "questions": all_questions,
                "seed": sample.get("conversation_seed", {}),
                "scale": "10M",
            })

        print(f"    Loaded {len(conversations)} conversations")
        return conversations
    except Exception as e:
        print(f"    ERROR loading 10M: {e}")
        return []


# --- Mnemosyne Ingestion ---

def ingest_conversation(beam: BeamMemory, messages: List[Dict], 
                        use_scratchpad: bool = True,
                        use_episodic: bool = True) -> Dict:
    """Ingest a conversation into Mnemosyne BEAM tiers using batch writes."""
    start_time = time.perf_counter()
    stats = {"wm_count": 0, "ep_count": 0, "sp_count": 0, "total_chars": 0}

    BATCH_SIZE = 500
    
    # Process in batches for efficiency
    for batch_start in range(0, len(messages), BATCH_SIZE):
        batch_msgs = messages[batch_start:batch_start + BATCH_SIZE]
        
        # Build batch items
        batch_items = []
        for i, msg in enumerate(batch_msgs):
            content = msg.get("content", "")
            if not content.strip():
                continue
            batch_items.append({
                "content": content,
                "source": f"beam_{msg.get('role', 'unknown')}",
                "importance": 0.3 + (0.1 * ((batch_start + i) % 5)),
            })
            stats["total_chars"] += len(content)
            
            # Scratchpad every 10 messages
            if use_scratchpad and (batch_start + i) % 10 == 0 and len(content) > 50:
                try:
                    beam.scratchpad_write(f"[t={batch_start + i}] {content[:300]}")
                    stats["sp_count"] += 1
                except Exception:
                    pass
        
        if not batch_items:
            continue
        
        # Batch insert into working memory
        beam.remember_batch(batch_items)
        stats["wm_count"] += len(batch_items)
        
        # Episodic consolidation per batch
        if use_episodic:
            try:
                cursor = beam.conn.cursor()
                # Get oldest working memory items for this batch
                cursor.execute("""
                    SELECT id, content FROM working_memory 
                    WHERE session_id = ? 
                    ORDER BY timestamp ASC 
                    LIMIT ?
                """, (beam.session_id, min(len(batch_items), 500)))
                wm_rows = cursor.fetchall()
                
                if wm_rows:
                    wm_ids = [row["id"] for row in wm_rows]
                    recent_texts = [row["content"][:100] for row in wm_rows[:5]]
                    summary = f"Conversation batch {batch_start // BATCH_SIZE}: " + " | ".join(recent_texts[:3])
                    if len(summary) > 500:
                        summary = summary[:497] + "..."
                    
                    beam.consolidate_to_episodic(
                        summary=summary,
                        source_wm_ids=wm_ids,
                        source="beam_consolidation",
                        importance=0.4,
                        scope="global",
                    )
                    stats["ep_count"] += 1
                    
                    # Remove consolidated items from working memory
                    placeholders = ",".join("?" * len(wm_ids))
                    cursor.execute(f"DELETE FROM working_memory WHERE id IN ({placeholders})", wm_ids)
                    stats["wm_count"] -= len(wm_ids)
                    beam.conn.commit()
            except Exception:
                pass  # Best-effort consolidation

    stats["ingest_time_ms"] = (time.perf_counter() - start_time) * 1000
    return stats


def ingest_for_ablation(beam: BeamMemory, messages: List[Dict], 
                        mode: str) -> Dict:
    """Ingest with specific ablation mode."""
    use_episodic = mode not in ("no_episodic",)
    use_scratchpad = mode not in ("no_scratchpad",)
    return ingest_conversation(beam, messages, use_scratchpad, use_episodic)


# --- Retrieval Evaluation ---

def compute_relevance(retrieved_content: str, ideal_answer: str,
                      use_embeddings: bool = True) -> float:
    """
    Compute relevance score between retrieved content and ideal answer.
    Hybrid: token overlap + containment + embedding cosine similarity.
    
    Token overlap and containment capture exact lexical matches.
    Embedding similarity captures semantic relevance (critical for
    evaluating vector-based retrievers fairly).
    """
    if not retrieved_content or not ideal_answer:
        return 0.0

    # 1. Token overlap (Jaccard-like) — 30% weight
    ret_tokens = set(retrieved_content.lower().split())
    ans_tokens = set(ideal_answer.lower().split())
    if not ans_tokens:
        return 0.0

    jaccard = len(ret_tokens & ans_tokens) / len(ret_tokens | ans_tokens) if ret_tokens | ans_tokens else 0.0

    # 2. Substring containment — 30% weight
    ideal_lower = ideal_answer.lower()
    ret_lower = retrieved_content.lower()
    containment_score = 0.0
    if ideal_lower in ret_lower or ret_lower in ideal_lower:
        containment_score = 1.0
    else:
        ans_words = ideal_lower.split()
        if len(ans_words) >= 3:
            matches = 0
            for i in range(len(ans_words) - 2):
                phrase = " ".join(ans_words[i:i+3])
                if phrase in ret_lower:
                    matches += 1
            containment_score = min(1.0, matches / max(1, len(ans_words) - 2))

    # 3. Embedding cosine similarity — 40% weight
    embed_score = 0.0
    if use_embeddings:
        try:
            from mnemosyne.core import embeddings as _emb_eval
            if _emb_eval.available():
                # Truncate long texts to avoid OOM
                ret_text = retrieved_content[:1000]
                ans_text = ideal_answer[:1000]
                vecs = _emb_eval.embed([ret_text, ans_text])
                if vecs is not None and len(vecs) == 2:
                    a, b = vecs[0], vecs[1]
                    a_norm = a / (np.linalg.norm(a) + 1e-8)
                    b_norm = b / (np.linalg.norm(b) + 1e-8)
                    cosine = float(np.dot(a_norm, b_norm))
                    # Cosine ranges [-1, 1]. Map to [0, 1] via (cos+1)/2, 
                    # but most embeddings cluster positive, so use max(0, cos)
                    embed_score = max(0.0, cosine)
        except Exception:
            pass  # Embedding eval is best-effort

    if embed_score > 0:
        return 0.3 * jaccard + 0.3 * containment_score + 0.4 * embed_score
    else:
        # Fallback: pure lexical (50/50)
        return 0.5 * jaccard + 0.5 * containment_score


def evaluate_retrieval(beam: BeamMemory, questions: List[Dict], top_k: int = 10) -> Dict:
    """Evaluate retrieval quality for a set of probing questions."""
    if not questions:
        return {}

    metrics = {
        "recall": {k: [] for k in [1, 3, 5, 10]},
        "mrr": [],
        "ndcg": {k: [] for k in [1, 3, 5, 10]},
        "latency_ms": [],
        "relevance_scores": [],
    }

    # Limit questions for benchmarking
    questions = questions[:BENCHMARK_QUERIES_PER_SCALE]

    for q in questions:
        query = q["question"]
        ideal = q["ideal_answer"]

        # Time the recall
        t0 = time.perf_counter()
        try:
            results = beam.recall(query, top_k=top_k)
        except Exception as e:
            print(f"    Recall error for '{query[:60]}...': {e}")
            results = []
        latency = (time.perf_counter() - t0) * 1000
        metrics["latency_ms"].append(latency)

        # Compute relevance for each retrieved result
        relevances = []
        for r in results:
            content = r.get("content", "")
            rel = compute_relevance(content, ideal)
            relevances.append(rel)

        if not relevances:
            relevances = [0.0]

        # Binary relevance: is there any relevant result in top-K?
        # Threshold: relevance > 0.15 means "contains useful information"
        RELEVANCE_THRESHOLD = 0.15
        binary_relevance = [1.0 if r >= RELEVANCE_THRESHOLD else 0.0 for r in relevances]

        # Recall@K
        for k in [1, 3, 5, 10]:
            if k <= len(binary_relevance):
                metrics["recall"][k].append(
                    1.0 if sum(binary_relevance[:k]) > 0 else 0.0
                )
            else:
                metrics["recall"][k].append(
                    1.0 if sum(binary_relevance) > 0 else 0.0
                )

        # MRR
        for rank, rel in enumerate(relevances, 1):
            if rel >= RELEVANCE_THRESHOLD:
                metrics["mrr"].append(1.0 / rank)
                break
        else:
            metrics["mrr"].append(0.0)

        # NDCG@K
        for k in [1, 3, 5, 10]:
            dcg = sum(
                (2**rel - 1) / math.log2(i + 2)
                for i, rel in enumerate(relevances[:k])
            )
            # Ideal DCG: all relevant results at top
            ideal_rels = sorted(relevances, reverse=True)[:k]
            idcg = sum(
                (2**rel - 1) / math.log2(i + 2)
                for i, rel in enumerate(ideal_rels)
            )
            ndcg = dcg / idcg if idcg > 0 else 0.0
            metrics["ndcg"][k].append(ndcg)

        metrics["relevance_scores"].append(max(relevances) if relevances else 0.0)

    return metrics


def compute_robustness(recall_values: List[float], delta: float) -> float:
    """Robustness-δ@K: fraction of queries with recall >= delta."""
    if not recall_values:
        return 0.0
    return sum(1.0 for r in recall_values if r >= delta) / len(recall_values)


def aggregate_metrics(metrics: Dict) -> Dict:
    """Compute aggregate statistics from per-query metrics."""
    agg = {}

    # Recall@K
    for k, vals in metrics.get("recall", {}).items():
        if vals:
            agg[f"recall@{k}"] = statistics.mean(vals)
            for delta in ROBUSTNESS_DELTAS:
                agg[f"robustness_{delta}@k{k}"] = compute_robustness(vals, delta)

    # MRR
    mrr_vals = metrics.get("mrr", [])
    agg["mrr"] = statistics.mean(mrr_vals) if mrr_vals else 0.0

    # NDCG@K
    for k, vals in metrics.get("ndcg", {}).items():
        if vals:
            agg[f"ndcg@{k}"] = statistics.mean(vals)

    # Latency
    lat_vals = metrics.get("latency_ms", [])
    if lat_vals:
        sorted_lat = sorted(lat_vals)
        agg["latency_avg_ms"] = statistics.mean(lat_vals)
        agg["latency_p50_ms"] = sorted_lat[int(len(sorted_lat) * 0.50)]
        agg["latency_p95_ms"] = sorted_lat[min(int(len(sorted_lat) * 0.95), len(sorted_lat) - 1)]
        agg["latency_p99_ms"] = sorted_lat[min(int(len(sorted_lat) * 0.99), len(sorted_lat) - 1)]
        agg["latency_min_ms"] = min(lat_vals)
        agg["latency_max_ms"] = max(lat_vals)

    # Throughput
    if lat_vals:
        agg["qps"] = 1000.0 / statistics.mean(lat_vals) if statistics.mean(lat_vals) > 0 else 0

    # Average relevance
    rel_vals = metrics.get("relevance_scores", [])
    agg["avg_relevance"] = statistics.mean(rel_vals) if rel_vals else 0.0

    return agg


# --- Baseline Retrievers ---

class BaselineRetriever:
    """Base class for baseline retrievers that bypass BEAM entirely."""

    def __init__(self, db_path: Path):
        import sqlite3
        self._db_path = db_path
        self.conn = sqlite3.connect(str(db_path))
        self.conn.row_factory = sqlite3.Row

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        raise NotImplementedError

    def close(self):
        self.conn.close()


class KeywordRetriever(BaselineRetriever):
    """Simple keyword matching: no FTS5, no vectors. Searches both working + episodic."""

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        query_words = set(query.lower().split())
        if not query_words:
            return []

        cursor = self.conn.cursor()
        all_rows = []

        # Search episodic memory
        cursor.execute("""
            SELECT id, content, source, timestamp, importance, 'episodic' as tier
            FROM episodic_memory
            ORDER BY timestamp DESC
            LIMIT 50000
        """)
        all_rows.extend(dict(row) for row in cursor.fetchall())

        # Search working memory
        cursor.execute("""
            SELECT id, content, source, timestamp, importance, 'working' as tier
            FROM working_memory
            ORDER BY timestamp DESC
            LIMIT 50000
        """)
        all_rows.extend(dict(row) for row in cursor.fetchall())

        scored = []
        for row in all_rows:
            content = (row.get("content") or "").lower()
            score = sum(1 for w in query_words if w in content)
            if score > 0:
                scored.append((score, row))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored[:top_k]]


class FTS5OnlyRetriever(BaselineRetriever):
    """FTS5 text search only, no vector embedding. Searches both working + episodic FTS5."""

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        cursor = self.conn.cursor()
        results = []

        # Search episodic FTS5
        try:
            cursor.execute("""
                SELECT e.id, e.content, e.source, e.timestamp, e.importance, f.rank, 'episodic' as tier
                FROM fts_episodes f
                JOIN episodic_memory e ON f.rowid = e.rowid
                WHERE fts_episodes MATCH ?
                ORDER BY f.rank
                LIMIT ?
            """, (query, top_k))
            for row in cursor.fetchall():
                d = dict(row)
                d["score"] = 1.0 / (1.0 + row["rank"]) if row["rank"] else 0.5
                results.append(d)
        except Exception:
            pass

        # Search working FTS5
        try:
            cursor.execute("""
                SELECT wm.id, wm.content, wm.source, wm.timestamp, wm.importance, wf.rank, 'working' as tier
                FROM fts_working wf
                JOIN working_memory wm ON wf.id = wm.id
                WHERE fts_working MATCH ?
                ORDER BY wf.rank
                LIMIT ?
            """, (query, top_k))
            for row in cursor.fetchall():
                d = dict(row)
                d["score"] = 1.0 / (1.0 + row["rank"]) if row["rank"] else 0.5
                results.append(d)
        except Exception:
            pass

        if not results:
            return KeywordRetriever(self._db_path).search(query, top_k)

        # Sort by score descending, keep top_k
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return results[:top_k]


class VecOnlyRetriever(BaselineRetriever):
    """Vector-only search (sqlite-vec), no FTS5."""

    def search(self, query: str, top_k: int = 10) -> List[Dict]:
        if not _embeddings.available():
            return KeywordRetriever(self.conn.path).search(query, top_k)

        query_vec = _embeddings.embed([query])
        if query_vec is None:
            return []

        cursor = self.conn.cursor()
        try:
            vec_json = json.dumps(query_vec[0].tolist())
            cursor.execute(f"""
                SELECT e.id, e.content, e.source, e.timestamp, e.importance,
                       vec_distance_L2(?, e.rowid) as distance
                FROM vec_episodes v
                JOIN episodic_memory e ON v.rowid = e.rowid
                ORDER BY distance
                LIMIT ?
            """, (vec_json, top_k))
            rows = cursor.fetchall()
        except Exception:
            # Fallback if vec_episodes doesn't exist or L2 function not available
            return KeywordRetriever(self.conn.path).search(query, top_k)

        max_dist = max((row["distance"] for row in rows), default=1.0)
        results = []
        for row in rows:
            d = dict(row)
            d["score"] = 1.0 - (row["distance"] / max_dist) if max_dist > 0 else 1.0
            results.append(d)
        return results


# --- Benchmark Runner ---

def run_benchmark_scale(scale: str, conversations: List[Dict], 
                        modes: List[str] = None,
                        top_k: int = DEFAULT_TOP_K) -> Dict:
    """Run benchmark for a specific scale across all modes."""
    if modes is None:
        modes = ["full", "fts5_only", "vec_only", "keyword_only", "no_scratchpad", "no_episodic"]

    results = {}
    total_messages = sum(len(c.get("messages", [])) for c in conversations)
    total_questions = sum(len(c.get("questions", [])) for c in conversations)
    print(f"\n{'='*70}")
    print(f"  SCALE: {scale} | Conversations: {len(conversations)} | Messages: {total_messages:,} | Questions: {total_questions}")
    print(f"{'='*70}")

    for mode in modes:
        print(f"\n  --- Mode: {mode} ---")

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / f"bench_{scale}_{mode}.db"
            init_beam(db_path)

            use_episodic = mode not in ("no_episodic",)
            use_scratchpad = mode not in ("no_scratchpad",)
            beam = BeamMemory(session_id=f"beam_{scale}_{mode}", db_path=db_path)

            # --- Ingest ---
            ingest_start = time.perf_counter()
            total_ingest_stats = {"wm_count": 0, "ep_count": 0, "sp_count": 0, "total_chars": 0}
            for conv in conversations:
                stats = ingest_conversation(
                    beam, conv["messages"],
                    use_scratchpad=use_scratchpad,
                    use_episodic=use_episodic,
                )
                for k in total_ingest_stats:
                    if k in stats:
                        total_ingest_stats[k] += stats[k]

            ingest_time = time.perf_counter() - ingest_start

            # DB size - get stats BEFORE closing connection
            db_size = os.path.getsize(db_path)
            wm_stats = beam.get_working_stats()
            ep_stats = beam.get_episodic_stats()

            print(f"    Ingest: {fmt_ms(ingest_time*1000)} | "
                  f"WM: {wm_stats.get('total', 0)} | EP: {ep_stats.get('total', 0)} | "
                  f"SP: {total_ingest_stats['sp_count']} | DB: {fmt_size(db_size)}")

            # --- Retrieval (BEAM native) ---
            if mode in ("full", "no_scratchpad", "no_episodic"):
                all_metrics = {"recall": {k: [] for k in [1, 3, 5, 10]},
                               "mrr": [], "ndcg": {k: [] for k in [1, 3, 5, 10]},
                               "latency_ms": [], "relevance_scores": []}

                for conv in conversations:
                    conv_metrics = evaluate_retrieval(beam, conv["questions"], top_k=top_k)
                    for key in all_metrics:
                        if isinstance(all_metrics[key], dict):
                            for subkey in all_metrics[key]:
                                all_metrics[key][subkey].extend(conv_metrics.get(key, {}).get(subkey, []))
                        else:
                            all_metrics[key].extend(conv_metrics.get(key, []))

                agg = aggregate_metrics(all_metrics)
                agg["ingest_time_ms"] = ingest_time * 1000
                agg["db_size_bytes"] = db_size
                agg["db_size"] = fmt_size(db_size)
                agg["wm_items"] = wm_stats.get("total", 0)
                agg["ep_items"] = ep_stats.get("total", 0)
                agg["ep_vectors"] = ep_stats.get("vectors", 0)
                agg["messages_ingested"] = total_messages
                agg["questions_evaluated"] = min(total_questions, BENCHMARK_QUERIES_PER_SCALE * len(conversations))
                results[mode] = agg

            # --- Baseline retrievers ---
            elif mode in ("fts5_only", "vec_only", "keyword_only"):
                # Close beam connection so retriever can open its own
                try:
                    beam.conn.close()
                except Exception:
                    pass

                retriever_class = {
                    "fts5_only": FTS5OnlyRetriever,
                    "vec_only": VecOnlyRetriever,
                    "keyword_only": KeywordRetriever,
                }[mode]

                retriever = retriever_class(db_path)
                all_metrics = {"recall": {k: [] for k in [1, 3, 5, 10]},
                               "mrr": [], "ndcg": {k: [] for k in [1, 3, 5, 10]},
                               "latency_ms": [], "relevance_scores": []}

                for conv in conversations:
                    for q in conv["questions"][:BENCHMARK_QUERIES_PER_SCALE]:
                        query = q["question"]
                        ideal = q["ideal_answer"]

                        t0 = time.perf_counter()
                        try:
                            results_list = retriever.search(query, top_k=top_k)
                        except Exception as e:
                            results_list = []
                        latency = (time.perf_counter() - t0) * 1000
                        all_metrics["latency_ms"].append(latency)

                        relevances = [compute_relevance(r.get("content", ""), ideal) for r in results_list]
                        if not relevances:
                            relevances = [0.0]

                        RELEVANCE_THRESHOLD = 0.15
                        binary = [1.0 if r >= RELEVANCE_THRESHOLD else 0.0 for r in relevances]

                        for k in [1, 3, 5, 10]:
                            all_metrics["recall"][k].append(1.0 if sum(binary[:k]) > 0 else 0.0)

                        for rank, rel in enumerate(relevances, 1):
                            if rel >= RELEVANCE_THRESHOLD:
                                all_metrics["mrr"].append(1.0 / rank)
                                break
                        else:
                            all_metrics["mrr"].append(0.0)

                        for k in [1, 3, 5, 10]:
                            dcg = sum((2**rel - 1) / math.log2(i + 2) for i, rel in enumerate(relevances[:k]))
                            ideal_rels = sorted(relevances, reverse=True)[:k]
                            idcg = sum((2**rel - 1) / math.log2(i + 2) for i, rel in enumerate(ideal_rels))
                            all_metrics["ndcg"][k].append(dcg / idcg if idcg > 0 else 0.0)

                        all_metrics["relevance_scores"].append(max(relevances))

                agg = aggregate_metrics(all_metrics)
                agg["ingest_time_ms"] = ingest_time * 1000
                agg["db_size_bytes"] = db_size
                agg["db_size"] = fmt_size(db_size)
                agg["messages_ingested"] = total_messages
                results[mode] = agg
                retriever.close()

            beam.conn.close()
            # Release thread-local connection to prevent "Too many open files"
            import gc
            gc.collect()

    return results


# --- Report Generation ---

def print_results(all_results: Dict):
    """Print formatted benchmark results."""
    print(f"\n\n{'='*80}")
    print(f"  MNEMOSYNE BEAM SOTA BENCHMARK RESULTS")
    print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Embedding: BAAI/bge-small-en-v1.5 ({EMBEDDING_DIM}d, {VEC_TYPE})")
    print(f"  Top-K: {DEFAULT_TOP_K}")
    print(f"{'='*80}")

    for scale, modes in sorted(all_results.items()):
        print(f"\n{'─'*80}")
        print(f"  SCALE: {scale}")
        print(f"{'─'*80}")

        # Header
        mode_names = list(modes.keys())
        print(f"  {'Metric':<30}", end="")
        for mode in mode_names:
            print(f" {mode:<18}", end="")
        print()

        # Data rows
        metrics_to_show = [
            "recall@1", "recall@3", "recall@5", "recall@10",
            "mrr", "ndcg@10",
            "robustness_0.3@k10",
            "latency_avg_ms", "latency_p95_ms",
            "qps", "avg_relevance",
            "messages_ingested", "db_size", "wm_items", "ep_items",
        ]

        for metric in metrics_to_show:
            print(f"  {metric:<30}", end="")
            for mode in mode_names:
                data = modes.get(mode, {})
                val = data.get(metric, "-")
                if isinstance(val, float):
                    if "latency" in metric:
                        print(f" {fmt_ms(val):<18}", end="")
                    elif "qps" in metric:
                        print(f" {val:.1f} qps{'':>12}", end="")
                    elif "recall" in metric or "robustness" in metric or "mrr" in metric or "ndcg" in metric:
                        print(f" {pcnt(val):<18}", end="")
                    elif "relevance" in metric:
                        print(f" {val:.4f}{'':>13}", end="")
                    else:
                        print(f" {val:<18.2f}", end="")
                else:
                    print(f" {str(val):<18}", end="")
            print()

    # --- SOTA Comparison Table ---
    print(f"\n\n{'='*80}")
    print(f"  SOTA COMPARISON: Mnemosyne BEAM vs Published Baselines")
    print(f"{'='*80}")
    print(f"  Note: Published numbers from Tavakoli et al., ICLR 2026 (Table 3)")
    print(f"  Mnemosyne uses identical BEAM dataset; metrics are retrieval-only (no LLM generation).")
    print(f"  Published numbers are end-to-end QA accuracy with LLM-as-judge.")
    print(f"  Direct comparison is APPROXIMATE -- retrieval quality correlates with QA accuracy.")
    print(f"")

    # The paper's key finding: LIGHT framework improves 3.5%-12.69% over baselines
    # We want to show Mnemosyne's retrieval quality at each scale
    print(f"  Methodology per ICLR 2026 paper:")
    print(f"    - BEAM dataset: 100 conversations, 2,000 probing questions")
    print(f"    - 10 memory abilities tested")
    print(f"    - LIGHT framework: episodic + working + scratchpad (identical to Mnemosyne BEAM)")
    print(f"    - Key metric: Robustness-δ@K (δ=0.3) for retrieval reliability")
    print(f"")

    # Find best mode per scale
    for scale in sorted(all_results.keys()):
        modes = all_results[scale]
        full = modes.get("full", {})
        if not full:
            continue
        print(f"  Scale {scale}:")
        print(f"    Mnemosyne Recall@10:  {pcnt(full.get('recall@10', 0))}")
        print(f"    Mnemosyne MRR:         {full.get('mrr', 0):.4f}")
        print(f"    Robustness-0.3@10:     {pcnt(full.get('robustness_0.3@k10', 0))}")
        print(f"    Avg Latency:           {fmt_ms(full.get('latency_avg_ms', 0))}")
        print(f"    P95 Latency:           {fmt_ms(full.get('latency_p95_ms', 0))}")
        print(f"    QPS (queries/sec):     {full.get('qps', 0):.1f}")
        print(f"    DB Size:               {full.get('db_size', 'N/A')}")
        print(f"")

    print(f"{'='*80}")
    print(f"  BENCHMARK COMPLETE")
    print(f"{'='*80}")


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="BEAM SOTA Benchmark for Mnemosyne")
    parser.add_argument("--scales", type=str, default="100K,500K,1M",
                        help="Comma-separated scales to benchmark (100K,500K,1M,10M)")
    parser.add_argument("--top-k", type=int, default=DEFAULT_TOP_K,
                        help=f"Top-K for retrieval (default: {DEFAULT_TOP_K})")
    parser.add_argument("--max-conv", type=int, default=None,
                        help="Max conversations per scale (default: all)")
    parser.add_argument("--modes", type=str,
                        default="full,fts5_only,vec_only,keyword_only,no_scratchpad,no_episodic",
                        help="Comma-separated modes to benchmark")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON file for results")
    parser.add_argument("--skip-10m", action="store_true",
                        help="Skip 10M scale (very large)")

    args = parser.parse_args()
    scales = [s.strip() for s in args.scales.split(",")]
    modes = [m.strip() for m in args.modes.split(",")]

    has_10m = "10M" in scales
    if has_10m:
        scales.remove("10M")

    print(f"╔{'═'*78}╗")
    print(f"║  MNEMOSYNE BEAM SOTA BENCHMARK                                                        ║")
    print(f"║  ICLR 2026 BEAM Dataset: Beyond a Million Tokens                                       ║")
    print(f"║  Scales: {', '.join(scales):<67s}║")
    print(f"║  Modes: {', '.join(modes):<68s}║")
    print(f"║  Top-K: {args.top_k:<70d}║")
    print(f"╚{'═'*78}╝")

    # --- Download dataset ---
    print(f"\n📥 Downloading BEAM dataset...")
    data = load_beam_dataset(scales, max_conversations=args.max_conv)
    _gc.collect()  # Ensure all dataset connections are released

    # --- Run benchmarks ---
    all_results = {}
    total_start = time.perf_counter()

    for scale in sorted(data.keys()):
        conversations = data[scale]
        scale_results = run_benchmark_scale(
            scale, conversations,
            modes=modes,
            top_k=args.top_k,
        )
        all_results[scale] = scale_results

    # --- 10M scale (if requested) ---
    if has_10m and not args.skip_10m:
        print(f"\n📥 Loading BEAM-10M dataset...")
        convs_10m = load_beam_10m(max_conversations=args.max_conv)
        if convs_10m:
            scale_results = run_benchmark_scale(
                "10M", convs_10m,
                modes=modes,
                top_k=args.top_k,
            )
            all_results["10M"] = scale_results
        else:
            print("  WARNING: Could not load 10M dataset. Skipping.")

    total_time = time.perf_counter() - total_start
    print(f"\n⏱️  Total benchmark time: {fmt_ms(total_time*1000)}")

    # --- Print results ---
    print_results(all_results)

    # --- Save results ---
    if args.output:
        output_path = Path(args.output)
        # Convert to serializable format
        serializable = {}
        for scale, modes in all_results.items():
            serializable[scale] = {}
            for mode, metrics in modes.items():
                serializable[scale][mode] = {
                    k: (v if not isinstance(v, float) or math.isfinite(v) else 0.0)
                    for k, v in metrics.items()
                }

        serializable["_meta"] = {
            "date": datetime.now().isoformat(),
            "benchmark": "ICLR 2026 BEAM",
            "framework": "Mnemosyne BEAM Architecture",
            "scales": list(all_results.keys()),
            "modes": modes,
            "top_k": args.top_k,
            "total_time_ms": total_time * 1000,
            "embedding_model": "BAAI/bge-small-en-v1.5",
            "embedding_dim": EMBEDDING_DIM,
            "vec_type": VEC_TYPE,
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(serializable, f, indent=2)
        print(f"\n📁 Results saved to: {output_path}")

    return all_results


if __name__ == "__main__":
    main()
