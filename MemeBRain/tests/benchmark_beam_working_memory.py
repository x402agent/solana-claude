"""
BEAM Working Memory Scale Benchmark — demonstrates working_memory recall
stays fast as working_memory grows, thanks to FTS5 fast path.
Run: PYTHONPATH=. python tests/benchmark_beam_working_memory.py
"""

import time
import tempfile
from pathlib import Path

from mnemosyne.core.beam import BeamMemory


def benchmark():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "wm_scale.db"
        beam = BeamMemory(session_id="wm_scale", db_path=db_path)

        sizes = [100, 1000, 5000, 10000]
        print("🔍 BEAM Working Memory Recall Latency vs Corpus Size")
        print("-" * 55)

        cumulative = 0
        for size in sizes:
            print(f"Inserting batch to reach {size} working memories...")
            t0 = time.time()
            batch = size - cumulative
            items = [
                {
                    "content": f"Working memory item {cumulative + i}: concept {i % 100} in domain {(cumulative + i) % 10}",
                    "source": "conversation",
                    "importance": 0.5
                }
                for i in range(batch)
            ]
            beam.remember_batch(items)
            insert_sec = time.time() - t0
            cumulative = size
            print(f"  Batch insert ({batch} items): {insert_sec:.1f}s")

            # Benchmark recall
            queries = ["concept 42", "domain 7", "nonexistent xyz"]
            for q in queries:
                times = []
                for _ in range(10):
                    t0 = time.time()
                    results = beam.recall(q, top_k=5)
                    times.append((time.time() - t0) * 1000)
                avg = sum(times) / len(times)
                p95 = sorted(times)[int(len(times) * 0.95)]
                print(f"  WM={size:5d} | Query='{q[:20]:<20}' | {avg:.2f}ms avg | {p95:.2f}ms p95")

        wm_stats = beam.get_working_stats()
        ep_stats = beam.get_episodic_stats()
        print(f"\n📊 Final working memory: {wm_stats['total']} items")
        print(f"📊 Final episodic memory: {ep_stats['total']} items | vectors: {ep_stats['vectors']} | vec_type: {ep_stats.get('vec_type', 'none')}")


if __name__ == "__main__":
    benchmark()
