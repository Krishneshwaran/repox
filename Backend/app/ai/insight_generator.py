from __future__ import annotations

from app.ai.prompt_builder import insights_prompt


class InsightGenerator:
    def generate(self, context: str, complete_fn) -> str:
        return complete_fn(insights_prompt(context))
