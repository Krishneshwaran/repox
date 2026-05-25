import json
from pathlib import Path


def _read_lines(path: Path) -> list[str]:
    try:
        return path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return []


def detect_dependencies(repo_dir: Path) -> list[str]:
    deps: set[str] = set()

    package_json = repo_dir / "package.json"
    if package_json.exists():
        try:
            data = json.loads(package_json.read_text(encoding="utf-8", errors="ignore"))
            for bucket in ("dependencies", "devDependencies", "peerDependencies"):
                for dep in data.get(bucket, {}).keys():
                    deps.add(dep)
        except (OSError, json.JSONDecodeError):
            pass

    requirements = repo_dir / "requirements.txt"
    if requirements.exists():
        for line in _read_lines(requirements):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            deps.add(stripped.split("==")[0].split(">=")[0].split("<=")[0].strip())

    pyproject = repo_dir / "pyproject.toml"
    if pyproject.exists():
        for line in _read_lines(pyproject):
            if "=" in line and not line.strip().startswith("["):
                key = line.split("=")[0].strip().strip('"').strip("'")
                if key and " " not in key and key.isidentifier():
                    deps.add(key)

    return sorted(deps)


def detect_package_managers(repo_dir: Path) -> list[str]:
    mapping = {
        "npm": [repo_dir / "package-lock.json", repo_dir / "package.json"],
        "yarn": [repo_dir / "yarn.lock"],
        "pnpm": [repo_dir / "pnpm-lock.yaml"],
        "pip": [repo_dir / "requirements.txt"],
        "poetry": [repo_dir / "poetry.lock", repo_dir / "pyproject.toml"],
    }
    detected = [name for name, markers in mapping.items() if any(marker.exists() for marker in markers)]
    return sorted(set(detected))

