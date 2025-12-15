from fastapi import FastAPI

from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging(settings.log_level)
logger = get_logger(__name__)

app = FastAPI(
    title="Airport Delay Lab API",
    version="0.1.0",
    description="Minimal health-checked API for the delay/congestion project.",
)


@app.get("/health", summary="Health check")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/health", summary="Versioned health check")
def health_v1() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def on_startup() -> None:
    logger.info("API starting with data_root=%s model_dir=%s", settings.data_root, settings.model_dir)
