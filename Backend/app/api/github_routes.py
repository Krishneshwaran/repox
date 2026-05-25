from fastapi import APIRouter, Depends

from app.api.deps import get_current_session
from app.models.auth import GitHubTokenSession
from app.models.github import Repository
from app.services.github_service import github_service

router = APIRouter(prefix="/github", tags=["github"])


@router.get("/repos", response_model=list[Repository])
async def list_repositories(session: GitHubTokenSession = Depends(get_current_session)) -> list[Repository]:
    return await github_service.fetch_repositories(session.access_token)
