from __future__ import annotations

from pathlib import Path

from app.models.scanner import ScanResult
from app.scanner.file_tree import list_files


class ContextBuilder:
    def _scan_block(self, scan: ScanResult) -> str:
        structure_flags = [k for k, v in scan.structure.items() if v]
        return (
            f"repo={scan.repo_name}\n"
            f"languages={', '.join(scan.languages) or 'unknown'}\n"
            f"frontend_framework={scan.frontend_framework}\n"
            f"backend_framework={scan.backend_framework}\n"
            f"package_managers={', '.join(scan.package_managers) or 'unknown'}\n"
            f"docker={scan.docker}\n"
            f"github_actions={scan.github_actions}\n"
            f"important_files={', '.join(scan.important_files[:60])}\n"
            f"dependencies={', '.join(scan.dependencies[:120])}\n"
            f"structure_flags={', '.join(structure_flags) or 'none'}"
        )

    def _repo_shape_block(self, repo_dir: Path | None) -> str:
        if not repo_dir:
            return ""
        files = list_files(repo_dir, max_files=3000)
        extensions: dict[str, int] = {}
        top_dirs: dict[str, int] = {}
        for path in files:
            ext = path.suffix.lower() or "<no_ext>"
            extensions[ext] = extensions.get(ext, 0) + 1
            rel = path.relative_to(repo_dir)
            root = rel.parts[0] if rel.parts else "root"
            top_dirs[root] = top_dirs.get(root, 0) + 1

        ext_summary = ", ".join(
            f"{k}:{v}" for k, v in sorted(extensions.items(), key=lambda item: item[1], reverse=True)[:15]
        )
        dir_summary = ", ".join(
            f"{k}:{v}" for k, v in sorted(top_dirs.items(), key=lambda item: item[1], reverse=True)[:20]
        )
        return f"file_count={len(files)}\nroot_directories={dir_summary}\nfile_types={ext_summary}"

    def _readme_block(self, readme_content: str, exists: bool) -> str:
        if not exists:
            return "readme=missing"
        compact = "\n".join(readme_content.splitlines()[:120])
        return f"readme=present\nreadme_excerpt:\n{compact}"

    def build(self, scan: ScanResult, repo_dir: Path | None = None, readme_content: str = "", readme_exists: bool = False) -> str:
        blocks = [self._scan_block(scan), self._repo_shape_block(repo_dir), self._readme_block(readme_content, readme_exists)]
        return "\n\n".join(block for block in blocks if block)

    def memory_notes(self, scan: ScanResult, repo_dir: Path | None = None) -> dict[str, str]:
        files = list_files(repo_dir, max_files=2000) if repo_dir else []
        folder_counts: dict[str, int] = {}
        file_samples: list[str] = []
        for path in files:
            rel = path.relative_to(repo_dir) if repo_dir else path
            if len(file_samples) < 160:
                file_samples.append(str(rel).replace("\\", "/"))
            root = rel.parts[0] if rel.parts else "root"
            folder_counts[root] = folder_counts.get(root, 0) + 1

        top_folders = ", ".join(
            f"{k}:{v}" for k, v in sorted(folder_counts.items(), key=lambda item: item[1], reverse=True)[:20]
        )
        structure_flags = [k for k, v in scan.structure.items() if v]
        return {
            "file_summaries": "Representative files: " + ", ".join(file_samples[:120]),
            "folder_summaries": "Top folders: " + top_folders,
            "architecture_summaries": (
                f"Frontend={scan.frontend_framework}; Backend={scan.backend_framework}; "
                f"Structure={', '.join(structure_flags) or 'none'}"
            ),
            "dependency_notes": "Dependencies: " + ", ".join(scan.dependencies[:120]),
        }
