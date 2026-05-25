from dataclasses import dataclass
from typing import Optional


@dataclass
class GitHubTokenSession:
    access_token: str
    token_type: str
    scope: Optional[str] = None
