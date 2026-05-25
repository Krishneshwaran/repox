import secrets
import threading
from typing import Dict, Optional

from app.models.auth import GitHubTokenSession


class InMemoryTokenStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tokens: Dict[str, GitHubTokenSession] = {}

    def create_session(self, token: GitHubTokenSession) -> str:
        session_id = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[session_id] = token
        return session_id

    def get_session(self, session_id: str) -> Optional[GitHubTokenSession]:
        with self._lock:
            return self._tokens.get(session_id)


token_store = InMemoryTokenStore()
