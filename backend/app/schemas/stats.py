from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class AirportStatsResponse(BaseModel):
    airport: str
    from_date: date
    to_date: date
    avg_delay_rate: float
    total_flights: int
    peak_hour: Optional[int]


class HourlyStat(BaseModel):
    hour: int
    delay_rate: float
    hourly_congestion_ratio: float
    airport_hour_flights: float


class TimeseriesPoint(BaseModel):
    date: date
    delay_rate: float
    flights: int


class StatsEnvelope(BaseModel):
    data: dict
    meta: dict
