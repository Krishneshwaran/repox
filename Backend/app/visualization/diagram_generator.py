from __future__ import annotations


class DiagramGenerator:
    def architecture_mermaid(self, repo: str, frontend: str, backend: str, has_docker: bool, has_ci: bool) -> str:
        ops = "Docker/Runtime" if has_docker else "Runtime"
        ci = "CI Pipeline" if has_ci else "Manual Delivery"
        return "\n".join(
            [
                "flowchart LR",
                f"    FE[{frontend or 'Frontend'}] --> API[API Routes]",
                f"    API --> BE[{backend or 'Backend Services'}]",
                "    BE --> DB[(Data Layer)]",
                f"    BE --> OPS[{ops}]",
                f"    OPS --> CI[{ci}]",
                f"    REPO[{repo}] --> FE",
                "    REPO --> BE",
            ]
        )
