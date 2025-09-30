// client/src/main.tsx
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import Annotate from "./pages/Annotate";
import AuthLogin from "./pages/AuthLogin";
import AuthSignup from "./pages/AuthSignup";
import Dashboard from "./pages/Dashboard";
import "./styles/tailwind.css";

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/dashboard", element: <Dashboard /> },

  { path: "/annotate/:id", element: <Annotate /> },

  { path: "/auth/login", element: <AuthLogin /> },
  { path: "/auth/signup", element: <AuthSignup /> },
  { path: "/login", element: <AuthLogin /> },
  { path: "/signup", element: <AuthSignup /> },
]);

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Root element "#root" not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>
);
