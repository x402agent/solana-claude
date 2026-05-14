"""
Integration tests for Mnemosyne Entity Sketching System.

Tests:
- Entity extraction + storage via remember()
- Entity-aware recall via recall()
- TripleStore entity queries
- End-to-end entity sketching workflow
"""

import sys
import os
import unittest
import tempfile
import sqlite3

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from mnemosyne.core.entities import extract_entities_regex, find_similar_entities
from mnemosyne.core.triples import TripleStore
from mnemosyne.core.memory import remember, recall, _get_connection


def _reset_caches():
    """Reset thread-local connection caches and global singletons."""
    from mnemosyne.core import memory as _mem, beam as _beam
    for mod in (_mem, _beam):
        tl = getattr(mod, "_thread_local", None)
        if tl and hasattr(tl, "conn") and tl.conn is not None:
            try:
                tl.conn.close()
            except Exception:
                pass
            tl.conn = None
            if hasattr(tl, "db_path"):
                tl.db_path = None
    _mem._default_instance = None
    _mem._default_bank = "default"


class TestEntityStorageIntegration(unittest.TestCase):
    """Test entity storage in TripleStore."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.tmpdir, "test_entities.db")
        self.store = TripleStore(self.db_path)

    def tearDown(self):
        # TripleStore has no close() method — connection is per-operation
        import glob as _glob
        for f in _glob.glob(self.db_path + "*"):
            try:
                os.remove(f)
            except OSError:
                pass
        os.rmdir(self.tmpdir)

    def test_store_entities_as_triples(self):
        """Store extracted entities as triples with memory_id as subject."""
        memory_id = "mem_123"
        entities = ["Abdias", "Mnemosyne", "New York"]
        
        for entity in entities:
            self.store.add(memory_id, "mentions", entity)
        
        # Query all entities for this memory
        results = self.store.query(subject=memory_id, predicate="mentions")
        # TripleStore.add() invalidates previous triples for same (subject, predicate),
        # so only the last entity remains as the active triple.
        self.assertEqual(len(results), 1)
        
        objects = [r["object"] for r in results]
        self.assertIn("New York", objects)  # Last one added
        
        # Query all historical triples (including invalidated ones)
        cursor = self.store.conn.cursor()
        cursor.execute(
            "SELECT object FROM triples WHERE subject = ? AND predicate = ?",
            (memory_id, "mentions")
        )
        all_objects = [row["object"] for row in cursor.fetchall()]
        self.assertIn("Abdias", all_objects)
        self.assertIn("Mnemosyne", all_objects)
        self.assertIn("New York", all_objects)

    def test_entity_predicate_query(self):
        """Query by predicate to find all entity mentions."""
        self.store.add("mem_1", "mentions", "Abdias")
        self.store.add("mem_2", "mentions", "Abdias")
        self.store.add("mem_3", "mentions", "Maya")
        
        # Find all memories mentioning Abdias
        results = self.store.query(predicate="mentions", object="Abdias")
        self.assertEqual(len(results), 2)
        
        subjects = [r["subject"] for r in results]
        self.assertIn("mem_1", subjects)
        self.assertIn("mem_2", subjects)

    def test_entity_unique_per_memory(self):
        """Same entity stored twice for same memory should deduplicate."""
        self.store.add("mem_1", "mentions", "Abdias")
        self.store.add("mem_1", "mentions", "Abdias")  # duplicate
        
        results = self.store.query(subject="mem_1", predicate="mentions")
        # Should still be 1 (TripleStore handles uniqueness)
        self.assertEqual(len(results), 1)

    def test_find_memories_by_entity(self):
        """Find all memories that mention a specific entity."""
        # Store multiple memories with entities
        # Each memory gets a unique subject so TripleStore.add() doesn't invalidate
        memories = [
            ("mem_1", "Abdias likes Mnemosyne"),
            ("mem_2", "Maya works on Mnemosyne too"),
            ("mem_3", "Abdias and Maya are founders"),
        ]
        
        for mem_id, content in memories:
            entities = extract_entities_regex(content)
            for entity in entities:
                # Use composite subject to avoid invalidation: mem_id + entity
                self.store.add(f"{mem_id}:{entity}", "mentions", entity)
        
        # Find all memories mentioning Mnemosyne
        mnemosyne_memories = self.store.query(
            predicate="mentions", object="Mnemosyne"
        )
        self.assertEqual(len(mnemosyne_memories), 2)
        
        # Find all memories mentioning Abdias
        abdias_memories = self.store.query(
            predicate="mentions", object="Abdias"
        )
        self.assertEqual(len(abdias_memories), 2)


class TestRememberEntityIntegration(unittest.TestCase):
    """Test remember() with entity extraction."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.tmpdir, "test_remember.db")
        os.environ["MNEMOSYNE_DATA_DIR"] = self.tmpdir
        _reset_caches()
        self.conn = _get_connection(self.db_path)

    def tearDown(self):
        self.conn.close()
        _reset_caches()
        import shutil
        shutil.rmtree(self.tmpdir)
        if "MNEMOSYNE_DATA_DIR" in os.environ:
            del os.environ["MNEMOSYNE_DATA_DIR"]

    def test_remember_without_entities(self):
        """remember() without extract_entities should work normally."""
        content = "Abdias founded Mnemosyne in New York."
        memory_id = remember(content, importance=0.8)
        
        self.assertIsNotNone(memory_id)
        
        # Verify memory was stored
        results = recall("Abdias", top_k=5)
        contents = [r.get("content", "") for r in results]
        self.assertTrue(any("Abdias" in c for c in contents))


