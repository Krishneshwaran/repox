from __future__ import annotations

from app.models.scanner import ScanResult


def summary_prompt(context: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You are a senior software architect. Provide concise, technical, developer-facing markdown. "
                "Use sections: Repository Summary, Purpose, Technologies, Architecture Style, Complexity, Health."
            ),
        },
        {"role": "user", "content": f"Generate repository summary from context:\n\n{context}"},
    ]


def architecture_prompt(context: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You explain architecture for engineering teams. Be concrete and avoid generic wording. "
                "Use sections: Frontend/Backend Relationship, API Flow, Service Structure, Folder Organization, Scalability Observations."
            ),
        },
        {"role": "user", "content": f"Explain architecture from context:\n\n{context}"},
    ]


def readme_prompt(readme_content: str, readme_exists: bool) -> list[dict[str, str]]:
    source = readme_content[:14000] if readme_exists else "README not found"
    return [
        {
            "role": "system",
            "content": (
                "You are a technical documentation reviewer. Return concise markdown with sections: "
                "Quality Assessment, Missing Sections, Setup Clarity, Onboarding Quality, Improvement Suggestions."
            ),
        },
        {"role": "user", "content": f"Analyze this README:\n\n{source}"},
    ]


def insights_prompt(context: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You are performing a repository engineering review. Use sections: Strengths, Weaknesses, "
                "Maintainability, Scalability, Technical Debt Indicators, Architecture Risks."
            ),
        },
        {"role": "user", "content": f"Generate repository insights from context:\n\n{context}"},
    ]


def ask_prompt(
    context: str,
    question: str,
    memory_notes: str = "",
    history: str = "",
) -> list[dict[str, str]]:
    memory_block = f"\n\nRepository memory notes:\n{memory_notes}" if memory_notes else ""
    history_block = f"\n\nConversation history:\n{history}" if history else ""
    return [
        {
            "role": "system",
            "content": (
                "You answer repository questions with technical precision in plain English. "
                "Respond in 1 to 3 short sentences. "
                "Do not use markdown, headings, bullets, numbered lists, code fences, or preambles. "
                "Do not start with phrases like 'Inferred purpose'. "
                "Answer directly and only describe what is supported by the repository context. "
                "If evidence is missing, explicitly say unknown and mention what files or signals would confirm it."
            ),
        },
        {
            "role": "user",
            "content": f"Repository context:\n{context}{memory_block}{history_block}\n\nQuestion: {question}",
        },
    ]


def fallback_summary(scan: ScanResult) -> str:
    structure_flags = [k for k, v in scan.structure.items() if v]
    return (
        "## Repository Summary\n"
        f"- Purpose: Repository `{scan.repo_name}` appears to be a {scan.backend_framework}/{scan.frontend_framework} codebase.\n"
        f"- Technologies: {', '.join(scan.languages) or 'Unknown'}; frameworks: {scan.frontend_framework}, {scan.backend_framework}.\n"
        f"- Architecture Style: {'Monorepo or layered' if len(structure_flags) > 2 else 'Compact service'}.\n"
        f"- Complexity: {'High' if len(scan.dependencies) > 40 else 'Moderate' if len(scan.dependencies) > 12 else 'Low'}.\n"
        f"- Health: README={'present' if scan.documentation.get('readme') else 'missing'}, docker={'yes' if scan.docker else 'no'}, CI={'yes' if scan.github_actions else 'no'}."
    )
