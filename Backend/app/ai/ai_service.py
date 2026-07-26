from __future__ import annotations

import hashlib
from pathlib import Path
from threading import Lock

import httpx
from fastapi import HTTPException, status

from app.ai.architecture_analyzer import ArchitectureAnalyzer
from app.ai.context_builder import ContextBuilder
from app.ai.embeddings import RepoEmbeddingsStore
from app.ai.insight_generator import InsightGenerator
from app.ai.prompt_builder import ask_prompt
from app.ai.readme_analyzer import ReadmeAnalyzer
from app.ai.repo_summarizer import RepoSummarizer
from app.config import get_settings
from app.models.ai import AskMessage, ReadmeScores
from app.models.scanner import ScanResult
from app.scanner.repo_cloner import RepoCloner
from app.scanner.service_registry import scanner_service


class AICache:
    def __init__(self) -> None:
        self._lock = Lock()
        self._data: dict[str, object] = {}

    def get(self, key: str) -> object | None:
        with self._lock:
            return self._data.get(key)

    def set(self, key: str, value: object) -> None:
        with self._lock:
            self._data[key] = value


class AIService:
    def __init__(self, workspace: Path) -> None:
        self.settings = get_settings()
        self.cache = AICache()
        self.context_builder = ContextBuilder()
        self.summarizer = RepoSummarizer()
        self.arch_analyzer = ArchitectureAnalyzer()
        self.readme_analyzer = ReadmeAnalyzer()
        self.insight_generator = InsightGenerator()
        self.embeddings = RepoEmbeddingsStore(workspace)
        self.cloner = RepoCloner(workspace / ".ai_repo_cache")

    def _cache_key(self, op: str, repo_name: str, extra: str = "") -> str:
        return f"{op}:{repo_name}:{extra}"

    def _provider_request(self, base_url: str, api_key: str, model: str, messages: list[dict[str, str]]) -> str:
        # Ignore machine-level proxy env vars (some local setups point to dead proxies).
        with httpx.Client(timeout=60, trust_env=False) as client:
            response = client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": 512,
                },
            )
            if not response.is_success:
                try:
                    err_body = response.json()
                    err_detail = err_body.get("error", {})
                    if isinstance(err_detail, dict):
                        err_msg = err_detail.get("message", str(err_body))
                    else:
                        err_msg = str(err_detail)
                except Exception:
                    err_msg = response.text or f"HTTP {response.status_code}"
                raise RuntimeError(f"[{model}] HTTP {response.status_code}: {err_msg}")
            payload = response.json()
            return payload["choices"][0]["message"]["content"].strip()

    def _complete(self, messages: list[dict[str, str]], *, user_api_key: str | None = None, user_model: str | None = None, user_provider: str | None = None) -> str:
        last_error: Exception | None = None

        # User-supplied key takes priority
        if user_api_key:
            base_url = (
                "https://api.groq.com/openai/v1" if user_provider == "groq"
                else "https://openrouter.ai/api/v1"
            )
            model = user_model or (self.settings.groq_model if user_provider == "groq" else self.settings.openrouter_model)
            try:
                return self._provider_request(base_url, user_api_key, model, messages)
            except Exception as exc:
                last_error = exc

        if self.settings.groq_api_key:
            try:
                return self._provider_request(
                    "https://api.groq.com/openai/v1",
                    self.settings.groq_api_key,
                    user_model or self.settings.groq_model,
                    messages,
                )
            except Exception as exc:
                last_error = exc

        if self.settings.openrouter_api_key:
            try:
                return self._provider_request(
                    "https://openrouter.ai/api/v1",
                    self.settings.openrouter_api_key,
                    user_model or self.settings.openrouter_model,
                    messages,
                )
            except Exception as exc:
                last_error = exc

        if last_error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI provider request failed: {last_error}",
            ) from last_error

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No AI provider configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.",
        )

    def _bound_complete(self, user_api_key: str | None, user_model: str | None, user_provider: str | None):
        """Returns a no-arg-override complete callable bound to user credentials."""
        def complete(messages: list[dict[str, str]]) -> str:
            return self._complete(messages, user_api_key=user_api_key, user_model=user_model, user_provider=user_provider)
        return complete

    def _get_scan(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None) -> ScanResult:
        if scan_result:
            return scan_result
        if scan_id:
            return scanner_service.get_result(scan_id)
        _, result = scanner_service.scan(repo_name, clone_url)
        return result

    def _clone_repo(self, repo_name: str, clone_url: str | None) -> Path:
        effective_clone = clone_url or f"https://github.com/{repo_name}.git"
        return self.cloner.clone(effective_clone)

    def _read_readme(self, repo_dir: Path) -> tuple[str, bool]:
        for name in ["README.md", "Readme.md", "readme.md", "README"]:
            p = repo_dir / name
            if p.exists() and p.is_file():
                return p.read_text(encoding="utf-8", errors="ignore"), True
        return "", False

    def summarize(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None, user_api_key: str | None = None, user_model: str | None = None, user_provider: str | None = None) -> str:
        scan = self._get_scan(repo_name, scan_id, scan_result, clone_url)
        key = self._cache_key("summary", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, str):
            return cached
        complete = self._bound_complete(user_api_key, user_model, user_provider)
        context = self.context_builder.build(scan)
        summary = self.summarizer.summarize(context, complete)
        self.cache.set(key, summary)
        return summary

    def architecture(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None, user_api_key: str | None = None, user_model: str | None = None, user_provider: str | None = None) -> str:
        scan = self._get_scan(repo_name, scan_id, scan_result, clone_url)
        key = self._cache_key("architecture", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, str):
            return cached
        complete = self._bound_complete(user_api_key, user_model, user_provider)
        context = self.context_builder.build(scan)
        report = self.arch_analyzer.analyze(context, complete)
        self.cache.set(key, report)
        return report

    def readme_analysis(self, repo_name: str, clone_url: str | None, scan_result: ScanResult | None = None, user_api_key: str | None = None, user_model: str | None = None, user_provider: str | None = None) -> tuple[str, ReadmeScores]:
        key = self._cache_key("readme", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, tuple):
            return cached  # type: ignore[return-value]
        complete = self._bound_complete(user_api_key, user_model, user_provider)
        repo_dir: Path | None = None
        try:
            repo_dir = self._clone_repo(repo_name, clone_url)
            content, exists = self._read_readme(repo_dir)
            analysis, (readme_score, readability_score, completeness_score) = self.readme_analyzer.analyze(content, exists, complete)
            scores = ReadmeScores(readme_score=readme_score, readability_score=readability_score, completeness_score=completeness_score)
            result = (analysis, scores)
            self.cache.set(key, result)
            return result
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Failed to analyze README: {exc}") from exc
        finally:
            if repo_dir:
                self.cloner.cleanup(repo_dir)

    def insights(self, repo_name: str, scan_id: str | None, scan_result: ScanResult | None, clone_url: str | None, user_api_key: str | None = None, user_model: str | None = None, user_provider: str | None = None) -> str:
        scan = self._get_scan(repo_name, scan_id, scan_result, clone_url)
        key = self._cache_key("insights", repo_name)
        cached = self.cache.get(key)
        if isinstance(cached, str):
            return cached
        complete = self._bound_complete(user_api_key, user_model, user_provider)
        repo_dir: Path | None = None
        try:
            repo_dir = self._clone_repo(repo_name, clone_url)
            notes = self.context_builder.memory_notes(scan, repo_dir)
            self.embeddings.upsert_notes(repo_name, notes)
            context = self.context_builder.build(scan, repo_dir)
            report = self.insight_generator.generate(context, complete)
            self.cache.set(key, report)
            return report
        finally:
            if repo_dir:
                self.cloner.cleanup(repo_dir)

    def ask(
        self,
        repo_name: str,
        question: str,
        scan_id: str | None,
        scan_result: ScanResult | None,
        clone_url: str | None,
        history: list[AskMessage] | None = None,
        user_api_key: str | None = None,
        user_model: str | None = None,
        user_provider: str | None = None,
    ) -> str:
        scan = self._get_scan(repo_name, scan_id, scan_result, clone_url)
        history_key = ""
        history_lines: list[str] = []
        if history:
            for message in history[-12:]:
                role = message.role.strip() or "unknown"
                content = message.content.strip()
                if content:
                    history_lines.append(f"{role}: {content}")
            history_key = hashlib.sha256("\n".join(history_lines).encode("utf-8")).hexdigest()[:16]
        key = self._cache_key("ask", repo_name, f"{question.strip().lower()}:{history_key}")
        cached = self.cache.get(key)
        if isinstance(cached, str):
            return cached

        complete = self._bound_complete(user_api_key, user_model, user_provider)
        context = self.context_builder.build(scan)
        memory = self.embeddings.query_notes(repo_name, question)
        history_text = "\n".join(history_lines) if history else ""
        answer = complete(ask_prompt(context, question, memory, history_text))
        self.cache.set(key, answer)
        return answer


ai_service = AIService(Path.cwd())
