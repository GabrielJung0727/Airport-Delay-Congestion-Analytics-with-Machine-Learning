from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd


class DataRepository:
    """Provides access to processed training data for stats and inference."""

    def __init__(self, table_path: Path) -> None:
        self.table_path = table_path
        self._df = self._load()

    def _load(self) -> pd.DataFrame:
        if not self.table_path.exists():
            raise FileNotFoundError(f"Train table not found at {self.table_path}")
        df = pd.read_parquet(self.table_path)
        df["flight_date"] = pd.to_datetime(df["flight_date"])
        if "airport_code" not in df.columns:
            df["airport_code"] = df["airport_name"]
        df["airport_code"] = df["airport_code"].str.upper()
        return df

    @property
    def df(self) -> pd.DataFrame:
        return self._df

    def refresh(self) -> None:
        self._df = self._load()

    def _filter(
        self,
        airport_code: Optional[str],
        start_date: Optional[date],
        end_date: Optional[date],
    ) -> pd.DataFrame:
        df = self.df
        if airport_code:
            df = df[df["airport_code"] == airport_code.upper()]
        if start_date:
            df = df[df["flight_date"] >= pd.Timestamp(start_date)]
        if end_date:
            df = df[df["flight_date"] <= pd.Timestamp(end_date)]
        return df

    def list_airports(self) -> Dict[str, str]:
        sample = (
            self.df[["airport_code", "airport_name"]]
            .dropna()
            .drop_duplicates()
        )
        return dict(zip(sample["airport_code"], sample["airport_name"]))

    def airport_stats(
        self,
        airport_code: str,
        start_date: Optional[date],
        end_date: Optional[date],
    ) -> Dict[str, Any]:
        filtered = self._filter(airport_code, start_date, end_date)
        if filtered.empty:
            raise ValueError("No flights available for the specified filters.")

        total_flights = int(len(filtered))
        avg_delay_rate = float(filtered["delay_label"].mean())
        peak_hour_series = (
            filtered.groupby("hour")["delay_label"]
            .mean()
            .sort_values(ascending=False)
        )
        peak_hour = int(peak_hour_series.index[0]) if not peak_hour_series.empty else None
        latest_date = filtered["flight_date"].max()
        earliest_date = filtered["flight_date"].min()

        return {
            "airport": airport_code.upper(),
            "from_date": earliest_date.date().isoformat(),
            "to_date": latest_date.date().isoformat(),
            "avg_delay_rate": avg_delay_rate,
            "total_flights": total_flights,
            "peak_hour": peak_hour,
        }

    def hourly_stats(self, airport_code: Optional[str]) -> list[Dict[str, Any]]:
        filtered = self._filter(airport_code, None, None)
        if filtered.empty:
            return []
        grouped = (
            filtered.groupby("hour")
            .agg(
                delay_rate=("delay_label", "mean"),
                congestion=("hourly_congestion_ratio", "mean"),
                flights=("airport_hour_flights", "mean"),
            )
            .reset_index()
            .sort_values("hour")
        )
        grouped["hour"] = grouped["hour"].astype(int)
        results: list[Dict[str, Any]] = []
        for _, row in grouped.iterrows():
            results.append(
                {
                    "hour": int(row["hour"]),
                    "delay_rate": float(row["delay_rate"]),
                    "hourly_congestion_ratio": float(row["congestion"]),
                    "airport_hour_flights": float(row["flights"]),
                }
            )
        return results

    def timeseries_stats(self, airport_code: Optional[str]) -> list[Dict[str, Any]]:
        filtered = self._filter(airport_code, None, None)
        if filtered.empty:
            return []
        grouped = (
            filtered.groupby("flight_date")
            .agg(delay_rate=("delay_label", "mean"), flights=("delay_label", "count"))
            .reset_index()
            .sort_values("flight_date")
        )
        results: list[Dict[str, Any]] = []
        for _, row in grouped.iterrows():
            results.append(
                {
                    "date": row["flight_date"].date().isoformat(),
                    "delay_rate": float(row["delay_rate"]),
                    "flights": int(row["flights"]),
                }
            )
        return results

    def sample_row(self, airport_code: str, hour: int, weekday: int) -> pd.Series:
        df = self.df
        mask = (
            (df["airport_code"] == airport_code.upper())
            & (df["hour"] == hour)
            & (df["weekday"] == weekday)
        )
        candidates = df[mask]
        if candidates.empty:
            candidates = df[df["airport_code"] == airport_code.upper()]
        if candidates.empty:
            candidates = df
        return candidates.sort_values("flight_date").iloc[-1]
