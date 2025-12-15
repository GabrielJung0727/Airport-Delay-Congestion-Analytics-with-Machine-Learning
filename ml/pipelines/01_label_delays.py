"""
Phase 3: derive delay minutes and labels from the flights master table.

Usage:
python ml/pipelines/01_label_delays.py \
  --input data/interim/flights_master.parquet \
  --output data/interim/flights_labeled.parquet \
  --stats data/interim/flights_labeled_stats.json
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd

DELAY_THRESHOLD_MINUTES = 15
CANCELLATION_KEYWORDS = {"취소", "결항"}
DIVERSION_KEYWORDS = {"회항"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create delay labels from flights master table.")
    parser.add_argument("--input", type=Path, default=Path("data/interim/flights_master.parquet"))
    parser.add_argument("--output", type=Path, default=Path("data/interim/flights_labeled.parquet"))
    parser.add_argument("--stats", type=Path, default=Path("data/interim/flights_labeled_stats.json"))
    parser.add_argument("--log", type=Path, default=Path("logs/ml/01_label_delays.log"))
    return parser.parse_args()


def hhmm_to_minutes(value: pd.Series) -> pd.Series:
    if value.dtype.name == "Int64":
        series = value.astype("float64")
    else:
        series = value.astype("float64", errors="ignore")

    def convert(val):
        if pd.isna(val):
            return np.nan
        hour = int(val) // 100
        minute = int(val) % 100
        return hour * 60 + minute

    return series.map(convert)


def compute_delay_minutes(df: pd.DataFrame) -> pd.Series:
    scheduled = hhmm_to_minutes(df["scheduled_time"])
    actual = hhmm_to_minutes(df["actual_time"].fillna(df["expected_time"]))
    delay = actual - scheduled
    return delay


def flag_special_status(status: pd.Series) -> pd.Series:
    def classify(value: object) -> str | None:
        if pd.isna(value):
            return None
        text = str(value)
        if any(keyword in text for keyword in CANCELLATION_KEYWORDS):
            return "cancelled"
        if any(keyword in text for keyword in DIVERSION_KEYWORDS):
            return "diverted"
        return None

    return status.map(classify)


def label_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["special_status"] = flag_special_status(df["status"])

    df["delay_minutes"] = compute_delay_minutes(df)
    df.loc[df["special_status"].notna(), "delay_minutes"] = pd.NA

    df["delay_label"] = (
        df["delay_minutes"].astype("float64").ge(DELAY_THRESHOLD_MINUTES).astype("Int64")
    )
    df.loc[df["delay_minutes"].isna(), "delay_label"] = pd.NA
    return df


def compute_stats(df: pd.DataFrame) -> dict[str, float]:
    valid = df["delay_label"].dropna()
    if valid.empty:
        return {
            "total_rows": len(df),
            "labeled_rows": 0,
            "delay_rate": None,
            "cancelled_rows": int(df["special_status"].eq("cancelled").sum()),
            "diverted_rows": int(df["special_status"].eq("diverted").sum()),
        }
    delay_rate = float(valid.mean())
    return {
        "total_rows": len(df),
        "labeled_rows": int(valid.count()),
        "delay_rate": round(delay_rate, 4),
        "cancelled_rows": int(df["special_status"].eq("cancelled").sum()),
        "diverted_rows": int(df["special_status"].eq("diverted").sum()),
    }


def run(input_path: Path, output: Path, stats_path: Path) -> dict[str, float]:
    df = pd.read_parquet(input_path)
    labeled = label_dataframe(df)
    labeled["label_source"] = "ICAO15"

    output.parent.mkdir(parents=True, exist_ok=True)
    labeled.to_parquet(output, index=False)
    logging.info("Saved labeled flights → %s", output)

    stats = compute_stats(labeled)
    stats_path.parent.mkdir(parents=True, exist_ok=True)
    stats_path.write_text(json.dumps(stats, indent=2, ensure_ascii=False))
    logging.info("Stats: %s", stats)

    return stats


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run(args.input, args.output, args.stats)


if __name__ == "__main__":
    main()
