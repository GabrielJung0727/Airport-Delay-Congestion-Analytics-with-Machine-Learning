import React from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => (
  <div
    style={{
      padding: "1.2rem",
      borderRadius: "18px",
      background: "linear-gradient(135deg, rgba(79,70,229,0.95), rgba(16,185,129,0.85))",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: "0.4rem",
      boxShadow: "0 15px 45px rgba(15,23,42,0.3)"
    }}
  >
    <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{title}</span>
    <strong style={{ fontSize: "1.6rem" }}>{value}</strong>
    {subtitle && <span style={{ fontSize: "0.8rem", opacity: 0.75 }}>{subtitle}</span>}
  </div>
);

export default StatCard;
