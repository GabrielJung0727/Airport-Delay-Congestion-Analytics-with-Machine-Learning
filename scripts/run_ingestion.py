"""
Fetches data from the four public aviation APIs listed in docs/04_api_specs.md.

Raw responses are stored under `data/external/api_raw/<source>/<timestamp>.json`
and normalized tables under `data/external/api_clean/<source>/<timestamp>.parquet`.

Example:
    python scripts/run_ingestion.py --max-records 50
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import pandas as pd
import requests
import xmltodict
from dotenv import load_dotenv

DATA_ROOT = Path("data/external")
RAW_DIR = DATA_ROOT / "api_raw"
CLEAN_DIR = DATA_ROOT / "api_clean"


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def ensure_dirs(source: str) -> tuple[Path, Path]:
    raw_path = RAW_DIR / source
    clean_path = CLEAN_DIR / source
    raw_path.mkdir(parents=True, exist_ok=True)
    clean_path.mkdir(parents=True, exist_ok=True)
    return raw_path, clean_path


def parse_records(payload: Any, record_path: Iterable[str]) -> List[Dict[str, Any]]:
    data = payload
    for key in record_path:
        if data is None:
            break
        if isinstance(data, dict):
            data = data.get(key)
        else:
            break
    if data is None:
        return []
    if isinstance(data, list):
        records = data
    else:
        records = [data]
    normalized: List[Dict[str, Any]] = []
    for record in records:
        if isinstance(record, dict):
            normalized.append(record)
        else:
            normalized.append({"value": record})
    return normalized


def write_raw(source: str, timestamp: str, payload: Any) -> Path:
    raw_dir, _ = ensure_dirs(source)
    raw_path = raw_dir / f"{timestamp}.json"
    with raw_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return raw_path


def write_clean(source: str, timestamp: str, records: List[Dict[str, Any]]) -> Path:
    _, clean_dir = ensure_dirs(source)
    df = pd.DataFrame(records) if records else pd.DataFrame([{"empty": True}])
    df["source"] = source
    df["fetched_at"] = timestamp
    clean_path = clean_dir / f"{timestamp}.parquet"
    df.to_parquet(clean_path, index=False)
    return clean_path


def fetch_api(name: str, spec: Dict[str, Any], max_records: Optional[int], dry_run: bool) -> Dict[str, Any]:
    timestamp = utc_timestamp()
    if dry_run:
        fake_payload = {"meta": {"dry_run": True}, "items": [{"message": f"{name}-sample", "ts": timestamp}]}
        write_raw(name, timestamp, fake_payload)
        write_clean(name, timestamp, fake_payload["items"])
        logging.info("[%s] dry-run → stored placeholder entries", name)
        return {"source": name, "status": "dry-run", "records": len(fake_payload["items"])}

    params = spec.get("params", {}).copy()
    if max_records:
        if "numOfRows" in params:
            params["numOfRows"] = max_records
        elif "size" in params:
            params["size"] = max_records

    try:
        response = requests.get(spec["url"], params=params, timeout=spec.get("timeout", 30))
        response.raise_for_status()
        text = response.text
        if spec.get("format", "xml") == "json":
            payload = response.json()
        else:
            payload = xmltodict.parse(text)
    except Exception as exc:
        logging.error("[%s] request failed: %s", name, exc)
        payload = {"error": str(exc)}
        write_raw(name, timestamp, payload)
        return {"source": name, "status": "failed", "error": str(exc)}

    write_raw(name, timestamp, payload)
    records = parse_records(payload, spec.get("record_path", []))
    if max_records and len(records) > max_records:
        records = records[:max_records]
    write_clean(name, timestamp, records)
    logging.info("[%s] stored %d records", name, len(records))
    return {"source": name, "status": "ok", "records": len(records)}


def build_specs(service_key: str, today: str) -> Dict[str, Dict[str, Any]]:
    return {
        "kac_status": {
            "url": os.getenv("API_KAC_BASE_URL", ""),
            "format": "xml",
            "params": {
                "serviceKey": service_key,
                "schDate": today,
                "pageNo": 1,
                "numOfRows": 100,
                "schLineType": "D",
                "_type": "json",
            },
            "record_path": ["response", "body", "items", "item"],
        },
        "molit_domestic": {
            "url": os.getenv("API_MOLIT_BASE_URL", ""),
            "format": "xml",
            "params": {
                "serviceKey": service_key,
                "depAirportId": "NAARKSS",
                "arrAirportId": "NAARKPC",
                "depPlandTime": today,
                "pageNo": 1,
                "numOfRows": 100,
                "_type": "json",
            },
            "record_path": ["response", "body", "items", "item"],
        },
        "icn_passenger": {
            "url": os.getenv("API_ICN_PASSENGER_BASE_URL", ""),
            "format": "xml",
            "params": {
                "serviceKey": service_key,
                "from_time": "0000",
                "to_time": "2400",
                "airport": "T1",
                "_type": "json",
            },
            "record_path": ["response", "body", "items", "item"],
        },
        "icn_arrivals": {
            "url": os.getenv("API_ICN_ARRIVAL_BASE_URL", ""),
            "format": "xml",
            "params": {
                "serviceKey": service_key,
                "airport_code": "P01",
                "from_time": "0000",
                "to_time": "2400",
                "_type": "json",
            },
            "record_path": ["response", "body", "items", "item"],
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest external aviation APIs.")
    parser.add_argument("--max-records", type=int, default=None, help="Limit number of records stored per API.")
    parser.add_argument("--dry-run", action="store_true", help="Skip HTTP calls and create placeholder files.")
    parser.add_argument("--sources", nargs="*", help="Subset of sources to fetch. Default=all.")
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    load_dotenv()
    args = parse_args()
    service_key = os.getenv("API_ENCODING_KEY")
    if not service_key and not args.dry_run:
        raise RuntimeError("API_ENCODING_KEY env variable not set. Use --dry-run for offline testing.")

    today = datetime.utcnow().strftime("%Y%m%d")
    specs = build_specs(service_key or "dry-run", today)
    sources = args.sources or list(specs.keys())

    summary = []
    for source in sources:
        spec = specs.get(source)
        if not spec:
            logging.warning("Unknown source %s", source)
            continue
        if not spec["url"]:
            logging.warning("Source %s missing base URL; skipping", source)
            continue
        result = fetch_api(source, spec, args.max_records, args.dry_run)
        summary.append(result)

    summary_path = DATA_ROOT / "api_ingestion_summary.json"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    logging.info("Summary written to %s", summary_path)


if __name__ == "__main__":
    main()
