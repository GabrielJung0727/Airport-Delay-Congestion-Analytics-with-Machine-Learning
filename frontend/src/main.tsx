import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/global.css";
import { Language, LanguageContext } from "./i18n";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root container missing in index.html");
}

const Root = () => {
  const [lang, setLang] = useState<Language>("ko");
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <App />
    </LanguageContext.Provider>
  );
};

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
