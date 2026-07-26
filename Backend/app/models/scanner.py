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
    readme_analysis: dict[str, object] = Field(default_factory=dict)
    quality: dict[str, object] = Field(default_factory=dict)
    security: dict[str, object] = Field(default_factory=dict)
    api_routes: list[dict[str, str]] = Field(default_factory=list)
    commit_history: dict[str, object] = Field(default_factory=dict)
    data_sources: dict[str, str] = Field(default_factory=dict)


class ScannerRunResponse(BaseModel):
    scan_id: str
    status: str
    result: ScanResult


class ScannerStatsResponse(BaseModel):
    total_scans: int


class ScanHistoryItem(BaseModel):
    scan_id: str
    repo_name: str
    version: int
    frontend_framework: str
    backend_framework: str
    languages: list[str]
    created_at: str
    status: str = "completed"


class ScannerHistoryResponse(BaseModel):
    items: list[ScanHistoryItem]


class ScannerDiffRequest(BaseModel):
    from_scan_id: str
    to_scan_id: str


class ScannerDiffResponse(BaseModel):
    from_scan_id: str
    to_scan_id: str
    repo_name: str
    summary: list[str]
    changed_fields: dict[str, dict[str, object]]
