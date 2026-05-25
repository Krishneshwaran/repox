from __future__ import annotations

from app.ai.prompt_builder import architecture_prompt


class ArchitectureAnalyzer:
    def analyze(self, context: str, complete_fn) -> str:
        return complete_fn(architecture_prompt(context))
