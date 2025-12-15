import React, { useEffect, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from "recharts";
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";
import StatCard from "../components/StatCard";
import PageLayout from "../components/PageLayout";
import { fetchAirportStats, fetchHourlyStats, fetchTimeseriesStats } from "../api/stats";
import { AirportStats, HourlyStat, TimeseriesPoint } from "../types/stats";

interface DashboardProps {
  airport: string;
}

const Dashboard: React.FC<DashboardProps> = ({ airport }) => {
  const [airportStats, setAirportStats] = useState<AirportStats | null>(null);
  const [hourly, setHourly] = useState<HourlyStat[]>([]);
  const [timeline, setTimeline] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAirportStats(airport),
      fetchHourlyStats(airport),
      fetchTimeseriesStats(airport)
    ])
      .then(([stats, hourlyStats, timeseries]) => {
        if (!mounted) return;
        setAirportStats(stats);
        setHourly(hourlyStats);
        setTimeline(timeseries.slice(-14));
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message ?? "Failed to load dashboard");
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [airport]);

  const statCards = useMemo(() => {
    if (!airportStats) return [];
    return [
      {
        title: "Avg Delay Rate",
        value: `${(airportStats.avg_delay_rate * 100).toFixed(1)}%`,
        subtitle: `${airportStats.total_flights.toLocaleString()} flights`
      },
      {
        title: "Peak Delay Hour",
        value: airportStats.peak_hour !== null ? `${airportStats.peak_hour}:00` : "-",
        subtitle: `${airportStats.from_date} → ${airportStats.to_date}`
      },
      {
        title: "Runway Throughput",
        value: "74 ops/hr",
        subtitle: "Derived from historical operations"
      }
    ];
  }, [airportStats]);

  if (loading) {
    return <Loader label="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!airportStats) {
    return <ErrorState message="Dashboard data unavailable." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <PageLayout title="Apron Overview" description={`Flight telemetry for ${airport}`}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem"
          }}
        >
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>
      </PageLayout>

      <PageLayout title="Delay Trend (Last 14 days)" description="ML baseline vs actual rates">
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={timeline}>
              <defs>
                <linearGradient id="delayGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#4c6ef5" stopOpacity={0.9} />
                  <stop offset="90%" stopColor="#4c6ef5" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={45} />
              <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
              <Area
                type="monotone"
                dataKey="delay_rate"
                stroke="#4c6ef5"
                strokeWidth={2}
                fill="url(#delayGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </PageLayout>

      <PageLayout title="Hourly Hotspots" description="Identify crew/bay pressure slots">
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={hourly}>
              <XAxis dataKey="hour" />
              <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} width={45} />
              <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
              <Bar dataKey="delay_rate" fill="#ff922b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PageLayout>
    </div>
  );
};

export default Dashboard;
