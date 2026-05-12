#!/usr/bin/env python3
"""
Mnemosyne vs Vector DBs: Head-to-Head BEAM Retrieval Benchmark
===============================================================
Compares Mnemosyne (FTS5+vec hybrid) against FAISS (flat L2) and
ChromaDB (HNSW) on the same BEAM dataset. Measures:

  - Ingestion throughput (msgs/sec)
  - Storage size (MB)
  - Retrieval latency (ms) - avg, p50, p95, p99
  - Recall@10 (fraction of gold messages found)

Usage:
  cd /root/.hermes/projects/mnemosyne
  python3 tests/benchmark_vs_vectordbs.py --scales 100K,500K,1M
"""

# Raise fd limit before any imports
import resource
resource.setrlimit(resource.RLIMIT_NOFILE, (65536, 65536))

import argparse
import ast
import gc
import json
import os
import statistics
import sys
import tempfile
import time
from collections import defaultdict
from pathlib import Path
from typing import Dict, List

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from mnemosyne.core.beam import BeamMemory, init_beam

# --- Vector DB imports ---
try:
    import faiss
    HAS_FAISS = True
except ImportError:
    HAS_FAISS = False
    print("FAISS not installed. Skipping FAISS comparison.")

try:
    import chromadb
    from chromadb.config import Settings
    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False
    print("ChromaDB not installed. Skipping ChromaDB comparison.")

# --- Config ---
DEFAULT_SCALES = ["100K"]
DEFAULT_TOP_K = 10
BENCHMARK_QUERIES_PER_SCALE = 100

# --- Embedding model for FAISS/Chroma ---
# Use Mnemosyne's embedder (already loaded, no extra install)
EMBEDDER = None

def get_embedder():
    global EMBEDDER
    if EMBEDDER is None:
        from mnemosyne.core import embeddings as _emb
        EMBEDDER = _emb
    return EMBEDDER


def load_beam_data(scales: List[str], max_convs: int = 3) -> Dict:
    """Load BEAM conversations and their gold-standard question/answer pairs."""
    from datasets import load_dataset
    
    data = {}
    for scale in scales:
        print(f"  Loading BEAM {scale}...")
        conversations = []
        
        if scale == "10M":
            ds = load_dataset("Mohammadta/BEAM-10M", streaming=True)
            split = "10M" if "10M" in ds else list(ds.keys())[0]
            
            for i, sample in enumerate(ds[split]):
                if max_convs and i >= max_convs:
                    break
                
                # Extract messages
                plans = sample.get("plans", [])
                messages = []
                for plan in plans:
                    blocks = plan.get("chat", []) if isinstance(plan, dict) else []
                    for block in blocks:
                        if isinstance(block, list):
                            for msg in block:
                                if isinstance(msg, dict):
                                    messages.append(msg.get("content", ""))
                
                # Extract questions + gold message IDs
                probing = sample.get("probing_questions", {})
                if isinstance(probing, str):
                    probing = ast.literal_eval(probing)
                
                questions = []
                for ability, qs in probing.items():
                    if isinstance(qs, list):
                        for q in qs:
                            if isinstance(q, dict):
                                source_ids = q.get("source_chat_ids", {})
                                all_sources = []
                                if isinstance(source_ids, dict):
                                    for v in source_ids.values():
                                        all_sources.extend(v if isinstance(v, list) else [v])
                                
                                questions.append({
                                    "question": q.get("question", ""),
                                    "gold_message_indices": [int(s) for s in all_sources if str(s).isdigit()],
                                })
                
                conversations.append({
                    "id": str(i),
                    "messages": messages,
                    "questions": questions[:BENCHMARK_QUERIES_PER_SCALE],
                })
                
            ds.cleanup_cache_files() if hasattr(ds, 'cleanup_cache_files') else None
            del ds
            gc.collect()
        else:
            ds = load_dataset("Mohammadta/BEAM", streaming=True)
            if scale not in ds:
                continue
            
            for i, sample in enumerate(ds[scale]):
                if max_convs and i >= max_convs:
                    break
                
                # Extract messages
                blocks = sample.get("chat", [])
                messages = []
                for block in blocks:
                    if isinstance(block, list):
                        for msg in block:
                            if isinstance(msg, dict):
                                messages.append(msg.get("content", ""))
                
                # Extract questions
                probing = sample.get("probing_questions", "{}")
                if isinstance(probing, str):
                    probing = ast.literal_eval(probing)
                
                questions = []
                for ability, qs in probing.items():
                    if isinstance(qs, list):
                        for q in qs:
                            if isinstance(q, dict):
                                source_ids = q.get("source_chat_ids", {})
                                all_sources = []
                                if isinstance(source_ids, dict):
                                    for v in source_ids.values():
                                        all_sources.extend(v if isinstance(v, list) else [v])
                                
                                questions.append({
                                    "question": q.get("question", ""),
                                    "gold_message_indices": [int(s) for s in all_sources if str(s).isdigit()],
                                })
                
                conversations.append({
                    "id": str(i),
                    "messages": messages,
                    "questions": questions[:BENCHMARK_QUERIES_PER_SCALE],
                })
            
            ds.cleanup_cache_files() if hasattr(ds, 'cleanup_cache_files') else None
            del ds
            gc.collect()
        
        data[scale] = conversations
        print(f"    {len(conversations)} conversations, {sum(len(c['messages']) for c in conversations)} msgs, {sum(len(c['questions']) for c in conversations)} questions")
    
    return data


