from __future__ import annotations

from pathlib import Path
from threading import Lock

from app.models.scanner import ScanResult
from app.models.visualization import GraphResponse, TimelineEvent, TimelineResponse, VizEdge, VizNode
from app.scanner.service_registry import scanner_service
from app.visualization.api_flow_mapper import ApiFlowMapper
from app.visualization.architecture_mapper import ArchitectureMapper
from app.visualization.dependency_mapper import DependencyMapper
from app.visualization.diagram_generator import DiagramGenerator
from app.visualization.graph_builder import GraphBuilder
from app.visualization.node_generator import NodeGenerator
from app.visualization.timeline_analyzer import TimelineAnalyzer


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
    def __init__(self, _workspace: Path) -> None:
        self.cache = VisualizationCache()
        self.node_generator = NodeGenerator()
        self.graph_builder = GraphBuilder()
        self.dependency_mapper = DependencyMapper()
        self.architecture_mapper = ArchitectureMapper()
        self.api_flow_mapper = ApiFlowMapper()
        self.timeline_analyzer = TimelineAnalyzer()
        self.diagram_generator = DiagramGenerator()

    def _key(self, op: str, repo: str) -> str:
        return f"viz:{op}:{repo}"

    def _resolve_scan(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> ScanResult:
        if scan_result:
            return scan_result
        if scan_id:
            return scanner_service.get_result(scan_id)
        _, scan = scanner_service.scan(repo_name, clone_url)
        return scan

    def _to_graph(self, nodes: list[dict[str, object]], edges: list[dict[str, str]], insights: list[str], mermaid: str) -> GraphResponse:
        return GraphResponse(
            nodes=[VizNode(**n) for n in nodes],
            edges=[VizEdge(**e) for e in edges],
            mermaid=mermaid,
            insights=insights,
        )

    def architecture(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        key = self._key("architecture", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, GraphResponse):
            return cached

        scan = self._resolve_scan(repo_name, scan_id, scan_result, clone_url)
        nodes = self.node_generator.core_nodes(scan)
        edges = self.graph_builder.build_architecture_edges(scan)
        mermaid = self.diagram_generator.architecture_mermaid(scan.repo_name, scan.frontend_framework, scan.backend_framework, scan.docker, scan.github_actions)
        insights = [
            "Interactive architecture model built from scanner intelligence.",
            "Heaviest coupling likely between API and backend service layers.",
            "Use node inspection to identify module ownership and dependency surface.",
        ]
        graph = self._to_graph(nodes, edges, insights, mermaid)
        self.cache.set(key, graph)
        return graph

    def dependencies(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        key = self._key("dependencies", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, GraphResponse):
            return cached

        scan = self._resolve_scan(repo_name, scan_id, scan_result, clone_url)
        nodes, edges, insights = self.dependency_mapper.map_dependencies(scan)
        mermaid = self.graph_builder.mermaid_from_graph(nodes, edges)
        graph = self._to_graph(nodes, edges, insights, mermaid)
        self.cache.set(key, graph)
        return graph

    def api_flow(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        key = self._key("api-flow", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, GraphResponse):
            return cached

        scan = self._resolve_scan(repo_name, scan_id, scan_result, clone_url)
        nodes, edges, insights = self.api_flow_mapper.map_flow(scan)
        mermaid = self.graph_builder.mermaid_from_graph(nodes, edges)
        graph = self._to_graph(nodes, edges, insights, mermaid)
        self.cache.set(key, graph)
        return graph

    def repository_map(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> GraphResponse:
        key = self._key("repository-map", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, GraphResponse):
            return cached

        scan = self._resolve_scan(repo_name, scan_id, scan_result, clone_url)
        nodes, edges, insights = self.architecture_mapper.repository_map(scan)
        mermaid = self.graph_builder.mermaid_from_graph(nodes, edges)
        graph = self._to_graph(nodes, edges, insights, mermaid)
        self.cache.set(key, graph)
        return graph

    def timeline(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> TimelineResponse:
        key = self._key("timeline", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, TimelineResponse):
            return cached

        scan = self._resolve_scan(repo_name, scan_id, scan_result, clone_url)
        events_raw, summary = self.timeline_analyzer.build_timeline(scan)
        timeline = TimelineResponse(events=[TimelineEvent(**e) for e in events_raw], summary=summary)
        self.cache.set(key, timeline)
        return timeline


visualization_service = VisualizationService(Path.cwd())
