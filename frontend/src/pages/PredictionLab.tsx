import React, { useState } from "react";
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";
import PageLayout from "../components/PageLayout";
import { requestPrediction } from "../api/predict";
import { PredictResponse } from "../types/predict";

interface PredictionLabProps {
  airport: string;
}

const defaultForm = {
  hour: 18,
  weekday: 3,
  month: 12,
  congestion_ratio: 1.2
};

const PredictionLab: React.FC<PredictionLabProps> = ({ airport }) => {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? "" : Number(value)
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        airport,
        hour: Number(form.hour),
        weekday: Number(form.weekday),
        month: Number(form.month),
        congestion_ratio: Number(form.congestion_ratio)
      };
      const response = await requestPrediction(payload);
      setResult(response);
    } catch (err: any) {
      setError(err.message ?? "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Prediction Lab"
      description="Experiment with input combinations to project delay probability"
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          background: "#fff",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px solid #e9ecef"
        }}
      >
        {["hour", "weekday", "month", "congestion_ratio"].map((field) => (
          <label key={field} style={{ fontSize: "0.85rem", color: "#555" }}>
            {field.replace("_", " ")}
            <input
              type="number"
              name={field}
              value={form[field as keyof typeof form]}
              onChange={handleChange}
              style={{
                width: "100%",
                marginTop: "0.35rem",
                borderRadius: "8px",
                padding: "0.5rem",
                border: "1px solid #ced4da"
              }}
              min={field === "hour" ? 0 : 0}
              max={field === "hour" ? 23 : field === "weekday" ? 6 : field === "month" ? 12 : undefined}
              step="0.1"
            />
          </label>
        ))}
        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            style={{
              background: "#4c6ef5",
              color: "#fff",
              padding: "0.75rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Run Prediction
          </button>
        </div>
      </form>

      <div style={{ marginTop: "1.5rem" }}>
        {loading && <Loader label="Predicting..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && result && (
          <div
            style={{
              padding: "1rem",
              border: "1px solid #dbe4ff",
              borderRadius: "12px",
              background: "#f8f9ff",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}
          >
            <strong>Delay Probability: {(result.delay_probability * 100).toFixed(1)}%</strong>
            <span>Label (threshold {result.threshold.toFixed(2)}): {result.predicted_label === 1 ? "Likely delay" : "On time"}</span>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default PredictionLab;
