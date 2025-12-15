from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.api.v1 import api_router

configure_logging(settings.log_level)
logger = get_logger(__name__)

app = FastAPI(
    title="Airport Delay Lab API",
    version="0.1.0",
    description="Delay analytics & prediction API.",
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Health check")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def on_startup() -> None:
    logger.info("API starting with data_root=%s model_dir=%s", settings.data_root, settings.model_dir)


app.include_router(api_router)
