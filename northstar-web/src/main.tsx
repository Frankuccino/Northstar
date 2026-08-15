import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppProvider } from "./app/providers/index.tsx";
import { ErrorBoundary } from "./app/error-boundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>,
);
