"""
BEAM Scale Benchmark — demonstrates recall stays flat as corpus grows.
Run: PYTHONPATH=. python tests/benchmark_beam_scale.py
"""

import time
import tempfile
from pathlib import Path

from mnemosyne.core.beam import BeamMemory


def benchmark():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "scale.db"
        beam = BeamMemory(session_id="scale", db_path=db_path)

        sizes = [100, 500, 1000, 2000]
        print("🔍 BEAM Recall Latency vs Corpus Size")
        print("-" * 50)

        cumulative = 0
        for size in sizes:
            # Insert batch
            print(f"Inserting batch to reach {size} episodic memories...")
            t0 = time.time()
            batch = size - cumulative
            for i in range(batch):
                beam.consolidate_to_episodic(
                    summary=f"Scale test item {cumulative + i}: concept {i % 100} in domain {(cumulative + i) % 10}",
                    source_wm_ids=[f"s{cumulative + i}"],
                    importance=0.5
                )
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
                print(f"  Corpus={size:4d} | Query='{q[:20]:<20}' | {avg:.2f}ms avg | {p95:.2f}ms p95")

        ep_stats = beam.get_episodic_stats()
        print(f"\n📊 Final episodic memory: {ep_stats['total']} items | vectors: {ep_stats['vectors']}")


if __name__ == "__main__":
    benchmark()
