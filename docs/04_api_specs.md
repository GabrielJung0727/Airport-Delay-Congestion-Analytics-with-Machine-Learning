# 🛠️ 항공편 지연·혼잡도 분석 시스템

## 개발 기술 문서 (Development Specification)

본 문서는 **항공편 지연 및 공항 혼잡도 분석·예측 시스템**을 실제로 개발하기 위한 기술 기준을 정의한다. 데이터 파이프라인, 모델 학습, 백엔드 API, 프론트엔드 인터페이스를 모두 포함하며, 재현 가능한 구현을 1차 목표로 한다.

---

## 1. 문서 목적

- 개발 중 의사결정 기준 제공
- 프론트엔드–백엔드–ML 간 인터페이스 명확화
- 재현 가능한 데이터/모델 파이프라인 확보

---

## 2. 시스템 전체 구조

```
[CSV / XLSX 데이터]
        ↓
[전처리 & Feature Engineering]
        ↓
[ML 모델 학습 (XGBoost 계열)]
        ↓
[모델 아티팩트 저장]
        ↓
[FastAPI Backend]
        ↓
[React + TypeScript Dashboard]
```

**역할**

- Data/ML: 데이터 수집·정제·학습·아티팩트 저장
- Backend: 모델 로딩/추론, 통계 집계, REST API 제공
- Frontend: 대시보드/예측 UI, API 연동

---

## 3. 개발 환경

### 3.1 공통

- OS: macOS / Linux (Windows는 WSL 권장)
- Python: 3.10+
- Node.js: 18+
- Git 기반 버전 관리

### 3.2 Backend

- Framework: FastAPI
- 주요 라이브러리: pandas, numpy, scikit-learn, xgboost / lightgbm, pydantic
- 역할: 데이터 조회 API, 예측 요청 처리, 모델 로딩/추론

### 3.3 ML

- 실행 환경: 로컬 / Colab
- 모델 후보: XGBoost (Primary), CatBoost, LightGBM
- 실험 관리: `yaml` 기반 설정, Feature Importance 저장

### 3.4 Frontend

- Framework: React + TypeScript (Vite)
- Chart: Recharts or ECharts
- 역할: 통계 시각화, 공항별 상세, 예측 결과 표시

---

## 4. 데이터 구조 정의

### 4.1 디렉터리 규칙

- `data/raw/` : 원본 (불변, 수정 금지)
- `data/interim/` : 1차 정제
- `data/processed/` : 학습/서빙용 확정 테이블
- `ml/artifacts/` : 모델/메타데이터/Feature Importance

### 4.2 메인 테이블 (항공편 단위)

| 컬럼명 | 타입 | 설명 |
| --- | --- | --- |
| flight_date | date | 운항 일자 (UTC 또는 현지, 일관 유지) |
| airline | string | 항공사 코드 |
| origin_airport | string | 출발 공항 IATA/ICAO |
| dest_airport | string | 도착 공항 IATA/ICAO |
| sched_dep_time | int | 예정 출발 시각(HHMM, 로컬) |
| actual_dep_time | int | 실제 출발 시각(HHMM, 로컬) |
| sched_arr_time | int | 예정 도착 시각(HHMM, 로컬) |
| actual_arr_time | int | 실제 도착 시각(HHMM, 로컬) |
| delay_minutes | int | 도착 지연 분 |
| delay_label | int | 지연 여부 (0/1) |

### 4.3 혼잡도 파생 Feature

```
airport_hour_flights
airport_daily_avg_flights
hourly_congestion_ratio
previous_hour_delay_rate
```

### 4.4 라벨 정의

```python
delay_label = 1 if arrival_delay_minutes > 15 else 0
```

(ICAO / FAA 기준)

---

## 5. 전처리 파이프라인

### 5.1 처리 순서

1. Raw CSV/XLSX 병합
2. 컬럼 표준화 (타임존/형식 일관)
3. 지연 라벨 생성
4. 공항/시간대 통계 Join
5. Feature Engineering (Lag, 혼잡도 등)
6. 학습/서빙용 테이블 Export → `data/processed/`

### 5.2 실행 형태 (예시)

