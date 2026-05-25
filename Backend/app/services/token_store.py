import json
import secrets
import threading
from pathlib import Path
from typing import Dict, Optional

from app.config import get_settings
from app.models.auth import GitHubTokenSession


class InMemoryTokenStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._tokens: Dict[str, GitHubTokenSession] = {}
        settings = get_settings()
        self._store_path = Path(settings.session_store_path)
        self._load()

    def _load(self) -> None:
        if not self._store_path.exists():
            return
        try:
            raw = json.loads(self._store_path.read_text(encoding="utf-8"))
            loaded: Dict[str, GitHubTokenSession] = {}
            for session_id, token_dict in raw.items():
                loaded[session_id] = GitHubTokenSession(**token_dict)
            self._tokens = loaded
        except Exception:
            self._tokens = {}

    def _save(self) -> None:
        try:
            payload = {
                sid: {
                    "access_token": token.access_token,
                    "token_type": token.token_type,
                    "scope": token.scope,
                }
                for sid, token in self._tokens.items()
            }
            self._store_path.write_text(json.dumps(payload), encoding="utf-8")
        except Exception:
            pass

    def create_session(self, token: GitHubTokenSession) -> str:
        session_id = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[session_id] = token
            self._save()
        return session_id

    def get_session(self, session_id: str) -> Optional[GitHubTokenSession]:
        with self._lock:
            return self._tokens.get(session_id)

    def delete_session(self, session_id: str) -> None:
        with self._lock:
            if session_id in self._tokens:
                del self._tokens[session_id]
                self._save()


token_store = InMemoryTokenStore()
