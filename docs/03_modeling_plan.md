# 🤖 모델링 계획 — Airport Delay Lab

## 1. 목표
- 문제 유형: `delay_label`(15분 초과 지연 여부)을 예측하는 이진 분류.
- 성능 지표: ROC-AUC ≥ 0.70, F1 ≥ 0.60을 만족해야 한다.
- 모델군: Baseline(Logistic Regression, RandomForest)과 Gradient Boosting(XGBoost, CatBoost, LightGBM)을 모두 실험한다.

## 2. 데이터 분할
| 구분 | 비율 | 설명 |
| --- | --- | --- |
| 학습(Train) | 70% | 2019~2023 주요 기간, 시간순 분할 |
| 검증(Validation) | 15% | 2024년 1분기 |
| 테스트(Test) | 15% | 2024년 2분기 이후 |
- 시간 순서를 유지하여 미래 정보 누수를 방지한다.
- Pandas 필터링으로 기간을 직접 나누며, `scikit-learn train_test_split`은 사용하지 않는다.

## 3. Feature 처리 전략
- 수치형: 혼잡도 지표, lag 변수, `delay_minutes` 등을 그대로 입력.
- 범주형:
  - `origin_airport`, `dest_airport`, `airline` → Target Encoding (필요 시 희귀값 One-hot).
  - `weekday`, `month`, `hour` → sine/cosine 기반 순환 인코딩 실험.
- 정규화: 트리 모델은 불필요하지만 Logistic baseline에는 StandardScaler 적용.
- 결측값: 평균/0 대체 + `*_missing_flag` 컬럼 추가.

## 4. 실험 로드맵
| 단계 | 내용 | 비고 |
| --- | --- | --- |
| E1 | Logistic Regression (class_weight 비교) | 기준선 |
| E2 | RandomForest (n_estimators=500) | Feature Importance 대비 |
| E3 | XGBoost (기본 + Hyperparameter 튜닝) | 메인 모델 |
| E4 | CatBoost (범주 자동 처리) | 소규모 튜닝 |
| E5 | LightGBM | 대용량 처리 성능 확인 |
| E6 | Soft Voting/Ensemble | 필요 시 적용 |

### 하이퍼파라미터 예시 (XGBoost)
```yaml
model: xgboost
params:
  n_estimators: [400, 600, 800]
  max_depth: [5, 7, 9]
  learning_rate: [0.05, 0.1]
  subsample: [0.7, 0.9]
  colsample_bytree: [0.7, 0.9]
  scale_pos_weight: [1.5, 2.0, 2.5]
```
- 실험 로그는 `ml/artifacts/experiments/{timestamp}.json`에 저장한다.

## 5. 평가 지표
| 지표 | 용도 |
| --- | --- |
| ROC-AUC | 모델 비교, 최적 threshold 탐색 |
| F1 | 운영 KPI |
| Precision@0.5 / Recall@0.5 | 경보 신뢰도 보고 |
| PR Curve, Confusion Matrix | EDA 및 보고서 시각화 |
| Calibration Plot | 확률 값 검증 |

## 6. Threshold 튜닝
```python
best_f1, best_threshold = 0, 0.5
for t in np.linspace(0.3, 0.9, 25):
    preds = (probs >= t).astype(int)
    f1 = f1_score(y_true, preds)
```
- 검증 데이터에서 최적 threshold를 찾고 `ml/artifacts/reports/metrics.json`에 저장한다.
- 예측 API는 metrics.json에 기록된 threshold를 응답에 포함해 프론트에서 그대로 활용한다.

## 7. 모델 저장 및 서빙
- 모델 파일: `ml/artifacts/models/{model_name}.pkl`
- 메타데이터: `ml/artifacts/reports/metrics.json`, `feature_importance.json`
- FastAPI의 Model Registry가 최신 모델을 로드하여 `/api/v1/predict`에 사용한다.
- 향후 DB/캐시 도입을 대비해 `model_version` 필드를 응답에 포함한다.

## 8. 리스크와 대응
| 리스크 | 대응 방안 |
| --- | --- |
| 클래스 불균형 | `scale_pos_weight`, class_weight, SMOTE 실험 |
| 공항별 편향 | Target Encoding + 공항별 보정 |
| 시간대 Drift | 최근 30일 롤링 재학습, 자동화 스케줄링 |
| 실시간 데이터 결측 | 외부 API 실패 시 과거 평균값 사용 |

이 계획을 기준으로 실험을 기록하면 모델 개선과 배포가 재현 가능해진다.
