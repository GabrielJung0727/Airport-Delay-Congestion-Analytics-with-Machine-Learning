import React from "react";

const Loader: React.FC<{ label?: string }> = ({ label = "Loading..." }) => (
  <div
    style={{
      padding: "1rem",
      textAlign: "center",
      fontSize: "0.9rem",
      color: "#555"
    }}
  >
    {label}
  </div>
);

export default Loader;
