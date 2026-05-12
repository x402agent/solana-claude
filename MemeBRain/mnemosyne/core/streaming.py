"""
Mnemosyne Streaming Memory + Delta Sync
========================================

Real-time memory event streaming and incremental synchronization
between Mnemosyne instances.

Event-driven architecture:
- Push: callbacks registered on the stream
- Pull: iterate over events as they occur

Delta sync:
- Diff-based: only changed memories since last sync
- Incremental: track sync checkpoints per peer
"""

import json
import hashlib
import threading
from datetime import datetime
from typing import List, Dict, Optional, Any, Callable, Iterator, Union
from dataclasses import dataclass, field, asdict
from enum import Enum, auto
from pathlib import Path


class EventType(Enum):
    MEMORY_ADDED = auto()
    MEMORY_RECALLED = auto()
    MEMORY_INVALIDATED = auto()
    MEMORY_CONSOLIDATED = auto()
    MEMORY_UPDATED = auto()


@dataclass
class MemoryEvent:
    """A memory system event."""
    event_type: EventType
    memory_id: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    session_id: Optional[str] = None
    content: Optional[str] = None
    source: Optional[str] = None
    importance: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    delta: Optional[Dict[str, Any]] = None  # Only changed fields for updates

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["event_type"] = self.event_type.name
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MemoryEvent":
        data["event_type"] = EventType[data["event_type"]]
        return cls(**{k: v for k, v in data.items() if k in [f.name for f in cls.__dataclass_fields__.values()]})


class MemoryStream:
    """
    Real-time event stream for memory operations.

    Supports both push (callbacks) and pull (iterator) patterns.
    Thread-safe. Events are buffered for iterators that connect
    after the event fired.
    """

    def __init__(self, max_buffer: int = 1000):
        self._callbacks: Dict[EventType, List[Callable[[MemoryEvent], None]]] = {
            et: [] for et in EventType
        }
        self._any_callbacks: List[Callable[[MemoryEvent], None]] = []
        self._buffer: List[MemoryEvent] = []
        self._max_buffer = max_buffer
        self._lock = threading.Lock()
        self._iterators: List["_StreamIterator"] = []

    def on(self, event_type: EventType, callback: Callable[[MemoryEvent], None]) -> None:
        """Register a callback for a specific event type."""
        with self._lock:
            self._callbacks[event_type].append(callback)

    def on_any(self, callback: Callable[[MemoryEvent], None]) -> None:
        """Register a callback for all event types."""
        with self._lock:
            self._any_callbacks.append(callback)

    def off(self, event_type: EventType, callback: Callable[[MemoryEvent], None]) -> None:
        """Remove a callback for a specific event type."""
        with self._lock:
            if callback in self._callbacks[event_type]:
                self._callbacks[event_type].remove(callback)

    def off_any(self, callback: Callable[[MemoryEvent], None]) -> None:
        """Remove an any-event callback."""
        with self._lock:
            if callback in self._any_callbacks:
                self._any_callbacks.remove(callback)

    def emit(self, event: MemoryEvent) -> None:
        """Emit an event to all registered callbacks and iterators."""
        with self._lock:
            # Buffer for late-joining iterators
            self._buffer.append(event)
            if len(self._buffer) > self._max_buffer:
                self._buffer = self._buffer[-self._max_buffer:]

            # Notify type-specific callbacks
            callbacks = list(self._callbacks[event.event_type])
            any_callbacks = list(self._any_callbacks)
            iterators = list(self._iterators)

        # Call outside lock to avoid blocking
        for cb in callbacks:
            try:
                cb(event)
            except Exception:
                pass  # Never let a callback break the stream
        for cb in any_callbacks:
            try:
                cb(event)
            except Exception:
                pass
        for it in iterators:
            it._push(event)

    def listen(self, event_types: Optional[List[EventType]] = None) -> Iterator[MemoryEvent]:
        """Return an iterator that yields events as they occur."""
        it = _StreamIterator(self, event_types)
        with self._lock:
            self._iterators.append(it)
        return iter(it)

    def _remove_iterator(self, it: "_StreamIterator") -> None:
        with self._lock:
            if it in self._iterators:
                self._iterators.remove(it)

    def get_buffer(self, event_types: Optional[List[EventType]] = None,
                   since: Optional[str] = None) -> List[MemoryEvent]:
        """Get buffered events, optionally filtered."""
        with self._lock:
            events = list(self._buffer)
        if event_types:
            events = [e for e in events if e.event_type in event_types]
        if since:
            events = [e for e in events if e.timestamp >= since]
        return events

    def clear_buffer(self) -> None:
        """Clear the event buffer."""
        with self._lock:
            self._buffer.clear()


