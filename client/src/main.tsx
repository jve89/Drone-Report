// client/src/main.tsx
import { StrictMode } from "react";
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

  // Support both param names
  { path: "/annotate/:id", element: <Annotate /> },
  { path: "/annotate/:draftId", element: <Annotate /> },

  // Support both auth URL schemes
  { path: "/auth/login", element: <AuthLogin /> },
  { path: "/auth/signup", element: <AuthSignup /> },
  { path: "/login", element: <AuthLogin /> },
  { path: "/signup", element: <AuthSignup /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </StrictMode>
);
