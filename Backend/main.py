from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings

settings = get_settings()

app = FastAPI(title="repoX API", version="0.1.0")

origins = {settings.frontend_origin}
if "localhost" in settings.frontend_origin:
    origins.add(settings.frontend_origin.replace("localhost", "127.0.0.1"))
if "127.0.0.1" in settings.frontend_origin:
    origins.add(settings.frontend_origin.replace("127.0.0.1", "localhost"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "repoX backend"}


app.include_router(api_router)
