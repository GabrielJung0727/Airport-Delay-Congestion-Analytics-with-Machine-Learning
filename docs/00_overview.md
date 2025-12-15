# 📘 프로젝트 개요 — Airport Delay Lab

## 1. 프로젝트 미션
- 공공 항공 데이터를 수집·정제하여 **공항별 혼잡도와 지연 가능성을 정량화**한다.
- Gradient Boosting 계열 모델을 학습해 **지연 예측 API**와 **프론트 대시보드**로 노출한다.
- **Route Advisor** 기능으로 승객/운영 담당자가 출발 시각을 즉시 판단할 수 있게 한다.

## 2. 성공 기준
| 항목 | 완료 조건 |
| --- | --- |
| 데이터 | `data/raw/` 봉인, `train_table.parquet` 생성 |
| 모델 | XGBoost ROC-AUC ≥ 0.70, F1 ≥ 0.60 |
| 백엔드 | `/api/v1/stats/*`, `/api/v1/predict` Swagger 테스트 통과 |
| 프론트 | Dashboard · Airport Detail · Prediction Lab · Route Advisor 데모 |
| 문서 | docs/00~05, README, 보고서, 발표 자료 |

## 3. 시스템 구조
```
data/raw → ml/pipelines(00~05) → data/interim/processed
                                   ↘ ml/artifacts/models
ml/artifacts/models → FastAPI Backend → REST API → React/Vite Frontend
외부 API(KAC/MOLIT/ICN) → data/external/api_{raw,clean}
```

## 4. PHASE 및 산출물
| Phase | 주요 결과 |
| --- | --- |
| 0 | 환경 세팅, `.env`, 테스트 실행 |
| 1 | Raw 봉인 / Data Dictionary |
| 2 | `flights_master.parquet` |
| 3 | `flights_labeled.parquet` |
| 4 | `features_congestion.parquet` |
| 5 | `train_table.parquet` |
| 6 | `outputs/graphs/*.png`, `phase6_eda_stats.json` |
| 7 | API 수집 스크립트, `data/external/api_*` |
| 8 | 모델 3종, `metrics.json`, `feature_importance.json` |
| 9 | FastAPI `/api/v1` |
|10 | Frontend React/Vite |
|11 | 보고서·PPT·docs |

## 5. 기술 스택 및 실행 커맨드
| 영역 | 스택 | 실행 명령 |
| --- | --- | --- |
| 데이터/ML/백엔드 | Python 3.10, FastAPI, pandas, XGBoost·CatBoost·LightGBM | `source .venv/bin/activate && uvicorn app.main:app --app-dir backend` |
| 프론트엔드 | React 18, TypeScript, Vite, Recharts | `cd frontend && npm run dev` |
| 인프라 | 로컬/Colab, Docker(PostgreSQL 옵션) | `docker-compose up db` (필요 시) |

## 6. 역할 분담 원칙
- **데이터/ML**: 파이프라인 재현성 확보, 설정 파일 기반 실험, Feature Importance 기록.
- **백엔드**: 모델 로딩/캐싱, Pydantic 검증, API 로그와 헬스체크 유지.
- **프론트**: 실시간 시각화, Prediction Lab 캘린더·Route Advisor, 다국어(i18n) 적용.
- **공통**: Raw 불변, 자동화 스크립트 필수, “한 번만” 코드 금지, Swagger/Storybook 수준 문서화.

이 문서는 프로젝트 시작점 요약이며, 세부 구현 지침은 docs/01~05에 정리되어 있다.
