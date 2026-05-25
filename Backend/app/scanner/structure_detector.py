from pathlib import Path


STRUCTURE_DIRS = ("frontend", "backend", "docs", "api", "components", "services")


def detect_structure(repo_dir: Path) -> dict[str, bool]:
    lower_dirs = {p.name.lower() for p in repo_dir.rglob("*") if p.is_dir() and ".git" not in p.parts}
    return {name: name in lower_dirs for name in STRUCTURE_DIRS}

