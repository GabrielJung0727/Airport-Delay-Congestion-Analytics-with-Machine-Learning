import React from "react";

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      padding: "1rem",
      backgroundColor: "#ffe8e6",
      borderRadius: "8px",
      border: "1px solid #ffb1a6",
      color: "#a1261c",
      fontSize: "0.9rem"
    }}
  >
    {message}
  </div>
);

export default ErrorState;
