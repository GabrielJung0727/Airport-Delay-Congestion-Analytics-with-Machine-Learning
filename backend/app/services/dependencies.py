from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from app.core.config import settings
from app.services.data_repository import DataRepository
from app.services.model import Predictor


@lru_cache
def get_repository() -> DataRepository:
    return DataRepository(Path(settings.train_table_path))


@lru_cache
def get_predictor() -> Predictor:
    repo = get_repository()
    return Predictor(
        repository=repo,
        model_dir=Path(settings.model_dir),
        model_name=settings.default_model_name,
        metrics_path=Path(settings.metrics_path),
    )
