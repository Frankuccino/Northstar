import { LoginPage } from "@/features/auth/pages/login-page";
import { RegisterPage } from "@/features/auth/pages/register-page";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/auth-layout";
import { PublicRoute } from "../public-route";
import { ProtectedRoute } from "../protected-route";
import { AppShell } from "@/features/layout/components/app-shell";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { SettingsPage } from "@/features/layout/components/settings-page";
import { PlaceholderPage } from "@/features/layout/components/placeholder-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/login",
            element: <LoginPage />,
          },
          {
            path: "/register",
            element: <RegisterPage />,
          },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/settings",
            element: <SettingsPage />,
          },
          {
            path: "/employees",
            element: <PlaceholderPage title="Employees" />,
          },
          {
            path: "/admin",
            element: <PlaceholderPage title="Admin" />,
          },
        ],
      },
    ],
  },
]);
