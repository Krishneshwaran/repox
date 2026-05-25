from fastapi import Cookie, HTTPException, status

from app.models.auth import GitHubTokenSession
from app.services.token_store import token_store


def get_current_session(repox_session: str | None = Cookie(default=None)) -> GitHubTokenSession:
    if not repox_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    session = token_store.get_session(repox_session)
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session not found.")

    return session
