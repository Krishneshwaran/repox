from fastapi import APIRouter, Cookie, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse, RedirectResponse

from app.auth.state_store import state_store
from app.config import get_settings
from app.services.github_service import github_service
from app.services.token_store import token_store

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/github/login")
async def github_login() -> RedirectResponse:
    settings = get_settings()
    if not settings.github_client_id or not settings.github_client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth is not configured.",
        )

    state = state_store.create()
    authorize_url = github_service.build_authorize_url(
        client_id=settings.github_client_id,
        callback_url=settings.github_callback_url,
        state=state,
    )
    response = RedirectResponse(url=authorize_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response


@router.get("/github/callback")
async def github_callback(
    code: str = Query(...),
    state: str = Query(...),
    oauth_state: str | None = Cookie(default=None),
) -> Response:
    settings = get_settings()
    if not oauth_state or oauth_state != state or not state_store.consume(state):
        response = RedirectResponse(url=f"{settings.frontend_url}?auth=error&reason=invalid_state")
        response.delete_cookie("oauth_state", path="/")
        return response

    try:
        token = await github_service.exchange_code_for_token(
            code=code,
            client_id=settings.github_client_id,
            client_secret=settings.github_client_secret,
            callback_url=settings.github_callback_url,
        )
    except HTTPException:
        response = RedirectResponse(url=f"{settings.frontend_url}?auth=error&reason=token_exchange")
        response.delete_cookie("oauth_state", path="/")
        return response

    session_id = token_store.create_session(token)
    response = RedirectResponse(url=f"{settings.frontend_url}?auth=success")
    response.delete_cookie("oauth_state", path="/")
    response.set_cookie(
        key="repox_session",
        value=session_id,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=60 * 60 * 12,
        path="/",
    )
    return response


@router.post("/logout")
async def logout(repox_session: str | None = Cookie(default=None)) -> JSONResponse:
    if repox_session:
        token_store.delete_session(repox_session)
    response = JSONResponse(content={"ok": True})
    response.delete_cookie("repox_session", path="/")
    return response
