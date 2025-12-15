"""
Phase 5: join flight-level records with congestion features to build the final
training table.

Usage:
python ml/pipelines/03_build_train_table.py \
  --flights data/interim/flights_labeled.parquet \
  --congestion data/interim/features_congestion.parquet \
  --output data/processed/train_table.parquet
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

NUMERIC_FEATURES = [
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
    "national_hour_ratio",
    "national_weekday_ratio",
    "national_monthly_ratio",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build train table by joining flight rows with congestion features.")
    parser.add_argument("--flights", type=Path, default=Path("data/interim/flights_labeled.parquet"))
    parser.add_argument("--congestion", type=Path, default=Path("data/interim/features_congestion.parquet"))
    parser.add_argument("--output", type=Path, default=Path("data/processed/train_table.parquet"))
    parser.add_argument("--stats", type=Path, default=Path("data/processed/train_table_stats.json"))
    return parser.parse_args()


def _standardize_airport(name: object) -> Optional[str]:
    if pd.isna(name):
        return None
    cleaned = str(name).strip()
    if not cleaned:
        return None
    return AIRSIDE_MAP.get(cleaned, cleaned.upper())


def load_flights(path: Path) -> pd.DataFrame:
    df = pd.read_parquet(path)
    df = df[df["special_status"].isna()].copy()
    df = df[df["delay_label"].notna()]
    df["flight_date"] = pd.to_datetime(df["flight_date"])
    df["hour"] = (df["scheduled_time"] // 100).astype("Int64")
    df = df[df["hour"].notna()]
    df["weekday"] = df["flight_date"].dt.weekday
    df["month"] = df["flight_date"].dt.month
    df["is_weekend"] = df["weekday"].isin([5, 6]).astype("Int64")
    df["scheduled_minutes"] = ((df["hour"] * 60) + (df["scheduled_time"] % 100)).astype("Int64")
    df["airport_code"] = df["airport_name"].map(_standardize_airport)
    return df


def load_congestion(path: Path) -> pd.DataFrame:
    df = pd.read_parquet(path)
    df["flight_date"] = pd.to_datetime(df["flight_date"])
    return df


def impute_numeric(df: pd.DataFrame, ref: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    medians = ref[NUMERIC_FEATURES].median()
    for col in NUMERIC_FEATURES:
        fill_value = medians.get(col)
        if pd.isna(fill_value):
            fill_value = 0.0
        df[col] = df[col].fillna(fill_value)
    return df


def build_train_table(flights: pd.DataFrame, congestion: pd.DataFrame) -> pd.DataFrame:
    merged = flights.merge(
        congestion,
        on=["airport_code", "flight_date", "hour"],
        how="left",
        suffixes=("", "_agg"),
    )
    merged = impute_numeric(merged, congestion)
    return merged


def run_pipeline(args: argparse.Namespace) -> dict[str, object]:
    flights = load_flights(args.flights)
    congestion = load_congestion(args.congestion)
    train = build_train_table(flights, congestion)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    train.to_parquet(args.output, index=False)
    logging.info("Saved train table → %s (%d rows)", args.output, len(train))

    stats = {
        "rows": int(len(train)),
        "airports": int(train["airport_code"].nunique()),
        "delay_rate": float(train["delay_label"].mean()),
        "date_start": str(train["flight_date"].min()),
        "date_end": str(train["flight_date"].max()),
        "missing_after_impute": {
            col: int(train[col].isna().sum()) for col in NUMERIC_FEATURES
        },
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
