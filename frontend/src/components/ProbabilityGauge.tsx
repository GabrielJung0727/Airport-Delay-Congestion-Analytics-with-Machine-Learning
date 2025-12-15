import React from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface ProbabilityGaugeProps {
  probability: number;
}

const ProbabilityGauge: React.FC<ProbabilityGaugeProps> = ({ probability }) => {
  const value = Math.min(Math.max(probability * 100, 0), 100);
  const data = [{ name: "Delay", value }];

  return (
    <div style={{ width: "220px", height: "220px" }}>
      <ResponsiveContainer>
        <RadialBarChart
          data={data}
          startAngle={220}
          endAngle={-40}
          innerRadius="85%"
          outerRadius="100%"
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            tick={false}
          />
          <RadialBar
            minAngle={15}
            clockWise
            background
            dataKey="value"
            cornerRadius={50}
            fill={value > 70 ? "#f94144" : value > 50 ? "#ffb703" : "#3bb273"}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ textAlign: "center", marginTop: "-40px" }}>
        <strong style={{ fontSize: "1.4rem" }}>{value.toFixed(1)}%</strong>
        <div style={{ color: "#6c757d", fontSize: "0.9rem" }}>Delay probability</div>
      </div>
    </div>
  );
};

export default ProbabilityGauge;
