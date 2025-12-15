from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.schemas.stats import AirportStatsResponse, HourlyStat, TimeseriesPoint
from app.services.data_repository import DataRepository
from app.services.dependencies import get_repository
from app.utils.responses import wrap_response

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


@router.get("/airport")
def get_airport_stats(
    airport: str = Query(..., min_length=3, max_length=4, description="Airport IATA/ICAO code"),
    start: Optional[date] = Query(None, description="Start date (inclusive)"),
    end: Optional[date] = Query(None, description="End date (inclusive)"),
    repo: DataRepository = Depends(get_repository),
) -> dict:
    try:
        stats = repo.airport_stats(airport.upper(), start, end)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return wrap_response(stats)


@router.get("/hourly")
def get_hourly_stats(
    airport: Optional[str] = Query(None, min_length=3, max_length=4),
    repo: DataRepository = Depends(get_repository),
) -> dict:
    stats = repo.hourly_stats(airport.upper() if airport else None)
    return wrap_response({"items": stats})


@router.get("/timeseries")
def get_timeseries_stats(
    airport: Optional[str] = Query(None, min_length=3, max_length=4),
    repo: DataRepository = Depends(get_repository),
) -> dict:
    stats = repo.timeseries_stats(airport.upper() if airport else None)
    return wrap_response({"items": stats})
