# 🧱 특성 공학 및 데이터 파이프라인

## 1. 디렉터리 체계
| 경로 | 설명 |
| --- | --- |
| `data/raw/` | 원본 CSV/XLSX (수정 금지) |
| `data/interim/` | 1차 정제 및 통계 결과 (`flights_master.parquet`, `features_congestion.parquet`) |
| `data/processed/` | 학습·서빙용 확정 테이블 (`train_table.parquet`) |
| `data/external/` | API 수집 데이터 (`api_raw/`, `api_clean/`) |

## 2. 파이프라인 구성
| 스크립트 | 기능 | 산출물 |
| --- | --- | --- |
| `ml/pipelines/00_merge_raw.py` | Raw 병합, 컬럼 표준화, 타입 변환 | `data/interim/flights_master.parquet` |
| `ml/pipelines/01_label_delays.py` | 지연 분 계산, 결항/회항 정책 반영 | `data/interim/flights_labeled.parquet`, `flights_labeled_stats.json` |
| `ml/pipelines/02_feature_build.py` | 혼잡도/통계 Feature 생성 | `data/interim/features_congestion.parquet`, `congestion_features_stats.json` |
| `ml/pipelines/03_join_features.py` | Flight × Feature 병합, Lag 추가 | `data/processed/train_table.parquet` |
| `ml/pipelines/04_run_eda.py` | 지연률/분포 분석 및 그래프 출력 | `outputs/phase6_eda_stats.json`, `outputs/graphs/*.png` |
| `ml/pipelines/05_export_artifacts.py` | 학습 설정/아티팩트 내보내기 | `ml/artifacts/models/*.pkl` |

실행 템플릿:
```bash
source .venv/bin/activate
python ml/pipelines/00_merge_raw.py --config configs/pipeline.yaml
...
python ml/pipelines/05_export_artifacts.py
```

## 3. 표준 스키마
### 3.1 Flights Master (`flights_master`)
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| `flight_id` | string | `flight_date_airline_flightno_origin_dest` |
| `flight_date` | date | UTC ISO8601 (`YYYY-MM-DD`) |
| `airline` | string | 항공사 코드(IATA) |
| `origin_airport`, `dest_airport` | string | 공항 코드(IATA) |
| `sched_dep_time`, `actual_dep_time`, `sched_arr_time`, `actual_arr_time` | int | HHMM, 로컬 기준 |
| `cancelled`, `diverted` | bool | 원본 플래그 |

### 3.2 Labeled Flights (`flights_labeled`)
- `arr_delay_min = actual_arr_time - sched_arr_time` (분 단위, 타임존 보정 후 계산).
- `delay_label = 1 if arr_delay_min > 15 else 0`.
- 정책
  - `cancelled == 1` → 지도학습 제외, 통계만 활용.
  - `diverted == 1` → 지연 label=1로 간주.

### 3.3 혼잡도 Feature (`features_congestion`)
| 이름 | 정의 |
| --- | --- |
| `airport_hour_flights` | 동일 공항·시간대 운항편수 |
| `airport_daily_avg_flights` | 공항 하루 평균 운항편수(롤링 7일) |
| `hourly_congestion_ratio` | `airport_hour_flights / airport_daily_avg_flights` |
| `prev_hour_delay_rate` | 동일 공항 이전 시간대 지연률 |
| `prev_day_delay_rate` | 동일 공항 이전 일자 지연률 |
| `weekday_delay_baseline` | 공항×요일 평균 지연률 |
| `lag_delay_1/2/3` | 시계열 정렬 후 지연 라벨 lag |
| `weather_proxy` | API 기상 지수(미수집 시 0) |

### 3.4 학습 테이블 (`train_table`)
- Primary Key: `flight_id`
- 입력 Feature: `hour`, `weekday`, `month`, Target Encoding된 공항·항공사, 위 혼잡도/lag 변수, 외부 API 지표.
- 출력: `delay_label`, `delay_minutes`.

## 4. 품질 점검 체크리스트
1. **무결성**: `flight_id` 고유 여부, null 비율 기록 → `*_stats.json`.
2. **표준화**: 문자열 대문자/trim, 시간 값 0~2359 범위 검증.
3. **이상치 처리**: `delay_minutes` 상위 0.5% 클리핑.
4. **통계 검증**: `python ml/pipelines/04_run_eda.py --verify`로 평균 지연률, 공항별 분포 비교.

## 5. 재현성 및 자동화
- 모든 파이프라인은 공통 config(`configs/pipeline.yaml`)에서 경로/파라미터를 읽는다.
- `scripts/quickstart.sh`가 merge → label → feature → EDA → train 순서로 실행되도록 유지한다.
- Raw 파일이 추가되면 `docs/01_data_dictionary.md`의 SHA·행 수를 먼저 갱신한 뒤 파이프라인 전체를 다시 실행한다.

위 규칙을 지키면 특성 공학 결과를 모델과 서비스에서 동일하게 사용할 수 있다.
