from fastapi import APIRouter

from app.api.v1 import routes_health, routes_predict, routes_stats

api_router = APIRouter()
api_router.include_router(routes_health.router)
api_router.include_router(routes_stats.router)
api_router.include_router(routes_predict.router)
