from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from urllib.parse import quote, urlsplit, urlunsplit
from uuid import uuid4

from fastapi import HTTPException, status

from app.models.scanner import ScanHistoryItem, ScanResult, ScannerDiffResponse
from app.scanner.config_detector import detect_documentation, detect_important_files, detect_infrastructure
from app.scanner.dependency_detector import detect_dependencies, detect_package_managers
from app.scanner.deep_analyzer import analyze_commits, analyze_quality, analyze_readme, analyze_security, extract_api_routes, scan_data_sources
from app.scanner.file_tree import list_files
from app.scanner.repo_cloner import RepoCloner
from app.scanner.structure_detector import detect_structure
from app.scanner.tech_detector import detect_backend_framework, detect_frontend_framework, detect_languages


class ScannerResultStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._results: dict[str, ScanResult] = {}
        self._history: list[ScanHistoryItem] = []
        self._repo_versions: dict[str, int] = {}

    def save(self, result: ScanResult) -> str:
        scan_id = uuid4().hex
        with self._lock:
            version = self._repo_versions.get(result.repo_name, 0) + 1
            self._repo_versions[result.repo_name] = version
            self._results[scan_id] = result
            self._history.insert(
                0,
                ScanHistoryItem(
                    scan_id=scan_id,
                    repo_name=result.repo_name,
                    version=version,
                    frontend_framework=result.frontend_framework,
                    backend_framework=result.backend_framework,
                    languages=result.languages,
                    created_at=datetime.now(UTC).isoformat(),
                ),
            )
            self._history = self._history[:200]
        return scan_id

    def get(self, scan_id: str) -> ScanResult | None:
        with self._lock:
            return self._results.get(scan_id)

    def count(self) -> int:
        with self._lock:
            return len(self._results)

    def history(self, limit: int = 50) -> list[ScanHistoryItem]:
        with self._lock:
            return self._history[:limit]

    def history_for_repo(self, repo_name: str, limit: int = 50) -> list[ScanHistoryItem]:
        with self._lock:
            return [h for h in self._history if h.repo_name == repo_name][:limit]


class ScannerService:
    def __init__(self, workspace: Path) -> None:
        self.cloner = RepoCloner(workspace / ".scanner_cache")
        self.store = ScannerResultStore()

    def _resolve_clone_url(self, repo_name: str, clone_url: str | None) -> str:
        if clone_url:
            return clone_url
        if "/" not in repo_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid repository name.")
        return f"https://github.com/{quote(repo_name, safe='/')}.git"

    def _with_access_token(self, clone_url: str, access_token: str | None) -> str:
        if not access_token:
            return clone_url
        parts = urlsplit(clone_url)
        if parts.scheme != "https":
            return clone_url
        if parts.hostname not in {"github.com", "www.github.com"}:
            return clone_url
        netloc = f"x-access-token:{quote(access_token, safe='')}@{parts.hostname}"
        if parts.port:
            netloc = f"{netloc}:{parts.port}"
        return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))

    def scan(self, repo_name: str, clone_url: str | None, access_token: str | None = None) -> tuple[str, ScanResult]:
        repo_dir: Path | None = None
        try:
            effective_clone_url = self._resolve_clone_url(repo_name, clone_url)
            effective_clone_url = self._with_access_token(effective_clone_url, access_token)
            repo_dir = self.cloner.clone(effective_clone_url)
            files = list_files(repo_dir)
            dependencies = detect_dependencies(repo_dir)
            dep_set = set(dependencies)
            file_names = {path.name for path in files}
            docker, github_actions = detect_infrastructure(repo_dir)

            result = ScanResult(
                repo_name=repo_name,
                languages=detect_languages(files, repo_dir),
                frontend_framework=detect_frontend_framework(repo_dir, file_names, dep_set),
                backend_framework=detect_backend_framework(repo_dir, dep_set),
                package_managers=detect_package_managers(repo_dir),
                docker=docker,
                github_actions=github_actions,
                documentation=detect_documentation(repo_dir),
                structure=detect_structure(repo_dir),
                important_files=detect_important_files(repo_dir),
                dependencies=dependencies[:120],
                readme_analysis=analyze_readme(repo_dir),
                quality=analyze_quality(repo_dir),
                security=analyze_security(repo_dir),
                api_routes=extract_api_routes(repo_dir),
                commit_history=analyze_commits(repo_dir),
                data_sources=scan_data_sources(),
            )
            scan_id = self.store.save(result)
            return scan_id, result
        except HTTPException:
            raise
        except Exception as exc:
            error_text = str(exc).lower()
            if "repository not found" in error_text:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        "Repository not found or not accessible. "
                        "Verify the repo name and ensure your GitHub token has access."
                    ),
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Repository scan failed: {exc}",
            ) from exc
        finally:
            if repo_dir:
                self.cloner.cleanup(repo_dir)

    def get_result(self, scan_id: str) -> ScanResult:
        result = self.store.get(scan_id)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan result not found.")
        return result

    def total_scans(self) -> int:
        return self.store.count()

    def recent_history(self, limit: int = 50) -> list[ScanHistoryItem]:
        return self.store.history(limit)

    def repo_history(self, repo_name: str, limit: int = 50) -> list[ScanHistoryItem]:
        return self.store.history_for_repo(repo_name, limit)

    def diff_scans(self, from_scan_id: str, to_scan_id: str) -> ScannerDiffResponse:
        first = self.get_result(from_scan_id)
        second = self.get_result(to_scan_id)
        if first.repo_name != second.repo_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Both scans must belong to the same repository.")

        changed_fields: dict[str, dict[str, object]] = {}
        summary: list[str] = []

        def mark_change(field: str, a: object, b: object) -> None:
            if a != b:
                changed_fields[field] = {"from": a, "to": b}
                summary.append(f"{field} changed")

        mark_change("frontend_framework", first.frontend_framework, second.frontend_framework)
        mark_change("backend_framework", first.backend_framework, second.backend_framework)
        mark_change("languages", first.languages, second.languages)
        mark_change("package_managers", first.package_managers, second.package_managers)
        mark_change("docker", first.docker, second.docker)
        mark_change("github_actions", first.github_actions, second.github_actions)
        mark_change("structure", first.structure, second.structure)

        deps_added = sorted(set(second.dependencies) - set(first.dependencies))
        deps_removed = sorted(set(first.dependencies) - set(second.dependencies))
        if deps_added or deps_removed:
            changed_fields["dependencies"] = {"added": deps_added[:80], "removed": deps_removed[:80]}
            summary.append(f"dependencies changed (+{len(deps_added)} / -{len(deps_removed)})")

        files_added = sorted(set(second.important_files) - set(first.important_files))
        files_removed = sorted(set(first.important_files) - set(second.important_files))
        if files_added or files_removed:
            changed_fields["important_files"] = {"added": files_added[:40], "removed": files_removed[:40]}
            summary.append(f"important files changed (+{len(files_added)} / -{len(files_removed)})")

        if not summary:
            summary.append("No significant scanner-level changes detected between selected snapshots.")

        return ScannerDiffResponse(
            from_scan_id=from_scan_id,
            to_scan_id=to_scan_id,
            repo_name=first.repo_name,
            summary=summary,
            changed_fields=changed_fields,
        )
