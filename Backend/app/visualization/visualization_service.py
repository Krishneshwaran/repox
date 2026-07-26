from __future__ import annotations

from pathlib import Path
from threading import Lock

from fastapi import HTTPException, status

from app.ai.ai_service import AIService
from app.models.scanner import ScanResult
from app.models.visualization import GraphResponse, TimelineEvent, TimelineResponse, VizEdge, VizNode
from app.scanner.repo_cloner import RepoCloner
from app.scanner.service_registry import scanner_service
from app.visualization import viz_ai


class VisualizationCache:
    def __init__(self) -> None:
        self._lock = Lock()
        self._cache: dict[str, object] = {}

    def get(self, key: str) -> object | None:
        with self._lock:
            return self._cache.get(key)

    def set(self, key: str, value: object) -> None:
        with self._lock:
            self._cache[key] = value


class VisualizationService:
    def __init__(self, workspace: Path) -> None:
        self.cache = VisualizationCache()
        self._ai = AIService(workspace)
        self.cloner = RepoCloner(workspace / ".viz_repo_cache")

    def _key(self, op: str, repo: str) -> str:
        return f"viz:v2:{op}:{repo}"

    def _resolve_scan(
        self,
        repo_name: str,
        scan_id: str | None,
        scan_result: ScanResult | None,
        clone_url: str | None,
    ) -> ScanResult:
        if scan_result:
            return scan_result
        if scan_id:
            return scanner_service.get_result(scan_id)
        _, scan = scanner_service.scan(repo_name, clone_url)
        return scan

    def _clone(self, repo_name: str, clone_url: str | None) -> Path:
        effective_url = clone_url or f"https://github.com/{repo_name}.git"
        return self.cloner.clone(effective_url)

    def _to_graph(self, nodes: list[dict], edges: list[dict], insights: list[str]) -> GraphResponse:
        return GraphResponse(
            nodes=[VizNode(**n) for n in nodes],
            edges=[VizEdge(**e) for e in edges],
            mermaid="",
            insights=insights,
        )

    def _run_viz(self, op: str, repo_name: str, clone_url: str | None, generate_fn) -> GraphResponse:
        key = self._key(op, repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, GraphResponse):
            return cached

        repo_dir: Path | None = None
        try:
            repo_dir = self._clone(repo_name, clone_url)
            nodes, edges, insights = generate_fn(repo_dir, repo_name, self._ai._complete)
            graph = self._to_graph(nodes, edges, insights)
            self.cache.set(key, graph)
            return graph
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Visualization failed: {exc}",
            ) from exc
        finally:
            if repo_dir:
                self.cloner.cleanup(repo_dir)

    def _run_timeline(self, repo_name: str, clone_url: str | None) -> TimelineResponse:
        key = self._key("timeline", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, TimelineResponse):
            return cached

        repo_dir: Path | None = None
        try:
            repo_dir = self._clone(repo_name, clone_url)
            events_raw, summary = viz_ai.timeline(repo_dir, repo_name, self._ai._complete)
            result = TimelineResponse(events=[TimelineEvent(**e) for e in events_raw], summary=summary)
            self.cache.set(key, result)
            return result
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Timeline failed: {exc}",
            ) from exc
        finally:
            if repo_dir:
                self.cloner.cleanup(repo_dir)

    # ── Public API ────────────────────────────────────────────

    def architecture(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        return self._run_viz("architecture", repo_name, clone_url, viz_ai.architecture_graph)

    def dependencies(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        return self._run_viz("dependencies", repo_name, clone_url, viz_ai.dependency_graph)

    def api_flow(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        return self._run_viz("api-flow", repo_name, clone_url, viz_ai.api_flow_graph)

    def repository_map(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        return self._run_viz("repository-map", repo_name, clone_url, viz_ai.repository_map)

    def timeline(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> TimelineResponse:
        return self._run_timeline(repo_name, clone_url)


visualization_service = VisualizationService(Path.cwd())
