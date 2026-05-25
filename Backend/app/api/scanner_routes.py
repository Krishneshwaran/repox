from fastapi import APIRouter, Depends

from app.api.deps import get_current_session
from app.models.auth import GitHubTokenSession
from app.models.scanner import ScanResult, ScannerRequest, ScannerRunResponse
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
