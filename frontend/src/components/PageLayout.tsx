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
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem"
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
      {children}
    </section>
  );
};

export default PageLayout;
