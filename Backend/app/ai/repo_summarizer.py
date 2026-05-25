from __future__ import annotations

from app.ai.prompt_builder import summary_prompt


class RepoSummarizer:
    def summarize(self, context: str, complete_fn) -> str:
        return complete_fn(summary_prompt(context))
