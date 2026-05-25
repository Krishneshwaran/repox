from pathlib import Path


IMPORTANT_FILES = [
    "README.md",
    "Dockerfile",
    "docker-compose.yml",
    "requirements.txt",
    "package.json",
    "pyproject.toml",
    "tsconfig.json",
    "vite.config.js",
    "vite.config.ts",
    "next.config.js",
    "tailwind.config.js",
    ".env.example",
]


def detect_important_files(repo_dir: Path) -> list[str]:
    found: list[str] = []
    for name in IMPORTANT_FILES:
        if list(repo_dir.rglob(name)):
            found.append(name)
    return sorted(found)


def detect_infrastructure(repo_dir: Path) -> tuple[bool, bool]:
    has_docker = (repo_dir / "Dockerfile").exists() or (repo_dir / "docker-compose.yml").exists()
    has_github_actions = (repo_dir / ".github" / "workflows").exists()
    return has_docker, has_github_actions


def detect_documentation(repo_dir: Path) -> dict[str, bool]:
    return {"readme": (repo_dir / "README.md").exists()}

