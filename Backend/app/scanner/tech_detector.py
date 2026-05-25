from pathlib import Path


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
    if "next.config.js" in file_names or "next" in dependencies:
        return "Next.js"
    if "react" in dependencies:
        return "React"
    if "vue" in dependencies:
        return "Vue"
    if "@angular/core" in dependencies:
        return "Angular"
    if "svelte" in dependencies:
        return "Svelte"
    return "Unknown"


def detect_backend_framework(repo_dir: Path, dependencies: set[str]) -> str:
    if "fastapi" in dependencies:
        return "FastAPI"
    if "django" in dependencies:
        return "Django"
    if "flask" in dependencies:
        return "Flask"
    if "express" in dependencies:
        return "Express"
    if "@nestjs/core" in dependencies:
        return "NestJS"
    if "spring-boot-starter" in dependencies or (repo_dir / "pom.xml").exists():
        return "Spring Boot"
    return "Unknown"

