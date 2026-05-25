from pydantic import BaseModel, Field


class ScannerRequest(BaseModel):
    repo_name: str = Field(..., examples=["owner/repo"])
    clone_url: str | None = None


class ScanResult(BaseModel):
    repo_name: str
    languages: list[str]
    frontend_framework: str
    backend_framework: str
    package_managers: list[str]
    docker: bool
    github_actions: bool
    documentation: dict[str, bool]
    structure: dict[str, bool]
    important_files: list[str]
    dependencies: list[str]


class ScannerRunResponse(BaseModel):
    scan_id: str
    status: str
    result: ScanResult

