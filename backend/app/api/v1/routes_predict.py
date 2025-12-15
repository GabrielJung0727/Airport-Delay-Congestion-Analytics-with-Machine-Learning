from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.predict import PredictRequest
from app.services.dependencies import get_predictor
from app.services.model import PredictionError, Predictor
from app.utils.responses import wrap_response

router = APIRouter(prefix="/api/v1", tags=["predict"])


@router.post("/predict")
def predict_delay(
    payload: PredictRequest,
    predictor: Predictor = Depends(get_predictor),
) -> dict:
    try:
        prediction = predictor.predict(payload.dict())
    except PredictionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return wrap_response(prediction)
