from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status

from app.models.auth import GitHubTokenSession
from app.models.github import Repository


class GitHubService:
    AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    USER_REPOS_URL = "https://api.github.com/user/repos"

    def build_authorize_url(self, client_id: str, callback_url: str, state: str) -> str:
        query = urlencode(
            {
                "client_id": client_id,
                "redirect_uri": callback_url,
                "scope": "repo",
                "state": state,
            }
        )
        return f"{self.AUTHORIZE_URL}?{query}"

    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        callback_url: str,
    ) -> GitHubTokenSession:
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": callback_url,
        }
        headers = {"Accept": "application/json"}

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(self.TOKEN_URL, data=payload, headers=headers)

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub token exchange failed.",
            )

        data = response.json()
        access_token = data.get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub did not return an access token.",
            )

        return GitHubTokenSession(
            access_token=access_token,
            token_type=data.get("token_type", "bearer"),
            scope=data.get("scope"),
        )

    async def fetch_repositories(self, access_token: str) -> list[Repository]:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        params = {"sort": "updated", "per_page": 100}

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(self.USER_REPOS_URL, headers=headers, params=params)

        if response.status_code == 401:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub session expired. Please login again.",
            )
        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to fetch repositories from GitHub.",
            )

        data: list[dict[str, Any]] = response.json()
        return [Repository.model_validate(repo) for repo in data]


github_service = GitHubService()