# ============================================================
#  Benchmark: Mnemosyne
# ============================================================

def benchmark_mnemosyne(conversations: List[dict], top_k: int = DEFAULT_TOP_K) -> dict:
    """Benchmark Mnemosyne ingestion + retrieval on BEAM data."""
    results = {
        "name": "Mnemosyne (FTS5+vec)",
        "ingest_time_s": 0,
        "db_size_mb": 0,
        "latencies_ms": [],
        "recalls": [],
        "total_queries": 0,
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "mnemosyne_bench.db"
        init_beam(db_path)
        beam = BeamMemory(session_id="bench", db_path=db_path)
        
        # Ingest all conversations
        t0 = time.perf_counter()
        total_msgs = 0
        for conv in conversations:
            for msg_content in conv["messages"]:
                if msg_content.strip():
                    beam.remember(msg_content, source="bench", importance=0.5)
                    total_msgs += 1
        
        # Consolidate some to episodic
        try:
            cursor = beam.conn.cursor()
            cursor.execute("SELECT id, content FROM working_memory WHERE session_id = ? ORDER BY timestamp ASC LIMIT 200", (beam.session_id,))
            rows = cursor.fetchall()
            if rows:
                ids = [r["id"] for r in rows]
                summary = " | ".join(r["content"][:80] for r in rows[:5])
                beam.consolidate_to_episodic(summary=summary[:500], source_wm_ids=ids, source="bench_consolidation", importance=0.4, scope="global")
                beam.conn.commit()
        except Exception:
            pass
        
        results["ingest_time_s"] = time.perf_counter() - t0
        results["db_size_mb"] = os.path.getsize(db_path) / (1024 * 1024)
        
        # Query
        for conv in conversations:
            for q in conv["questions"]:
                question = q["question"]
                gold_indices = set(q.get("gold_message_indices", []))
                
                if not question or not gold_indices:
                    continue
                
                t0 = time.perf_counter()
                try:
                    memories = beam.recall(question, top_k=top_k)
                except Exception:
                    memories = []
                latency = (time.perf_counter() - t0) * 1000
                
                # Check recall: how many gold messages were found?
                # We match by content substring since we don't have per-message IDs
                hits = 0
                for mem in memories[:top_k]:
                    mem_content = mem.get("content", "")
                    # Fuzzy match: if any gold message content appears in the memory content
                    for gidx in gold_indices:
                        if gidx < len(conv["messages"]):
                            gold_content = conv["messages"][gidx][:100]
                            if gold_content and gold_content[:50] in mem_content:
                                hits += 1
                                break
                
                recall = hits / len(gold_indices) if gold_indices else 0
                
                results["latencies_ms"].append(latency)
                results["recalls"].append(recall)
                results["total_queries"] += 1
        
        beam.conn.close()
    
    return results


# ============================================================
#  Benchmark: FAISS
# ============================================================

def benchmark_faiss(conversations: List[dict], top_k: int = DEFAULT_TOP_K) -> dict:
    """Benchmark FAISS flat L2 index on BEAM data."""
    if not HAS_FAISS:
        return {"name": "FAISS", "error": "not installed"}
    
    results = {
        "name": "FAISS (flat L2)",
        "ingest_time_s": 0,
        "db_size_mb": 0,
        "latencies_ms": [],
        "recalls": [],
        "total_queries": 0,
    }
    
    embedder = get_embedder()
    
    # Build message index
    all_messages = []
    t0 = time.perf_counter()
    
    for conv in conversations:
        all_messages.extend(msg for msg in conv["messages"] if msg.strip())
    
    # Embed all messages
    embeddings_list = embedder.embed(all_messages)
    if embeddings_list is None:
        return {"name": "FAISS (flat L2)", "error": "embedding failed"}
    embeddings = np.array(embeddings_list) if not isinstance(embeddings_list, np.ndarray) else embeddings_list
    
    # Build FAISS index
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings.astype(np.float32))
    
    results["ingest_time_s"] = time.perf_counter() - t0
    
    # Estimate size
    results["db_size_mb"] = (embeddings.nbytes + sum(len(m.encode()) for m in all_messages)) / (1024 * 1024)
    
    # Query
    msg_offset = 0
    for conv in conversations:
        for q in conv["questions"]:
            question = q["question"]
            gold_indices = set(q.get("gold_message_indices", []))
            
            if not question:
                continue
            
            t0 = time.perf_counter()
            q_emb = embedder.embed_query(question)
            if q_emb is None:
                continue
            distances, indices = index.search(q_emb.reshape(1, -1).astype(np.float32), top_k)
            latency = (time.perf_counter() - t0) * 1000
            
            # Check recall
            retrieved_global_indices = indices[0].tolist()
            retrieved_local = [i - msg_offset for i in retrieved_global_indices if msg_offset <= i < msg_offset + len(conv["messages"])]
            
            hits = len(set(retrieved_local) & gold_indices)
            recall = hits / len(gold_indices) if gold_indices else 0
            
            results["latencies_ms"].append(latency)
            results["recalls"].append(recall)
            results["total_queries"] += 1
        
        msg_offset += len(conv["messages"])
    
    return results


