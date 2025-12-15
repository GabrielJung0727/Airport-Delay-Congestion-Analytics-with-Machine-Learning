import React from "react";

const App: React.FC = () => {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", padding: "2rem" }}>
      <h1>Airport Delay Lab</h1>
      <p>Frontend is up. Connect to the backend health check to verify end-to-end.</p>
      <ul>
        <li>Backend health: <code>http://localhost:8000/health</code></li>
        <li>Frontend dev server: <code>npm run dev -- --host --port 5173</code></li>
      </ul>
    </div>
  );
};

export default App;
