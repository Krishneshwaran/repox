from __future__ import annotations

from app.models.scanner import ScanResult


class TimelineAnalyzer:
    def build_timeline(self, scan: ScanResult) -> tuple[list[dict[str, str]], str]:
        events: list[dict[str, str]] = []

        events.append(
            {
                "title": "Repository Bootstrap",
                "date_hint": "Earliest commit window",
                "detail": f"Initial project foundation with {scan.backend_framework or 'backend'} and {scan.frontend_framework or 'frontend'} components.",
                "category": "foundation",
            }
        )

        if scan.docker:
            events.append(
                {
                    "title": "Containerization Introduced",
                    "date_hint": "Mid-stage evolution",
                    "detail": "Docker artifacts detected, indicating deployment standardization.",
                    "category": "infrastructure",
                }
            )

        if scan.github_actions:
            events.append(
                {
                    "title": "CI Automation Added",
                    "date_hint": "Post-bootstrap",
                    "detail": "GitHub Actions workflow presence indicates CI/CD maturation.",
                    "category": "automation",
                }
            )

        if len(scan.dependencies) > 50:
            events.append(
                {
                    "title": "Dependency Expansion",
                    "date_hint": "Growth phase",
                    "detail": "Dependency volume suggests feature growth and broader integration surface.",
                    "category": "scalability",
                }
            )

        events.append(
            {
                "title": "Current Architecture State",
                "date_hint": "Present",
                "detail": f"Active stack appears as FE={scan.frontend_framework}, BE={scan.backend_framework}, languages={', '.join(scan.languages) or 'unknown'}.",
                "category": "current",
            }
        )

        summary = "Timeline synthesized from repository structure signals and scanner metadata; exact dates require git history mining."
        return events, summary
