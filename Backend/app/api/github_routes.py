from fastapi import APIRouter, Depends

from app.api.deps import get_current_session
from app.models.auth import GitHubTokenSession
from app.models.github import Repository
from app.services.github_service import github_service

router = APIRouter(prefix="/github", tags=["github"])


@router.get("/repos", response_model=list[Repository])
async def list_repositories(session: GitHubTokenSession = Depends(get_current_session)) -> list[Repository]:
    return await github_service.fetch_repositories(session.access_token)


@router.get("/repos/{owner}/{repo}/languages")
async def repo_languages(
    owner: str,
    repo: str,
    session: GitHubTokenSession = Depends(get_current_session),
) -> dict[str, int]:
    return await github_service.fetch_repo_languages(session.access_token, owner, repo)


@router.get("/repos/{owner}/{repo}/activity")
async def repo_activity(
    owner: str,
    repo: str,
    session: GitHubTokenSession = Depends(get_current_session),
) -> list[int]:
    return await github_service.fetch_commit_activity(session.access_token, owner, repo)
