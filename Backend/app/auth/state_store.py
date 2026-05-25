import secrets
import threading
from typing import Set


class StateStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._states: Set[str] = set()

    def create(self) -> str:
        state = secrets.token_urlsafe(24)
        with self._lock:
            self._states.add(state)
        return state

    def consume(self, state: str) -> bool:
        with self._lock:
            if state not in self._states:
                return False
            self._states.remove(state)
            return True


state_store = StateStore()