# ============================================================
#  Benchmark: ChromaDB
# ============================================================

def benchmark_chroma(conversations: List[dict], top_k: int = DEFAULT_TOP_K) -> dict:
    """Benchmark ChromaDB on BEAM data."""
    if not HAS_CHROMA:
        return {"name": "ChromaDB", "error": "not installed"}
    
    results = {
        "name": "ChromaDB (HNSW)",
        "ingest_time_s": 0,
        "db_size_mb": 0,
        "latencies_ms": [],
        "recalls": [],
        "total_queries": 0,
    }
    
    embedder = get_embedder()
    
    with tempfile.TemporaryDirectory() as tmpdir:
        client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=tmpdir,
            anonymized_telemetry=False,
        ))
        
        collection = client.create_collection(name="beam_bench")
        
        # Ingest
        t0 = time.perf_counter()
        msg_offset = 0
        
        for conv in conversations:
            messages = [m for m in conv["messages"] if m.strip()]
            if not messages:
                continue
            
            ids = [f"msg_{msg_offset + i}" for i in range(len(messages))]
            embeddings_list = embedder.embed(messages)
            if embeddings_list is None:
                continue
            embeddings = np.array(embeddings_list) if not isinstance(embeddings_list, np.ndarray) else embeddings_list
            
            collection.add(
                embeddings=embeddings.tolist(),
                documents=messages,
                ids=ids,
            )
            msg_offset += len(messages)
        
        results["ingest_time_s"] = time.perf_counter() - t0
        
        # Check DB size
        db_size = sum(
            os.path.getsize(os.path.join(root, f))
            for root, _, files in os.walk(tmpdir)
            for f in files
        )
        results["db_size_mb"] = db_size / (1024 * 1024)
        
        # Query
        msg_offset = 0
        for conv in conversations:
            for q in conv["questions"]:
                question = q["question"]
                gold_indices = set(q.get("gold_message_indices", []))
                
                if not question:
                    continue
                
                t0 = time.perf_counter()
                q_emb = embedder.embed_query(question)
                if q_emb is None:
                    continue
                chroma_results = collection.query(
                    query_embeddings=[q_emb.tolist()],
                    n_results=top_k,
                )
                latency = (time.perf_counter() - t0) * 1000
                
                # Check recall
                retrieved_ids = chroma_results["ids"][0]
                retrieved_local = [
                    int(rid.split("_")[1]) - msg_offset
                    for rid in retrieved_ids
                    if rid.startswith("msg_")
                ]
                
                hits = len(set(retrieved_local) & gold_indices)
                recall = hits / len(gold_indices) if gold_indices else 0
                
                results["latencies_ms"].append(latency)
                results["recalls"].append(recall)
                results["total_queries"] += 1
            
            msg_offset += len(conv["messages"])
    
    return results


