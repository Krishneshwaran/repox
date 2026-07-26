from __future__ import annotations

import json
import re
from pathlib import Path

_SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "out", "target", ".mypy_cache",
    ".pytest_cache", "coverage", ".idea", ".vscode",
}
_SOURCE_EXTS = {".py", ".ts", ".js", ".go", ".rs", ".java", ".rb", ".cs"}

# Route patterns per language
_ROUTE_PATTERNS = [
    # FastAPI / Flask / Express
    re.compile(r'@(?:router|app)\.(get|post|put|patch|delete|head)\s*\(\s*["\']([^"\']+)["\']', re.I),
    # Express router.get('/path'
    re.compile(r'router\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']', re.I),
    # Go chi/gin: r.GET("/path"
    re.compile(r'r\.(GET|POST|PUT|PATCH|DELETE)\s*\(\s*"([^"]+)"', re.I),
    # Spring: @GetMapping("/path")
    re.compile(r'@(?:Get|Post|Put|Patch|Delete)Mapping\s*\(\s*["\']([^"\']+)["\']', re.I),
]

_IMPORT_PATTERN = re.compile(
    r'(?:^import\s+["\']([^"\']+)["\']|^from\s+([^\s]+)\s+import|require\s*\(\s*["\']([^"\'./][^"\']*)["\'])',
    re.MULTILINE,
)


def _is_skip(rel: Path) -> bool:
    return any(part in _SKIP_DIRS for part in rel.parts)


def _read(path: Path, max_lines: int = 100) -> str:
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        return "\n".join(lines[:max_lines])
    except Exception:
        return ""


# ── Directory tree ────────────────────────────────────────────

def get_top_dirs(repo_dir: Path) -> list[tuple[str, int]]:
    """Return (dir_name, file_count) for top-level dirs, sorted by count."""
    counts: dict[str, int] = {}
    for p in repo_dir.rglob("*"):
        if p.is_dir():
            continue
        rel = p.relative_to(repo_dir)
        if _is_skip(rel):
            continue
        root = rel.parts[0] if len(rel.parts) > 1 else "root"
        counts[root] = counts.get(root, 0) + 1
    return sorted(counts.items(), key=lambda x: x[1], reverse=True)


# ── Dependency parsing ────────────────────────────────────────

def parse_dependencies(repo_dir: Path) -> dict[str, list[str]]:
    """
    Returns {"npm": [...], "pip": [...], "go": [...], ...}
    """
    deps: dict[str, list[str]] = {}

    # npm
    pkg = repo_dir / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8", errors="ignore"))
            npm = list(data.get("dependencies", {}).keys()) + list(data.get("devDependencies", {}).keys())
            if npm:
                deps["npm"] = npm
        except Exception:
            pass

    # pip
    for req_name in ["requirements.txt", "requirements-dev.txt", "requirements-prod.txt"]:
        req = repo_dir / req_name
        if req.exists():
            lines = [
                l.split("==")[0].split(">=")[0].split("<=")[0].strip()
                for l in req.read_text(encoding="utf-8", errors="ignore").splitlines()
                if l.strip() and not l.startswith("#")
            ]
            if lines:
                deps.setdefault("pip", []).extend(lines)

    # pyproject.toml
    ppt = repo_dir / "pyproject.toml"
    if ppt.exists():
        content = ppt.read_text(encoding="utf-8", errors="ignore")
        found = re.findall(r'"([a-zA-Z0-9_\-]+)\s*(?:[>=<^~][^"]*)?"\s*,', content)
        if found:
            deps.setdefault("pip", []).extend(found)

    # go.mod
    gomod = repo_dir / "go.mod"
    if gomod.exists():
        lines = gomod.read_text(encoding="utf-8", errors="ignore").splitlines()
        go_deps = [l.strip().split()[0] for l in lines if l.strip().startswith("\t") and "/" in l]
        if go_deps:
            deps["go"] = go_deps

    # Cargo.toml
    cargo = repo_dir / "Cargo.toml"
    if cargo.exists():
        content = cargo.read_text(encoding="utf-8", errors="ignore")
        found = re.findall(r'^([a-zA-Z0-9_\-]+)\s*=', content, re.MULTILINE)
        if found:
            deps["cargo"] = found

    # deduplicate
    return {k: list(dict.fromkeys(v)) for k, v in deps.items()}


