from __future__ import annotations

from app.models.scanner import ScanResult


class ApiFlowMapper:
    def map_flow(self, scan: ScanResult) -> tuple[list[dict[str, object]], list[dict[str, str]], list[str]]:
        nodes = [
            {"id": "client", "label": scan.frontend_framework or "Client", "kind": "frontend", "importance": 4, "summary": "User-facing interface.", "technologies": [scan.frontend_framework]},
            {"id": "routes", "label": "API Routes", "kind": "api-routes", "importance": 4, "summary": "Route handlers and endpoints.", "technologies": [scan.backend_framework]},
            {"id": "middleware", "label": "Middleware", "kind": "middleware", "importance": 3, "summary": "Auth/validation pipeline.", "technologies": [scan.backend_framework]},
            {"id": "services", "label": "Service Layer", "kind": "service", "importance": 4, "summary": "Business logic orchestration.", "technologies": [scan.backend_framework]},
            {"id": "db", "label": "Database/Data", "kind": "data", "importance": 3, "summary": "Persistence and data providers.", "technologies": ["database", "storage"]},
        ]
        edges = [
            {"id": "e-client-routes", "source": "client", "target": "routes", "label": "HTTP", "kind": "api-flow", "risk": "low"},
            {"id": "e-routes-mw", "source": "routes", "target": "middleware", "label": "guards", "kind": "api-flow", "risk": "medium"},
            {"id": "e-mw-services", "source": "middleware", "target": "services", "label": "invoke", "kind": "api-flow", "risk": "low"},
            {"id": "e-services-db", "source": "services", "target": "db", "label": "query/write", "kind": "api-flow", "risk": "medium"},
        ]

        insights = [
            "Flow is inferred from framework and structure signals; validate route-to-service boundaries with source-level parsing for large systems.",
            "Entry-point candidates include backend bootstrap files and scanner-detected important files.",
        ]
        return nodes, edges, insights
