from pathlib import Path
from threading import Lock
from urllib.parse import quote, urlsplit, urlunsplit
from uuid import uuid4

from fastapi import HTTPException, status

from app.models.scanner import ScanResult
from app.scanner.config_detector import detect_documentation, detect_important_files, detect_infrastructure
from app.scanner.dependency_detector import detect_dependencies, detect_package_managers
from app.scanner.file_tree import list_files
from app.scanner.repo_cloner import RepoCloner
from app.scanner.structure_detector import detect_structure
from app.scanner.tech_detector import detect_backend_framework, detect_frontend_framework, detect_languages


class ScannerResultStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._results: dict[str, ScanResult] = {}

    def save(self, result: ScanResult) -> str:
        scan_id = uuid4().hex
        with self._lock:
            self._results[scan_id] = result
        return scan_id

    def get(self, scan_id: str) -> ScanResult | None:
        with self._lock:
            return self._results.get(scan_id)


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
        # Embed token for authenticated clone (needed for private repositories).
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
