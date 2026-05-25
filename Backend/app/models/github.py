from pydantic import BaseModel


class Repository(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    description: str | None = None
    language: str | None = None
    stargazers_count: int
    private: bool
