from fastapi import APIRouter, Depends

from app.api.deps import get_current_session
from app.models.auth import GitHubTokenSession
from app.models.visualization import GraphResponse, TimelineResponse, VisualizationBaseRequest
from app.visualization.visualization_service import visualization_service

router = APIRouter(prefix="/visualization", tags=["visualization"])


@router.post("/architecture", response_model=GraphResponse)
async def architecture_graph(
    payload: VisualizationBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> GraphResponse:
    return visualization_service.architecture(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url)


@router.post("/dependencies", response_model=GraphResponse)
async def dependency_graph(
    payload: VisualizationBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> GraphResponse:
    return visualization_service.dependencies(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url)


@router.post("/api-flow", response_model=GraphResponse)
async def api_flow_graph(
    payload: VisualizationBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> GraphResponse:
    return visualization_service.api_flow(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url)


@router.post("/repository-map", response_model=GraphResponse)
async def repository_map_graph(
    payload: VisualizationBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> GraphResponse:
    return visualization_service.repository_map(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url)


@router.post("/timeline", response_model=TimelineResponse)
async def timeline_graph(
    payload: VisualizationBaseRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> TimelineResponse:
    return visualization_service.timeline(payload.repo_name, payload.scan_id, payload.scan_result, payload.clone_url)
