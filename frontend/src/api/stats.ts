import { apiFetch, withQuery } from "./client";
import {
  AirportStats,
  HourlyStat,
  TimeseriesPoint,
  ApiResponseEnvelope
} from "../types/stats";

export async function fetchAirportStats(airport: string) {
  const query = withQuery({ airport });
  const response = await apiFetch<ApiResponseEnvelope<AirportStats>>(
    `/api/v1/stats/airport${query}`
  );
  return response.data;
}

export async function fetchHourlyStats(airport?: string) {
  const query = withQuery({ airport });
  const response = await apiFetch<
    ApiResponseEnvelope<{ items: HourlyStat[] }>
  >(`/api/v1/stats/hourly${query}`);
  return response.data.items;
}

export async function fetchTimeseriesStats(airport?: string) {
  const query = withQuery({ airport });
  const response = await apiFetch<
    ApiResponseEnvelope<{ items: TimeseriesPoint[] }>
  >(`/api/v1/stats/timeseries${query}`);
  return response.data.items;
}
