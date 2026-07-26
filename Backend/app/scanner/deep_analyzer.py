import re
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from git import Repo

SKIP_DIRS = {'.git', 'node_modules', 'venv', '.venv', 'dist', 'build', 'coverage', '__pycache__'}
TEXT_SUFFIXES = {'.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.go', '.rb', '.php', '.env', '.yml', '.yaml', '.json', '.toml'}


def source_files(repo_dir: Path, limit: int = 2500) -> list[Path]:
    files: list[Path] = []
    for path in repo_dir.rglob('*'):
        if len(files) >= limit:
            break
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES and not any(part in SKIP_DIRS for part in path.parts):
            files.append(path)
    return files


def analyze_readme(repo_dir: Path) -> dict[str, object]:
    candidates = [path for path in repo_dir.iterdir() if path.is_file() and path.name.lower().startswith('readme')]
    if not candidates:
        return {'exists': False, 'score': 0, 'readability_score': 0, 'completeness_score': 0, 'sections': {}, 'missing_sections': ['overview', 'installation', 'usage', 'configuration', 'license']}
    path = candidates[0]
    text = path.read_text(encoding='utf-8', errors='ignore')
    headings = '\n'.join(re.findall(r'^#{1,6}\s+(.+)$', text, flags=re.MULTILINE)).lower()
    sections = {
        'overview': len(text.strip()) > 120,
        'installation': any(key in headings for key in ('install', 'setup', 'getting started')),
        'usage': any(key in headings for key in ('usage', 'example', 'quick start')),
        'configuration': any(key in headings for key in ('config', 'environment', 'variables')),
        'contributing': 'contribut' in headings,
        'license': 'license' in headings or (repo_dir / 'LICENSE').exists(),
        'testing': any(key in headings for key in ('test', 'quality')),
        'support': any(key in headings for key in ('support', 'contact', 'troubleshoot', 'faq')),
    }
    completeness = round(sum(sections.values()) / len(sections) * 100)
    lines = [line for line in text.splitlines() if line.strip()]
    average_line = sum(len(line) for line in lines) / max(len(lines), 1)
    readability = max(0, min(100, 100 - max(0, round(average_line - 80)) + min(15, len(re.findall(r'^#', text, flags=re.MULTILINE)) * 3)))
    return {'exists': True, 'path': path.name, 'score': round(completeness * .7 + readability * .3), 'readability_score': readability, 'completeness_score': completeness, 'sections': sections, 'missing_sections': [name for name, present in sections.items() if not present]}


def analyze_quality(repo_dir: Path) -> dict[str, object]:
    files = source_files(repo_dir)
    test_files = [path for path in files if any(marker in path.name.lower() or marker in [part.lower() for part in path.parts] for marker in ('test', 'tests', 'spec', '__tests__'))]
    build_names = {'package.json', 'Makefile', 'pyproject.toml', 'setup.py', 'pom.xml', 'build.gradle', 'Cargo.toml', 'go.mod', 'Dockerfile'}
    build_files = sorted({path.relative_to(repo_dir).as_posix() for path in repo_dir.rglob('*') if path.is_file() and path.name in build_names and not any(part in SKIP_DIRS for part in path.parts)})
    workflow_dir = repo_dir / '.github' / 'workflows'
    workflows = [path.name for path in workflow_dir.glob('*.y*ml')] if workflow_dir.exists() else []
    return {'source_file_count': len(files), 'test_file_count': len(test_files), 'has_tests': bool(test_files), 'build_files': build_files, 'has_build_configuration': bool(build_files), 'ci_workflows': workflows}


def analyze_security(repo_dir: Path) -> dict[str, object]:
    patterns = {'private_key': re.compile(r'BEGIN .*PRIVATE KEY'), 'github_token': re.compile(r'github_pat_[A-Za-z0-9_]{20,}'), 'aws_key': re.compile(r'AKIA[0-9A-Z]{16}')}
    findings: list[dict[str, object]] = []
    for path in source_files(repo_dir):
        try:
            if path.stat().st_size > 512000:
                continue
            text = path.read_text(encoding='utf-8', errors='ignore')
        except OSError:
            continue
        for kind, pattern in patterns.items():
            for match in list(pattern.finditer(text))[:3]:
                findings.append({'type': kind, 'file': path.relative_to(repo_dir).as_posix(), 'line': text.count('\n', 0, match.start()) + 1, 'severity': 'high'})
    return {'status': 'attention' if findings else 'clear', 'finding_count': len(findings), 'findings': findings[:50], 'note': 'Heuristic scan; verify findings manually.'}


def extract_api_routes(repo_dir: Path) -> list[dict[str, str]]:
    quote_chars = re.escape(chr(34) + chr(39))
    route_pattern = re.compile(r'(?:@(?:\w+\.)?|(?:app|router)\.)(get|post|put|patch|delete)\(\s*[' + quote_chars + r']([^' + quote_chars + r']+)')
    routes: list[dict[str, str]] = []
    for path in source_files(repo_dir):
        try:
            text = path.read_text(encoding='utf-8', errors='ignore')
        except OSError:
            continue
        for method, route in route_pattern.findall(text):
            routes.append({'method': method.upper(), 'path': route, 'file': path.relative_to(repo_dir).as_posix(), 'framework': 'static source analysis'})
    return routes[:200]


def analyze_commits(repo_dir: Path) -> dict[str, object]:
    try:
        commits = list(Repo(repo_dir).iter_commits(max_count=100))
    except (OSError, ValueError):
        return {'analyzed_commits': 0, 'weekly_activity': [0] * 16, 'active_weeks': 0, 'contributors': [], 'latest_commit_at': None, 'latest_commit_message': None, 'history_depth': 'unavailable'}
    now = datetime.now(UTC)
    weekly = [0] * 16
    authors: Counter[str] = Counter()
    for commit in commits:
        authored = commit.authored_datetime.astimezone(UTC)
        age = (now - authored).days // 7
        if 0 <= age < 16:
            weekly[15 - age] += 1
        authors[commit.author.name or 'Unknown'] += 1
    latest = commits[0] if commits else None
    return {'analyzed_commits': len(commits), 'weekly_activity': weekly, 'active_weeks': sum(bool(count) for count in weekly), 'contributors': [{'name': name, 'commits': count} for name, count in authors.most_common(5)], 'latest_commit_at': latest.authored_datetime.astimezone(UTC).isoformat() if latest else None, 'latest_commit_message': latest.message.splitlines()[0][:160] if latest else None, 'history_depth': 'up to 100 commits'}


def scan_data_sources() -> dict[str, str]:
    return {'languages': 'Cloned repository file extensions', 'frameworks': 'Dependency manifests and marker files', 'dependencies': 'Repository dependency manifests', 'documentation': 'README and documentation files', 'quality': 'Source tree, tests, builds, and CI workflows', 'security': 'Heuristic scan of source files', 'api_routes': 'Static extraction from source files', 'commit_history': 'Local Git history (up to 100 commits)'}
