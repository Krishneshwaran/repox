from fastapi import APIRouter, Depends

from app.ai.ai_service import ai_service
from app.api.deps import get_current_session
from app.models.ai import (
    AIBaseRequest,
    ArchitectureResponse,
    AskConversationRequest,
    AskResponse,
    InsightResponse,
    ReadmeAnalysisResponse,
    SummarizeResponse,
)
from app.models.auth import GitHubTokenSession

router = APIRouter(prefix="/ai", tags=["ai"])


def _overrides(p: AIBaseRequest) -> dict:
    return {"user_api_key": p.user_api_key, "user_model": p.user_model, "user_provider": p.user_provider}


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_repo(
    payload: AIBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> SummarizeResponse:
    summary = ai_service.summarize(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url, **_overrides(payload))
    return SummarizeResponse(summary=summary)


@router.post("/architecture", response_model=ArchitectureResponse)
async def architecture_overview(
    payload: AIBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> ArchitectureResponse:
    report = ai_service.architecture(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url, **_overrides(payload))
    return ArchitectureResponse(architecture=report)


@router.post("/readme-analysis", response_model=ReadmeAnalysisResponse)
async def readme_analysis(
    payload: AIBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> ReadmeAnalysisResponse:
    report, scores = ai_service.readme_analysis(payload.repo_name, payload.clone_url, payload.scan_result, **_overrides(payload))
    return ReadmeAnalysisResponse(analysis=report, scores=scores)


@router.post("/insights", response_model=InsightResponse)
async def repository_insights(
    payload: AIBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> InsightResponse:
    report = ai_service.insights(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url, **_overrides(payload))
    return InsightResponse(insights=report)


@router.post("/ask", response_model=AskResponse)
async def ask_repo(
    payload: AskConversationRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> AskResponse:
    answer = ai_service.ask(
        payload.repo_name,
        payload.question,
        payload.scan_id,
        payload.scan_result,
        payload.clone_url,
        payload.history,
        **_overrides(payload),
    )
    return AskResponse(answer=answer)
