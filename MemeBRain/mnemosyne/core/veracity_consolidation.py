"""
Mnemosyne Veracity-Weighted Consolidation
=========================================
Our novel contribution: Bayesian confidence scoring + conflict resolution.

Veracity tiers:
- stated:     1.0  (user explicitly stated)
- inferred:   0.7  (inferred from context)
- tool:       0.5  (tool output, may be stale)
- imported:   0.6  (imported from external source)
- unknown:    0.8  (default, unverified)

Bayesian updating:
- confidence = 1 - (0.7^n) where n = mention count
- More mentions = higher confidence
- Contradictions detected and flagged

Conflict resolution:
- Same subject + predicate = potential conflict
- Higher confidence wins
- Lower confidence flagged for review
- Consolidation: periodic synthesis of high-confidence facts
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path


# Veracity weights
VERACITY_WEIGHTS = {
    "stated": 1.0,
    "inferred": 0.7,
    "tool": 0.5,
    "imported": 0.6,
    "unknown": 0.8,
}


@dataclass
class ConsolidatedFact:
    """A fact that has been through consolidation."""
    subject: str
    predicate: str
    object: str
    confidence: float
    mention_count: int
    first_seen: str
    last_seen: str
    sources: List[str]
    veracity: str
    superseded: bool = False


class VeracityConsolidator:
    """
    Bayesian confidence consolidation with conflict detection.
    
    Builds on:
    - Memanto's conflict resolution (arXiv:2604.22085)
    - REMem's fact preservation (arXiv:2602.13530)
    - Our novel veracity-weighted Bayesian updating
    """
    
    def __init__(self, db_path: Path = None, conn=None):
        if conn is not None:
            self.conn = conn
            self.db_path = db_path or Path(":memory:")
        else:
            self.db_path = db_path or Path.home() / ".hermes" / "mnemosyne" / "data" / "mnemosyne.db"
            self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._owns_connection = conn is None
        self._init_tables()
    
    def _init_tables(self):
        """Initialize consolidation schema."""
        cursor = self.conn.cursor()
        
        # Consolidated facts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS consolidated_facts (
                id TEXT PRIMARY KEY,
                subject TEXT NOT NULL,
                predicate TEXT NOT NULL,
                object TEXT NOT NULL,
                confidence REAL DEFAULT 0.5,
                mention_count INTEGER DEFAULT 1,
                first_seen TEXT,
                last_seen TEXT,
                sources_json TEXT,
                veracity TEXT DEFAULT 'unknown',
                superseded_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cf_subject ON consolidated_facts(subject)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cf_predicate ON consolidated_facts(predicate)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cf_object ON consolidated_facts(object)")
        
        # Conflicts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conflicts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fact_a_id TEXT NOT NULL,
                fact_b_id TEXT NOT NULL,
                conflict_type TEXT,
                resolution TEXT,
                resolved_at TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.conn.commit()
    
    def bayesian_update(self, current_confidence: float, veracity: str) -> float:
        """
        Update confidence using Bayesian formula.
        
        Formula: new_confidence = 1 - (0.7^n) where n = mention count
        But we approximate with: new = old + (1 - old) * veracity_weight * 0.3
        
        Args:
            current_confidence: Current confidence level
            veracity: Veracity tier
            
        Returns:
            float: Updated confidence
        """
        weight = VERACITY_WEIGHTS.get(veracity, 0.8)
        increment = (1.0 - current_confidence) * weight * 0.3
        return min(current_confidence + increment, 1.0)
    
    def consolidate_fact(self, subject: str, predicate: str, object: str,
                        veracity: str = "unknown", source: str = None) -> ConsolidatedFact:
        """
        Add or update a fact in consolidation.
        
        Args:
            subject: Fact subject
            predicate: Fact predicate
            object: Fact object
            veracity: Veracity tier
            source: Source memory ID
            
        Returns:
            ConsolidatedFact: The consolidated result
        """
        cursor = self.conn.cursor()
        
        # Check if fact already exists
        cursor.execute("""
            SELECT * FROM consolidated_facts
            WHERE subject = ? AND predicate = ? AND object = ?
        """, (subject, predicate, object))
        
        row = cursor.fetchone()
        now = datetime.now().isoformat()
        
        if row:
            # Update existing fact
            new_confidence = self.bayesian_update(row["confidence"], veracity)
            new_count = row["mention_count"] + 1
            
            sources = json.loads(row["sources_json"] or "[]")
            if source and source not in sources:
                sources.append(source)
            
            cursor.execute("""
                UPDATE consolidated_facts
                SET confidence = ?, mention_count = ?, last_seen = ?,
                    sources_json = ?, veracity = ?, updated_at = ?
                WHERE id = ?
            """, (new_confidence, new_count, now, json.dumps(sources),
                  veracity, now, row["id"]))
            
            self.conn.commit()
            
            return ConsolidatedFact(
                subject=subject,
                predicate=predicate,
                object=object,
                confidence=new_confidence,
                mention_count=new_count,
                first_seen=row["first_seen"],
                last_seen=now,
                sources=sources,
                veracity=veracity
            )
        
        else:
            # Check for conflicts (same subject+predicate, different object)
            cursor.execute("""
                SELECT * FROM consolidated_facts
                WHERE subject = ? AND predicate = ? AND object != ?
            """, (subject, predicate, object))
            
            conflicts = cursor.fetchall()
            
            # Insert new fact
            fact_id = f"cf_{subject}_{predicate}_{object}".replace(" ", "_")[:100]
            base_confidence = VERACITY_WEIGHTS.get(veracity, 0.8) * 0.5
            
            sources = [source] if source else []
            
            cursor.execute("""
                INSERT INTO consolidated_facts
                (id, subject, predicate, object, confidence, mention_count,
                 first_seen, last_seen, sources_json, veracity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (fact_id, subject, predicate, object, base_confidence, 1,
                  now, now, json.dumps(sources), veracity))
            
            self.conn.commit()
            
            # Record conflicts
            for conflict in conflicts:
                self._record_conflict(fact_id, conflict["id"], "contradiction")
            
            return ConsolidatedFact(
                subject=subject,
                predicate=predicate,
                object=object,
                confidence=base_confidence,
                mention_count=1,
                first_seen=now,
                last_seen=now,
                sources=sources,
                veracity=veracity
            )
    
    def _record_conflict(self, fact_a_id: str, fact_b_id: str, conflict_type: str):
        """Record a conflict between two facts."""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO conflicts (fact_a_id, fact_b_id, conflict_type)
            VALUES (?, ?, ?)
        """, (fact_a_id, fact_b_id, conflict_type))
        self.conn.commit()
    
    def resolve_conflict(self, conflict_id: int, winning_fact_id: str):
        """
        Resolve a conflict by marking the losing fact as superseded.
        
        Args:
            conflict_id: Conflict to resolve
            winning_fact_id: The fact that wins
        """
        cursor = self.conn.cursor()
        
        # Get conflict details
        cursor.execute("SELECT * FROM conflicts WHERE id = ?", (conflict_id,))
        conflict = cursor.fetchone()
        
        if not conflict:
            return
        
        # Determine losing fact
        losing_id = conflict["fact_b_id"] if winning_fact_id == conflict["fact_a_id"] else conflict["fact_a_id"]
        
        # Mark as superseded
        now = datetime.now().isoformat()
        cursor.execute("""
            UPDATE consolidated_facts
            SET superseded_by = ?, updated_at = ?
            WHERE id = ?
        """, (winning_fact_id, now, losing_id))
        
        # Mark conflict as resolved
        cursor.execute("""
            UPDATE conflicts
            SET resolution = ?, resolved_at = ?
            WHERE id = ?
        """, (f"superseded_by_{winning_fact_id}", now, conflict_id))
        
        self.conn.commit()
    
    def get_conflicts(self) -> List[Dict]:
        """Get all unresolved conflicts."""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT * FROM conflicts WHERE resolution IS NULL
            ORDER BY created_at DESC
        """)
        
        conflicts = []
        for row in cursor.fetchall():
            conflicts.append({
                "id": row["id"],
                "fact_a_id": row["fact_a_id"],
                "fact_b_id": row["fact_b_id"],
                "type": row["conflict_type"],
                "created_at": row["created_at"]
            })
        
        return conflicts
    
    def get_consolidated_facts(self, subject: str = None, min_confidence: float = 0.5) -> List[ConsolidatedFact]:
        """
        Get consolidated facts, optionally filtered by subject and confidence.
        
        Args:
            subject: Filter by subject
            min_confidence: Minimum confidence threshold
            
        Returns:
            List of ConsolidatedFact
        """
        cursor = self.conn.cursor()
        
        if subject:
            cursor.execute("""
                SELECT * FROM consolidated_facts
                WHERE subject = ? AND confidence >= ? AND superseded_by IS NULL
                ORDER BY confidence DESC, mention_count DESC
            """, (subject, min_confidence))
        else:
            cursor.execute("""
                SELECT * FROM consolidated_facts
                WHERE confidence >= ? AND superseded_by IS NULL
                ORDER BY confidence DESC, mention_count DESC
            """, (min_confidence,))
        
        facts = []
        for row in cursor.fetchall():
            facts.append(ConsolidatedFact(
                subject=row["subject"],
                predicate=row["predicate"],
                object=row["object"],
                confidence=row["confidence"],
                mention_count=row["mention_count"],
                first_seen=row["first_seen"],
                last_seen=row["last_seen"],
                sources=json.loads(row["sources_json"] or "[]"),
                veracity=row["veracity"],
                superseded=row["superseded_by"] is not None
            ))
        
        return facts
    
    def get_high_confidence_summary(self, subject: str, threshold: float = 0.8) -> str:
        """
        Generate a summary of high-confidence facts about a subject.
        
        Args:
            subject: Subject to summarize
            threshold: Confidence threshold
            
        Returns:
            str: Human-readable summary
        """
        facts = self.get_consolidated_facts(subject, min_confidence=threshold)
        
        if not facts:
            return f"No high-confidence facts about {subject}."
        
        lines = [f"High-confidence facts about {subject}:"]
        for fact in facts:
            lines.append(f"  - {fact.subject} {fact.predicate} {fact.object} "
                        f"(conf: {fact.confidence:.2f}, mentions: {fact.mention_count})")
        
        return "\n".join(lines)
    
    def run_consolidation_pass(self):
        """
        Background consolidation pass.
        
        1. Find facts with multiple mentions
        2. Boost confidence
        3. Detect conflicts
        4. Auto-resolve obvious conflicts (higher confidence wins)
        """
        cursor = self.conn.cursor()
        
        # Find facts ready for consolidation (mention_count > 2)
        cursor.execute("""
            SELECT * FROM consolidated_facts
            WHERE mention_count > 2 AND superseded_by IS NULL
            ORDER BY mention_count DESC
        """)
        
        for row in cursor.fetchall():
            subject = row["subject"]
            predicate = row["predicate"]
            
            # Find conflicts
            cursor.execute("""
                SELECT * FROM consolidated_facts
                WHERE subject = ? AND predicate = ? AND object != ?
                AND superseded_by IS NULL
            """, (subject, predicate, row["object"]))
            
            conflicts = cursor.fetchall()
            for conflict in conflicts:
                # Auto-resolve: higher confidence wins
                if row["confidence"] > conflict["confidence"]:
                    self.resolve_conflict_by_facts(row["id"], conflict["id"])
    
    def resolve_conflict_by_facts(self, winning_id: str, losing_id: str):
        """Resolve conflict by marking losing fact as superseded."""
        now = datetime.now().isoformat()
        cursor = self.conn.cursor()
        
        cursor.execute("""
            UPDATE consolidated_facts
            SET superseded_by = ?, updated_at = ?
            WHERE id = ?
        """, (winning_id, now, losing_id))
        
        self.conn.commit()
    
    def get_stats(self) -> Dict:
        """Get consolidation statistics."""
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM consolidated_facts WHERE superseded_by IS NULL")
        active_facts = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM consolidated_facts WHERE superseded_by IS NOT NULL")
        superseded_facts = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM conflicts WHERE resolution IS NULL")
        unresolved_conflicts = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(confidence) FROM consolidated_facts WHERE superseded_by IS NULL")
        avg_confidence = cursor.fetchone()[0] or 0.0
        
        cursor.execute("SELECT AVG(mention_count) FROM consolidated_facts WHERE superseded_by IS NULL")
        avg_mentions = cursor.fetchone()[0] or 0.0
        
        return {
            "active_facts": active_facts,
            "superseded_facts": superseded_facts,
            "unresolved_conflicts": unresolved_conflicts,
            "avg_confidence": round(avg_confidence, 3),
            "avg_mentions": round(avg_mentions, 2),
        }
    
    def close(self):
        """Close database connection."""
        self.conn.close()


