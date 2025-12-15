"""
Phase 4: build congestion-oriented feature tables by combining
KAC aggregated statistics with flight-level aggregates.

Outputs
-------
1. `data/interim/features_congestion.parquet`
2. `data/interim/congestion_features_stats.json`
3. Normalized reference tables in `data/interim/kac_*.parquet`
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import pandas as pd

AIRSIDE_MAP: Dict[str, str] = {
    "인천": "ICN",
    "김포": "GMP",
    "김해": "PUS",
    "제주": "CJU",
    "대구": "TAE",
    "광주": "KWJ",
    "무안": "MWX",
    "청주": "CJJ",
    "양양": "YNY",
    "여수": "RSU",
    "울산": "USN",
    "목포": "MPK",
    "사천": "HIN",
    "포항경주": "KPO",
    "군산": "KUV",
    "원주": "WJU",
}

WEEKDAY_MAP = {
    "월요일": 0,
    "화요일": 1,
    "수요일": 2,
    "목요일": 3,
    "금요일": 4,
    "토요일": 5,
    "일요일": 6,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build congestion feature table.")
    parser.add_argument("--flights", type=Path, default=Path("data/interim/flights_labeled.parquet"))
    parser.add_argument("--kac-airport", type=Path, default=Path("data/raw/kac/kac_airport_stats_20050101_20251215.xlsx"))
    parser.add_argument("--kac-hourly", type=Path, default=Path("data/raw/kac/kac_hourly_stats_20050101_20251215.xlsx"))
    parser.add_argument("--kac-weekday", type=Path, default=Path("data/raw/kac/kac_weekday_stats_20050101_20251215.xlsx"))
    parser.add_argument("--kac-timeseries", type=Path, default=Path("data/raw/kac/kac_timeseries_stats_20050101_20251215.xlsx"))
    parser.add_argument("--output", type=Path, default=Path("data/interim/features_congestion.parquet"))
    parser.add_argument("--stats", type=Path, default=Path("data/interim/congestion_features_stats.json"))
    parser.add_argument("--cache-dir", type=Path, default=Path("data/interim"))
    return parser.parse_args()


def _to_float(value: object) -> Optional[float]:
    if pd.isna(value):
        return np.nan
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value)
    s = str(value).strip().replace(",", "")
    if not s or s in {"-", "--"}:
        return np.nan
    try:
        return float(s)
    except ValueError:
        return np.nan


def _standardize_airport(name: object) -> Optional[str]:
    if pd.isna(name):
        return None
    cleaned = str(name).strip()
    if not cleaned:
        return None
    return AIRSIDE_MAP.get(cleaned, cleaned.upper())


def _prepare_base(df: pd.DataFrame, rename_map: Dict[str, str], drop_rows: int) -> pd.DataFrame:
    df = df.copy()
    df = df.dropna(how="all")
    df = df.iloc[drop_rows:].copy()
    df = df.rename(columns=rename_map)
    return df.reset_index(drop=True)


def load_kac_airport(path: Path) -> pd.DataFrame:
    mapping = {
        "노선 구분": "airport_name_ko",
        "전체": "flights_arrivals",
        "운항 구분": "flights_departures",
        "전체.1": "flights_total",
        "여객화물 구분": "passengers_arrivals",
        "전체.2": "passengers_departures",
        "여객 구분": "passengers_total",
        "전체.3": "cargo_arrivals",
        "화물 구분": "cargo_departures",
        "전체.4": "cargo_total",
    }
    df = pd.read_excel(path, header=4)
    df = _prepare_base(df, mapping, drop_rows=3)
    df = df[df["airport_name_ko"].notna()]
    df = df[df["airport_name_ko"] != "합계"]
    numeric_cols = [c for c in df.columns if c != "airport_name_ko"]
    for col in numeric_cols:
        df[col] = df[col].map(_to_float)
    df["airport_code"] = df["airport_name_ko"].map(_standardize_airport)
    flights_sum = df["flights_total"].sum()
    df["airport_flight_share"] = df["flights_total"] / flights_sum
    return df


def load_kac_hourly(path: Path) -> pd.DataFrame:
    mapping = {
        "노선 구분": "hour_label",
        "전체": "flights_arrivals",
        "운항 구분": "flights_departures",
        "전체.1": "flights_total",
    }
    df = pd.read_excel(path, header=4)
    df = _prepare_base(df, mapping, drop_rows=3)
    df = df[df["hour_label"].notna()]
    df = df[df["hour_label"] != "시간대"]
    df = df[df["hour_label"] != "합계"]
    for col in ["flights_arrivals", "flights_departures", "flights_total"]:
        df[col] = df[col].map(_to_float)

    def parse_hour(label: str) -> Optional[int]:
        label = label.strip()
        if not label:
            return None
        try:
            hour = int(label.split(":")[0])
            return hour
        except (ValueError, IndexError):
            return None

    df["hour"] = df["hour_label"].map(parse_hour)
    df = df[df["hour"].notna()]
    df["hour_ratio"] = df["flights_total"] / df["flights_total"].mean()
    return df[["hour", "hour_ratio"]]


def load_kac_weekday(path: Path) -> pd.DataFrame:
    mapping = {
        "노선 구분": "weekday_name",
        "전체": "flights_arrivals",
        "운항 구분": "flights_departures",
        "전체.1": "flights_total",
    }
    df = pd.read_excel(path, header=4)
    df = _prepare_base(df, mapping, drop_rows=3)
    df = df[df["weekday_name"].notna()]
    df = df[df["weekday_name"] != "요일"]
    df = df[df["weekday_name"] != "합계"]
    for col in ["flights_arrivals", "flights_departures", "flights_total"]:
        df[col] = df[col].map(_to_float)
    df["weekday"] = df["weekday_name"].map(WEEKDAY_MAP)
    df = df[df["weekday"].notna()]
    df["weekday_ratio"] = df["flights_total"] / df["flights_total"].mean()
    return df[["weekday", "weekday_ratio"]]


def load_kac_timeseries(path: Path) -> pd.DataFrame:
    mapping = {
        "노선 구분": "airport_name_ko",
        "전체": "year",
        "운항 구분": "month",
        "전체.1": "flights_arrivals",
        "여객화물 구분": "flights_departures",
        "전체.2": "flights_total",
        "여객 구분": "passengers_arrivals",
        "전체.3": "passengers_departures",
        "화물 구분": "passengers_total",
        "전체.4": "cargo_arrivals",
        "연도/월 구분": "cargo_departures",
        "전체.5": "cargo_total",
    }
    df = pd.read_excel(path, header=4)
    df = _prepare_base(df, mapping, drop_rows=3)
    df = df[df["airport_name_ko"].notna()]
    numeric_cols = [c for c in df.columns if c not in {"airport_name_ko"}]
    for col in numeric_cols:
        df[col] = df[col].map(_to_float)
    df["month"] = df["month"].astype("Int64")
    df = df[df["month"].notna()]
    df["monthly_ratio"] = df["flights_total"] / df["flights_total"].mean()
    df["airport_code"] = df["airport_name_ko"].map(_standardize_airport)
    return df[["airport_code", "year", "month", "monthly_ratio"]]


def build_flight_features(flights_path: Path) -> pd.DataFrame:
    flights = pd.read_parquet(flights_path)
    flights = flights[flights["special_status"].isna()].copy()
    flights["flight_date"] = pd.to_datetime(flights["flight_date"])
    flights["hour"] = (flights["scheduled_time"] // 100).astype("Int64")
    flights = flights[flights["hour"].notna()]
    flights["airport_name_ko"] = flights["airport_name"].str.strip()
    flights["airport_code"] = flights["airport_name_ko"].map(_standardize_airport)
    flights["weekday"] = flights["flight_date"].dt.weekday
    flights["year"] = flights["flight_date"].dt.year
    flights["month"] = flights["flight_date"].dt.month

    daily_counts = (
        flights.groupby(["airport_code", "flight_date"])
        .size()
        .reset_index(name="daily_flights")
    )
    airport_daily_avg = (
        daily_counts.groupby("airport_code")["daily_flights"].mean().reset_index(name="airport_daily_avg_flights")
    )

    hourly_stats = (
        flights.groupby(["airport_code", "flight_date", "hour"])
        .agg(
            airport_hour_flights=("flight_number", "count"),
            delay_rate=("delay_label", lambda x: x.dropna().mean()),
        )
        .reset_index()
    )
    hourly_stats["delay_rate"] = hourly_stats["delay_rate"].fillna(0.0)

    hourly_stats = hourly_stats.merge(daily_counts, on=["airport_code", "flight_date"], how="left")
    hourly_stats = hourly_stats.merge(airport_daily_avg, on="airport_code", how="left")

    hourly_stats = hourly_stats.sort_values(["airport_code", "flight_date", "hour"])
    hourly_stats["previous_hour_delay_rate"] = (
        hourly_stats.groupby(["airport_code", "flight_date"])["delay_rate"].shift(1)
    )

    daily_delay = (
        flights.groupby(["airport_code", "flight_date"])["delay_label"]
        .mean()
        .reset_index(name="daily_delay_rate")
    )
    daily_delay["prev_day_delay_rate"] = (
        daily_delay.sort_values(["airport_code", "flight_date"])
        .groupby("airport_code")["daily_delay_rate"]
        .shift(1)
    )

    hourly_stats = hourly_stats.merge(
        daily_delay[["airport_code", "flight_date", "prev_day_delay_rate"]],
        on=["airport_code", "flight_date"],
        how="left",
    )

    hourly_stats["hourly_congestion_ratio"] = hourly_stats["airport_hour_flights"] / (
        hourly_stats["daily_flights"] / 24.0
    )
    hourly_stats["hourly_congestion_ratio"] = hourly_stats["hourly_congestion_ratio"].replace([np.inf, -np.inf], np.nan)
    hourly_stats["weekday"] = hourly_stats["flight_date"].dt.weekday
    hourly_stats["month"] = hourly_stats["flight_date"].dt.month

    airport_names = flights[["airport_code", "airport_name_ko"]].drop_duplicates(subset="airport_code")
    hourly_stats = hourly_stats.merge(airport_names, on="airport_code", how="left")

    return hourly_stats


def run_pipeline(args: argparse.Namespace) -> dict[str, float]:
    kac_airport = load_kac_airport(args.kac_airport)
    kac_hourly = load_kac_hourly(args.kac_hourly)
    kac_weekday = load_kac_weekday(args.kac_weekday)
    kac_timeseries = load_kac_timeseries(args.kac_timeseries)

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    kac_airport.to_parquet(args.cache_dir / "kac_airport_stats.parquet", index=False)
    kac_hourly.to_parquet(args.cache_dir / "kac_hourly_ratios.parquet", index=False)
    kac_weekday.to_parquet(args.cache_dir / "kac_weekday_ratios.parquet", index=False)
    kac_timeseries.to_parquet(args.cache_dir / "kac_monthly_ratios.parquet", index=False)

    flight_features = build_flight_features(args.flights)

    features = flight_features.merge(
        kac_airport[["airport_code", "airport_flight_share", "passengers_total", "cargo_total"]],
        on="airport_code",
        how="left",
    )
    features = features.merge(kac_hourly, on="hour", how="left")
    features = features.merge(kac_weekday, on="weekday", how="left")

    monthly_ratio = (
        kac_timeseries.groupby("month")["monthly_ratio"].mean().reset_index(name="monthly_ratio")
    )
    features = features.merge(monthly_ratio, on="month", how="left", suffixes=("", "_national"))

    output_cols = [
        "airport_code",
        "airport_name_ko",
        "flight_date",
        "hour",
        "weekday",
        "month",
        "airport_hour_flights",
        "daily_flights",
        "airport_daily_avg_flights",
        "hourly_congestion_ratio",
        "previous_hour_delay_rate",
        "prev_day_delay_rate",
        "delay_rate",
        "airport_flight_share",
        "passengers_total",
        "cargo_total",
        "hour_ratio",
        "weekday_ratio",
        "monthly_ratio",
    ]
    features = features[output_cols]

    args.output.parent.mkdir(parents=True, exist_ok=True)
    features.to_parquet(args.output, index=False)
    logging.info("Saved congestion features → %s (%d rows)", args.output, len(features))

    stats = {
        "rows": int(len(features)),
        "airports": int(features["airport_code"].nunique()),
        "date_start": str(features["flight_date"].min()),
        "date_end": str(features["flight_date"].max()),
        "avg_hourly_congestion": float(features["hourly_congestion_ratio"].mean()),
        "avg_delay_rate": float(features["delay_rate"].mean()),
    }
    args.stats.parent.mkdir(parents=True, exist_ok=True)
    args.stats.write_text(json.dumps(stats, indent=2, ensure_ascii=False))
    logging.info("Stats: %s", stats)
    return stats


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run_pipeline(args)


if __name__ == "__main__":
    main()
