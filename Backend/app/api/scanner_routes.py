from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_session
from app.models.auth import GitHubTokenSession
from app.models.scanner import (
    ScannerDiffRequest,
    ScannerDiffResponse,
    ScanResult,
    ScannerHistoryResponse,
    ScannerRequest,
    ScannerRunResponse,
    ScannerStatsResponse,
)
from app.scanner.service_registry import scanner_service

router = APIRouter(prefix="/scanner", tags=["scanner"])


@router.post("/scan", response_model=ScannerRunResponse)
async def run_scan(
    payload: ScannerRequest,
    session: GitHubTokenSession = Depends(get_current_session),
) -> ScannerRunResponse:
    scan_id, result = scanner_service.scan(payload.repo_name, payload.clone_url, session.access_token)
    return ScannerRunResponse(scan_id=scan_id, status="completed", result=result)


@router.get("/result/{scan_id}", response_model=ScanResult)
async def get_scan_result(
    scan_id: str,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> ScanResult:
    return scanner_service.get_result(scan_id)


@router.get("/stats", response_model=ScannerStatsResponse)
async def get_scan_stats(
    _session: GitHubTokenSession = Depends(get_current_session),
) -> ScannerStatsResponse:
    return ScannerStatsResponse(total_scans=scanner_service.total_scans())


@router.get("/history", response_model=ScannerHistoryResponse)
async def get_scan_history(
    limit: int = Query(default=50, ge=1, le=200),
    _session: GitHubTokenSession = Depends(get_current_session),
) -> ScannerHistoryResponse:
    return ScannerHistoryResponse(items=scanner_service.recent_history(limit))


@router.get("/history/{repo_name}", response_model=ScannerHistoryResponse)
async def get_repo_scan_history(
    repo_name: str,
    limit: int = Query(default=50, ge=1, le=200),
    _session: GitHubTokenSession = Depends(get_current_session),
) -> ScannerHistoryResponse:
    return ScannerHistoryResponse(items=scanner_service.repo_history(repo_name, limit))


@router.post("/diff", response_model=ScannerDiffResponse)
async def diff_scans(
    payload: ScannerDiffRequest,
    _session: GitHubTokenSession = Depends(get_current_session),
) -> ScannerDiffResponse:
    return scanner_service.diff_scans(payload.from_scan_id, payload.to_scan_id)
