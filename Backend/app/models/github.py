from pydantic import BaseModel


class Repository(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    clone_url: str | None = None
    description: str | None = None
    language: str | None = None
    stargazers_count: int
    forks_count: int = 0
    watchers_count: int = 0
    open_issues_count: int = 0
    private: bool
    updated_at: str | None = None
    default_branch: str | None = None
    size: int = 0
    topics: list[str] = []
