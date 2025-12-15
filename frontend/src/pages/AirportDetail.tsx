import React, { useEffect, useState } from "react";
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";
import PageLayout from "../components/PageLayout";
import { fetchHourlyStats, fetchTimeseriesStats } from "../api/stats";
import { HourlyStat, TimeseriesPoint } from "../types/stats";

interface AirportDetailProps {
  airport: string;
}

const AirportDetail: React.FC<AirportDetailProps> = ({ airport }) => {
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
        setError(err.message ?? "Failed to load airport details.");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [airport]);

  if (loading) {
    return <Loader label="Loading airport detail..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <PageLayout title={`Hourly Breakdown (${airport})`} description="Delay rate, flights, congestion ratio">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th>Hour</th>
                <th>Delay Rate</th>
                <th>Congestion</th>
                <th>Flights</th>
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

      <PageLayout title="Recent Delay Timeline" description="Full timeline from the processed dataset">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ background: "#f8f9fa" }}>
                <th>Date</th>
                <th>Delay Rate</th>
                <th>Flights</th>
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
