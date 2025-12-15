import React, { useState } from "react";
import PageLayout from "../components/PageLayout";
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";
import ProbabilityGauge from "../components/ProbabilityGauge";
import { requestPrediction } from "../api/predict";
import { useTranslation } from "../i18n";

interface RouteAdvisorProps {
  airport: string;
}

const defaultForm = {
  travelMinutes: 90,
  checkinBufferMinutes: 120,
  flightHour: 10,
  congestion_ratio: 1.0,
  date: new Date().toISOString().slice(0, 10)
};

const formatTime = (date: Date) =>
  `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

const RouteAdvisor: React.FC<RouteAdvisorProps> = ({ airport }) => {
  const t = useTranslation();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    probability: number;
    leaveAt: string;
    arriveAt: string;
    bufferMinutes: number;
  } | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const flightDate = new Date(form.date);
      flightDate.setUTCHours(Number(form.flightHour), 0, 0, 0);

      const payload = {
        airport,
        hour: Number(form.flightHour),
        weekday: flightDate.getUTCDay(),
        month: flightDate.getUTCMonth() + 1,
        congestion_ratio: Number(form.congestion_ratio)
      };

      const response = await requestPrediction(payload);
      const probability = response.delay_probability;

      let extraBuffer = 0;
      if (probability > 0.85) extraBuffer = 45;
      else if (probability > 0.7) extraBuffer = 30;
      else if (probability > 0.5) extraBuffer = 15;

      const targetArrival = new Date(flightDate);
      targetArrival.setUTCMinutes(targetArrival.getUTCMinutes() - Number(form.checkinBufferMinutes));

      const recommendedArrival = new Date(targetArrival);
      recommendedArrival.setUTCMinutes(recommendedArrival.getUTCMinutes() - extraBuffer);

      const leaveTime = new Date(recommendedArrival);
      leaveTime.setUTCMinutes(leaveTime.getUTCMinutes() - Number(form.travelMinutes));

      setResult({
        probability,
        leaveAt: formatTime(leaveTime),
        arriveAt: formatTime(recommendedArrival),
        bufferMinutes: Number(form.checkinBufferMinutes) + extraBuffer
      });
    } catch (err: any) {
      setError(err.message ?? t.common.routeFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title={t.route.title} description={t.route.description}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          background: "#fff",
          padding: "1rem",
          borderRadius: "16px",
          border: "1px solid #e9ecef"
        }}
      >
        <label style={{ fontSize: "0.85rem", color: "#555" }}>
          {t.route.form.date}
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            style={{ width: "100%", marginTop: "0.35rem" }}
          />
        </label>
        <label style={{ fontSize: "0.85rem", color: "#555" }}>
          {t.route.form.hour}
          <input
            type="number"
            min={0}
            max={23}
            name="flightHour"
            value={form.flightHour}
            onChange={handleChange}
            style={{ width: "100%", marginTop: "0.35rem" }}
          />
        </label>
        <label style={{ fontSize: "0.85rem", color: "#555" }}>
          {t.route.form.travel}
          <input
            type="number"
            min={0}
            name="travelMinutes"
            value={form.travelMinutes}
            onChange={handleChange}
            style={{ width: "100%", marginTop: "0.35rem" }}
          />
        </label>
        <label style={{ fontSize: "0.85rem", color: "#555" }}>
          {t.route.form.buffer}
          <input
            type="number"
            min={0}
            name="checkinBufferMinutes"
            value={form.checkinBufferMinutes}
            onChange={handleChange}
            style={{ width: "100%", marginTop: "0.35rem" }}
          />
        </label>
        <label style={{ fontSize: "0.85rem", color: "#555" }}>
          {t.route.form.congestion}
          <input
            type="number"
            min={0}
            step="0.1"
            name="congestion_ratio"
            value={form.congestion_ratio}
            onChange={handleChange}
            style={{ width: "100%", marginTop: "0.35rem" }}
          />
        </label>
        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            style={{
              background: "#1f7aec",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer"
            }}
          >
            {t.route.button}
          </button>
        </div>
      </form>

      <div style={{ marginTop: "1.5rem" }}>
        {loading && <Loader label={t.route.loader} />}
        {error && <ErrorState message={error} />}
        {!loading && !error && result && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              alignItems: "center",
              background: "#fff",
              padding: "1.5rem",
              borderRadius: "16px",
              border: "1px solid #e9ecef"
            }}
          >
            <ProbabilityGauge probability={result.probability} />
            <div style={{ flex: "1 1 220px" }}>
              <h3 style={{ marginTop: 0 }}>{t.route.resultTitle}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, color: "#495057" }}>
                <li>
                  <strong>{t.route.leave}:</strong> {result.leaveAt}
                </li>
                <li>
                  <strong>{t.route.arrive}:</strong> {result.arriveAt}
                </li>
                <li>
                  <strong>{t.route.buffer}:</strong> {result.bufferMinutes} min
                </li>
              </ul>
              <p style={{ fontSize: "0.85rem", color: "#6c757d" }}>{t.route.footnote}</p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default RouteAdvisor;
