from __future__ import annotations

import re

from app.ai.prompt_builder import readme_prompt


class ReadmeAnalyzer:
    def _score(self, readme_content: str, readme_exists: bool) -> tuple[int, int, int]:
        if not readme_exists:
            return 10, 10, 5

        content = readme_content.strip()
        lowered = content.lower()
        words = re.findall(r"[a-zA-Z0-9_\-]+", content)
        line_count = max(1, len(content.splitlines()))

        required_sections = ["installation", "setup", "usage", "contributing", "license"]
        section_hits = sum(1 for sec in required_sections if sec in lowered)

        has_code_block = "```" in content
        avg_words_per_line = len(words) / line_count

        completeness = min(100, 20 + section_hits * 14 + (12 if has_code_block else 0) + (12 if len(words) > 220 else 0))
        readability = min(100, 30 + (22 if 4 <= avg_words_per_line <= 16 else 8) + (16 if line_count > 25 else 4) + (16 if has_code_block else 0) + (16 if len(words) > 140 else 8))
        readme_score = min(100, int((completeness * 0.55) + (readability * 0.45)))
        return readme_score, readability, completeness

    def analyze(self, readme_content: str, readme_exists: bool, complete_fn) -> tuple[str, tuple[int, int, int]]:
        analysis = complete_fn(readme_prompt(readme_content, readme_exists))
        scores = self._score(readme_content, readme_exists)
        return analysis, scores
