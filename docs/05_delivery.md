# 📦 PHASE 11 최종 전달 가이드

PHASE 11(정리 및 제출)을 한 번에 처리하기 위한 실무 체크리스트다. 서버 구동 시 초기 예측/시각화 설정(64), 보고서 정리(65), 문서 패키징(66)을 순차적으로 확인한다.

---

## 1. 서버 구동 및 기본 예측 세팅 (Step 64)

1. **환경 준비**

   ```bash
   source .venv/bin/activate
      
   npm --prefix frontend run dev
   ```

   - `.env`에 `DATA_ROOT`, `MODEL_DIR`, 외부 API Key가 모두 존재해야 한다.
   - 가동 전 `python ml/pipelines/*.py`를 재실행하여 `data/processed/train_table.parquet`과 `ml/artifacts/models/xgb.pkl`을 최신 상태로 맞춘다.

2. **시각화 초기화**
   - 백엔드 부팅 로그에서 `API starting with data_root=...` 값이 실제 경로와 일치하는지 확인한다.
   - Prediction Lab 달력은 UTC+9 기준으로 생성된다. 서버 재시작 후에는 “Run Prediction”을 한 번 눌러 14일치 `forecastMap`을 새로 채운다.
   - Dashboard/Detail API는 최근 14일 데이터를 자동으로 잘라 사용하므로 추가 설정이 필요 없다. 단, 기간 메타데이터가 필요하면 `data/processed/train_table_stats.json`을 갱신한다.

3. **헬스체크**

   ```bash
   curl http://localhost:8001/api/v1/health
   curl "http://localhost:8001/api/v1/stats/airport?airport=ICN"
   curl -X POST http://localhost:8001/api/v1/predict -H "Content-Type: application/json" \
     -d '{"airport":"ICN","hour":10,"weekday":2,"month":12,"congestion_ratio":1.1}'
   ```

   - 위 세 요청이 모두 200 OK로 응답하면 프론트엔드 기본 시각화도 정상 연동된 상태다.

---

## 2. 보고서 구성 (Step 65)

| 섹션 | 핵심 내용 | 참고 산출물 |
| --- | --- | --- |
| 문제 정의 | “공항별 혼잡·지연 예측 및 출발 권장 시각 계산” | README.md, docs/00_overview.md |
| 데이터 소개 | 8개 Raw + 4개 API, 컬럼·기간·키 | docs/01_data_dictionary.md, data/raw/\* |
| 전처리/혼잡도 | 파이프라인, 라벨, 혼잡도 수식 | docs/02_feature_engineering.md, data/interim/ |
| 모델 비교 | Logistic/RF/XGBoost/CatBoost/LightGBM 성능 | ml/artifacts/reports/metrics.json |
| Feature Importance | 상위 변수 10개 시각화 | ml/artifacts/reports/feature_importance.json |
| 예측/데모 | Prediction Lab, Route Advisor, 달력 뷰 | frontend/dist 캡처 |
| 한계/확장 | 실시간 기상, Postgres 적재 계획 | docs/03_modeling_plan.md |

- PPT 추천 구성: 문제 정의 → 데이터 → 전처리/혼잡도 → EDA 그래프 → 모델 성능 → 예측 데모 → 향후 계획.
- 그래프 자료는 `outputs/graphs/`와 `outputs/phase6_eda_stats.json`을 활용한다.

---

## 3. 문서 패키지 검증 (Step 66)

| 파일 | 내용 | 상태 |
| --- | --- | --- |
| `docs/00_overview.md` | 프로젝트 개요·PHASE 요약 | ✅ |
| `docs/01_data_dictionary.md` | 원본 데이터 인벤토리 | ✅ |
| `docs/02_feature_engineering.md` | 파이프라인·혼잡도 정의 | ✅ |
| `docs/03_modeling_plan.md` | 모델링 전략·지표 | ✅ |
| `docs/04_api_specs.md` | API 규격 및 로드맵 | ✅ |
| `docs/05_delivery.md` | 최종 전달 지침 | ✅ |

- 제출 전 `markdownlint docs/*.md`로 간단히 포맷을 검사한다.
- README에는 최종 실행 명령(`scripts/quickstart.sh`)과 데모 링크를 명시한다.

---

## 4. 제출 체크리스트

- [ ] `scripts/quickstart.sh` 실행 → 전처리·모델·백엔드·프론트 순으로 확인
- [ ] `npm run build`, `uvicorn ...` 실행 로그 캡처 → 보고서/부록에 첨부
- [ ] `docs/` 폴더 압축 또는 Git push
- [ ] PPT와 시연 영상(옵션) 준비

위 절차를 따르면 PHASE 11 요구사항을 모두 충족하며, 다른 인원이 합류하더라도 동일한 결과를 바로 재현할 수 있다.
