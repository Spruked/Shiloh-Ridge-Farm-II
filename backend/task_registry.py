import re
import threading
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from task_status import TaskStatus

_DEDUP_WINDOW = timedelta(minutes=5)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", text.lower())).strip()


class TaskRegistry:
    """In-memory registry for mesh task lifecycle tracking and dedup."""

    def __init__(self) -> None:
        self._tasks: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def create_task(self, query: str, session_id: Optional[str] = None) -> str:
        task_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        with self._lock:
            self._tasks[task_id] = {
                "task_id": task_id,
                "query": query,
                "normalized_query": _normalize(query),
                "session_id": session_id,
                "status": TaskStatus.PENDING,
                "created_at": now,
                "updated_at": now,
            }
        return task_id

    def update_status(self, task_id: str, status: TaskStatus) -> bool:
        with self._lock:
            if task_id not in self._tasks:
                return False
            self._tasks[task_id]["status"] = status
            self._tasks[task_id]["updated_at"] = datetime.now(timezone.utc)
            return True

    def recent_task_exists(self, query: str) -> bool:
        """Return True if a matching normalized query is PENDING or PROCESSING within the dedup window."""
        normalized = _normalize(query)
        cutoff = datetime.now(timezone.utc) - _DEDUP_WINDOW
        with self._lock:
            for task in self._tasks.values():
                if (
                    task["normalized_query"] == normalized
                    and task["status"] in (TaskStatus.PENDING, TaskStatus.PROCESSING)
                    and task["created_at"] >= cutoff
                ):
                    return True
        return False