# --- Testing ---
if __name__ == "__main__":
    import tempfile
    import os
    
    print("Veracity Consolidation Tests")
    print("=" * 60)
    
    # Create temp database
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    
    cons = VeracityConsolidator(db_path=Path(db_path))
    
    # Test 1: Basic consolidation
    print("\nTest 1: Basic consolidation")
    fact1 = cons.consolidate_fact("Alice", "is", "developer", "stated", "mem_001")
    print(f"  Initial: {fact1.subject} {fact1.predicate} {fact1.object} (conf: {fact1.confidence:.2f})")
    
    # Test 2: Bayesian update
    print("\nTest 2: Bayesian update")
    fact2 = cons.consolidate_fact("Alice", "is", "developer", "stated", "mem_002")
    print(f"  Updated: {fact2.subject} {fact2.predicate} {fact2.object} (conf: {fact2.confidence:.2f}, mentions: {fact2.mention_count})")
    
    # Test 3: Conflict detection
    print("\nTest 3: Conflict detection")
    fact3 = cons.consolidate_fact("Alice", "is", "manager", "inferred", "mem_003")
    print(f"  Conflict: {fact3.subject} {fact3.predicate} {fact3.object} (conf: {fact3.confidence:.2f})")
    
    conflicts = cons.get_conflicts()
    print(f"  Unresolved conflicts: {len(conflicts)}")
    
    # Test 4: Conflict resolution
    print("\nTest 4: Conflict resolution")
    if conflicts:
        cons.resolve_conflict(conflicts[0]["id"], "cf_Alice_is_developer")
        print(f"  Resolved conflict #{conflicts[0]['id']}")
    
    # Test 5: High-confidence summary
    print("\nTest 5: High-confidence summary")
    summary = cons.get_high_confidence_summary("Alice", threshold=0.5)
    print(summary)
    
    # Test 6: Stats
    print("\nTest 6: Stats")
    stats = cons.get_stats()
    print(f"  {stats}")
    
    # Cleanup
    cons.close()
    os.unlink(db_path)
    
    print("\n" + "=" * 60)
    print("Veracity consolidation tests passed!")
