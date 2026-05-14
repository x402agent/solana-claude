"""
Comprehensive Mnemosyne BEAM Benchmark
======================================
Run: PYTHONPATH=. python tests/benchmark_beam_comprehensive.py
"""

import time
import tempfile
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

from mnemosyne.core.beam import BeamMemory, init_beam
from mnemosyne.core.memory import Mnemosyne


def benchmark_writes(beam: BeamMemory, n: int = 500):
    print(f"\n📝 Write Benchmark ({n} working memories)")
    t0 = time.time()
    for i in range(n):
        beam.remember(f"Task {i}: evaluate model checkpoint {i * 13}", source="conversation", importance=0.5)
    total_ms = (time.time() - t0) * 1000
    avg_ms = total_ms / n
    print(f"  Total: {total_ms:.1f} ms | Avg: {avg_ms:.3f} ms | Throughput: {n / (total_ms / 1000):.0f} ops/sec")


def benchmark_episodic_insert(beam: BeamMemory, n: int = 500):
    print(f"\n🗄️  Episodic Insert Benchmark ({n} summaries)")
    t0 = time.time()
    for i in range(n):
        beam.consolidate_to_episodic(
            summary=f"Project Alpha milestone {i}: shipped feature {i * 7}",
            source_wm_ids=[f"wm_{i}"],
            importance=0.6
        )
    total_ms = (time.time() - t0) * 1000
    avg_ms = total_ms / n
    print(f"  Total: {total_ms:.1f} ms | Avg: {avg_ms:.3f} ms | Throughput: {n / (total_ms / 1000):.0f} ops/sec")


def benchmark_recall_scaling(beam: BeamMemory):
    print(f"\n🔍 Hybrid Recall Scaling")
    queries = [
        "shipped feature",
        "milestone 250",
        "project alpha",
        "completely unrelated query",
    ]
    for q in queries:
        times = []
        for _ in range(20):
            t0 = time.time()
            results = beam.recall(q, top_k=5)
            times.append((time.time() - t0) * 1000)
        avg = sum(times) / len(times)
        p95 = sorted(times)[int(len(times) * 0.95)]
        print(f"  '{q[:30]:<30}' | {avg:.2f} ms avg | {p95:.2f} ms p95 | {len(results)} results")


def benchmark_sleep(beam: BeamMemory, n_old: int = 300):
    print(f"\n😴 Sleep Benchmark ({n_old} old working memories)")
    conn = sqlite3.connect(beam.db_path)
    old_ts = (datetime.now() - timedelta(hours=20)).isoformat()
    for i in range(n_old):
        conn.execute(
            "INSERT INTO working_memory (id, content, source, timestamp, session_id, importance) VALUES (?, ?, ?, ?, ?, ?)",
            (f"old{i}", f"Old task content number {i}", "conversation", old_ts, beam.session_id, 0.5)
        )
    conn.commit()
    conn.close()

    t0 = time.time()
    result = beam.sleep(dry_run=False)
    total_ms = (time.time() - t0) * 1000
    print(f"  Sleep took: {total_ms:.1f} ms | consolidated: {result.get('items_consolidated', 0)} items | summaries: {result.get('summaries_created', 0)}")


def benchmark_legacy_vs_beam(db_path: Path):
    print(f"\n⚔️  Legacy Flat Scan vs BEAM Hybrid")
    mem = Mnemosyne(session_id="legacy_test", db_path=db_path)

    # Populate legacy memories
    n = 500
    print(f"  Populating {n} legacy memories...")
    for i in range(n):
        mem.remember(f"Legacy memory number {i} about machine learning", source="conversation", importance=0.5)

    # Time legacy flat recall (the old approach: get last 1000, score in Python)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    t0 = time.time()
    rows = conn.execute(
        "SELECT id, content, importance FROM memories WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1000",
        ("legacy_test",)
    ).fetchall()
    query_words = ["machine", "learning"]
    for row in rows:
        content = row["content"].lower()
        exact = sum(1 for w in query_words if w in content)
        score = exact / len(query_words)
    legacy_ms = (time.time() - t0) * 1000

    # Time BEAM recall
    t0 = time.time()
    beam_results = mem.recall("machine learning")
    beam_ms = (time.time() - t0) * 1000

    print(f"  Legacy flat scan ({n} rows):  {legacy_ms:.2f} ms")
    print(f"  BEAM hybrid recall:            {beam_ms:.2f} ms")
    print(f"  Speedup:                       {legacy_ms / max(beam_ms, 0.1):.1f}x")


def benchmark_scratchpad(beam: BeamMemory):
    print(f"\n📝 Scratchpad Benchmark")
    t0 = time.time()
    for i in range(100):
        beam.scratchpad_write(f"Scratch note {i}: compute loss function")
    write_ms = (time.time() - t0) * 1000
    avg_write = write_ms / 100

    t0 = time.time()
    entries = beam.scratchpad_read()
    read_ms = (time.time() - t0) * 1000

    print(f"  Avg write: {avg_write:.3f} ms | Read {len(entries)} entries: {read_ms:.2f} ms")


def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "bench.db"
        print("=" * 60)
        print("Mnemosyne BEAM Comprehensive Benchmark")
        print("=" * 60)

        beam = BeamMemory(session_id="bench", db_path=db_path)

        benchmark_writes(beam, n=500)
        benchmark_episodic_insert(beam, n=500)
        benchmark_recall_scaling(beam)
        benchmark_sleep(beam, n_old=300)
        benchmark_scratchpad(beam)
        benchmark_legacy_vs_beam(db_path)

        stats = beam.get_working_stats()
        ep_stats = beam.get_episodic_stats()
        print(f"\n📊 Final State")
        print(f"  Working memory:  {stats['total']} items")
        print(f"  Episodic memory: {ep_stats['total']} items | vectors: {ep_stats['vectors']}")
        print("=" * 60)


if __name__ == "__main__":
    main()