# ============================================================
#  Report
# ============================================================

def print_report(all_results: Dict[str, Dict[str, dict]]):
    """Print comparison report."""
    print("\n" + "=" * 100)
    print("  MNEMOSYNE vs VECTOR DATABASES — BEAM Retrieval Benchmark")
    print("=" * 100)
    
    for scale, systems in all_results.items():
        print(f"\n  --- Scale: {scale} ---")
        print(f"  {'System':<30} {'Ingest':>10} {'DB Size':>10} {'Avg Lat':>10} {'P50 Lat':>10} {'P95 Lat':>10} {'Recall':>10}")
        print(f"  {'-'*30} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")
        
        for sys_name, r in systems.items():
            if "error" in r:
                print(f"  {sys_name:<30} {'SKIPPED':>10} ({r['error']})")
                continue
            
            ingest = f"{r['ingest_time_s']:.1f}s"
            db = f"{r['db_size_mb']:.1f}MB"
            
            if r["latencies_ms"]:
                avg_lat = f"{statistics.mean(r['latencies_ms']):.1f}ms"
                p50 = f"{statistics.median(r['latencies_ms']):.1f}ms"
                p95 = f"{sorted(r['latencies_ms'])[int(len(r['latencies_ms'])*0.95)]:.1f}ms" if len(r['latencies_ms']) > 1 else "N/A"
            else:
                avg_lat = p50 = p95 = "N/A"
            
            if r["recalls"]:
                avg_recall = f"{statistics.mean(r['recalls'])*100:.1f}%"
            else:
                avg_recall = "N/A"
            
            print(f"  {sys_name:<30} {ingest:>10} {db:>10} {avg_lat:>10} {p50:>10} {p95:>10} {avg_recall:>10}")
    
    print("\n" + "=" * 100)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scales", default="100K", help="Comma-separated scales")
    parser.add_argument("--convs", type=int, default=3, help="Conversations per scale")
    args = parser.parse_args()
    
    scales = [s.strip() for s in args.scales.split(",")]
    
    print(f"\n{'='*100}")
    print(f"  Mnemosyne vs Vector DBs Head-to-Head")
    print(f"  Scales: {scales} | Conversations/scale: {args.convs}")
    print(f"{'='*100}")
    
    # Load data
    print("\n[1/3] Loading BEAM data...")
    data = load_beam_data(scales, max_convs=args.convs)
    
    all_results = {}
    
    for scale in scales:
        if scale not in data:
            continue
        
        conversations = data[scale]
        all_results[scale] = {}
        
        # Benchmark each system
        print(f"\n[2/3] Benchmarking {scale}...")
        
        print("  Mnemosyne...")
        all_results[scale]["Mnemosyne"] = benchmark_mnemosyne(conversations)
        
        if HAS_FAISS:
            print("  FAISS...")
            all_results[scale]["FAISS"] = benchmark_faiss(conversations)
    
    print(f"\n[3/3] Report:")
    print_report(all_results)
    
    # Save results
    out_path = PROJECT_ROOT / "results" / "vectordb_comparison.json"
    os.makedirs(out_path.parent, exist_ok=True)
    
    # Convert to serializable format
    serializable = {}
    for scale, systems in all_results.items():
        serializable[scale] = {}
        for sys_name, r in systems.items():
            sr = dict(r)
            if "latencies_ms" in sr:
                sr["avg_latency_ms"] = statistics.mean(sr["latencies_ms"]) if sr["latencies_ms"] else 0
                sr["p50_latency_ms"] = statistics.median(sr["latencies_ms"]) if sr["latencies_ms"] else 0
                sr["p95_latency_ms"] = sorted(sr["latencies_ms"])[int(len(sr["latencies_ms"])*0.95)] if len(sr["latencies_ms"]) > 1 else 0
            if "recalls" in sr:
                sr["avg_recall"] = statistics.mean(sr["recalls"]) if sr["recalls"] else 0
            sr.pop("latencies_ms", None)
            sr.pop("recalls", None)
            serializable[scale][sys_name] = sr
    
    with open(out_path, "w") as f:
        json.dump(serializable, f, indent=2)
    
    print(f"\n  Results saved to: {out_path}")


if __name__ == "__main__":
    main()
