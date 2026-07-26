import json
import secrets
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

from app.config import get_settings
from app.models.auth import GitHubTokenSession

# Match the cookie max_age set in auth_routes (12 hours)
SESSION_TTL_SECONDS = 60 * 60 * 12


class InMemoryTokenStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        # value: (session, expires_at_unix)
        self._tokens: Dict[str, Tuple[GitHubTokenSession, float]] = {}
        settings = get_settings()
        # Anchor path to the directory containing this file so it's always
        # found regardless of where the server process is launched from.
        configured = Path(settings.session_store_path)
        if not configured.is_absolute():
            configured = Path(__file__).parent.parent.parent / configured.name
        self._store_path = configured
        self._load()

    def _load(self) -> None:
        if not self._store_path.exists():
            return
        try:
            raw = json.loads(self._store_path.read_text(encoding="utf-8"))
            now = time.time()
            loaded: Dict[str, Tuple[GitHubTokenSession, float]] = {}
            for session_id, entry in raw.items():
                expires_at = entry.get("expires_at", 0)
                if expires_at > now:  # skip already-expired sessions
                    loaded[session_id] = (
                        GitHubTokenSession(
                            access_token=entry["access_token"],
                            token_type=entry["token_type"],
                            scope=entry.get("scope"),
                        ),
                        expires_at,
                    )
            self._tokens = loaded
        except Exception:
            self._tokens = {}

    def _save(self) -> None:
        try:
            self._store_path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                sid: {
                    "access_token": token.access_token,
                    "token_type": token.token_type,
                    "scope": token.scope,
                    "expires_at": expires_at,
                }
                for sid, (token, expires_at) in self._tokens.items()
            }
            self._store_path.write_text(json.dumps(payload), encoding="utf-8")
        except Exception:
            pass

    def create_session(self, token: GitHubTokenSession) -> str:
        session_id = secrets.token_urlsafe(32)
        expires_at = time.time() + SESSION_TTL_SECONDS
        with self._lock:
            self._tokens[session_id] = (token, expires_at)
            self._save()
        return session_id

    def get_session(self, session_id: str) -> Optional[GitHubTokenSession]:
        with self._lock:
            entry = self._tokens.get(session_id)
            if entry is None:
                return None
            token, expires_at = entry
            if time.time() > expires_at:
                del self._tokens[session_id]
                self._save()
                return None
            return token

    def delete_session(self, session_id: str) -> None:
        with self._lock:
            if session_id in self._tokens:
                del self._tokens[session_id]
                self._save()


token_store = InMemoryTokenStore()
