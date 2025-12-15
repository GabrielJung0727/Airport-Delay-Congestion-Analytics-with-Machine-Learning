export interface AirportStats {
  airport: string;
  from_date: string;
  to_date: string;
  avg_delay_rate: number;
  total_flights: number;
  peak_hour: number | null;
}

export interface HourlyStat {
  hour: number;
  delay_rate: number;
  hourly_congestion_ratio: number;
  airport_hour_flights: number;
}

export interface TimeseriesPoint {
  date: string;
  delay_rate: number;
  flights: number;
}

export interface ApiResponseEnvelope<T> {
  data: T;
  meta: { request_id: string };
}
