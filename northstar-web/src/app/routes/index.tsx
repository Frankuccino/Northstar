import { LoginPage } from "@/features/auth/pages/login-page";
import { RegisterPage } from "@/features/auth/pages/register-page";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/auth-layout";
import { PublicRoute } from "../public-route";
import { ProtectedRoute } from "../protected-route";
import { DashboardLayout } from "../layouts/dashboard-layout";
import DashboardPage from "@/features/auth/pages/dashboard-page";

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
        element: <DashboardLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
]);