# ── Route extraction ──────────────────────────────────────────

def extract_routes(repo_dir: Path) -> list[dict[str, str]]:
    """Walk source files, extract route definitions."""
    routes: list[dict[str, str]] = []
    for p in repo_dir.rglob("*"):
        if p.is_dir() or _is_skip(p.relative_to(repo_dir)):
            continue
        if p.suffix.lower() not in _SOURCE_EXTS:
            continue
        content = _read(p, max_lines=200)
        for pat in _ROUTE_PATTERNS:
            for m in pat.finditer(content):
                groups = [g for g in m.groups() if g]
                method = groups[0].upper() if len(groups) >= 2 else "ANY"
                path_val = groups[1] if len(groups) >= 2 else groups[0]
                routes.append({
                    "method": method,
                    "path": path_val,
                    "file": str(p.relative_to(repo_dir)).replace("\\", "/"),
                })
    return routes[:60]  # cap at 60 routes


# ── Import analysis ───────────────────────────────────────────

def extract_internal_imports(repo_dir: Path) -> dict[str, list[str]]:
    """Map file → list of internal modules it imports."""
    imports: dict[str, list[str]] = {}
    source_files = [
        p for p in repo_dir.rglob("*")
        if not p.is_dir()
        and not _is_skip(p.relative_to(repo_dir))
        and p.suffix.lower() in _SOURCE_EXTS
        and not any(k in p.stem.lower() for k in ["test", "spec", "mock"])
    ]
    for p in source_files[:40]:
        content = _read(p, max_lines=60)
        found = []
        for m in _IMPORT_PATTERN.finditer(content):
            pkg = next((g for g in m.groups() if g), None)
            if pkg and not pkg.startswith((".", "/")) and "/" not in pkg:
                # likely a top-level internal module reference
                found.append(pkg.split(".")[0])
        if found:
            key = str(p.relative_to(repo_dir)).replace("\\", "/")
            imports[key] = list(dict.fromkeys(found))
    return imports


# ── Infra detection ───────────────────────────────────────────

def detect_infra(repo_dir: Path) -> dict[str, bool]:
    return {
        "docker": (repo_dir / "Dockerfile").exists() or (repo_dir / "docker-compose.yml").exists() or (repo_dir / "docker-compose.yaml").exists(),
        "github_actions": (repo_dir / ".github" / "workflows").exists(),
        "makefile": (repo_dir / "Makefile").exists(),
        "kubernetes": any(repo_dir.rglob("*.yaml")) and any("kind: Deployment" in f.read_text(encoding="utf-8", errors="ignore") for f in list(repo_dir.rglob("*.yaml"))[:10] if not _is_skip(f.relative_to(repo_dir))),
    }


# ── Mini summary for AI ───────────────────────────────────────

def build_mini_summary(
    repo_name: str,
    top_dirs: list[tuple[str, int]],
    deps: dict[str, list[str]],
    routes: list[dict[str, str]],
    infra: dict[str, bool],
) -> str:
    """Compact text (~300 tokens) describing the repo for the AI insights call."""
    lines = [f"repo: {repo_name}"]

    dirs_str = ", ".join(f"{d}({c})" for d, c in top_dirs[:10])
    lines.append(f"top_dirs: {dirs_str}")

    for mgr, pkgs in deps.items():
        lines.append(f"{mgr}_deps: {', '.join(pkgs[:20])}")

    if routes:
        route_str = ", ".join(f"{r['method']} {r['path']}" for r in routes[:15])
        lines.append(f"routes: {route_str}")

    infra_flags = [k for k, v in infra.items() if v]
    lines.append(f"infra: {', '.join(infra_flags) or 'none'}")

    return "\n".join(lines)
