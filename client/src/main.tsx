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
  { path: "/login", element: <AuthLogin /> },
  { path: "/signup", element: <AuthSignup /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/annotate/:draftId", element: <Annotate /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
