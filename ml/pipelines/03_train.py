"""
Phase 8 training pipeline.

Trains baseline models (Logistic Regression, RandomForest) and gradient boosting
models (XGBoost, CatBoost, LightGBM) on `data/processed/train_table.parquet`.
Outputs:
  - Trained models under `ml/artifacts/models/*.joblib`
  - Metrics/thresholds under `ml/artifacts/reports/metrics.json`
  - Feature importance under `ml/artifacts/reports/feature_importance.json`
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from lightgbm import LGBMClassifier
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

ARTIFACT_DIR = Path("ml/artifacts")
MODEL_DIR = ARTIFACT_DIR / "models"
REPORT_DIR = ARTIFACT_DIR / "reports"

TARGET = "delay_label"
DROP_COLUMNS = [
    TARGET,
    "delay_minutes",
    "special_status",
    "label_source",
    "flight_date",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train ML models for delay prediction.")
    parser.add_argument("--input", type=Path, default=Path("data/processed/train_table.parquet"))
    parser.add_argument("--test-size", type=float, default=0.3)
    parser.add_argument("--random-state", type=int, default=42)
    parser.add_argument("--n_estimators", type=int, default=300)
    return parser.parse_args()


def load_dataset(path: Path) -> pd.DataFrame:
    df = pd.read_parquet(path)
    df = df[df[TARGET].notna()].copy()
    logging.info("Loaded dataset %s (%d rows)", path, len(df))
    return df


def split_dataset(df: pd.DataFrame, test_size: float, random_state: int) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    train_df, temp_df = train_test_split(
        df,
        test_size=test_size,
        stratify=df[TARGET],
        random_state=random_state,
    )
    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.5,
        stratify=temp_df[TARGET],
        random_state=random_state,
    )
    logging.info("Split dataset into train=%d, val=%d, test=%d", len(train_df), len(val_df), len(test_df))
    return train_df, val_df, test_df


def build_preprocessor(df: pd.DataFrame) -> Tuple[ColumnTransformer, List[str]]:
    features = [col for col in df.columns if col not in DROP_COLUMNS]
    X = df[features]
    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numeric_cols = [col for col in features if col not in categorical_cols]

    from sklearn.impute import SimpleImputer

    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler(with_mean=False)),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_cols),
            ("cat", categorical_transformer, categorical_cols),
        ]
    )
    preprocessor.feature_list_ = features  # type: ignore[attr-defined]
    preprocessor.categorical_cols_ = categorical_cols  # type: ignore[attr-defined]
    preprocessor.numeric_cols_ = numeric_cols  # type: ignore[attr-defined]
    return preprocessor, features


def find_best_threshold(y_true: np.ndarray, y_prob: np.ndarray) -> Tuple[float, float]:
    precision, recall, thresholds = precision_recall_curve(y_true, y_prob)
    thresholds = np.append(thresholds, 1.0)
    f1_scores = 2 * precision * recall / (precision + recall + 1e-9)
    best_idx = np.nanargmax(f1_scores)
    best_threshold = thresholds[best_idx]
    return float(best_threshold), float(f1_scores[best_idx])


def evaluate_predictions(y_true: np.ndarray, y_prob: np.ndarray, threshold: float) -> Dict[str, float]:
    y_pred = (y_prob >= threshold).astype(int)
    roc_auc = roc_auc_score(y_true, y_prob)
    f1 = f1_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    accuracy = accuracy_score(y_true, y_pred)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

    return {
        "roc_auc": float(roc_auc),
        "f1": float(f1),
        "precision": float(precision),
        "recall": float(recall),
        "accuracy": float(accuracy),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
        "threshold": float(threshold),
    }


def extract_feature_names(preprocessor: ColumnTransformer) -> List[str]:
    try:
        names = preprocessor.get_feature_names_out().tolist()
    except AttributeError:
        num_features = preprocessor.numeric_cols_  # type: ignore[attr-defined]
        cat_pipeline = preprocessor.transformers_[1][1]
        cat_encoder = cat_pipeline.named_steps["encoder"]
        cat_features = preprocessor.categorical_cols_  # type: ignore[attr-defined]
        cat_names = cat_encoder.get_feature_names_out(cat_features)
        names = list(num_features) + cat_names.tolist()
    return names


def extract_importance(model_name: str, model, feature_names: List[str]) -> List[Tuple[str, float]]:
    if hasattr(model, "coef_"):
        coefs = np.abs(model.coef_).ravel()
    elif hasattr(model, "feature_importances_"):
        coefs = model.feature_importances_
    else:
        return []
    importance = sorted(zip(feature_names, coefs), key=lambda x: x[1], reverse=True)
    return [(name, float(value)) for name, value in importance[:50]]


def train_models(preprocessor: ColumnTransformer, train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame, random_state: int, n_estimators: int) -> Tuple[Dict[str, Dict[str, float]], Dict[str, List[Tuple[str, float]]]]:
    features = preprocessor.feature_list_  # type: ignore[attr-defined]
    X_train = train_df[features]
    y_train = train_df[TARGET].astype(int)
    X_val = val_df[features]
    y_val = val_df[TARGET].astype(int)
    X_test = test_df[features]
    y_test = test_df[TARGET].astype(int)

    preprocessor.fit(X_train)
    feature_names = extract_feature_names(preprocessor)
    X_train_enc = preprocessor.transform(X_train)
    X_val_enc = preprocessor.transform(X_val)
    X_test_enc = preprocessor.transform(X_test)

    neg, pos = np.bincount(y_train)
    scale_pos_weight = neg / max(pos, 1)

    configs = [
        ("log_reg", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ("random_forest", RandomForestClassifier(n_estimators=n_estimators, class_weight="balanced", random_state=random_state, n_jobs=-1, max_depth=8)),
        ("xgboost", XGBClassifier(
            n_estimators=n_estimators,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            max_depth=6,
            reg_lambda=1.0,
            scale_pos_weight=scale_pos_weight,
            eval_metric="auc",
            n_jobs=-1,
            random_state=random_state,
        )),
        ("lightgbm", LGBMClassifier(
            n_estimators=n_estimators,
            subsample=0.8,
            colsample_bytree=0.8,
            learning_rate=0.05,
            class_weight=None,
            scale_pos_weight=scale_pos_weight,
            random_state=random_state,
        )),
        ("catboost", CatBoostClassifier(
            iterations=n_estimators,
            learning_rate=0.05,
            depth=6,
            loss_function="Logloss",
            verbose=False,
            scale_pos_weight=scale_pos_weight,
            random_seed=random_state,
        )),
    ]

    metrics: Dict[str, Dict[str, float]] = {}
    importances: Dict[str, List[Tuple[str, float]]] = {}

    for name, model in configs:
        logging.info("Training %s", name)
        if name == "catboost":
            model.fit(X_train_enc.toarray(), y_train)
            val_prob = model.predict_proba(X_val_enc.toarray())[:, 1]
            test_prob = model.predict_proba(X_test_enc.toarray())[:, 1]
        else:
            model.fit(X_train_enc, y_train)
            val_prob = model.predict_proba(X_val_enc)[:, 1]
            test_prob = model.predict_proba(X_test_enc)[:, 1]

        best_threshold, best_f1 = find_best_threshold(y_val, val_prob)
        logging.info("%s best threshold=%.3f (val F1=%.3f)", name, best_threshold, best_f1)

        metrics[name] = evaluate_predictions(y_test, test_prob, best_threshold)
        metrics[name]["val_best_f1"] = best_f1

        importances[name] = extract_importance(name, model, feature_names)

        model_path = MODEL_DIR / f"{name}.joblib"
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "preprocessor": preprocessor}, model_path)
        logging.info("Saved %s model to %s", name, model_path)

    return metrics, importances


def save_reports(metrics: Dict[str, Dict[str, float]], importances: Dict[str, List[Tuple[str, float]]]) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    metrics_path = REPORT_DIR / "metrics.json"
    feature_path = REPORT_DIR / "feature_importance.json"
    metrics_path.write_text(json.dumps(metrics, indent=2))
    feature_path.write_text(json.dumps(importances, indent=2))
    logging.info("Metrics written to %s", metrics_path)
    logging.info("Feature importance written to %s", feature_path)


def main() -> None:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    df = load_dataset(args.input)
    train_df, val_df, test_df = split_dataset(df, args.test_size, args.random_state)
    preprocessor, features = build_preprocessor(df)
    preprocessor.feature_names_in_ = features  # type: ignore[attr-defined]

    metrics, importances = train_models(preprocessor, train_df, val_df, test_df, args.random_state, args.n_estimators)
    save_reports(metrics, importances)


if __name__ == "__main__":
    main()