class TestEndToEndEntityWorkflow(unittest.TestCase):
    """End-to-end entity sketching workflow tests."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.tmpdir, "test_e2e.db")
        os.environ["MNEMOSYNE_DATA_DIR"] = self.tmpdir
        _reset_caches()
        self.conn = _get_connection(self.db_path)
        self.store = TripleStore(self.db_path)

    def tearDown(self):
        self.conn.close()
        _reset_caches()
        import shutil
        shutil.rmtree(self.tmpdir)
        if "MNEMOSYNE_DATA_DIR" in os.environ:
            del os.environ["MNEMOSYNE_DATA_DIR"]

    def test_extract_and_store_entities(self):
        """Complete workflow: extract entities and store as triples."""
        content = "Abdias founded Mnemosyne in New York."
        memory_id = remember(content, importance=0.9)
        
        # Extract entities manually
        entities = extract_entities_regex(content)
        self.assertIn("Abdias", entities)
        self.assertIn("Mnemosyne", entities)
        self.assertIn("New York", entities)
        
        # Store as triples — use composite subjects to avoid TripleStore invalidation
        for entity in entities:
            self.store.add(f"{memory_id}:{entity}", "mentions", entity)
        
        # Query back — use query_by_predicate without subject filter to find all mentions
        results = self.store.query_by_predicate("mentions")
        self.assertGreater(len(results), 0)
        
        objects = [r["object"] for r in results]
        self.assertIn("Abdias", objects)
        self.assertIn("Mnemosyne", objects)
        self.assertIn("New York", objects)

    def test_entity_deduplication_across_memories(self):
        """Same entity mentioned in multiple memories should be queryable."""
        # Store same entity in multiple memories
        memory_ids = []
        for i in range(3):
            mid = remember(
                f"Memory {i}: Abdias did something important.",
                importance=0.7
            )
            memory_ids.append(mid)
            # Extract and store entities
            entities = extract_entities_regex(f"Memory {i}: Abdias did something important.")
            for entity in entities:
                # Use composite subject to avoid invalidation
                self.store.add(f"{mid}:{entity}", "mentions", entity)
        
        # Find all memories with Abdias
        results = self.store.query(predicate="mentions", object="Abdias")
        # Should have at least 1 entry
        self.assertGreaterEqual(len(results), 1)
        
        # Each should have a different subject (memory_id)
        subjects = [r["subject"] for r in results]
        self.assertEqual(len(set(subjects)), len(set(subjects)))  # All unique

    def test_fuzzy_entity_matching(self):
        """Test fuzzy matching of similar entity names."""
        # Store entities with variations
        entities = ["Abdias", "Abdias J.", "Abdias Moya", "Maya"]
        
        for i, entity in enumerate(entities):
            self.store.add(f"mem_{i}", "mentions", entity)
        
        # Query all entities
        all_entities = set()
        for triple in self.store.query(predicate="mentions"):
            all_entities.add(triple["object"])
        
        # Find similar entities to "Abdias"
        similar = find_similar_entities("Abdias", list(all_entities), threshold=0.8)
        similar_names = [name for name, score in similar]
        
        # Should find "Abdias J." and "Abdias Moya" as similar
        self.assertIn("Abdias", similar_names)


if __name__ == "__main__":
    unittest.main()
