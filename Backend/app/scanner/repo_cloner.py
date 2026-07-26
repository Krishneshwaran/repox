import shutil
from pathlib import Path
from uuid import uuid4

from git import Repo


class RepoCloner:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def clone(self, clone_url: str) -> Path:
        target_dir = self.base_dir / uuid4().hex
        Repo.clone_from(clone_url, target_dir, depth=100, single_branch=True)
        return target_dir

    def cleanup(self, repo_dir: Path) -> None:
        if repo_dir.exists():
            shutil.rmtree(repo_dir, ignore_errors=True)
