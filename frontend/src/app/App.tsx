import React, { useState } from "react";
import Dashboard from "../pages/Dashboard";
import AirportDetail from "../pages/AirportDetail";
import PredictionLab from "../pages/PredictionLab";
import RouteAdvisor from "../pages/RouteAdvisor";
import AirportHero from "../components/AirportHero";

const tabs = [
  { id: "dashboard", label: "Control Tower" },
  { id: "detail", label: "Gate Situation" },
  { id: "lab", label: "Prediction Lab" },
  { id: "route", label: "Route Advisor" }
];

const AVAILABLE_AIRPORTS = ["ICN"];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [airport, setAirport] = useState<string>(AVAILABLE_AIRPORTS[0]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#edf0ff 0%, #f7fbff 40%, #f5f5f5 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#212529",
        padding: "1.5rem"
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <AirportHero airport={airport} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            background: "#fff",
            padding: "1rem 1.5rem",
            borderRadius: "20px",
            boxShadow: "0 6px 30px rgba(15,23,42,0.08)"
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#6c7385" }}>Choose airport</p>
            <h2 style={{ margin: 0 }}>OPS Dashboard</h2>
          </div>
          <div style={{ display: "flex", gap: "0.7rem" }}>
            <select
              value={airport}
              onChange={(event) => setAirport(event.target.value)}
              style={{
                padding: "0.5rem 0.8rem",
                borderRadius: "10px",
                border: "1px solid #ced4da",
                fontSize: "1rem"
              }}
            >
              {AVAILABLE_AIRPORTS.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "999px",
                    border: "none",
                    background: activeTab === tab.id ? "#1f7aec" : "#e9ecef",
                    color: activeTab === tab.id ? "#fff" : "#495057",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main>
          {activeTab === "dashboard" && <Dashboard airport={airport} />}
          {activeTab === "detail" && <AirportDetail airport={airport} />}
          {activeTab === "lab" && <PredictionLab airport={airport} />}
        </main>
        {activeTab === "route" && <RouteAdvisor airport={airport} />}
      </div>
    </div>
  );
};

export default App;
