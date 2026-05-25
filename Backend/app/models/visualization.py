from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.scanner import ScanResult


class VisualizationBaseRequest(BaseModel):
    repo_name: str = Field(..., examples=["owner/repo"])
    clone_url: str | None = None
    scan_id: str | None = None
    scan_result: ScanResult | None = None


class VizNode(BaseModel):
    id: str
    label: str
    kind: str
    importance: int = 1
    summary: str = ""
    technologies: list[str] = Field(default_factory=list)


class VizEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""
    kind: str = "relation"
    risk: str = "low"


class GraphResponse(BaseModel):
    nodes: list[VizNode]
    edges: list[VizEdge]
    mermaid: str
    insights: list[str] = Field(default_factory=list)


class TimelineEvent(BaseModel):
    title: str
    date_hint: str
    detail: str
    category: str


class TimelineResponse(BaseModel):
    events: list[TimelineEvent]
    summary: str
