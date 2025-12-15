from __future__ import annotations

from fastapi import APIRouter

from app.utils.responses import wrap_response

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", summary="API health status")
def health_check() -> dict:
    return wrap_response({"status": "ok"})