class _StreamIterator:
    """Internal iterator that buffers events from the stream."""

    def __init__(self, stream: MemoryStream, event_types: Optional[List[EventType]] = None):
        self._stream = stream
        self._event_types = event_types
        self._queue: List[MemoryEvent] = []
        self._lock = threading.Lock()
        self._index = 0

    def _push(self, event: MemoryEvent) -> None:
        if self._event_types is None or event.event_type in self._event_types:
            with self._lock:
                self._queue.append(event)

    def __iter__(self):
        return self

    def __next__(self) -> MemoryEvent:
        while True:
            with self._lock:
                if self._index < len(self._queue):
                    event = self._queue[self._index]
                    self._index += 1
                    return event
            # Small sleep to avoid busy-waiting
            import time
            time.sleep(0.01)

    def __del__(self):
        self._stream._remove_iterator(self)


@dataclass
class SyncCheckpoint:
    """Checkpoint for incremental delta sync."""
    peer_id: str
    last_sync_at: str
    last_memory_id: Optional[str] = None
    last_rowid: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict())


class DeltaSync:
    """
    Incremental memory synchronization between two Mnemosyne instances.

    Only transfers memories that have changed since the last sync checkpoint.
    Uses delta encoding: only changed fields, not full objects.
    """

    def __init__(self, mnemosyne_instance, checkpoint_dir: Optional[Path] = None):
        from mnemosyne.core.memory import Mnemosyne
        if not isinstance(mnemosyne_instance, Mnemosyne):
            raise TypeError("DeltaSync requires a Mnemosyne instance")
        self.mnemosyne = mnemosyne_instance
        self.checkpoint_dir = checkpoint_dir or (Path.home() / ".hermes" / "mnemosyne" / "sync")
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self._checkpoints: Dict[str, SyncCheckpoint] = {}
        self._lock = threading.Lock()
        self._load_checkpoints()

    def _checkpoint_path(self, peer_id: str) -> Path:
        return self.checkpoint_dir / f"checkpoint_{peer_id}.json"

    def _load_checkpoints(self) -> None:
        """Load all saved checkpoints."""
        if not self.checkpoint_dir.exists():
            return
        for f in self.checkpoint_dir.glob("checkpoint_*.json"):
            peer_id = f.stem.replace("checkpoint_", "")
            try:
                with open(f, "r") as fh:
                    data = json.load(fh)
                self._checkpoints[peer_id] = SyncCheckpoint(**data)
            except Exception:
                pass

    def _save_checkpoint(self, peer_id: str) -> None:
        """Save checkpoint to disk."""
        cp = self._checkpoints.get(peer_id)
        if cp:
            path = self._checkpoint_path(peer_id)
            with open(path, "w") as f:
                f.write(cp.to_json())

    def get_checkpoint(self, peer_id: str) -> Optional[SyncCheckpoint]:
        """Get the current checkpoint for a peer."""
        with self._lock:
            return self._checkpoints.get(peer_id)

    def set_checkpoint(self, peer_id: str, checkpoint: SyncCheckpoint) -> None:
        """Set and save a checkpoint."""
        with self._lock:
            self._checkpoints[peer_id] = checkpoint
        self._save_checkpoint(peer_id)

    def compute_delta(self, peer_id: str, table: str = "working_memory") -> List[Dict[str, Any]]:
        """
        Compute the delta of changed memories since last sync with peer.

        Returns list of memory dicts with only changed fields if possible,
        or full memory objects for new memories.
        """
        checkpoint = self.get_checkpoint(peer_id)
        conn = self.mnemosyne.conn
        cursor = conn.cursor()

        if checkpoint:
            # Get memories modified since last sync
            cursor.execute(f"""
                SELECT * FROM {table}
                WHERE rowid > ? OR timestamp > ?
                ORDER BY rowid ASC
            """, (checkpoint.last_rowid, checkpoint.last_sync_at))
        else:
            # First sync: send everything
            cursor.execute(f"""
                SELECT * FROM {table}
                ORDER BY rowid ASC
            """)

        rows = cursor.fetchall()
        delta = []
        for row in rows:
            mem = dict(row)
            # Strip internal fields
            mem.pop("embedding", None)
            delta.append(mem)

        return delta

    def apply_delta(self, peer_id: str, delta: List[Dict[str, Any]],
                    table: str = "working_memory") -> Dict[str, int]:
        """
        Apply an incoming delta from a peer.

        Returns stats: {inserted: N, updated: N, skipped: N}
        """
        conn = self.mnemosyne.conn
        cursor = conn.cursor()
        stats = {"inserted": 0, "updated": 0, "skipped": 0}

        for mem in delta:
            mid = mem.get("id")
            if not mid:
                stats["skipped"] += 1
                continue

            # Check if exists
            cursor.execute(f"SELECT 1 FROM {table} WHERE id = ?", (mid,))
            exists = cursor.fetchone() is not None

            if exists:
                # Update changed fields
                updatable = {k: v for k, v in mem.items()
                             if k not in ("id", "rowid", "timestamp", "created_at")
                             and v is not None}
                if updatable:
                    sets = ", ".join(f"{k} = ?" for k in updatable.keys())
                    cursor.execute(
                        f"UPDATE {table} SET {sets} WHERE id = ?",
                        list(updatable.values()) + [mid]
                    )
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            else:
                # Insert new
                cols = [k for k in mem.keys() if k not in ("rowid",)]
                placeholders = ", ".join("?" for _ in cols)
                cursor.execute(
                    f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders})",
                    [mem.get(c) for c in cols]
                )
                stats["inserted"] += 1

        conn.commit()

        # Update checkpoint
        cursor.execute(f"SELECT MAX(rowid) FROM {table}")
        max_rowid = cursor.fetchone()[0] or 0
        self.set_checkpoint(peer_id, SyncCheckpoint(
            peer_id=peer_id,
            last_sync_at=datetime.now().isoformat(),
            last_rowid=max_rowid
        ))

        return stats

    def sync_to(self, peer_id: str, table: str = "working_memory") -> Dict[str, Any]:
        """
        Full sync cycle: compute delta for peer, return it.
        The caller is responsible for sending the delta to the peer.
        """
        delta = self.compute_delta(peer_id, table)
        return {
            "peer_id": peer_id,
            "table": table,
            "delta": delta,
            "count": len(delta),
            "checkpoint": self.get_checkpoint(peer_id).to_dict() if self.get_checkpoint(peer_id) else None
        }

    def sync_from(self, peer_id: str, delta: List[Dict[str, Any]],
                  table: str = "working_memory") -> Dict[str, Any]:
        """
        Full sync cycle: apply delta from peer.
        """
        stats = self.apply_delta(peer_id, delta, table)
        return {
            "peer_id": peer_id,
            "table": table,
            "stats": stats,
            "checkpoint": self.get_checkpoint(peer_id).to_dict() if self.get_checkpoint(peer_id) else None
        }