```
python -m ml.pipeline.preprocess \
  --config configs/preprocess.yaml \
  --raw data/raw \
  --out data/processed
```

- 모든 파이프라인은 **동일 입력 시 동일 결과**가 나와야 한다.
- 입력/출력 스키마는 Pydantic/dataclasses로 검증.

---

## 6. 모델링 파이프라인

### 6.1 Feature 그룹

- 시간: hour, day_of_week, month
- 공항: origin_airport (Target Encoding)
- 혼잡도: airport_hour_flights, congestion_ratio 등
- Lag: previous_hour_delay_rate 등

### 6.2 차원 축소/선택 (조건: Feature 수 > 40)

1. PCA (옵션)
2. RandomForest Feature Importance
3. 상위 Feature 유지

### 6.3 학습·평가

- Split: Train → Validation → Test
- Metric: ROC-AUC, F1-score (primary), Precision/Recall (secondary)
- Output:
  - 모델 바이너리 (`ml/artifacts/models/{model_name}.bin`)
  - Feature Importance (`ml/artifacts/feature_importance/{model}.json`)
  - 학습 설정 (`ml/artifacts/configs/{run_id}.yaml`)

### 6.4 학습 스켈레톤 (예시)

```
python -m ml.train \
  --config configs/train_xgb.yaml \
  --data data/processed/flights.parquet \
  --out ml/artifacts/models/xgb.bin
```

---

## 7. Backend API 설계

### 7.1 공통 규칙

- Base Path: `/api/v1`
- Content-Type: `application/json; charset=utf-8`
- 응답 래퍼:

  ```json
  { "data": {...}, "meta": { "request_id": "<uuid>" } }
  ```

