from __future__ import annotations

from app.models.scanner import ScanResult


class GraphBuilder:
    def build_architecture_edges(self, scan: ScanResult) -> list[dict[str, str]]:
        edges = [
            {"id": "e-repo-front", "source": "repo", "target": "frontend", "label": "contains", "kind": "ownership", "risk": "low"},
            {"id": "e-repo-back", "source": "repo", "target": "backend", "label": "contains", "kind": "ownership", "risk": "low"},
            {"id": "e-front-back", "source": "frontend", "target": "backend", "label": "API calls", "kind": "api", "risk": "medium"},
            {"id": "e-back-deps", "source": "backend", "target": "deps", "label": "imports", "kind": "dependency", "risk": "medium"},
            {"id": "e-back-ops", "source": "backend", "target": "ops", "label": "deploy/runtime", "kind": "infrastructure", "risk": "low"},
        ]
        if scan.frontend_framework.lower() in {"none", "unknown", ""}:
            edges = [e for e in edges if e["target"] != "frontend" and e["source"] != "frontend"]
        return edges

    def mermaid_from_graph(self, nodes: list[dict[str, object]], edges: list[dict[str, str]]) -> str:
        lines = ["flowchart TD"]
        for node in nodes:
            lines.append(f"    {node['id']}[{node['label']}]")
        for edge in edges:
            label = edge.get("label", "")
            lines.append(f"    {edge['source']} -->|{label}| {edge['target']}")
        return "\n".join(lines)
