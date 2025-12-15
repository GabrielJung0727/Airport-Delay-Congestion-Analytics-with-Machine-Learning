export interface PredictRequest {
  airport: string;
  hour: number;
  weekday: number;
  month?: number;
  congestion_ratio?: number;
  airport_hour_flights?: number;
  daily_flights?: number;
  airport_daily_avg_flights?: number;
}

export interface PredictResponse {
  delay_probability: number;
  predicted_label: number;
  threshold: number;
}

export interface ApiResponseEnvelope<T> {
  data: T;
  meta: { request_id: string };
}
