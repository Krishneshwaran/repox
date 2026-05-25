from __future__ import annotations

from app.models.scanner import ScanResult


class NodeGenerator:
    def core_nodes(self, scan: ScanResult) -> list[dict[str, object]]:
        nodes: list[dict[str, object]] = [
            {
                "id": "repo",
                "label": scan.repo_name,
                "kind": "repository",
                "importance": 5,
                "summary": "Root repository context.",
                "technologies": scan.languages,
            },
            {
                "id": "frontend",
                "label": scan.frontend_framework or "Frontend",
                "kind": "frontend",
                "importance": 4,
                "summary": "Client/UI layer.",
                "technologies": [scan.frontend_framework] if scan.frontend_framework else [],
            },
            {
                "id": "backend",
                "label": scan.backend_framework or "Backend",
                "kind": "backend",
                "importance": 4,
                "summary": "API and business logic layer.",
                "technologies": [scan.backend_framework] if scan.backend_framework else [],
            },
            {
                "id": "deps",
                "label": "Dependencies",
                "kind": "dependency-hub",
                "importance": 3,
                "summary": "External packages and modules.",
                "technologies": scan.package_managers,
            },
            {
                "id": "ops",
                "label": "Ops/Infra",
                "kind": "infrastructure",
                "importance": 2,
                "summary": "Runtime and delivery stack.",
                "technologies": ["Docker" if scan.docker else "No Docker", "GitHub Actions" if scan.github_actions else "No CI"],
            },
        ]
        return nodes
