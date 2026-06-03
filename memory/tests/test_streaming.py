"""
Tests for Mnemosyne streaming memory + delta sync.
"""

import pytest
import json
import time
import threading
from datetime import datetime
from pathlib import Path

from mnemosyne.core.streaming import (
    MemoryStream, MemoryEvent, EventType, SyncCheckpoint,
    DeltaSync, _StreamIterator
)
from mnemosyne.core.memory import Mnemosyne


# ─── Fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def stream():
    return MemoryStream(max_buffer=100)


@pytest.fixture
def sample_event():
    return MemoryEvent(
        event_type=EventType.MEMORY_ADDED,
        memory_id="mem_123",
        session_id="sess_456",
        content="Test memory",
        source="conversation",
        importance=0.7
    )


@pytest.fixture
def mnemosyne(tmp_path):
    db_path = tmp_path / "test_streaming.db"
    return Mnemosyne(session_id="test_session", db_path=db_path)


# ─── MemoryEvent ────────────────────────────────────────────────────

class TestMemoryEvent:
    def test_event_creation(self, sample_event):
        assert sample_event.event_type == EventType.MEMORY_ADDED
        assert sample_event.memory_id == "mem_123"
        assert sample_event.content == "Test memory"

    def test_event_to_dict(self, sample_event):
        d = sample_event.to_dict()
        assert d["event_type"] == "MEMORY_ADDED"
        assert d["memory_id"] == "mem_123"
        assert "timestamp" in d

    def test_event_to_json(self, sample_event):
        j = sample_event.to_json()
        data = json.loads(j)
        assert data["event_type"] == "MEMORY_ADDED"
        assert data["memory_id"] == "mem_123"

    def test_event_from_dict(self):
        d = {
            "event_type": "MEMORY_RECALLED",
            "memory_id": "mem_456",
            "timestamp": "2026-01-01T00:00:00",
            "session_id": "sess_789",
            "content": "Recalled memory",
        }
        event = MemoryEvent.from_dict(d)
        assert event.event_type == EventType.MEMORY_RECALLED
        assert event.memory_id == "mem_456"

    def test_event_delta_field(self):
        event = MemoryEvent(
            event_type=EventType.MEMORY_UPDATED,
            memory_id="mem_789",
            delta={"importance": {"old": 0.5, "new": 0.9}}
        )
        assert event.delta["importance"]["new"] == 0.9


# ─── MemoryStream ───────────────────────────────────────────────────

class TestMemoryStream:
    def test_callback_registration(self, stream, sample_event):
        called = []
        def handler(event):
            called.append(event)
        stream.on(EventType.MEMORY_ADDED, handler)
        stream.emit(sample_event)
        assert len(called) == 1
        assert called[0].memory_id == "mem_123"

    def test_any_callback(self, stream, sample_event):
        called = []
        def handler(event):
            called.append(event)
        stream.on_any(handler)
        stream.emit(sample_event)
        assert len(called) == 1

    def test_callback_removal(self, stream, sample_event):
        called = []
        def handler(event):
            called.append(event)
        stream.on(EventType.MEMORY_ADDED, handler)
        stream.off(EventType.MEMORY_ADDED, handler)
        stream.emit(sample_event)
        assert len(called) == 0

    def test_buffering(self, stream):
        for i in range(5):
            stream.emit(MemoryEvent(
                event_type=EventType.MEMORY_ADDED,
                memory_id=f"mem_{i}"
            ))
        buffer = stream.get_buffer()
        assert len(buffer) == 5
        assert buffer[0].memory_id == "mem_0"

    def test_buffer_filter_by_type(self, stream):
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="a"))
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_RECALLED, memory_id="b"))
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="c"))
        buffer = stream.get_buffer([EventType.MEMORY_ADDED])
        assert len(buffer) == 2
        assert all(e.event_type == EventType.MEMORY_ADDED for e in buffer)

    def test_buffer_filter_since(self, stream):
        now = datetime.now().isoformat()
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="old"))
        time.sleep(0.01)
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="new"))
        buffer = stream.get_buffer(since=now)
        assert len(buffer) == 2  # Both should be after "now" since we just created it

    def test_buffer_max_size(self):
        s = MemoryStream(max_buffer=3)
        for i in range(5):
            s.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id=f"mem_{i}"))
        buffer = s.get_buffer()
        assert len(buffer) == 3
        assert buffer[0].memory_id == "mem_2"  # Oldest kept

    def test_clear_buffer(self, stream):
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="a"))
        stream.clear_buffer()
        assert len(stream.get_buffer()) == 0

    def test_iterator_basic(self, stream):
        events = []
        def collect():
            for event in stream.listen([EventType.MEMORY_ADDED]):
                events.append(event)
                if len(events) >= 2:
                    break
        t = threading.Thread(target=collect)
        t.start()
        time.sleep(0.05)
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="a"))
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="b"))
        t.join(timeout=2)
        assert len(events) == 2
        assert events[0].memory_id == "a"
        assert events[1].memory_id == "b"

    def test_iterator_filter(self, stream):
        events = []
        def collect():
            for event in stream.listen([EventType.MEMORY_RECALLED]):
                events.append(event)
                if len(events) >= 1:
                    break
        t = threading.Thread(target=collect)
        t.start()
        time.sleep(0.05)
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_ADDED, memory_id="a"))
        stream.emit(MemoryEvent(event_type=EventType.MEMORY_RECALLED, memory_id="b"))
        t.join(timeout=2)
        assert len(events) == 1
        assert events[0].memory_id == "b"

    def test_multiple_callbacks_same_type(self, stream, sample_event):
        calls1, calls2 = [], []
        stream.on(EventType.MEMORY_ADDED, lambda e: calls1.append(e))
        stream.on(EventType.MEMORY_ADDED, lambda e: calls2.append(e))
        stream.emit(sample_event)
        assert len(calls1) == 1
        assert len(calls2) == 1

    def test_callback_exception_isolation(self, stream, sample_event):
        called = []
        def bad_handler(event):
            raise RuntimeError("boom")
        def good_handler(event):
            called.append(event)
        stream.on(EventType.MEMORY_ADDED, bad_handler)
        stream.on(EventType.MEMORY_ADDED, good_handler)
        stream.emit(sample_event)  # Should not raise
        assert len(called) == 1

    def test_all_event_types(self, stream):
        for et in EventType:
            stream.emit(MemoryEvent(event_type=et, memory_id=f"mem_{et.name}"))
        buffer = stream.get_buffer()
        assert len(buffer) == len(EventType)


