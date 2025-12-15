import React, { useEffect, useState } from "react";
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";
import PageLayout from "../components/PageLayout";
import { fetchHourlyStats, fetchTimeseriesStats } from "../api/stats";
import { HourlyStat, TimeseriesPoint } from "../types/stats";
import { useTranslation } from "../i18n";

const gateSnapshot = [
  { terminal: "T1 Gates A-F", utilization: 0.82, status: "high" },
  { terminal: "T1 Gates G-M", utilization: 0.68, status: "stable" },
  { terminal: "T2 Gates N-R", utilization: 0.74, status: "elevated" },
  { terminal: "Satellite Gates", utilization: 0.41, status: "available" }
] as const;

interface AirportDetailProps {
  airport: string;
}

const AirportDetail: React.FC<AirportDetailProps> = ({ airport }) => {
  const t = useTranslation();
  const [hourly, setHourly] = useState<HourlyStat[]>([]);
  const [timeline, setTimeline] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchHourlyStats(airport), fetchTimeseriesStats(airport)])
      .then(([hourlyStats, timeseries]) => {
        if (!mounted) return;
        setHourly(hourlyStats);
        setTimeline(timeseries);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message ?? t.common.errorDetail);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [airport, t.common.errorDetail]);

  if (loading) {
    return <Loader label={t.common.loadingDetail} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <PageLayout title={`${airport} · ${t.detail.gateTitle}`} description={t.detail.gateDesc}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem"
          }}
        >
          {gateSnapshot.map((gate) => (
            <div
              key={gate.terminal}
              style={{
                padding: "1rem",
                borderRadius: "16px",
                border: "1px solid #edf2ff",
                background: "#fff",
                boxShadow: "0 10px 20px rgba(15,23,42,0.05)"
              }}
            >
              <strong>{gate.terminal}</strong>
              <p style={{ margin: "0.3rem 0", color: "#6c757d", fontSize: "0.85rem" }}>
                {t.detail.gateStatus[gate.status]}
              </p>
              <div
                style={{
                  height: "8px",
                  borderRadius: "999px",
                  background: "#e9ecef",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${gate.utilization * 100}%`,
                    background: gate.utilization > 0.75 ? "#f03e3e" : "#339af0",
                    height: "100%"
                  }}
                />
              </div>
              <small style={{ color: "#868e96" }}>
                {t.detail.utilizationLabel.replace("{value}", (gate.utilization * 100).toFixed(0))}
              </small>
            </div>
          ))}
        </div>
      </PageLayout>

      <PageLayout
        title={`${airport} · ${t.detail.hourlyTitle}`}
        description={t.detail.hourlyDesc}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th>{t.detail.table.hour}</th>
                <th>{t.detail.table.delayRate}</th>
                <th>{t.detail.table.congestion}</th>
                <th>{t.detail.table.flights}</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((row) => (
                <tr key={row.hour} style={{ borderBottom: "1px solid #f1f1f1" }}>
                  <td>{row.hour}:00</td>
                  <td>{(row.delay_rate * 100).toFixed(1)}%</td>
                  <td>{row.hourly_congestion_ratio.toFixed(2)}×</td>
                  <td>{row.airport_hour_flights.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageLayout>

      <PageLayout title={t.detail.timelineTitle} description={t.detail.timelineDesc}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th>{t.detail.table.date}</th>
                <th>{t.detail.table.delayRate}</th>
                <th>{t.detail.table.flights}</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((row) => (
                <tr key={row.date} style={{ borderBottom: "1px solid #f1f1f1" }}>
                  <td>{row.date}</td>
                  <td>{(row.delay_rate * 100).toFixed(1)}%</td>
                  <td>{row.flights.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageLayout>
    </div>
  );
};

export default AirportDetail;
