from pathlib import Path


def _has_any_file(repo_dir: Path, candidates: list[str]) -> bool:
    return any((repo_dir / candidate).exists() for candidate in candidates)


LANG_EXTENSIONS = {
    "Python": {".py"},
    "JavaScript": {".js", ".mjs", ".cjs"},
    "TypeScript": {".ts", ".tsx"},
    "Go": {".go"},
    "Rust": {".rs"},
    "Java": {".java"},
    "C++": {".cpp", ".cc", ".cxx", ".hpp", ".h"},
}


def detect_languages(files: list[Path], repo_dir: Path) -> list[str]:
    detected: set[str] = set()
    for file_path in files:
        suffix = file_path.suffix.lower()
        for language, extensions in LANG_EXTENSIONS.items():
            if suffix in extensions:
                detected.add(language)
    if not detected and (repo_dir / "README.md").exists():
        detected.add("Unknown")
    return sorted(detected)


def detect_frontend_framework(repo_dir: Path, file_names: set[str], dependencies: set[str]) -> str:
    deps = {dep.lower() for dep in dependencies}

    if (
        "next.config.js" in file_names
        or "next.config.mjs" in file_names
        or "next" in deps
        or _has_any_file(repo_dir, ["app/layout.tsx", "app/page.tsx", "pages/_app.tsx"])
    ):
        return "Next.js"
    if "react" in deps or _has_any_file(repo_dir, ["src/App.tsx", "src/App.jsx", "src/main.tsx", "src/main.jsx"]):
        return "React"
    if "vue" in deps or _has_any_file(repo_dir, ["src/App.vue", "vite.config.ts", "vite.config.js"]):
        return "Vue"
    if "@angular/core" in deps or _has_any_file(repo_dir, ["angular.json"]):
        return "Angular"
    if "svelte" in deps or _has_any_file(repo_dir, ["svelte.config.js", "svelte.config.ts"]):
        return "Svelte"
    return "Unknown"


def detect_backend_framework(repo_dir: Path, dependencies: set[str]) -> str:
    deps = {dep.lower() for dep in dependencies}

    if "fastapi" in deps or _has_any_file(repo_dir, ["main.py", "app/main.py"]):
        return "FastAPI"
    if "django" in deps or _has_any_file(repo_dir, ["manage.py"]):
        return "Django"
    if "flask" in deps or _has_any_file(repo_dir, ["app.py", "wsgi.py"]):
        return "Flask"
    if "express" in deps:
        return "Express"
    if "@nestjs/core" in deps:
        return "NestJS"
    if "spring-boot-starter" in deps or (repo_dir / "pom.xml").exists() or (repo_dir / "build.gradle").exists():
        return "Spring Boot"
    return "Unknown"
