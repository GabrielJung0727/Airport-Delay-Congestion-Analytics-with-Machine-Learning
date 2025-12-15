import React from "react";

interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ title, description, actions, children }) => {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <div
        className="glass-panel"
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem"
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {description && (
              <p style={{ margin: "0.25rem 0", color: "#666", fontSize: "0.9rem" }}>{description}</p>
            )}
          </div>
          {actions}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
};

export default PageLayout;
