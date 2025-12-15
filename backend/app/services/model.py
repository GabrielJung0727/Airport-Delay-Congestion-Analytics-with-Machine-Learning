from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator

from app.services.data_repository import DataRepository


class PredictionError(Exception):
    """Raised when inference cannot be performed."""


class Predictor:
    def __init__(
        self,
        repository: DataRepository,
        model_dir: Path,
        model_name: str,
        metrics_path: Path,
    ) -> None:
        self.repository = repository
        self.model_path = model_dir / f"{model_name}.joblib"
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model file not found at {self.model_path}")
        bundle = joblib.load(self.model_path)
        self.model: BaseEstimator = bundle["model"]
        self.preprocessor = bundle["preprocessor"]
        self.feature_list = getattr(self.preprocessor, "feature_list_", None)
        if not self.feature_list:
            raise PredictionError("Preprocessor feature list is missing.")
        self.threshold = self._load_threshold(metrics_path, model_name)

    @staticmethod
    def _load_threshold(metrics_path: Path, model_name: str) -> float:
        if not metrics_path.exists():
            return 0.5
        try:
            metrics = json.loads(metrics_path.read_text())
            return float(metrics.get(model_name, {}).get("threshold", 0.5))
        except Exception:
            return 0.5

    def _build_feature_row(self, payload: Dict[str, Any]) -> pd.DataFrame:
        airport_code = payload["airport"].upper()
        hour = payload["hour"]
        weekday = payload["weekday"]
        base_row = self.repository.sample_row(airport_code, hour, weekday)
        row = base_row.copy()
        row["airport_code"] = airport_code
        row["hour"] = hour
        row["weekday"] = weekday
        row["month"] = payload.get("month") or row["month"]
        if "congestion_ratio" in payload and payload["congestion_ratio"] is not None:
            row["hourly_congestion_ratio"] = payload["congestion_ratio"]
        for field in [
            "airport_hour_flights",
            "daily_flights",
            "airport_daily_avg_flights",
        ]:
            if payload.get(field) is not None:
                row[field] = payload[field]
        frame = pd.DataFrame([row])
        missing_cols = set(self.feature_list) - set(frame.columns)
        for col in missing_cols:
            frame[col] = np.nan
        frame = frame[self.feature_list]
        return frame

    def predict(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        features = self._build_feature_row(payload)
        transformed = self.preprocessor.transform(features)
        proba = self.model.predict_proba(transformed)[:, 1][0]
        return {
            "delay_probability": float(proba),
            "predicted_label": int(proba >= self.threshold),
            "threshold": self.threshold,
        }
