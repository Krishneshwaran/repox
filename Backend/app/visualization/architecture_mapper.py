from __future__ import annotations

from app.models.scanner import ScanResult


class ArchitectureMapper:
    def repository_map(self, scan: ScanResult) -> tuple[list[dict[str, object]], list[dict[str, str]], list[str]]:
        nodes: list[dict[str, object]] = []
        edges: list[dict[str, str]] = []
        insights: list[str] = []

        for idx, file_path in enumerate(scan.important_files[:24]):
            parts = file_path.replace('\\\\', '/').split('/')
            folder = parts[0] if len(parts) > 1 else 'root'
            node_id = f"folder-{folder.lower().replace('.', '-')}-{idx}"
            purpose = "Application logic" if any(k in folder.lower() for k in ["app", "src", "server", "api"]) else "Project asset/config"
            nodes.append(
                {
                    "id": node_id,
                    "label": f"/{folder}",
                    "kind": "folder",
                    "importance": 4 if purpose == "Application logic" else 2,
                    "summary": f"{purpose} inferred from structure and key files.",
                    "technologies": scan.languages[:3],
                }
            )

        unique_nodes = {n["label"]: n for n in nodes}.values()
        nodes = list(unique_nodes)

        if nodes:
            edges.append({"id": "e-repo-map", "source": "repo-map", "target": list(nodes)[0]["id"], "label": "entry", "kind": "map", "risk": "low"})
        nodes.insert(0, {"id": "repo-map", "label": scan.repo_name, "kind": "repository", "importance": 5, "summary": "Repository map root.", "technologies": scan.languages})

        for i in range(1, len(nodes)):
            edges.append({"id": f"e-map-{i}", "source": "repo-map", "target": nodes[i]["id"], "label": "contains", "kind": "map", "risk": "low"})

        insights.append(f"Mapped {max(0, len(nodes)-1)} top-level folders/files from important file signals.")
        insights.append("Folder purpose is AI-inferred; verify against domain-specific code semantics.")
        return nodes, edges, insights
