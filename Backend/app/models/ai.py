from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.scanner import ScanResult


class AIBaseRequest(BaseModel):
    repo_name: str = Field(..., examples=["owner/repo"])
    clone_url: str | None = None
    scan_id: str | None = None
    scan_result: ScanResult | None = None
    user_api_key: str | None = None
    user_model: str | None = None
    user_provider: str | None = None


class SummarizeResponse(BaseModel):
    summary: str


class ArchitectureResponse(BaseModel):
    architecture: str


class ReadmeScores(BaseModel):
    readme_score: int
    readability_score: int
    completeness_score: int


class ReadmeAnalysisResponse(BaseModel):
    analysis: str
    scores: ReadmeScores


class InsightResponse(BaseModel):
    insights: str


class AskResponse(BaseModel):
    answer: str


class AskMessage(BaseModel):
    role: str
    content: str


class AskConversationRequest(AIBaseRequest):
    question: str
    history: list[AskMessage] = Field(default_factory=list)
