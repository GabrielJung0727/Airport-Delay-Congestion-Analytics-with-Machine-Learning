import React, { useState } from "react";
import Dashboard from "../pages/Dashboard";
import AirportDetail from "../pages/AirportDetail";
import PredictionLab from "../pages/PredictionLab";

const tabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "detail", label: "Airport Detail" },
  { id: "lab", label: "Prediction Lab" }
];

const AVAILABLE_AIRPORTS = ["ICN"];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [airport, setAirport] = useState<string>(AVAILABLE_AIRPORTS[0]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f6fa",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#212529"
      }}
    >
      <header
        style={{
          padding: "1.5rem 2rem",
          backgroundColor: "#fff",
          borderBottom: "1px solid #e9ecef",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Airport Delay Lab</h1>
          <small style={{ color: "#868e96" }}>Live stats + ML predictions</small>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.9rem", color: "#555" }}>
            Airport
            <select
              value={airport}
              onChange={(event) => setAirport(event.target.value)}
              style={{
                marginLeft: "0.5rem",
                padding: "0.4rem 0.6rem",
                borderRadius: "8px",
                border: "1px solid #ced4da"
              }}
            >
              {AVAILABLE_AIRPORTS.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <nav
        style={{
          display: "flex",
          gap: "1rem",
          padding: "1rem 2rem",
          borderBottom: "1px solid #e9ecef",
          background: "#fff"
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: activeTab === tab.id ? "#4c6ef5" : "#dee2e6",
              background: activeTab === tab.id ? "#4c6ef5" : "#fff",
              color: activeTab === tab.id ? "#fff" : "#495057",
              cursor: "pointer"
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        {activeTab === "dashboard" && <Dashboard airport={airport} />}
        {activeTab === "detail" && <AirportDetail airport={airport} />}
        {activeTab === "lab" && <PredictionLab airport={airport} />}
      </main>
    </div>
  );
};

export default App;
