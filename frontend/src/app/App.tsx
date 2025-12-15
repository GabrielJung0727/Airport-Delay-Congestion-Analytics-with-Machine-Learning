import React, { useState } from "react";
import Dashboard from "../pages/Dashboard";
import AirportDetail from "../pages/AirportDetail";
import PredictionLab from "../pages/PredictionLab";
import RouteAdvisor from "../pages/RouteAdvisor";
import AirportHero from "../components/AirportHero";
import NeonBackground from "../components/NeonBackground";
import { Language, useLanguage, useTranslation } from "../i18n";

const TAB_ITEMS = [
  { id: "dashboard", key: "control" },
  { id: "detail", key: "detail" },
  { id: "lab", key: "lab" },
  { id: "route", key: "route" }
] as const;

const AVAILABLE_AIRPORTS = ["ICN"];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [airport, setAirport] = useState<string>(AVAILABLE_AIRPORTS[0]);
  const { lang, setLang } = useLanguage();
  const t = useTranslation();

  return (
    <div className="app-shell" style={{ minHeight: "100vh", padding: "1.5rem" }}>
      <NeonBackground />
      <div
        className="app-content"
        style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}
      >
        <AirportHero airport={airport} />

        <div
          className="glass-panel"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            padding: "1rem 1.5rem"
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#6c7385" }}>{t.app.chooseAirport}</p>
            <h2 style={{ margin: 0 }}>{t.app.opsDashboard}</h2>
          </div>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", color: "#6c7385" }}>
                {t.common.language}
                <select
                  value={lang}
                  onChange={(event) => setLang(event.target.value as Language)}
                  style={{
                    marginLeft: "0.5rem",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "10px",
                    border: "1px solid #ced4da",
                    fontSize: "0.9rem"
                  }}
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </label>
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
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {TAB_ITEMS.map((tab) => (
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
                  {t.tabs[tab.key]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main>
          {activeTab === "dashboard" && <Dashboard airport={airport} />}
          {activeTab === "detail" && <AirportDetail airport={airport} />}
          {activeTab === "lab" && <PredictionLab airport={airport} />}
          {activeTab === "route" && <RouteAdvisor airport={airport} />}
        </main>
      </div>
    </div>
  );
};

export default App;
