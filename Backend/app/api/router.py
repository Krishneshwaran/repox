from fastapi import APIRouter

from app.api.auth_routes import router as auth_router
from app.api.github_routes import router as github_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(github_router)
