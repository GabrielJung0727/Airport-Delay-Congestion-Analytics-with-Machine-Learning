# Airport Delay Lab

공항별 혼잡도와 지연 가능성을 분석·예측해 대시보드와 길찾기 어드바이저로 제공하는 풀스택 프로젝트다. 본 README는 실행 방법과 폴더 구조, 문서 링크를 빠르게 확인하기 위한 안내서다.

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [디렉터리 구조](#디렉터리-구조)
3. [빠른 실행](#빠른-실행)
4. [ML 파이프라인](#ml-파이프라인)
5. [백엔드 API](#백엔드-api)
6. [프론트엔드](#프론트엔드)
7. [데이터·문서 레퍼런스](#데이터문서-레퍼런스)
8. [트러블슈팅](#트러블슈팅)

---

## 프로젝트 개요
- **목표**: 공공 항공 데이터를 기반으로 혼잡도 지표를 계산하고, XGBoost 계열 모델로 지연 확률을 예측한 뒤 FastAPI + React 대시보드로 시각화.
- **주요 기능**
  - Dashboard / Airport Detail: 공항 지연률, 시간대별 혼잡 구간, 게이트 활용도
  - Prediction Lab: 달력 기반 파라미터 입력, 14일치 예측, 여객 수 추정
  - Route Advisor: 이동 시간·버퍼 입력 후 권장 출발 시각 제안
  - API 데이터 수집: 한국공항공사/국토부/인천공항 API 연동
- **핵심 지표**: ROC-AUC ≥ 0.70, F1 ≥ 0.60

---

## 디렉터리 구조
```
├─ backend/               # FastAPI 앱 (app/, api/, services/, tests/)
├─ frontend/              # React + Vite 대시보드
├─ ml/
│  ├─ pipelines/          # 00~05 파이프라인 스크립트
│  └─ artifacts/          # 모델, metrics.json, feature_importance.json
├─ data/
│  ├─ raw/                # 원본 데이터 (불변)
│  ├─ interim/            # flights_master, features_congestion 등
│  └─ processed/          # train_table.parquet, stats
├─ outputs/               # EDA 그래프, 요약 통계
├─ scripts/               # quickstart.sh, run_ingestion.sh 등
└─ docs/                  # 00_overview~05_delivery
```

---

## 빠른 실행
1. 의존성 설치
   ```bash
   python -m venv .venv && source .venv/bin/activate
   pip install -r backend/requirements.txt
   cd frontend && npm install && cd ..
   ```
2. 환경 변수
   - `.env.example`를 복사해 `.env` 생성 후 `DATA_ROOT`, `MODEL_DIR`, API 키 입력.
3. 원클릭 스크립트
   ```bash
   chmod +x scripts/quickstart.sh
   ./scripts/quickstart.sh
   ```
   - 순서: 전처리 → 모델 확인 → FastAPI (포트 8001) → Vite Dev Server (포트 5173).
4. 수동 실행
   ```bash
   # Backend
   source .venv/bin/activate
   uvicorn app.main:app --app-dir backend --reload

   # Frontend
   cd frontend
   npm run dev
   ```

---

## ML 파이프라인
- **주요 스크립트**: `ml/pipelines/00_merge_raw.py` ~ `05_export_artifacts.py`
- **산출물**
  - `data/interim/flights_master.parquet`
  - `data/interim/features_congestion.parquet`
  - `data/processed/train_table.parquet`
  - `ml/artifacts/models/*.pkl`, `ml/artifacts/reports/metrics.json`
- 실행 예시:
  ```bash
  source .venv/bin/activate
  python ml/pipelines/00_merge_raw.py --config configs/pipeline.yaml
  ```
- Feature·모델링 세부 설명: `docs/02_feature_engineering.md`, `docs/03_modeling_plan.md`

---

## 백엔드 API
- **기술 스택**: FastAPI, Pydantic, Uvicorn
- **엔드포인트**
  - `GET /api/v1/health`
  - `GET /api/v1/stats/airport?airport=ICN`
  - `GET /api/v1/stats/hourly?airport=ICN`
  - `GET /api/v1/stats/timeseries?airport=ICN`
  - `POST /api/v1/predict`
- **Swagger/OpenAPI**: <http://localhost:8001/docs>
- **테스트**: `pytest backend/tests`
- API 명세 상세: `docs/04_api_specs.md`

---

## 프론트엔드
- **스택**: React 18, TypeScript, Vite, Recharts
- **명령**
  ```bash
  cd frontend
  npm run dev          # 개발 서버
  npm run build        # 프로덕션 번들
  npm run preview      # 빌드 검증
  ```
- 주요 페이지: `Dashboard`, `AirportDetail`, `PredictionLab`, `RouteAdvisor`
- i18n 지원: `frontend/src/i18n.ts` 기반으로 한국어/영어 스위치
- 빌드 아웃풋: `frontend/dist/`

---

## 데이터·문서 레퍼런스
- `docs/00_overview.md` : 프로젝트 개요
- `docs/01_data_dictionary.md` : Raw 데이터 인벤토리
- `docs/02_feature_engineering.md` : 전처리/특성 공학
- `docs/03_modeling_plan.md` : 모델링 전략
- `docs/04_api_specs.md` : API 명세 + 실행 로드맵
- `docs/05_delivery.md` : 최종 제출 가이드

추가 그래프/통계는 `outputs/` 폴더에서 확인할 수 있다.

---

## 트러블슈팅
| 증상 | 조치 |
| --- | --- |
| 백엔드 예측 실패 (`MODEL_NOT_READY`) | `ml/artifacts/models/`에 최신 모델이 있는지 확인 후 `scripts/quickstart.sh` 재실행 |
| 프론트 API 호출 실패 (`ERR_CONNECTION_REFUSED`) | FastAPI 포트(8001) 실행 여부, CORS 설정 확인 |
| Prediction Lab 달력 값 미표시 | `fetchTimeseriesStats` API 응답 확인, `data/processed/train_table_stats.json` 최신화 |
| API 수집 오류 | `.env`의 API 키, `scripts/run_ingestion.sh` 로그 확인 |

---

## 라이선스
이 저장소는 팀 프로젝트 용도로 사용되며 별도 라이선스를 명시하지 않았다. 필요 시 담당자와 협의 후 배포한다.
