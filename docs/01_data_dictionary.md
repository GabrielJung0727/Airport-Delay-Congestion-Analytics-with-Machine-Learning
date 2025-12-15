# Raw Data Dictionary

## Raw Storage Principles
- Location: `data/raw/<source>/...`
- **Immutability:** file contents are never edited in-place; transformations happen in `data/interim` or `data/processed`.
- Provenance: every file has deterministic English snake_case naming (`{source}_{topic}_{from}_{to}.{ext}`).
- Integrity: each file’s SHA-256 and row count are recorded below; any drift must be investigated before use.

## Inventory Summary
| ID | Path | Description | Period (UTC) | Rows | SHA-256 | Join/Key Candidates |
| --- | --- | --- | --- | --- | --- | --- |
| MOLIT-1 | `data/raw/molit/molit_flights_20231014_20231114.xlsx` | 국토부 TAGO 국내선 출·도착 실적 (1개월) | 2023-10-14 → 2023-11-14 | 18,550 | `2213e990ff225e4fc3a87e19db9de2b2d757a76c86a970b50d0c398dff436ee6` | `{일자, 공항명, 편명, 출발/도착}` |
| MOLIT-2 | `data/raw/molit/molit_flights_20231115_20231215.xlsx` | 국토부 TAGO 국내선 출·도착 실적 (1개월) | 2023-11-15 → 2023-12-15 | 18,535 | `8fdda5090436ec754cfb6c84fcdd8ba30260b6bfd96ba1907dc71f52557a3cc6` | `{일자, 공항명, 편명, 출발/도착}` |
| KAC-AIRPORT | `data/raw/kac/kac_airport_stats_20050101_20251215.xlsx` | 한국공항공사 공항별 월별 운항/여객/화물 집계 | 2005-01-01 → 2025-12-15 | 24 | `cb64507a68764196b5ae628fd500f42077244fd2e6a17adbe867ac75fe38b17c` | `{공항명, 연도, 월}` |
| KAC-HOURLY | `data/raw/kac/kac_hourly_stats_20050101_20251215.xlsx` | 공항별 시간대별 운항/여객/화물 집계 | 2005-01-01 → 2025-12-15 | 32 | `58e47f62d201ed314d65965665d9fe8fe73b45c5f3372d5851769e130a60d0ab` | `{공항명, 시간대}` |
| KAC-WEEKDAY | `data/raw/kac/kac_weekday_stats_20050101_20251215.xlsx` | 공항별 요일별 운항/여객/화물 통계 | 2005-01-01 → 2025-12-15 | 15 | `8d48db0c841256f1e50f6e206ddde05b08b465cb8bce87c9b4216b688f1ce762` | `{공항명, 요일}` |
| KAC-TIMESERIES | `data/raw/kac/kac_timeseries_stats_20050101_20251215.xlsx` | 공항별/노선별 시계열 운항·여객·화물 추이 | 2005-01-01 → 2025-12-15 | 280 | `d5a246446f46b4769687aecfcbd4889f98c6e0b08a5340823c87763de3874a2e` | `{공항명, 연도, 월}` |
| ICN-1 | `data/raw/icn/icn_passenger_stats_20100101_20251201.xls` | 인천국제공항 승객/화물/운항 실적 (월별) | 2010-01-01 → 2025-12-01 | 210 | `3467afddc04410a88ab02bb2a9f849b0d316563afd00e5cb0954e0eea719e27b` | `{년, 월}` |

> NOTE: 8번째 오프라인 데이터 슬롯은 기상/좌석계획 CSV 수신 시 `data/raw/weather/`로 추가 예정. 자리만 확보해두고 로딩 시 동일 규칙 적용.

## Dataset Notes

### MOLIT Flight Movement Sheets
- Columns: `출발/도착`, `공항명`, `항공사`, `편명`, `도착지`, `일자`, `계획시간`, `예상시간`, `출발시간`, `구분`, `상태`, `지연원인`.
- Pre-processing considerations:
  - Normalize 공항명/도착지 → IATA/ICAO 코드.
  - Combine `계획시간`/`예상시간`/`출발시간` into HHMM integers, add timezone column.
  - `상태` + `지연원인` derive categorical reason tags.
- Join keys:
  - Natural key = `{편명, 일자, 출발/도착}`; prefer also `계획시간` to disambiguate duplicate charters.

### KAC Aggregated Statistics (Airport/Hourly/Weekday/Timeseries)
- Multi-level headers; parse using header rows 2~4 and flatten to snake_case (예: `운항(편)_도착` → `arrivals_flights`).
- Provide per-airport totals for 운항편수, 여객수, 화물톤.
- Use consistent `airport_code` derived from 공항명.
- Join keys:
  - Airport-level: `{airport_code, year, month}`.
  - Hourly-level: `{airport_code, hour_bin}` (hour bin boundaries must align with flight table).
  - Weekday-level: `{airport_code, weekday}` (0=Mon standard).
  - Timeseries-level: `{airport_code, year, month}` with potential route segmentation.

### ICN Passenger Stats
- Legacy `.xls` workbook containing 월별 운항/여객/화물 for 인천공항 전체.
- Columns include `년`, `월`, `운항(편)`, `여객(명)`, `화물(톤)` triples (도착/출발/계).
- Use as anchor for congestion ratio cross-check on ICN-specific dashboard.

## Raw Immutability Rule
- `data/raw/**` is read-only; no scripts may overwrite, drop, or reformat files in-place.
- Pipelines must copy or read → transform → write to `data/interim`/`processed`.
- If new raw data arrives, store alongside existing file with new timestamped name and update this dictionary with SHA/row count.
