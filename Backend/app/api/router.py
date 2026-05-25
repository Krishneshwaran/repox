from fastapi import APIRouter

from app.api.ai_routes import router as ai_router
from app.api.auth_routes import router as auth_router
from app.api.github_routes import router as github_router
from app.api.scanner_routes import router as scanner_router
from app.api.visualization_routes import router as visualization_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(github_router)
api_router.include_router(scanner_router)
api_router.include_router(ai_router)
api_router.include_router(visualization_router)
