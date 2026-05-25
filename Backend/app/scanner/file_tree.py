from pathlib import Path


def list_files(repo_dir: Path, max_files: int = 5000) -> list[Path]:
    files: list[Path] = []
    for path in repo_dir.rglob("*"):
        if ".git" in path.parts:
            continue
        if path.is_file():
            files.append(path)
        if len(files) >= max_files:
            break
    return files

