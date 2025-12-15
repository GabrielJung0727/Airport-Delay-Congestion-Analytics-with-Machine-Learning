import { apiFetch } from "./client";
import { PredictRequest, PredictResponse, ApiResponseEnvelope } from "../types/predict";

export async function requestPrediction(payload: PredictRequest) {
  const response = await apiFetch<ApiResponseEnvelope<PredictResponse>>(
    "/api/v1/predict",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
  return response.data;
}