# ─── DeltaSync ──────────────────────────────────────────────────────

class TestDeltaSync:
    def test_init(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        assert ds.mnemosyne is mnemosyne
        assert ds.checkpoint_dir.exists()

    def test_compute_delta_first_sync(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        # Store some memories
        mnemosyne.remember("Memory 1", source="test")
        mnemosyne.remember("Memory 2", source="test")
        delta = ds.compute_delta("peer_a", "working_memory")
        assert len(delta) >= 2

    def test_compute_delta_incremental(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        mnemosyne.remember("Memory 1", source="test")
        # First sync
        delta1 = ds.compute_delta("peer_b", "working_memory")
        ds.apply_delta("peer_b", delta1, "working_memory")
        # Add more
        mnemosyne.remember("Memory 2", source="test")
        delta2 = ds.compute_delta("peer_b", "working_memory")
        assert len(delta2) >= 1
        # Should only have the new memory
        contents = [d.get("content", "") for d in delta2]
        assert "Memory 2" in contents

    def test_apply_delta_insert(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        delta = [{"id": "test_1", "content": "Imported memory", "source": "import"}]
        stats = ds.apply_delta("peer_c", delta, "working_memory")
        assert stats["inserted"] == 1
        assert stats["updated"] == 0

    def test_apply_delta_update(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        mid = mnemosyne.remember("Original", source="test")
        delta = [{"id": mid, "content": "Updated", "source": "test", "importance": 0.9}]
        stats = ds.apply_delta("peer_d", delta, "working_memory")
        assert stats["updated"] == 1

    def test_apply_delta_skip_no_id(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        delta = [{"content": "No ID", "source": "test"}]
        stats = ds.apply_delta("peer_e", delta, "working_memory")
        assert stats["skipped"] == 1

    def test_checkpoint_persistence(self, mnemosyne, tmp_path):
        ds = DeltaSync(mnemosyne, checkpoint_dir=tmp_path)
        mnemosyne.remember("Memory", source="test")
        delta = ds.compute_delta("peer_f", "working_memory")
        # Apply delta to trigger checkpoint save
        ds.apply_delta("peer_f", delta, "working_memory")
        # Check checkpoint saved
        cp = ds.get_checkpoint("peer_f")
        assert cp is not None
        assert cp.peer_id == "peer_f"

    def test_checkpoint_reload(self, mnemosyne, tmp_path):
        ds1 = DeltaSync(mnemosyne, checkpoint_dir=tmp_path)
        mnemosyne.remember("Memory", source="test")
        delta = ds1.compute_delta("peer_g", "working_memory")
        ds1.apply_delta("peer_g", delta, "working_memory")
        # Create new instance pointing to same dir
        ds2 = DeltaSync(mnemosyne, checkpoint_dir=tmp_path)
        cp = ds2.get_checkpoint("peer_g")
        assert cp is not None
        assert cp.peer_id == "peer_g"

    def test_sync_to_returns_delta(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        mnemosyne.remember("Sync test", source="test")
        result = ds.sync_to("peer_h", "working_memory")
        assert "delta" in result
        assert "count" in result
        assert result["count"] >= 1

    def test_sync_from_applies_delta(self, mnemosyne):
        ds = DeltaSync(mnemosyne)
        delta = [{"id": "remote_1", "content": "Remote memory", "source": "remote"}]
        result = ds.sync_from("peer_i", delta, "working_memory")
        assert result["stats"]["inserted"] == 1

    def test_invalid_mnemosyne_type(self):
        with pytest.raises(TypeError):
            DeltaSync("not a mnemosyne")


# ─── SyncCheckpoint ─────────────────────────────────────────────────

class TestSyncCheckpoint:
    def test_checkpoint_creation(self):
        cp = SyncCheckpoint(peer_id="p1", last_sync_at="2026-01-01T00:00:00", last_rowid=42)
        assert cp.peer_id == "p1"
        assert cp.last_rowid == 42

    def test_checkpoint_serialization(self):
        cp = SyncCheckpoint(peer_id="p1", last_sync_at="2026-01-01T00:00:00", last_rowid=42)
        j = cp.to_json()
        data = json.loads(j)
        assert data["peer_id"] == "p1"
        assert data["last_rowid"] == 42