- 에러 포맷:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "..." } }
  ```

- 주요 에러 코드: `VALIDATION_ERROR`(422), `NOT_FOUND`(404), `MODEL_NOT_READY`(503), `INTERNAL_ERROR`(500)

### 7.2 헬스 체크

- `GET /api/v1/health`
- 200 OK, `{ "status": "ok" }`

### 7.3 통계 API

#### GET `/api/v1/stats/airport`

- Query: `airport`(필수, string, IATA/ICAO), `from`/`to`(ISO date, 옵션)
- Response 예시:

  ```json
  {
    "data": {
      "airport": "ICN",
      "avg_delay_rate": 0.27,
      "peak_hour": 18,
      "total_flights": 12430
    },
    "meta": { "request_id": "..." }
  }
  ```

#### GET `/api/v1/stats/hourly`

- Query: `airport`(옵션), `date`(옵션, ISO date)
- Response 예시:

  ```json
  {
    "data": [
      { "hour": 9, "delay_rate": 0.18, "congestion_ratio": 1.2 },
      { "hour": 10, "delay_rate": 0.31, "congestion_ratio": 1.5 }
    ],
    "meta": { "request_id": "..." }
  }
  ```

### 7.4 예측 API

- `POST /api/v1/predict`
- Request Body:

  ```json
  {
    "airport": "GMP",
    "hour": 9,
    "day_of_week": 1,
    "congestion_ratio": 1.3
  }
  ```

- Validation:
  - `airport`: 필수, 길이 3~4, 대문자
  - `hour`: 0~23
  - `day_of_week`: 0~6 (월=0 또는 ISO 규칙 중 하나로 고정)
  - `congestion_ratio`: >0, 실수
- Response:

  ```json
  {
    "data": { "delay_probability": 0.41 },
    "meta": { "request_id": "..." }
  }
  ```

- 모델 준비 안 된 경우: 503 + `MODEL_NOT_READY`

### 7.5 성능·캐싱

- 통계 API는 5~15분 캐시(역할에 따라 조정)
- 예측 API는 요청 당 모델 추론 (p95 < 300ms 목표)

---

## 8. 프론트엔드 페이지/인터페이스

- Dashboard: 전체 공항 지연률 요약, 시간대별 Heatmap (`GET /stats/hourly`)
- Airport Detail: 공항별 지연 원인/혼잡 시간 (`GET /stats/airport`)
- Prediction Lab: 입력값 변경 → 실시간 지연 확률 (`POST /predict`)
- 타입 정의: 서버 스키마를 TypeScript `type`/`interface`로 미러링, 응답 래퍼(`data/meta`) 포함

---

## 9. 로그 및 재현성

- 모든 학습은 config 파일 기반
- 모델 아티팩트: `ml/artifacts/models/`
- Feature Importance: `ml/artifacts/feature_importance/`
- 파이프라인 로그: `logs/ml/*.log`, API 로그: `logs/api/*.log`
- 동일 입력 대비 결정적 결과 (seed 고정, 버전 기록)

---

## 10. 개발 원칙 (중요)

- Raw 데이터 불변
- 모든 파이프라인 재실행 가능
- 분석 코드와 서비스 코드 분리
- “한 번만 돌아가는 코드” 금지

---

## 11. 개발 완료 기준 (Done Definition)

- 지연 예측 모델 ROC-AUC ≥ 0.7
- 공항별 혼잡도 시각화 완성
- 예측 API 정상 동작
- 프론트 대시보드에서 결과 확인 가능

---

## 12. 바로 다음 액션

- API 스펙 Swagger/OpenAPI 문서화 (`/docs` 노출)
- ML 학습 코드 Skeleton 작성 (preprocess/train/eval CLI)
- 프론트 대시보드 컴포넌트 설계/스켈레톤 생성

---

## 13. 외부 공개 API 목록 (4개)

- 공통: XML/JSON 대응 여부 확인, 요청 파라미터 샘플은 `scripts/run_ingestion.sh` 작성 시 반영
- Encoding 키 (예: `Encoding="Kgn3NZtSyDOE51%2FjW0cW8kkX7Yxvga%2FZ%2FdrpGvn%2B0m5IBqRV9UCKO%2BXRxFXWwKNHPsRUqzPFW6CdTSHbYln2Kw%3D%3D"`), `.env`에 `API_ENCODING_KEY`로 저장

| 구분 | 이름 | Endpoint | 주요 용도 |
| --- | --- | --- | --- |
| KAC | 한국공항공사 보험사용 항공편 지연/결항 조회 | <https://openapi.airport.co.kr/service/rest/StatusOfFlights> | 실시간/최근 지연 검증, 대시보드 |
| MOLIT | 국토교통부 TAGO 국내항공운항정보 | <https://apis.data.go.kr/1613000/DmstcFlightNvgInfoService> | 국내선 운항 스케줄/상태 보완 |
| ICN-1 | 인천국제공항 승객예고(출·입국장별) | <https://apis.data.go.kr/B551177/passgrAnncmt> | 혼잡도 보조 지표 (승객량) |
| ICN-2 | 인천국제공항 입국장 현황 | <https://apis.data.go.kr/B551177/StatusOfArrivals> | 실시간 입국 혼잡/지연 추정 |

요청/저장 원칙

- Raw 응답: `data/external/api_raw/{source}/{yyyymmddHH}.json`
- 정규화: `data/external/api_clean/{source}/{yyyymmdd}.parquet`
- 클라이언트 위치: `backend/app/services/ingestion/{source}.py`

---

## 14. 전체 개발 로드맵 체크리스트 (끝까지)

대상: 8개 오프라인 데이터 + 4개 API. 목표: 공항별 혼잡도/지연 이유 분석 + 예측 + TS 대시보드.

### 0) 프로젝트 준비

- [ ] 레포/폴더 구조 확인 (`backend`, `frontend`, `ml`, `data`)
- [ ] `.env.example` 갱신, `.gitignore`(data/raw 제외 또는 git-lfs)
- [ ] Python venv/패키지, Node 설치, (옵션) docker-compose PostgreSQL

### 1) 데이터 인벤토리 확정 (8개 파일)

- [ ] `data/raw/molit/` : 항공기 출도착 2개
- [ ] `data/raw/kac/` : 공항별/시간대별/요일별/시계열 통계 등
- [ ] `data/raw/icn/` : 인천공항 통계
- [ ] `docs/01_data_dictionary.md`에 파일명/기간/컬럼/키 후보 기록

### 2) CSV/XLSX 파싱·표준 스키마

- [ ] `ml/pipelines/00_merge_raw.py`: XLSX/CSV 읽기, 컬럼 snake_case, 타입 통일
- [ ] 항공기 출도착 2개 concat, 중복/결측 처리 → `data/interim/flights_master.parquet`

### 3) 라벨 정의

- [ ] `arr_delay_min` 계산
- [ ] `delay_label = 1 if arr_delay_min > 15 else 0`
- [ ] 결항/회항 처리 규칙 문서화 → `data/interim/flights_labeled.parquet`

### 4) 혼잡도 Feature 생성

- [ ] 공항 코드/명 정규화, 월/일 운항량 추출
- [ ] 시간대 구간 통일, 공항+시간대 운항량 계산
- [ ] 요일 표준화, 시계열 트렌드/lag 준비
- [ ] 파생: `airport_hour_flights`, `airport_daily_flights`, `congestion_ratio`, `prev_hour_delay_rate`, `prev_day_delay_rate` → `data/interim/features_congestion.parquet`

### 5) 데이터 병합

- [ ] 병합 키: `flight_date`, `origin_airport`, `hour`
- [ ] flights + 통계/시간대/요일/시계열 join, 결측 처리 → `data/processed/train_table.parquet`

### 6) EDA & 그래프(8~12개)

- [ ] 지연률 평균, 공항별 TOP10, 시간대별 지연률
- [ ] 혼잡도 vs 지연 산점도, 월별 시계열, Feature Importance
- [ ] Weather/Carrier/Congestion 프록시 해석 → `outputs/graphs/*.png`

### 7) API 수집 파이프라인 (4개)

- [ ] `.env`에 키 저장, `backend/app/services/ingestion/*.py` 작성
- [ ] 원본 JSON → `data/external/api_raw/`, 정규화 → `data/external/api_clean/`
- [ ] `scripts/run_ingestion.sh`로 일괄 실행

### 8) 모델 학습 (Baseline → Tree)

- [ ] Baseline: Logistic Regression, RandomForest
- [ ] Main: XGBoost, CatBoost, LightGBM
- [ ] 불균형 처리: class_weight/scale_pos_weight, threshold 튜닝
- [ ] 필요 시 PCA → RF feature selection → XGBoost
- [ ] 산출물: `ml/artifacts/models/*.bin|pkl`, `ml/artifacts/reports/metrics.json`, `feature_importance.json`

### 9) 백엔드 API (FastAPI)

- [ ] `/health`, CORS
- [ ] `/api/v1/stats/airport`, `/api/v1/stats/hourly`, `/api/v1/stats/timeseries`
- [ ] `/api/v1/predict` (Pydantic 검증, 모델 로드, 예측 반환)
- [ ] 데이터 소스: 초기 parquet, 필요 시 Postgres로 확장

### 10) 프론트엔드 (TypeScript, Vite)

- [ ] API client, 타입 정의, 라우팅
- [ ] Dashboard: 공항 TOP10, 시간대 heatmap/bar
- [ ] AirportDetail: 공항 선택 상세
- [ ] PredictionLab: 공항/시간 입력 → 확률 표시, 로딩/에러/필터

### 11) 통합 테스트·재현성

- [ ] `scripts/quickstart.sh`: 전처리 → 모델 로드 → 백/프론트 실행
- [ ] raw → processed 재실행 검증

### 12) 발표 산출물

- [ ] 보고서: 문제 정의, 데이터(8+4), 혼잡도 정의, 모델 비교, 인사이트, 한계/확장
- [ ] PPT 10장 구조, 예상 질문 8개 준비

### 최종 Done 체크

- [ ] `train_table.parquet`
- [ ] 그래프 8개 이상
- [ ] 모델 3종 비교
- [ ] 예측 API 동작
- [ ] 프론트 통계/예측 표시
- [ ] 보고서/PPT 정리

---

## 15. 실행 로드맵 (0% → 100%+)

**목표:** 설명 생략, 순서대로 실행. 각 Phase 완료 기준 포함.

### 🟥 PHASE 0 — 프로젝트 잠금 해제 (0% → 5%)

1. Git 초기화 및 첫 커밋
2. `.env` 실제 값 채우기 (API Key, Path)
3. Python venv 활성화
4. Backend / Frontend `hello world` 실행
5. `tree`로 폴더 구조 스냅샷 저장  
✅ 프론트 localhost 접속, 백엔드 `/health` 200

완료

### 🟧 PHASE 1 — Raw 데이터 고정 (5% → 15%)

6. `data/raw/` 파일명 규칙 통일
7. 각 파일 SHA/행 수 기록
8. `docs/01_data_dictionary.md` (파일명/기간/컬럼/Join Key 후보)
9. “raw 수정 금지” 규칙 명시  
✅ raw 폴더 봉인, 구조 설명 가능

완료

### 🟨 PHASE 2 — 항공편 Master Table (15% → 25%)

10. `ml/pipelines/00_merge_raw.py`
11. 출도착 데이터 2개 병합
12. 컬럼 영문화/표준화
13. 날짜/시간 타입 정규화
14. 중복 항공편 제거
15. 결측/비정상 행 로그
16. `data/interim/flights_master.parquet`  
✅ “1행=1플라이트” 성립

완료

### 🟨 PHASE 3 — 지연 라벨 정의 (25% → 30%)

17. 예정/실제 도착 시간 차이 계산
18. `delay_minutes` 생성
19. `delay_label` 생성 (15분 기준)
20. 결항/회항 처리 정책 결정
21. 지연률 분포 확인  
✅ “무엇을 예측?” 한 문장 답 가능

완료

### 🟩 PHASE 4 — 혼잡도 Feature (30% → 45%)

22. 공항별 통계 파싱
23. 시간대별 통계 파싱
24. 요일별 통계 파싱
25. 시계열 통계 파싱
26. 공항 코드/명 통일
27. 시간대 bin 통일
28. 혼잡도 수식 정의 (시간대 운항량, 일평균 대비 비율, 이전 시간대 지연률)
29. `features_congestion` 테이블 생성  
✅ “혼잡도”를 수식으로 설명 가능

완료

### 🟩 PHASE 5 — Feature 병합 (45% → 55%)

30. 항공편 × 혼잡도 병합
31. 시간/요일/월 feature 추가
32. Lag feature 추가
33. 결측 처리 전략 적용
34. `data/processed/train_table.parquet`  
✅ 단일 테이블로 학습 가능

### 🟦 PHASE 6 — EDA & 인사이트 (55% → 65%)

35. 전체 지연률
36. 공항별 지연률 TOP/BOTTOM
37. 시간대별 지연 Heatmap
38. 혼잡도 vs 지연 산점도
39. 월별/요일별 패턴
40. 핵심 인사이트 3~5개 문장화  
✅ 모델 없어도 발표 가능

### 🟦 PHASE 7 — API 데이터 연동 (65% → 70%)

41. 4개 API 수집 스크립트
42. Raw JSON 저장
43. 정규화 테이블 생성
44. 기상/혼잡 보조 feature 검토
45. “실시간 확장 가능” 근거 확보  
✅ API = 학습 보조 + 데모용

### 🟪 PHASE 8 — 모델 학습 (70% → 85%)

46. Baseline: Logistic/RF
47. XGBoost 학습
48. CatBoost 학습
49. LightGBM 학습
50. 불균형 처리
51. Threshold 튜닝
52. 성능 비교표
53. Feature Importance 추출  
✅ “왜 이 모델이 낫다” 설명 가능

### 🟪 PHASE 9 — Backend API (85% → 92%)

54. 통계 조회 API
55. 예측 API
56. 모델 로딩/추론 분리
57. 에러 핸들링
58. Swagger 검증  
✅ curl로 예측값 수신

### 🟦 PHASE 10 — Frontend (92% → 98%)

59. Dashboard
60. Airport Detail
61. Prediction Lab
62. 차트 연결
63. 로딩/에러 처리  
✅ 시연 가능

### 🟩 PHASE 11 — 정리 & 제출 (98% → 100%)

64. 보고서 작성
65. PPT 제작
66. 예상 질문 답변 준비
67. 리허설 1회  
🎉 완료

### 🟨 PHASE ∞ — 확장 (보너스)

- 실시간 예측, DB 적재, AutoML 비교, 추가 공항/항공사
