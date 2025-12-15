import React from "react";
import { useTranslation } from "../i18n";

interface AirportHeroProps {
  airport: string;
}

const AirportHero: React.FC<AirportHeroProps> = ({ airport }) => {
  const t = useTranslation();
  const heroText = t.hero;
  const title = heroText.title.replace("{airport}", airport);
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
        color: "#fff",
        padding: "2.5rem",
        borderRadius: "32px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 20px 45px rgba(0,0,0,0.25)"
      }}
    >
      <div style={{ maxWidth: "480px" }}>
        <p style={{ letterSpacing: "0.2em", fontSize: "0.8rem", marginBottom: "0.5rem", textTransform: "uppercase" }}>
          {heroText.tagline}
        </p>
        <h1 style={{ margin: 0, fontSize: "2.6rem", lineHeight: 1.2 }}>
          {title}
        </h1>
        <p style={{ marginTop: "0.8rem", color: "rgba(255,255,255,0.78)" }}>
          {heroText.description}
        </p>
      </div>
      <span
        style={{
          position: "absolute",
          right: "3rem",
          bottom: "-1rem",
          fontSize: "9rem",
          opacity: 0.08
        }}
      >
        ✈
      </span>
    </div>
  );
};

export default AirportHero;
