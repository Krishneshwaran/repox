from __future__ import annotations

from collections import Counter

from app.models.scanner import ScanResult


class DependencyMapper:
    def map_dependencies(self, scan: ScanResult) -> tuple[list[dict[str, object]], list[dict[str, str]], list[str]]:
        dep_counts = Counter(dep.split("@")[0].strip() for dep in scan.dependencies if dep.strip())
        top = dep_counts.most_common(18)

        nodes = []
        edges = []
        insights: list[str] = []

        nodes.append({"id": "module-core", "label": "Core Modules", "kind": "internal", "importance": 5, "summary": "Primary repository modules.", "technologies": scan.languages})
        for name, count in top:
            node_id = f"dep-{name.lower().replace('/', '-').replace('_', '-')}"
            risk = "high" if count > 3 else "medium" if count > 1 else "low"
            nodes.append(
                {
                    "id": node_id,
                    "label": name,
                    "kind": "external-dependency",
                    "importance": min(5, count + 1),
                    "summary": f"Referenced dependency ({count} mentions).",
                    "technologies": ["package"],
                }
            )
            edges.append({"id": f"e-core-{node_id}", "source": "module-core", "target": node_id, "label": f"refs {count}", "kind": "dependency", "risk": risk})

        if len(scan.dependencies) > 80:
            insights.append("High dependency surface detected; review supply-chain risk and update strategy.")
        if len(top) >= 12:
            insights.append("Dependency graph is broad; consider grouping by bounded context.")
        if any("legacy" in d.lower() for d in scan.dependencies):
            insights.append("Legacy package naming detected; validate maintenance status.")
        if not insights:
            insights.append("Dependency surface appears moderate with no immediate high-risk pattern from scanner metadata.")

        return nodes, edges, insights
