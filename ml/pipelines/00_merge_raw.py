"""
Builds the flights master table from MOLIT flight movement workbooks.

Usage
-----
python ml/pipelines/00_merge_raw.py \
    --input-dir data/raw/molit \
    --output data/interim/flights_master.parquet
"""

from __future__ import annotations

import argparse
import logging
import re
from pathlib import Path
from typing import Iterable

import pandas as pd

COLUMN_MAP = {
    "출발/도착": "direction",
    "공항명": "airport_name",
    "항공사": "airline",
    "편명": "flight_number",
    "도착지": "destination",
    "일자": "flight_date",
    "계획시간": "scheduled_time",
    "예상시간": "expected_time",
    "출발시간": "actual_time",
    "구분": "flight_type",
    "상태": "status",
    "지연원인": "delay_reason",
}

TIME_COLUMNS = ["scheduled_time", "expected_time", "actual_time"]
DEDUP_KEYS = ["flight_date", "flight_number", "direction", "scheduled_time", "airport_name"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge MOLIT flight schedules into master table.")
    parser.add_argument(
        "--input-dir",
        default="data/raw/molit",
        type=Path,
        help="Directory containing molit_flights_*.xlsx files.",
    )
    parser.add_argument(
        "--output",
        default="data/interim/flights_master.parquet",
        type=Path,
        help="Parquet path for the merged master table.",
    )
    parser.add_argument(
        "--invalid-log",
        default="logs/ml/00_merge_raw_invalid.csv",
        type=Path,
        help="CSV log path for rows dropped due to invalid data.",
    )
    return parser.parse_args()


def load_excel(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path)
    df = df.rename(columns=COLUMN_MAP)

    missing = set(COLUMN_MAP.values()) - set(df.columns)
    if missing:
        raise ValueError(f"{path} is missing columns: {sorted(missing)}")

    df["source_file"] = path.name
    return df[list(COLUMN_MAP.values()) + ["source_file"]]


def normalize_direction(series: pd.Series) -> pd.Series:
    mapping = {
        "출발": "departure",
        "도착": "arrival",
    }

    def _map(value: object) -> object:
        if pd.isna(value):
            return pd.NA
        cleaned = str(value).strip()
        if not cleaned:
            return pd.NA
        return mapping.get(cleaned, cleaned)

    return series.map(_map)


def normalize_time(value) -> pd.Series:
    if pd.isna(value):
        return pd.NA

    s = str(value).strip()
    if not s or s in {"-", "--", "취소", "결항"}:
        return pd.NA

    digits = re.sub(r"[^0-9]", "", s)
    if not digits:
        return pd.NA

    if len(digits) == 3:
        digits = f"0{digits}"
    elif len(digits) < 3:
        digits = digits.zfill(4)
    else:
        digits = digits[:4]

    try:
        hour = int(digits[:2])
        minute = int(digits[2:4])
    except ValueError:
        return pd.NA

    if hour > 23 or minute > 59:
        return pd.NA

    return hour * 100 + minute


def parse_flight_date(series: pd.Series) -> pd.Series:
    series = series.astype(str).str.strip()
    series = series.replace({"": pd.NA, "nan": pd.NA})
    parsed = pd.to_datetime(series, format="%Y%m%d", errors="coerce")
    return parsed


def normalize_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["direction"] = normalize_direction(df["direction"])
    df["flight_date"] = parse_flight_date(df["flight_date"])
    for col in ["flight_number", "airport_name", "destination", "airline"]:
        df[col] = (
            df[col]
            .astype(str)
            .str.strip()
            .replace({"nan": pd.NA, "": pd.NA})
        )

    for col in TIME_COLUMNS:
        df[col] = df[col].apply(normalize_time).astype("Int64")

    return df


def log_invalid_rows(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    issues = []
    issues.append(("invalid_date", df["flight_date"].isna()))
    issues.append(("missing_flight_number", df["flight_number"].isna()))
    issues.append(("missing_airport", df["airport_name"].isna()))
    issues.append(("missing_scheduled_time", df["scheduled_time"].isna()))

    issue_col = pd.Series("", index=df.index, dtype="object")
    for label, mask in issues:
        issue_col = issue_col.mask(mask & issue_col.eq(""), label)
        issue_col = issue_col.mask(mask & issue_col.ne(""), issue_col + "|" + label)

    df = df.copy()
    df["issues"] = issue_col

    invalid = df[df["issues"] != ""]
    valid = df[df["issues"] == ""].drop(columns=["issues"])
    return valid, invalid


def drop_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    result = df.drop_duplicates(subset=DEDUP_KEYS, keep="first")
    logging.info("Dropped %s duplicate rows", before - len(result))
    return result


def run_pipeline(input_dir: Path, output: Path, invalid_log: Path) -> None:
    files: Iterable[Path] = sorted(input_dir.glob("molit_flights_*.xlsx"))
    if not files:
        raise FileNotFoundError(f"No molit_flights_*.xlsx files found under {input_dir}")

    logging.info("Found %d workbook(s)", len(files))
    frames = [normalize_frame(load_excel(path)) for path in files]
    merged = pd.concat(frames, ignore_index=True)
    logging.info("Merged %d rows from %d files", len(merged), len(frames))

    valid, invalid = log_invalid_rows(merged)
    logging.info("Valid rows: %d, Invalid rows: %d", len(valid), len(invalid))

    valid = drop_duplicates(valid)

    output.parent.mkdir(parents=True, exist_ok=True)
    valid.to_parquet(output, index=False)
    logging.info("Saved flights master table → %s", output)

    if not invalid.empty:
        invalid_log.parent.mkdir(parents=True, exist_ok=True)
        invalid.to_csv(invalid_log, index=False)
        logging.info("Logged %d invalid rows → %s", len(invalid), invalid_log)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args()
    run_pipeline(args.input_dir, args.output, args.invalid_log)


if __name__ == "__main__":
    main()
