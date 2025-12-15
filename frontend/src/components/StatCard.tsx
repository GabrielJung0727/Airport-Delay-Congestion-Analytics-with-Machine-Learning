import React from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => (
  <div
    style={{
      padding: "1rem",
      borderRadius: "12px",
      border: "1px solid #e3e3e3",
      backgroundColor: "#fff",
      display: "flex",
      flexDirection: "column",
      gap: "0.4rem",
      boxShadow: "0 2px 4px rgba(0,0,0,0.04)"
    }}
  >
    <span style={{ fontSize: "0.85rem", color: "#666" }}>{title}</span>
    <strong style={{ fontSize: "1.4rem" }}>{value}</strong>
    {subtitle && <span style={{ fontSize: "0.8rem", color: "#999" }}>{subtitle}</span>}
  </div>
);

export default StatCard;
