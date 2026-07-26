from __future__ import annotations

import json
from pathlib import Path

_SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "out", "target", ".mypy_cache",
    ".pytest_cache", "coverage", ".idea", ".vscode",
}

_KEY_FILES = {
    "package.json", "pyproject.toml", "setup.py", "requirements.txt",
    "requirements-dev.txt", "go.mod", "Cargo.toml", "composer.json",
    "pom.xml", "build.gradle", "docker-compose.yml", "docker-compose.yaml",
    "Dockerfile", "README.md",
}

_SOURCE_PRIORITY = [
    "route", "router", "routes", "controller", "handler", "api",
    "service", "model", "schema", "main", "app", "index", "server", "config",
]

_SOURCE_EXTS = {".py", ".ts", ".js", ".go", ".rs", ".java", ".rb", ".cs", ".cpp", ".c"}


def _is_skip(path: Path) -> bool:
    return any(part in _SKIP_DIRS for part in path.parts)


def _read_safe(path: Path, max_lines: int = 80) -> str:
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        return "\n".join(lines[:max_lines])
    except Exception:
        return ""


def _priority_score(path: Path) -> int:
    name = path.stem.lower()
    return sum(1 for kw in _SOURCE_PRIORITY if kw in name)


def build_file_context(repo_dir: Path, max_source_files: int = 20) -> str:
    parts: list[str] = []

    # ── File tree (top 3 levels) ──────────────────────────────
    tree_lines: list[str] = []
    for p in sorted(repo_dir.rglob("*")):
        if _is_skip(p.relative_to(repo_dir)):
            continue
        rel = p.relative_to(repo_dir)
        depth = len(rel.parts)
        if depth > 3:
            continue
        prefix = "  " * (depth - 1)
        tree_lines.append(f"{prefix}{'/' if p.is_dir() else ''}{p.name}")
    parts.append("=== FILE TREE ===\n" + "\n".join(tree_lines[:300]))

    # ── Key config/manifest files ─────────────────────────────
    for name in _KEY_FILES:
        candidates = list(repo_dir.rglob(name))
        for candidate in candidates[:1]:
            if _is_skip(candidate.relative_to(repo_dir)):
                continue
            content = _read_safe(candidate, max_lines=120)
            if not content:
                continue
            # For package.json: parse and show only relevant sections
            if name == "package.json":
                try:
                    data = json.loads(candidate.read_text(encoding="utf-8", errors="ignore"))
                    content = json.dumps({
                        "name": data.get("name"),
                        "scripts": data.get("scripts", {}),
                        "dependencies": data.get("dependencies", {}),
                        "devDependencies": data.get("devDependencies", {}),
                    }, indent=2)
                except Exception:
                    pass
            parts.append(f"=== {candidate.relative_to(repo_dir)} ===\n{content}")

    # ── GitHub Actions workflows ──────────────────────────────
    workflows_dir = repo_dir / ".github" / "workflows"
    if workflows_dir.exists():
        for wf in list(workflows_dir.glob("*.yml"))[:3]:
            content = _read_safe(wf, max_lines=60)
            if content:
                parts.append(f"=== .github/workflows/{wf.name} ===\n{content}")

    # ── Source files (priority-ranked) ───────────────────────
    candidates: list[Path] = []
    for p in repo_dir.rglob("*"):
        if p.is_dir() or _is_skip(p.relative_to(repo_dir)):
            continue
        if p.suffix.lower() not in _SOURCE_EXTS:
            continue
        if any(skip in p.stem.lower() for skip in ["test", "spec", "mock", "fixture", "migration"]):
            continue
        candidates.append(p)

    ranked = sorted(candidates, key=_priority_score, reverse=True)
    seen: set[str] = set()
    added = 0
    for p in ranked:
        if added >= max_source_files:
            break
        stem = p.stem.lower()
        if stem in seen:
            continue
        seen.add(stem)
        content = _read_safe(p, max_lines=60)
        if content:
            parts.append(f"=== {p.relative_to(repo_dir)} ===\n{content}")
            added += 1

    return "\n\n".join(parts)
