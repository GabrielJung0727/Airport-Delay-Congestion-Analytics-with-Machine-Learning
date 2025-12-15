import React, { useEffect, useMemo, useState } from "react";
import Loader from "../components/Loader";
import ErrorState from "../components/ErrorState";
import PageLayout from "../components/PageLayout";
import { requestPrediction } from "../api/predict";
import { PredictResponse } from "../types/predict";
import ProbabilityGauge from "../components/ProbabilityGauge";
import { fetchTimeseriesStats } from "../api/stats";
import { TimeseriesPoint } from "../types/stats";
import { useTranslation } from "../i18n";

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
  const t = useTranslation();
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<TimeseriesPoint[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarRef, setCalendarRef] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const todayISO = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [forecastMap, setForecastMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    fetchTimeseriesStats(airport)
      .then((data) => {
        if (!mounted) return;
        setCalendarData(data);
        setCalendarError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setCalendarError(err.message ?? t.predictionCalendar.noData);
      });
    return () => {
      mounted = false;
    };
  }, [airport, t.predictionCalendar.noData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? "" : Number(value)
    }));
  };

  const handleDateSelect = (date: string) => {
    const dt = new Date(date);
    if (Number.isNaN(dt.getTime())) return;
    setForm((prev) => ({
      ...prev,
      month: dt.getUTCMonth() + 1,
      weekday: dt.getUTCDay()
    }));
    setSelectedDate(date);
  };

  const delayLookup = useMemo(() => {
    const map = new Map<string, TimeseriesPoint>();
    calendarData.forEach((item) => {
      map.set(item.date, item);
    });
    return map;
  }, [calendarData]);

  const avgFlights = useMemo(() => {
    if (!calendarData.length) return null;
    const total = calendarData.reduce((sum, entry) => sum + (entry.flights ?? 0), 0);
    if (!total) return null;
    return total / calendarData.length;
  }, [calendarData]);

  const calendarMatrix = useMemo(() => {
    const year = calendarRef.getUTCFullYear();
    const month = calendarRef.getUTCMonth();
    const start = new Date(Date.UTC(year, month, 1));
    const firstWeekday = start.getUTCDay(); // Sunday=0
    const firstCell = new Date(start);
    firstCell.setUTCDate(firstCell.getUTCDate() - firstWeekday);

    const weeks: Date[][] = [];
    for (let w = 0; w < 6; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(firstCell);
        cellDate.setUTCDate(firstCell.getUTCDate() + w * 7 + d);
        week.push(cellDate);
      }
      weeks.push(week);
    }
    return weeks;
  }, [calendarRef, calendarData]);

  const isSameMonth = (date: Date) => date.getUTCMonth() === calendarRef.getUTCMonth();

  const prevMonth = () => {
    setCalendarRef((current) => {
      const next = new Date(current);
      next.setUTCMonth(current.getUTCMonth() - 1);
      return new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1));
    });
  };

  const nextMonth = () => {
    setCalendarRef((current) => {
      const next = new Date(current);
      next.setUTCMonth(current.getUTCMonth() + 1);
      return new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 1));
    });
  };

  const buildPayload = (target: Date) => ({
    airport,
    hour: Number(form.hour),
    weekday: target.getUTCDay(),
    month: target.getUTCMonth() + 1,
    congestion_ratio: Number(form.congestion_ratio)
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const updates: Record<string, number> = {};
      let selectedResult: PredictResponse | null = null;

      const selectedDateObj = new Date(selectedDate);
      if (!Number.isNaN(selectedDateObj.getTime())) {
        const payload = buildPayload(selectedDateObj);
        selectedResult = await requestPrediction(payload);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const forecastDays = 14;

      for (let i = 0; i < forecastDays; i++) {
        const current = new Date(today);
        current.setDate(today.getDate() + i);
        const iso = current.toISOString().slice(0, 10);
        const resp = await requestPrediction(buildPayload(current));
        updates[iso] = resp.delay_probability;
        if (iso === selectedDate) {
          selectedResult = resp;
        }
      }

      if (selectedResult) {
        setResult(selectedResult);
      }
      setForecastMap((prev) => ({
        ...prev,
        ...updates,
        ...(selectedResult ? { [selectedDate]: selectedResult.delay_probability } : {})
      }));
    } catch (err: any) {
      setError(err.message ?? t.common.predictionFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title={t.prediction.title} description={t.prediction.description}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "1.5rem",
            flexWrap: "wrap"
          }}
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
            <div style={{ gridColumn: "1 / -1", fontWeight: 600, color: "#2c3e50" }}>
              {t.prediction.targetLabel}: {selectedDate}
            </div>
            {["hour", "weekday", "month", "congestion_ratio"].map((field) => (
              <label key={field} style={{ fontSize: "0.85rem", color: "#555" }}>
                {t.prediction.fields[field as keyof typeof form]}
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
            <div style={{ gridColumn: "1 / -1", fontSize: "0.8rem", color: "#6c757d" }}>
              {t.prediction.tips}
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
                {t.prediction.runButton}
              </button>
              <button
                type="button"
                onClick={() => setForm(defaultForm)}
                style={{
                  background: "#e9ecef",
                  color: "#343a40",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                {t.prediction.resetButton}
              </button>
            </div>
          </form>

          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              border: "1px solid #e9ecef",
              padding: "1rem"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.8rem"
              }}
            >
              <button onClick={prevMonth} style={{ border: "none", background: "none", fontSize: "1.5rem" }}>
                ‹
              </button>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {calendarRef.toLocaleString("default", { month: "long", year: "numeric" })}
              </p>
              <button onClick={nextMonth} style={{ border: "none", background: "none", fontSize: "1.5rem" }}>
                ›
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setCalendarRef(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
                  const today = new Date();
                  const iso = today.toISOString().slice(0, 10);
                  handleDateSelect(iso);
                }}
                style={{
                  border: "1px solid #dee2e6",
                  borderRadius: "8px",
                  background: "#f1f3f5",
                  padding: "0.4rem 0.7rem",
                  fontSize: "0.8rem",
                  marginLeft: "0.5rem"
                }}
              >
                {t.prediction.calendarToday}
              </button>
            </div>
            {calendarError && <ErrorState message={calendarError} />}
            {!calendarError && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    textAlign: "center",
                    color: "#868e96",
                    fontSize: "0.75rem",
                    marginBottom: "0.5rem"
                  }}
                >
                  {t.predictionCalendar.weekdays.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                    gap: "0.3rem"
                  }}
                >
                  {calendarMatrix.map((week, weekIdx) =>
                    week.map((day) => {
                      const iso = day.toISOString().slice(0, 10);
                      const stat = delayLookup.get(iso);
                      const level = stat?.delay_rate ?? null;
                      const predicted = forecastMap[iso];
                      const displayValue = level ?? predicted ?? null;
                      const flightsCount = stat?.flights ?? avgFlights ?? null;
                      const passengerEstimate = flightsCount ? Math.round(flightsCount * 150) : null;
                      const predictedPassengerDelay =
                        flightsCount && predicted !== undefined
                          ? Math.round(flightsCount * 150 * predicted)
                          : null;
                      const color = level
                        ? level > 0.85
                          ? "#f03e3e"
                          : level > 0.75
                          ? "#f9a825"
                          : level > 0.6
                          ? "#4dabf7"
                          : "#51cf66"
                        : "#dee2e6";
                      const muted = !isSameMonth(day);
                      const isSelected = iso === selectedDate;
                      return (
                        <button
                          key={`${weekIdx}-${iso}`}
                          onClick={() => handleDateSelect(iso)}
                          style={{
                            border: isSelected ? "2px solid #4c6ef5" : "1px solid #e9ecef",
                            borderRadius: "12px",
                            padding: "0.6rem 0.4rem",
                            background: muted ? "#f8f9fa" : "#fff",
                            color: muted ? "#adb5bd" : "#343a40",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.2rem",
                            minHeight: "80px"
                          }}
                          title={
                            stat
                              ? `${iso}: ${(stat.delay_rate * 100).toFixed(1)}% delay`
                              : predicted
                              ? `${iso}: ML ${(predicted * 100).toFixed(1)}%`
                              : `${iso}: No sample data`
                          }
                        >
                          <span>{day.getUTCDate()}</span>
                          <span
                            style={{
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              background: color,
                              opacity: level ? 1 : 0.4
                            }}
                          />
                          <small style={{ opacity: 0.8 }}>
                            {displayValue !== null ? `${(displayValue * 100).toFixed(0)}%` : "–"}
                          </small>
                          {passengerEstimate && (
                            <small style={{ color: "#868e96" }}>
                              {t.predictionCalendar.paxLabel.replace(
                                "{count}",
                                passengerEstimate.toLocaleString()
                              )}
                            </small>
                          )}
                          {predictedPassengerDelay !== null && (
                            <small style={{ color: level ? "#868e96" : "#4c6ef5", fontWeight: 600 }}>
                              {t.predictionCalendar.predictedPassengerLabel.replace(
                                "{count}",
                                predictedPassengerDelay.toLocaleString()
                              )}
                            </small>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
            <small style={{ color: "#868e96", display: "block", marginTop: "0.6rem" }}>
              {t.prediction.calendarHint}
            </small>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {loading && <Loader label={t.prediction.loaderLabel} />}
          {error && <ErrorState message={error} />}
          {!loading && !error && result && (
            <>
              <ProbabilityGauge probability={result.delay_probability} />
              <div
                style={{
                  flex: "1 1 240px",
                  padding: "1.2rem",
                  borderRadius: "16px",
                  border: "1px solid #e3f2fd",
                  background: "linear-gradient(135deg,#e3f2fd,#ffffff)"
                }}
              >
                <strong style={{ fontSize: "1.2rem" }}>
                  {result.predicted_label === 1 ? t.prediction.resultLikelyDelay : t.prediction.resultOnTime}
                </strong>
                <p style={{ margin: "0.5rem 0", color: "#495057" }}>
                  {t.prediction.resultNote.replace("{threshold}", result.threshold.toFixed(2))}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default PredictionLab;
