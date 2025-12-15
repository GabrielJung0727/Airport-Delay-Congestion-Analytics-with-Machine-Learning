from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, validator


class PredictRequest(BaseModel):
    airport: str = Field(..., min_length=3, max_length=4, description="Airport IATA/ICAO code")
    hour: int = Field(..., ge=0, le=23)
    weekday: int = Field(..., ge=0, le=6)
    month: Optional[int] = Field(None, ge=1, le=12)
    congestion_ratio: Optional[float] = Field(None, ge=0)
    airport_hour_flights: Optional[float] = Field(None, ge=0)
    daily_flights: Optional[float] = Field(None, ge=0)
    airport_daily_avg_flights: Optional[float] = Field(None, ge=0)

    @validator("airport")
    def uppercase_airport(cls, value: str) -> str:
        return value.upper()


class PredictResponse(BaseModel):
    delay_probability: float
    predicted_label: int
    threshold: float
